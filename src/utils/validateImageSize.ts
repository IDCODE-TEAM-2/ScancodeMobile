// Matches the server's spring.servlet.multipart.max-file-size (application.yaml) — keep
// both in sync. `fileSize` is undefined on some platforms (e.g. web); when unknown, the
// server-side limit is still the real backstop, so we simply skip the client-side check.
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export function isImageTooLarge(fileSize: number | undefined): boolean {
  return typeof fileSize === 'number' && fileSize > MAX_IMAGE_BYTES;
}
