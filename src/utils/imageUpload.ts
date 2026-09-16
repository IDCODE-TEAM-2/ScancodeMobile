import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE, getToken } from '../api';

/**
 * Normalizes an image URL to ensure valid HTTPS protocol, correct domain prefixing,
 * and elimination of duplicate consecutive slashes.
 */
export function normalizeImageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Local file / asset / blob / data URIs are used directly
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('ph:') ||
    trimmed.startsWith('content:')
  ) {
    return trimmed;
  }

  let normalized = trimmed;

  // Protocol-relative //domain.com -> https://domain.com
  if (normalized.startsWith('//')) {
    normalized = `https:${normalized}`;
  } else if (normalized.startsWith('/')) {
    // Relative path on server -> prepend API_BASE
    normalized = `${API_BASE}${normalized}`;
  } else if (normalized.startsWith('http://')) {
    // Upgrade http to https (iOS ATS and modern Android block cleartext HTTP)
    normalized = normalized.replace(/^http:\/\//i, 'https://');
  }

  // Remove duplicate slashes after protocol (e.g., https://api.scancode.ng//api -> https://api.scancode.ng/api)
  normalized = normalized.replace(/([^:])\/{2,}/g, '$1/');

  return normalized;
}

/**
 * Cross-platform image uploader to /api/media/upload.
 * Handles Native (FileSystem.uploadAsync) and Web (fetch with FormData + Blob).
 */
export async function uploadImageToBackend(uri: string): Promise<string> {
  const token = await getToken();
  const uploadUrl = `${API_BASE}/api/media/upload`;

  if (Platform.OS === 'web') {
    // Web: Fetch blob and send via standard FormData
    const response = await fetch(uri);
    const blob = await response.blob();
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'upload.jpg';
    formData.append('file', blob, filename);
    formData.append('public', 'true');

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      let msg = 'Upload failed. Please try again.';
      try {
        const errJson = await res.json();
        msg = errJson.message || errJson.error || msg;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }

    const json = await res.json();
    const url = json.url as string;
    return normalizeImageUrl(url) || url;
  }

  // Native: expo-file-system legacy multipart upload
  const response = await FileSystem.uploadAsync(uploadUrl, uri, {
    fieldName: 'file',
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    parameters: {
      public: 'true',
    },
  });

  if (response.status !== 200 && response.status !== 201) {
    let msg = 'Upload failed. Please try again.';
    try {
      const errJson = JSON.parse(response.body);
      msg = errJson.message || errJson.error || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const json = JSON.parse(response.body);
  const url = json.url as string;
  return normalizeImageUrl(url) || url;
}
