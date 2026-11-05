// Source images are capped before local compression; the upload endpoint applies
// the same limit as a backstop when a platform cannot report the selected file size.
export const MAX_IMAGE_BYTES = 1024 * 1024;

export function isImageTooLarge(fileSize: number | undefined): boolean {
  return typeof fileSize === 'number' && fileSize > MAX_IMAGE_BYTES;
}
