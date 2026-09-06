import { extname } from "node:path";
import { fileTypeFromBuffer } from "file-type";
export const MAX_FILE_BYTES = 5_242_880;
const extensions: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf" };
export async function validateFile(file: Express.Multer.File): Promise<{ extension: string; mimeType: string } | null> {
  const extension = extname(file.originalname).toLowerCase();
  const expected = extensions[extension];
  if (!expected || file.mimetype !== expected) return null;
  try {
    const detected = await fileTypeFromBuffer(file.buffer);
    return detected?.mime === expected ? { extension, mimeType: expected } : null;
  } catch { return null; }
}
