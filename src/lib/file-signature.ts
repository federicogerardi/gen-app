import { fileTypeFromBuffer } from 'file-type';

export async function detectFileTypeFromBuffer(buffer: Buffer) {
  return fileTypeFromBuffer(buffer);
}
