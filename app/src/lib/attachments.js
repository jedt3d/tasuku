// Prepares a file for upload (#9). Storage has the last word on size and type (ADR 0002): what is
// checked here only gives the person a clear message before the upload.
const MAX_BYTES = 10 * 1024 * 1024;
const LONG_SIDE = 1920;
const AS_IS = ['image/webp', 'image/jpeg', 'image/png'];

// The image reduced to at most 1920 px on its long side, as WebP. Null when this browser cannot
// read the image or cannot write WebP (it then answers with a PNG).
async function toWebp(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, LONG_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
    return blob?.type === 'image/webp' ? blob : null;
  } catch {
    return null;
  }
}

// Resolves to { blob, name } to upload, or to { problem } with a message key. An image that
// cannot be converted goes up as it is when it is a JPEG, PNG or WebP.
export async function prepare(file) {
  let blob = file;
  let name = file.name;
  if (file.type.startsWith('image/')) {
    const webp = await toWebp(file);
    if (webp) {
      blob = webp;
      name = name.replace(/\.[^.]*$/, '') + '.webp';
    } else if (!AS_IS.includes(file.type)) {
      return { problem: 'attach.wrongType' };
    }
  } else if (file.type !== 'application/pdf') {
    return { problem: 'attach.wrongType' };
  }
  return blob.size > MAX_BYTES ? { problem: 'attach.tooLarge' } : { blob, name };
}

export const formatSize = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
