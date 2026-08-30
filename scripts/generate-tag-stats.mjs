import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const blogDir = path.join(root, "src/content/blog");
const outFile = path.join(root, "public/admin/tag-stats.json");

function extractTags(fm) {
  const tags = [];
  const block = fm.match(/^tags:\s*\n((?:[ \t]*-[ \t]*.+\n?)*)/m);
  if (block) {
    for (const line of block[1].split("\n")) {
      const m = line.match(/^[ \t]*-[ \t]*(.+?)\s*$/);
      if (!m) continue;
      const name = m[1].replace(/^["']|["']$/g, "").trim();
      if (name) tags.push(name);
    }
    return tags;
  }
  const inline = fm.match(/^tags:\s*\[([^\]]*)\]/m);
  if (inline) {
    for (const part of inline[1].split(",")) {
      const name = part.replace(/^["'\s]+|["'\s]+$/g, "").trim();
      if (name) tags.push(name);
    }
  }
  return tags;
}

function main() {
  const counts = new Map();
  if (fs.existsSync(blogDir)) {
    for (const file of fs.readdirSync(blogDir)) {
      if (!file.endsWith(".md")) continue;
      const text = fs.readFileSync(path.join(blogDir, file), "utf8");
      const fm = text.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue;
      for (const tag of extractTags(fm[1])) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
  }

  const tags = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko"));

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), tags }, null, 2) + "\n");
  console.log(`tag-stats: ${tags.length} tags → ${path.relative(root, outFile)}`);
}

main();
