// Measures every image under public/projects (PNG, JPEG, GIF, SVG) and writes src/lib/cover-sizes.json
// ({ "/projects/<slug>/<file>": [width, height] }), so project cards can tell a
// cover shaped like the card (fills it edge to edge) from a phone screenshot or
// a square image (kept whole inside a padded frame). Runs before every build;
// run it by hand after adding images: npm run -s covers:measure
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const PUBLIC = join(process.cwd(), "public");
const OUT = join(process.cwd(), "src/lib/cover-sizes.json");

function size(buf: Buffer): [number, number] | null {
  // PNG: width and height are big-endian at bytes 16 and 20 of the IHDR chunk
  if (buf.readUInt32BE(0) === 0x89504e47) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  // GIF: little-endian logical screen size at bytes 6 and 8
  if (buf.toString("ascii", 0, 3) === "GIF") return [buf.readUInt16LE(6), buf.readUInt16LE(8)];
  // JPEG: walk the segments to the first start-of-frame marker
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      const length = buf.readUInt16BE(i + 2);
      const isFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isFrame) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      i += 2 + length;
    }
  }
  // SVG: width and height attributes, or the viewBox
  const head = buf.toString("utf-8", 0, Math.min(buf.length, 2048));
  if (head.includes("<svg")) {
    const w = head.match(/<svg[^>]*\swidth="(\d+(?:\.\d+)?)"/);
    const h = head.match(/<svg[^>]*\sheight="(\d+(?:\.\d+)?)"/);
    if (w && h) return [Number(w[1]), Number(h[1])];
    const vb = head.match(/viewBox="[\d.-]+\s+[\d.-]+\s+([\d.]+)\s+([\d.]+)"/);
    if (vb) return [Number(vb[1]), Number(vb[2])];
  }
  return null;
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const sizes: Record<string, [number, number]> = {};
const ROOT = join(PUBLIC, "projects");
for (const file of existsSync(ROOT) ? walk(ROOT).sort() : []) {
  if (!/\.(png|jpe?g|gif|svg)$/i.test(file)) continue;
  const dims = size(readFileSync(file));
  if (dims) sizes["/" + relative(PUBLIC, file).split("\\").join("/")] = dims;
}
writeFileSync(OUT, JSON.stringify(sizes, null, 2) + "\n");
console.log(`Measured ${Object.keys(sizes).length} images into src/lib/cover-sizes.json`);
