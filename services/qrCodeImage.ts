import { Platform } from 'react-native';
import { Directory, Paths } from 'expo/node_modules/expo-file-system';
import { toQR } from 'toqr';

const QR_MARGIN_MODULES = 4;
const QR_EXPORT_SCALE = 16;
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const CRC32_TABLE = new Uint32Array(256);

for (let index = 0; index < 256; index++) {
  let value = index;

  for (let bit = 0; bit < 8; bit++) {
    value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  CRC32_TABLE[index] = value >>> 0;
}

export interface GeneratedQrCodeImage {
  content: string;
  imageBase64: string;
  imageUri: string;
  moduleCount: number;
  pixelSize: number;
}

export interface SavedQrCodeImage {
  fileName: string;
  uri?: string;
}

export function normalizeQrLinkInput(input: string) {
  const trimmedValue = input.trim();

  if (!trimmedValue) {
    throw new Error('Paste a link before generating a QR code.');
  }

  const normalizedValue = hasUriScheme(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;

  try {
    new URL(normalizedValue);
  } catch {
    throw new Error('Enter a valid link.');
  }

  return normalizedValue;
}

export function createQrCodeImage(content: string): GeneratedQrCodeImage {
  const modules = toQR(content, 0);
  const moduleCount = Math.sqrt(modules.length);

  if (!Number.isInteger(moduleCount)) {
    throw new Error('The QR code could not be generated.');
  }

  const pngBytes = createQrPng(modules, moduleCount, QR_EXPORT_SCALE, QR_MARGIN_MODULES);
  const imageBase64 = bytesToBase64(pngBytes);
  const pixelSize = (moduleCount + QR_MARGIN_MODULES * 2) * QR_EXPORT_SCALE;

  return {
    content,
    imageBase64,
    imageUri: `data:image/png;base64,${imageBase64}`,
    moduleCount,
    pixelSize,
  };
}

export async function saveQrCodeImage(imageBase64: string): Promise<SavedQrCodeImage | null> {
  const fileName = buildQrFileName();

  if (Platform.OS === 'web') {
    downloadBrowserFile(imageBase64, fileName);

    return { fileName };
  }

  const directory = await getExportDirectory();

  if (!directory) {
    return null;
  }

  const file = directory.createFile(fileName, 'image/png');
  file.write(imageBase64, { encoding: 'base64' });

  return {
    fileName,
    uri: file.uri,
  };
}

function hasUriScheme(value: string) {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value);
}

function buildQrFileName() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  return `qr-code-${timestamp}.png`;
}

async function getExportDirectory() {
  try {
    return await Directory.pickDirectoryAsync();
  } catch (error) {
    if (isUserCancelled(error)) {
      return null;
    }

    const fallbackDirectory = new Directory(Paths.document, 'qr-codes');

    if (!fallbackDirectory.exists) {
      fallbackDirectory.create({ idempotent: true, intermediates: true });
    }

    return fallbackDirectory;
  }
}

function isUserCancelled(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /cancel/i.test(error.message);
}

function downloadBrowserFile(imageBase64: string, fileName: string) {
  if (typeof document === 'undefined') {
    throw new Error('Downloads are not available in this browser.');
  }

  const anchor = document.createElement('a');
  anchor.href = `data:image/png;base64,${imageBase64}`;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function createQrPng(
  modules: Uint8Array,
  moduleCount: number,
  scale: number,
  margin: number
) {
  const imageSize = (moduleCount + margin * 2) * scale;
  const rowLength = imageSize + 1;
  const rawBytes = new Uint8Array(rowLength * imageSize);

  let offset = 0;

  for (let y = 0; y < imageSize; y++) {
    rawBytes[offset++] = 0;

    const moduleY = Math.floor(y / scale) - margin;

    for (let x = 0; x < imageSize; x++) {
      const moduleX = Math.floor(x / scale) - margin;
      const insideQrBounds =
        moduleX >= 0 &&
        moduleX < moduleCount &&
        moduleY >= 0 &&
        moduleY < moduleCount;
      const moduleValue = insideQrBounds
        ? modules[moduleY * moduleCount + moduleX]
        : 0;

      rawBytes[offset++] = moduleValue === 1 ? 0 : 255;
    }
  }

  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = createChunk('IHDR', createIHDR(imageSize, imageSize));
  const idat = createChunk('IDAT', createZlibStore(rawBytes));
  const iend = createChunk('IEND', new Uint8Array(0));

  return concatBytes(signature, ihdr, idat, iend);
}

function createIHDR(width: number, height: number) {
  const ihdr = new Uint8Array(13);
  writeUint32BigEndian(ihdr, 0, width);
  writeUint32BigEndian(ihdr, 4, height);
  ihdr[8] = 8;
  ihdr[9] = 0;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return ihdr;
}

function createChunk(type: string, data: Uint8Array) {
  const typeBytes = new Uint8Array([
    type.charCodeAt(0),
    type.charCodeAt(1),
    type.charCodeAt(2),
    type.charCodeAt(3),
  ]);
  const chunk = new Uint8Array(data.length + 12);

  writeUint32BigEndian(chunk, 0, data.length);
  chunk.set(typeBytes, 4);
  chunk.set(data, 8);
  writeUint32BigEndian(chunk, data.length + 8, crc32(chunk.subarray(4, data.length + 8)));

  return chunk;
}

function createZlibStore(rawBytes: Uint8Array) {
  const blockCount = Math.ceil(rawBytes.length / 65535);
  const zlibBytes = new Uint8Array(2 + rawBytes.length + blockCount * 5 + 4);

  let outputOffset = 0;
  let inputOffset = 0;

  zlibBytes[outputOffset++] = 0x78;
  zlibBytes[outputOffset++] = 0x01;

  while (inputOffset < rawBytes.length) {
    const blockLength = Math.min(65535, rawBytes.length - inputOffset);
    const isLastBlock = inputOffset + blockLength >= rawBytes.length;
    const invertedLength = (~blockLength) & 0xffff;

    zlibBytes[outputOffset++] = isLastBlock ? 1 : 0;
    zlibBytes[outputOffset++] = blockLength & 0xff;
    zlibBytes[outputOffset++] = (blockLength >>> 8) & 0xff;
    zlibBytes[outputOffset++] = invertedLength & 0xff;
    zlibBytes[outputOffset++] = (invertedLength >>> 8) & 0xff;
    zlibBytes.set(rawBytes.subarray(inputOffset, inputOffset + blockLength), outputOffset);

    outputOffset += blockLength;
    inputOffset += blockLength;
  }

  writeUint32BigEndian(zlibBytes, outputOffset, adler32(rawBytes));

  return zlibBytes;
}

function writeUint32BigEndian(target: Uint8Array, offset: number, value: number) {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

function crc32(bytes: Uint8Array) {
  let checksum = 0xffffffff;

  for (let index = 0; index < bytes.length; index++) {
    checksum = CRC32_TABLE[(checksum ^ bytes[index]) & 0xff] ^ (checksum >>> 8);
  }

  return (checksum ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array) {
  let sumA = 1;
  let sumB = 0;

  for (let index = 0; index < bytes.length; index++) {
    sumA = (sumA + bytes[index]) % 65521;
    sumB = (sumB + sumA) % 65521;
  }

  return ((sumB << 16) | sumA) >>> 0;
}

function concatBytes(...arrays: Uint8Array[]) {
  let totalLength = 0;

  for (const array of arrays) {
    totalLength += array.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const array of arrays) {
    result.set(array, offset);
    offset += array.length;
  }

  return result;
}

function bytesToBase64(bytes: Uint8Array) {
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const b = index + 1 < bytes.length ? bytes[index + 1] : 0;
    const c = index + 2 < bytes.length ? bytes[index + 2] : 0;
    const chunk = (a << 16) | (b << 8) | c;

    output += BASE64_ALPHABET[(chunk >>> 18) & 63];
    output += BASE64_ALPHABET[(chunk >>> 12) & 63];
    output += index + 1 < bytes.length ? BASE64_ALPHABET[(chunk >>> 6) & 63] : '=';
    output += index + 2 < bytes.length ? BASE64_ALPHABET[chunk & 63] : '=';
  }

  return output;
}
