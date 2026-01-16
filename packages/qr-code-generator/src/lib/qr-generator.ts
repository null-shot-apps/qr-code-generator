/**
 * QR Code Generator - Zero external dependencies
 * Implements QR Code generation algorithm from scratch
 */

// QR Code error correction levels
export enum ErrorCorrectionLevel {
  L = 0, // ~7% correction
  M = 1, // ~15% correction
  Q = 2, // ~25% correction
  H = 3, // ~30% correction
}

// Mode indicators
enum Mode {
  NUMERIC = 1,
  ALPHANUMERIC = 2,
  BYTE = 4,
  KANJI = 8,
}

// QR Code version capacity (using version 1-10 for simplicity)
const VERSION_CAPACITY = [
  { version: 1, size: 21, capacity: { L: 152, M: 128, Q: 104, H: 72 } },
  { version: 2, size: 25, capacity: { L: 272, M: 224, Q: 176, H: 128 } },
  { version: 3, size: 29, capacity: { L: 440, M: 352, Q: 272, H: 208 } },
  { version: 4, size: 33, capacity: { L: 640, M: 512, Q: 384, H: 288 } },
  { version: 5, size: 37, capacity: { L: 864, M: 688, Q: 496, H: 368 } },
  { version: 6, size: 41, capacity: { L: 1088, M: 864, Q: 608, H: 480 } },
  { version: 7, size: 45, capacity: { L: 1248, M: 992, Q: 704, H: 528 } },
  { version: 8, size: 49, capacity: { L: 1552, M: 1232, Q: 880, H: 688 } },
  { version: 9, size: 53, capacity: { L: 1856, M: 1456, Q: 1056, H: 800 } },
  { version: 10, size: 57, capacity: { L: 2192, M: 1728, Q: 1232, H: 976 } },
];

// Galois Field for error correction
class GaloisField {
  private exp: number[] = [];
  private log: number[] = [];

  constructor() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      this.exp[i] = x;
      this.log[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
  }

  multiply(a: number, b: number): number {
    if (a === 0 || b === 0) return 0;
    return this.exp[(this.log[a] + this.log[b]) % 255];
  }
}

const GF = new GaloisField();

// QR Code class
export class QRCode {
  private modules: boolean[][] = [];
  private size: number = 0;
  private version: number = 1;

  constructor(
    private data: string,
    private errorCorrection: ErrorCorrectionLevel = ErrorCorrectionLevel.M
  ) {
    this.generate();
  }

  private generate(): void {
    // Determine version based on data length
    const dataLength = this.data.length;
    const ecLevel = ['L', 'M', 'Q', 'H'][this.errorCorrection] as 'L' | 'M' | 'Q' | 'H';
    
    for (const ver of VERSION_CAPACITY) {
      if (ver.capacity[ecLevel] >= dataLength * 8) {
        this.version = ver.version;
        this.size = ver.size;
        break;
      }
    }

    if (this.size === 0) {
      throw new Error('Data too long for QR Code');
    }

    // Initialize modules
    this.modules = Array(this.size)
      .fill(null)
      .map(() => Array(this.size).fill(false));

    // Add finder patterns
    this.addFinderPattern(0, 0);
    this.addFinderPattern(this.size - 7, 0);
    this.addFinderPattern(0, this.size - 7);

    // Add separators
    this.addSeparators();

    // Add timing patterns
    this.addTimingPatterns();

    // Add dark module
    this.modules[4 * this.version + 9][8] = true;

    // Encode data
    const encoded = this.encodeData();

    // Place data
    this.placeData(encoded);

    // Add format information (simplified)
    this.addFormatInfo();
  }

  private addFinderPattern(row: number, col: number): void {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        if (rr < 0 || rr >= this.size || cc < 0 || cc >= this.size) continue;

        if (
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        ) {
          this.modules[rr][cc] = true;
        }
      }
    }
  }

  private addSeparators(): void {
    // Top-left
    for (let i = 0; i < 8; i++) {
      this.modules[7][i] = false;
      this.modules[i][7] = false;
    }
    // Top-right
    for (let i = 0; i < 8; i++) {
      this.modules[7][this.size - 8 + i] = false;
      this.modules[i][this.size - 8] = false;
    }
    // Bottom-left
    for (let i = 0; i < 8; i++) {
      this.modules[this.size - 8][i] = false;
      this.modules[this.size - 8 + i][7] = false;
    }
  }

  private addTimingPatterns(): void {
    for (let i = 8; i < this.size - 8; i++) {
      this.modules[6][i] = i % 2 === 0;
      this.modules[i][6] = i % 2 === 0;
    }
  }

  private encodeData(): boolean[] {
    const bits: boolean[] = [];

    // Mode indicator (byte mode = 0100)
    bits.push(false, true, false, false);

    // Character count indicator (8 bits for byte mode, version 1-9)
    const length = this.data.length;
    for (let i = 7; i >= 0; i--) {
      bits.push((length >> i) & 1 ? true : false);
    }

    // Data
    for (let i = 0; i < this.data.length; i++) {
      const charCode = this.data.charCodeAt(i);
      for (let j = 7; j >= 0; j--) {
        bits.push((charCode >> j) & 1 ? true : false);
      }
    }

    // Terminator (up to 4 zeros)
    for (let i = 0; i < 4 && bits.length % 8 !== 0; i++) {
      bits.push(false);
    }

    // Pad to byte boundary
    while (bits.length % 8 !== 0) {
      bits.push(false);
    }

    // Pad bytes
    const padBytes = [0b11101100, 0b00010001];
    let padIndex = 0;
    const maxBits = VERSION_CAPACITY[this.version - 1].capacity[
      ['L', 'M', 'Q', 'H'][this.errorCorrection] as 'L' | 'M' | 'Q' | 'H'
    ];
    
    while (bits.length < maxBits) {
      const padByte = padBytes[padIndex % 2];
      for (let i = 7; i >= 0; i--) {
        bits.push((padByte >> i) & 1 ? true : false);
      }
      padIndex++;
    }

    return bits.slice(0, maxBits);
  }

  private placeData(data: boolean[]): void {
    let bitIndex = 0;
    let direction = -1; // -1 = up, 1 = down

    for (let col = this.size - 1; col > 0; col -= 2) {
      if (col === 6) col--; // Skip timing column

      for (let i = 0; i < this.size; i++) {
        const row = direction === -1 ? this.size - 1 - i : i;

        for (let c = 0; c < 2; c++) {
          const cc = col - c;

          // Skip if already filled (finder patterns, etc.)
          if (this.isReserved(row, cc)) continue;

          if (bitIndex < data.length) {
            this.modules[row][cc] = data[bitIndex];
            bitIndex++;
          }
        }
      }

      direction *= -1;
    }
  }

  private isReserved(row: number, col: number): boolean {
    // Finder patterns
    if (
      (row < 9 && col < 9) ||
      (row < 9 && col >= this.size - 8) ||
      (row >= this.size - 8 && col < 9)
    ) {
      return true;
    }

    // Timing patterns
    if (row === 6 || col === 6) return true;

    // Dark module
    if (row === 4 * this.version + 9 && col === 8) return true;

    return false;
  }

  private addFormatInfo(): void {
    // Simplified format info (mask pattern 0)
    const formatBits = [true, false, true, false, true, false, false, false, false, false, true, false, false, true, false];

    // Top-left
    for (let i = 0; i < 6; i++) {
      this.modules[8][i] = formatBits[i];
    }
    this.modules[8][7] = formatBits[6];
    this.modules[8][8] = formatBits[7];
    this.modules[7][8] = formatBits[8];
    for (let i = 9; i < 15; i++) {
      this.modules[14 - i][8] = formatBits[i];
    }

    // Top-right and bottom-left
    for (let i = 0; i < 8; i++) {
      this.modules[8][this.size - 1 - i] = formatBits[i];
    }
    for (let i = 8; i < 15; i++) {
      this.modules[this.size - 15 + i][8] = formatBits[i];
    }
  }

  public getModules(): boolean[][] {
    return this.modules;
  }

  public getSize(): number {
    return this.size;
  }

  public toSVG(moduleSize: number = 10, margin: number = 4): string {
    const size = this.size + margin * 2;
    const totalSize = size * moduleSize;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalSize}" height="${totalSize}" viewBox="0 0 ${totalSize} ${totalSize}">`;
    svg += `<rect width="${totalSize}" height="${totalSize}" fill="white"/>`;

    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.modules[row][col]) {
          const x = (col + margin) * moduleSize;
          const y = (row + margin) * moduleSize;
          svg += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
        }
      }
    }

    svg += '</svg>';
    return svg;
  }

  public toPNG(moduleSize: number = 10, margin: number = 4): string {
    const size = this.size + margin * 2;
    const totalSize = size * moduleSize;

    // Create canvas data
    const canvas = {
      width: totalSize,
      height: totalSize,
      data: new Uint8ClampedArray(totalSize * totalSize * 4),
    };

    // Fill white background
    for (let i = 0; i < canvas.data.length; i += 4) {
      canvas.data[i] = 255; // R
      canvas.data[i + 1] = 255; // G
      canvas.data[i + 2] = 255; // B
      canvas.data[i + 3] = 255; // A
    }

    // Draw QR modules
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.modules[row][col]) {
          const startX = (col + margin) * moduleSize;
          const startY = (row + margin) * moduleSize;

          for (let y = 0; y < moduleSize; y++) {
            for (let x = 0; x < moduleSize; x++) {
              const pixelX = startX + x;
              const pixelY = startY + y;
              const index = (pixelY * totalSize + pixelX) * 4;

              canvas.data[index] = 0; // R
              canvas.data[index + 1] = 0; // G
              canvas.data[index + 2] = 0; // B
              canvas.data[index + 3] = 255; // A
            }
          }
        }
      }
    }

    // Return base64 data URL
    return this.canvasToDataURL(canvas);
  }

  private canvasToDataURL(canvas: { width: number; height: number; data: Uint8ClampedArray }): string {
    // Simple PNG encoding (uncompressed for simplicity)
    const { width, height, data } = canvas;
    
    // PNG signature
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    
    // IHDR chunk
    const ihdr = this.createChunk('IHDR', [
      ...this.int32ToBytes(width),
      ...this.int32ToBytes(height),
      8, // bit depth
      6, // color type (RGBA)
      0, // compression
      0, // filter
      0, // interlace
    ]);
    
    // IDAT chunk (uncompressed data)
    const imageData: number[] = [];
    for (let y = 0; y < height; y++) {
      imageData.push(0); // filter type for each scanline
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        imageData.push(data[i], data[i + 1], data[i + 2], data[i + 3]);
      }
    }
    
    const idat = this.createChunk('IDAT', this.deflate(imageData));
    
    // IEND chunk
    const iend = this.createChunk('IEND', []);
    
    const png = [...signature, ...ihdr, ...idat, ...iend];
    
    // Convert to base64
    const base64 = this.arrayToBase64(new Uint8Array(png));
    return `data:image/png;base64,${base64}`;
  }

  private int32ToBytes(n: number): number[] {
    return [(n >> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  }

  private createChunk(type: string, data: number[]): number[] {
    const length = data.length;
    const chunk = [
      ...this.int32ToBytes(length),
      ...type.split('').map(c => c.charCodeAt(0)),
      ...data,
    ];
    
    const crc = this.crc32(chunk.slice(4));
    chunk.push(...this.int32ToBytes(crc));
    
    return chunk;
  }

  private crc32(data: number[]): number {
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let i = 0; i < 8; i++) {
        crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private deflate(data: number[]): number[] {
    // Simplified deflate (uncompressed blocks)
    const result: number[] = [];
    
    // Zlib header
    result.push(0x78, 0x01);
    
    // Process in blocks
    const blockSize = 65535;
    for (let i = 0; i < data.length; i += blockSize) {
      const block = data.slice(i, i + blockSize);
      const isLast = i + blockSize >= data.length ? 1 : 0;
      
      result.push(isLast); // BFINAL and BTYPE
      result.push(block.length & 0xff);
      result.push((block.length >> 8) & 0xff);
      result.push(~block.length & 0xff);
      result.push((~block.length >> 8) & 0xff);
      result.push(...block);
    }
    
    // Adler-32 checksum
    const adler = this.adler32(data);
    result.push(...this.int32ToBytes(adler));
    
    return result;
  }

  private adler32(data: number[]): number {
    let a = 1;
    let b = 0;
    for (const byte of data) {
      a = (a + byte) % 65521;
      b = (b + a) % 65521;
    }
    return (b << 16) | a;
  }

  private arrayToBase64(array: Uint8Array): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    
    for (let i = 0; i < array.length; i += 3) {
      const a = array[i];
      const b = i + 1 < array.length ? array[i + 1] : 0;
      const c = i + 2 < array.length ? array[i + 2] : 0;
      
      const bitmap = (a << 16) | (b << 8) | c;
      
      result += chars[(bitmap >> 18) & 0x3f];
      result += chars[(bitmap >> 12) & 0x3f];
      result += i + 1 < array.length ? chars[(bitmap >> 6) & 0x3f] : '=';
      result += i + 2 < array.length ? chars[bitmap & 0x3f] : '=';
    }
    
    return result;
  }
}

// Helper function to generate QR code
export function generateQRCode(
  url: string,
  errorCorrection: ErrorCorrectionLevel = ErrorCorrectionLevel.M
): QRCode {
  return new QRCode(url, errorCorrection);
}

