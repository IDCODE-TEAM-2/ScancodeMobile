import { Image, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_SOURCE_BYTES = 1024 * 1024;
const MAX_COMPRESSED_BYTES = 200 * 1024;
const MAX_WIDTHS = [1600, 1280, 1024, 800, 640];
const QUALITIES = [0.82, 0.72, 0.62, 0.52, 0.42];

export interface PreparedImage {
  uri: string;
  cleanup: () => Promise<void>;
}

export async function compressImageForUpload(uri: string): Promise<PreparedImage> {
  if (Platform.OS === 'web') return compressWebImage(uri);

  const source = await FileSystem.getInfoAsync(uri);
  if (!source.exists) {
    throw new Error('The selected image is no longer available. Please choose it again.');
  }
  if (source.size !== undefined && source.size > MAX_SOURCE_BYTES) {
    throw new Error('Choose an image no larger than 1 MB.');
  }

  const dimensions = await getImageDimensions(uri);
  for (const maxWidth of MAX_WIDTHS) {
    const width = Math.min(dimensions.width, maxWidth);
    const height = Math.round(dimensions.height * (width / dimensions.width));
    for (const compress of QUALITIES) {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width, height } }],
        { compress, format: ImageManipulator.SaveFormat.JPEG },
      );
      const info = await FileSystem.getInfoAsync(result.uri);
      if (info.exists && info.size !== undefined && info.size <= MAX_COMPRESSED_BYTES) {
        return {
          uri: result.uri,
          cleanup: () => FileSystem.deleteAsync(result.uri, { idempotent: true }),
        };
      }
      await FileSystem.deleteAsync(result.uri, { idempotent: true });
    }
  }

  throw new Error('Could not compress this image below 200 KB. Please choose another image.');
}

function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => reject(new Error('Could not read the selected image. Please choose another image.')),
    );
  });
}

async function compressWebImage(uri: string): Promise<PreparedImage> {
  const response = await fetch(uri);
  const source = await response.blob();
  if (source.size > MAX_SOURCE_BYTES) {
    throw new Error('Choose an image no larger than 1 MB.');
  }

  const sourceUrl = URL.createObjectURL(source);
  try {
    const image = new window.Image();
    image.src = sourceUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Could not read the selected image. Please choose another image.'));
    });

    for (const maxWidth of MAX_WIDTHS) {
      const width = Math.min(image.naturalWidth, maxWidth);
      const height = Math.round(image.naturalHeight * (width / image.naturalWidth));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image compression is unavailable in this browser.');

      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      for (const quality of QUALITIES) {
        const compressed = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, 'image/jpeg', quality),
        );
        if (compressed && compressed.size <= MAX_COMPRESSED_BYTES) {
          const compressedUrl = URL.createObjectURL(compressed);
          return {
            uri: compressedUrl,
            cleanup: async () => URL.revokeObjectURL(compressedUrl),
          };
        }
      }
    }

    throw new Error('Could not compress this image below 200 KB. Please choose another image.');
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
