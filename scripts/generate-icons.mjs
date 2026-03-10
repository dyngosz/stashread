import sharp from "sharp";
import { readFileSync } from "fs";
import { mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const svgPath = join(repoRoot, "src/assets/icons/icon.svg");
const outDir = join(repoRoot, "public/icons");

const sizes = [16, 32, 48, 96, 128];
const svgBuffer = readFileSync(svgPath);

await mkdir(outDir, { recursive: true });

for (const size of sizes) {
  const outPath = join(outDir, `icon-${size}.png`);
  await sharp(svgBuffer).resize(size, size).png().toFile(outPath);
  console.log(`Generated: icon-${size}.png`);
}
console.log("All icons generated.");
