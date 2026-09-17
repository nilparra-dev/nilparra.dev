/**
 * Minimal PNG (RGBA, 8 bit, truecolour + alpha) writer.
 *
 * The project ships its own pixel art, so the build only needs to turn the
 * in-memory raster into a real PNG file; no third-party image library is
 * required for that.
 */
import zlib from 'node:zlib';

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}

export function encodePNG(canvas) {
  const { width, height, pixels } = canvas;
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < width; x += 1) {
      const hex = pixels[y * width + x];
      const offset = y * stride + 1 + x * 4;
      if (!hex) continue; // transparent
      const value = parseInt(hex.slice(1), 16);
      raw[offset] = (value >> 16) & 0xff;
      raw[offset + 1] = (value >> 8) & 0xff;
      raw[offset + 2] = value & 0xff;
      raw[offset + 3] = 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Nearest-neighbour integer scale, used to inspect art and to export @2x sheets. */
export function scaleUp(canvas, factor) {
  const out = {
    width: canvas.width * factor,
    height: canvas.height * factor,
    pixels: new Array(canvas.width * factor * canvas.height * factor).fill(null),
  };
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const value = canvas.pixels[y * canvas.width + x];
      for (let dy = 0; dy < factor; dy += 1) {
        for (let dx = 0; dx < factor; dx += 1) {
          out.pixels[(y * factor + dy) * out.width + (x * factor + dx)] = value;
        }
      }
    }
  }
  return out;
}

/** Paste `source` onto `target` at (x, y), skipping transparent pixels. */
export function blit(target, source, x, y, factor = 1) {
  for (let sy = 0; sy < source.height; sy += 1) {
    for (let sx = 0; sx < source.width; sx += 1) {
      const value = source.pixels[sy * source.width + sx];
      if (!value) continue;
      for (let dy = 0; dy < factor; dy += 1) {
        for (let dx = 0; dx < factor; dx += 1) {
          const px = x + sx * factor + dx;
          const py = y + sy * factor + dy;
          if (px < 0 || py < 0 || px >= target.width || py >= target.height) continue;
          target.pixels[py * target.width + px] = value;
        }
      }
    }
  }
}
