import type { GeneratedQrCodeImage } from './qrCodeImage';

type BarcodeSymbology =
  | 'EAN_13'
  | 'EAN_8'
  | 'UPC_A'
  | 'CODE_128'
  | 'CODE_39'
  | 'ITF_14'
  | 'CODE_93'
  | 'PHARMA'
  | 'MSI'
  | 'CODABAR';

const BARCODE_HEIGHT = 260;
const BARCODE_MODULE_SCALE = 3;
const BARCODE_QUIET_MODULES = 16;
const BARCODE_VERTICAL_PADDING = 28;
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const CRC32_TABLE = new Uint32Array(256);

for (let index = 0; index < 256; index++) {
  let value = index;

  for (let bit = 0; bit < 8; bit++) {
    value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  CRC32_TABLE[index] = value >>> 0;
}

const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const EAN_R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const EAN13_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

const ITF_DIGITS: Record<string, string> = {
  '0': 'nnwwn',
  '1': 'wnnnw',
  '2': 'nwnnw',
  '3': 'wwnnn',
  '4': 'nnwnw',
  '5': 'wnwnn',
  '6': 'nwwnn',
  '7': 'nnnww',
  '8': 'wnnwn',
  '9': 'nwnwn',
};

const CODE39: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwwnnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw',
  B: 'nnwnnwnnw',
  C: 'wnwnnwnnn',
  D: 'nnnnwwnnw',
  E: 'wnnnwwnnn',
  F: 'nnwnwwnnn',
  G: 'nnnnnwwnw',
  H: 'wnnnnwwnn',
  I: 'nnwnnwwnn',
  J: 'nnnnwwwnn',
  K: 'wnnnnnnww',
  L: 'nnwnnnnww',
  M: 'wnwnnnnwn',
  N: 'nnnnwnnww',
  O: 'wnnnwnnwn',
  P: 'nnwnwnnwn',
  Q: 'nnnnnnwww',
  R: 'wnnnnnwwn',
  S: 'nnwnnnwwn',
  T: 'nnnnwnwwn',
  U: 'wwnnnnnnw',
  V: 'nwwnnnnnw',
  W: 'wwwnnnnnn',
  X: 'nwnnwnnnw',
  Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  '$': 'nwnwnwnnn',
  '/': 'nwnwnnnwn',
  '+': 'nwnnnwnwn',
  '%': 'nnnwnwnwn',
  '*': 'nwnnwnwnn',
};

const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const CODE93_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%abcd';
const CODE93_PATTERNS: Record<string, string> = {
  '0': '100010100',
  '1': '101001000',
  '2': '101000100',
  '3': '101000010',
  '4': '100101000',
  '5': '100100100',
  '6': '100100010',
  '7': '101010000',
  '8': '100010010',
  '9': '100001010',
  A: '110101000',
  B: '110100100',
  C: '110100010',
  D: '110010100',
  E: '110010010',
  F: '110001010',
  G: '101101000',
  H: '101100100',
  I: '101100010',
  J: '100110100',
  K: '100011010',
  L: '101011000',
  M: '101001100',
  N: '101000110',
  O: '100101100',
  P: '100010110',
  Q: '110110100',
  R: '110110010',
  S: '110101100',
  T: '110100110',
  U: '110010110',
  V: '110011010',
  W: '101101100',
  X: '101100110',
  Y: '100110110',
  Z: '100111010',
  '-': '100101110',
  '.': '111010100',
  ' ': '111010010',
  '$': '111001010',
  '/': '101101110',
  '+': '101110110',
  '%': '110101110',
  a: '100100110',
  b: '111011010',
  c: '111010110',
  d: '100110010',
  '*': '101011110',
};

const MSI_PATTERNS: Record<string, string> = {
  '0': '100100100100',
  '1': '100100100110',
  '2': '100100110100',
  '3': '100100110110',
  '4': '100110100100',
  '5': '100110100110',
  '6': '100110110100',
  '7': '100110110110',
  '8': '110100100100',
  '9': '110100100110',
};

const CODABAR_PATTERNS: Record<string, string> = {
  '0': '101010011',
  '1': '101011001',
  '2': '101001011',
  '3': '110010101',
  '4': '101101001',
  '5': '110101001',
  '6': '100101011',
  '7': '100101101',
  '8': '100110101',
  '9': '110100101',
  '-': '101001101',
  '$': '101100101',
  ':': '1101011011',
  '/': '1101101011',
  '.': '1101101101',
  '+': '1011011011',
  A: '1011001001',
  B: '1001001011',
  C: '1010010011',
  D: '1010011001',
};

export function createBarcodeImage(
  content: string,
  symbology: BarcodeSymbology
): GeneratedQrCodeImage {
  const modules = encodeBarcode(content, symbology);
  const pngBytes = createBarcodePng(modules);
  const imageBase64 = bytesToBase64(pngBytes);

  return {
    content,
    imageBase64,
    imageUri: `data:image/png;base64,${imageBase64}`,
    moduleCount: modules.length,
    pixelSize: (modules.length + BARCODE_QUIET_MODULES * 2) * BARCODE_MODULE_SCALE,
    kind: 'barcode',
    symbology,
  };
}

export function getBarcodeSymbologyForTemplate(templateId: string, content: string): BarcodeSymbology | null {
  switch (templateId) {
    case 'ean-13':
      return 'EAN_13';
    case 'ean-8':
      return 'EAN_8';
    case 'upc-a':
      return 'UPC_A';
    case 'code-128':
      return 'CODE_128';
    case 'code-39':
      return 'CODE_39';
    case 'itf-14':
      return 'ITF_14';
    case 'code-93':
      return 'CODE_93';
    case 'pharmacode':
      return 'PHARMA';
    case 'msi-plesey':
      return 'MSI';
    case 'codabar':
      return 'CODABAR';
    case 'product-code':
      return getProductCodeSymbology(content);
    default:
      return null;
  }
}

function getProductCodeSymbology(content: string): BarcodeSymbology {
  if (/^\d{8}$/.test(content)) {
    return 'EAN_8';
  }

  if (/^\d{12}$/.test(content)) {
    return 'UPC_A';
  }

  if (/^\d{13}$/.test(content)) {
    return 'EAN_13';
  }

  if (/^\d{14}$/.test(content)) {
    return 'ITF_14';
  }

  return 'CODE_128';
}

function encodeBarcode(content: string, symbology: BarcodeSymbology) {
  switch (symbology) {
    case 'EAN_13':
      return encodeEan13(content);
    case 'EAN_8':
      return encodeEan8(content);
    case 'UPC_A':
      return encodeEan13(`0${content}`);
    case 'CODE_128':
      return encodeCode128B(content);
    case 'CODE_39':
      return encodeCode39(content);
    case 'ITF_14':
      return encodeItf(content);
    case 'CODE_93':
      return encodeCode93(content);
    case 'PHARMA':
      return encodePharmacode(content);
    case 'MSI':
      return encodeMsi(content);
    case 'CODABAR':
      return encodeCodabar(content);
  }
}

function encodeEan13(value: string) {
  if (!/^\d{13}$/.test(value)) {
    throw new Error('EAN-13 requires 13 digits.');
  }

  const digits = value.split('').map(Number);
  const parity = EAN13_PARITY[digits[0]];
  const bits: boolean[] = [];

  appendBits(bits, '101');

  for (let index = 1; index <= 6; index++) {
    const set = parity[index - 1] === 'G' ? EAN_G : EAN_L;
    appendBits(bits, set[digits[index]]);
  }

  appendBits(bits, '01010');

  for (let index = 7; index <= 12; index++) {
    appendBits(bits, EAN_R[digits[index]]);
  }

  appendBits(bits, '101');

  return bits;
}

function encodeEan8(value: string) {
  if (!/^\d{8}$/.test(value)) {
    throw new Error('EAN-8 requires 8 digits.');
  }

  const digits = value.split('').map(Number);
  const bits: boolean[] = [];

  appendBits(bits, '101');

  for (let index = 0; index < 4; index++) {
    appendBits(bits, EAN_L[digits[index]]);
  }

  appendBits(bits, '01010');

  for (let index = 4; index < 8; index++) {
    appendBits(bits, EAN_R[digits[index]]);
  }

  appendBits(bits, '101');

  return bits;
}

function encodeItf(value: string) {
  if (!/^\d+$/.test(value) || value.length % 2 !== 0) {
    throw new Error('ITF barcodes require an even number of digits.');
  }

  const bits: boolean[] = [];
  appendWidths(bits, [1, 1, 1, 1], true);

  for (let index = 0; index < value.length; index += 2) {
    const bars = ITF_DIGITS[value[index]];
    const spaces = ITF_DIGITS[value[index + 1]];
    const widths: number[] = [];

    for (let patternIndex = 0; patternIndex < 5; patternIndex++) {
      widths.push(widthFor(bars[patternIndex]));
      widths.push(widthFor(spaces[patternIndex]));
    }

    appendWidths(bits, widths, true);
  }

  appendWidths(bits, [3, 1, 1], true);

  return bits;
}

function encodeCode39(value: string) {
  const data = `*${value.toUpperCase()}*`;
  const bits: boolean[] = [];

  for (let charIndex = 0; charIndex < data.length; charIndex++) {
    const pattern = CODE39[data[charIndex]];

    if (!pattern) {
      throw new Error('Code 39 contains unsupported characters.');
    }

    appendWidths(bits, pattern.split('').map(widthFor), true);

    if (charIndex < data.length - 1) {
      bits.push(false);
    }
  }

  return bits;
}

function encodeCode128B(value: string) {
  if (!/^[\x20-\x7e]+$/.test(value)) {
    throw new Error('Code 128 supports printable ASCII characters.');
  }

  const values = [104];
  let checksum = 104;

  for (let index = 0; index < value.length; index++) {
    const codeValue = value.charCodeAt(index) - 32;
    values.push(codeValue);
    checksum += codeValue * (index + 1);
  }

  values.push(checksum % 103, 106);

  const bits: boolean[] = [];

  for (const codeValue of values) {
    appendWidths(bits, CODE128_PATTERNS[codeValue].split('').map(Number), true);
  }

  return bits;
}

function encodeCode93(value: string) {
  const data = value.toUpperCase();
  const withChecks = `${data}${getCode93Checksum(data, 20)}${getCode93Checksum(`${data}${getCode93Checksum(data, 20)}`, 15)}`;
  const bits: boolean[] = [];

  appendBits(bits, CODE93_PATTERNS['*']);

  for (const char of withChecks) {
    const pattern = CODE93_PATTERNS[char];

    if (!pattern) {
      throw new Error('Code 93 contains unsupported characters.');
    }

    appendBits(bits, pattern);
  }

  appendBits(bits, CODE93_PATTERNS['*']);
  bits.push(true);

  return bits;
}

function getCode93Checksum(value: string, maxWeight: number) {
  let weight = 1;
  let total = 0;

  for (let index = value.length - 1; index >= 0; index--) {
    const charValue = CODE93_CHARS.indexOf(value[index]);

    if (charValue < 0) {
      throw new Error('Code 93 contains unsupported characters.');
    }

    total += charValue * weight;
    weight = weight === maxWeight ? 1 : weight + 1;
  }

  return CODE93_CHARS[total % 47];
}

function encodePharmacode(value: string) {
  let numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 3 || numberValue > 131070) {
    throw new Error('Pharmacode must be a number between 3 and 131070.');
  }

  const widths: number[] = [];

  while (numberValue > 0) {
    if (numberValue % 2 === 0) {
      widths.unshift(3);
      numberValue = (numberValue - 2) / 2;
    } else {
      widths.unshift(1);
      numberValue = (numberValue - 1) / 2;
    }
  }

  const bits: boolean[] = [];

  widths.forEach((width, index) => {
    appendRun(bits, true, width);

    if (index < widths.length - 1) {
      appendRun(bits, false, 2);
    }
  });

  return bits;
}

function encodeMsi(value: string) {
  if (!/^\d+$/.test(value)) {
    throw new Error('MSI Plessey supports only numeric data.');
  }

  const bits: boolean[] = [];
  appendBits(bits, '110');

  for (const digit of value) {
    appendBits(bits, MSI_PATTERNS[digit]);
  }

  appendBits(bits, '1001');

  return bits;
}

function encodeCodabar(value: string) {
  const bits: boolean[] = [];

  for (let index = 0; index < value.length; index++) {
    const pattern = CODABAR_PATTERNS[value[index]];

    if (!pattern) {
      throw new Error('Codabar contains unsupported characters.');
    }

    appendBits(bits, pattern);

    if (index < value.length - 1) {
      bits.push(false);
    }
  }

  return bits;
}

function appendBits(target: boolean[], bits: string) {
  for (const bit of bits) {
    target.push(bit === '1');
  }
}

function appendWidths(target: boolean[], widths: number[], startsWithBar: boolean) {
  let isBar = startsWithBar;

  for (const width of widths) {
    appendRun(target, isBar, width);
    isBar = !isBar;
  }
}

function appendRun(target: boolean[], isBar: boolean, width: number) {
  for (let index = 0; index < width; index++) {
    target.push(isBar);
  }
}

function widthFor(value: string) {
  return value === 'w' ? 3 : 1;
}

function createBarcodePng(modules: boolean[]) {
  const width = (modules.length + BARCODE_QUIET_MODULES * 2) * BARCODE_MODULE_SCALE;
  const height = BARCODE_HEIGHT;
  const rowLength = width + 1;
  const rawBytes = new Uint8Array(rowLength * height);
  const barTop = BARCODE_VERTICAL_PADDING;
  const barBottom = height - BARCODE_VERTICAL_PADDING;

  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawBytes[offset++] = 0;

    for (let x = 0; x < width; x++) {
      const moduleIndex = Math.floor(x / BARCODE_MODULE_SCALE) - BARCODE_QUIET_MODULES;
      const isBar =
        y >= barTop &&
        y < barBottom &&
        moduleIndex >= 0 &&
        moduleIndex < modules.length &&
        modules[moduleIndex];

      rawBytes[offset++] = isBar ? 0 : 255;
    }
  }

  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = createChunk('IHDR', createIHDR(width, height));
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
