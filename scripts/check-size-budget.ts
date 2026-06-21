import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

type Budget = {
  name: string;
  path: string;
  maxBytes: number;
};

const distDir = join(process.cwd(), "dist", "client");
const budgets: Budget[] = [
  { name: "news.json", path: "generated/news.json", maxBytes: 1_200_000 },
  { name: "places.json", path: "generated/places.json", maxBytes: 1_300_000 },
  { name: "search-index.json", path: "generated/search-index.json", maxBytes: 1_500_000 }
];
const maxJsChunkBytes = 230_000;
const maxTotalJsBytes = 460_000;

async function main(): Promise<void> {
  const errors: string[] = [];

  for (const budget of budgets) {
    const size = await fileSize(join(distDir, budget.path));
    if (size > budget.maxBytes) {
      errors.push(`${budget.name} is ${formatBytes(size)}; budget is ${formatBytes(budget.maxBytes)}`);
    }
  }

  const jsFiles = await listFiles(join(distDir, "assets"), ".js");
  const jsSizes = await Promise.all(jsFiles.map(async (path) => ({ path, size: await fileSize(path) })));
  const totalJsBytes = jsSizes.reduce((total, item) => total + item.size, 0);

  jsSizes.forEach((item) => {
    if (item.size > maxJsChunkBytes) {
      errors.push(`${relativePath(item.path)} is ${formatBytes(item.size)}; chunk budget is ${formatBytes(maxJsChunkBytes)}`);
    }
  });

  if (totalJsBytes > maxTotalJsBytes) {
    errors.push(`total JS is ${formatBytes(totalJsBytes)}; budget is ${formatBytes(maxTotalJsBytes)}`);
  }

  if (errors.length > 0) {
    throw new Error(`size budget failed:\n${errors.join("\n")}`);
  }

  console.log(
    `size budget passed: ${jsSizes.length} JS chunks, ${formatBytes(totalJsBytes)} total JS`
  );
}

async function listFiles(dir: string, extension: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return listFiles(path, extension);
      }
      return entry.isFile() && entry.name.endsWith(extension) ? [path] : [];
    })
  );

  return nested.flat();
}

async function fileSize(path: string): Promise<number> {
  return (await stat(path)).size;
}

function relativePath(path: string): string {
  return path.replace(`${distDir}/`, "");
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

void main();
