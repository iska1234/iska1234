import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "assets");

let page = 1;
let repos = [];
for (;;) {
  const raw = execSync(`gh api "user/repos?per_page=100&page=${page}"`, {
    encoding: "utf8",
  });
  const chunk = JSON.parse(raw);
  if (!chunk.length) break;
  repos = repos.concat(chunk);
  if (chunk.length < 100) break;
  page += 1;
}

const own = repos.filter((r) => !r.fork);
const since = Date.now() - 365 * 24 * 3600 * 1000;
const active = own
  .filter((r) => r.pushed_at && Date.parse(r.pushed_at) >= since)
  .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at));

const byMonth = {};
for (const r of active) {
  const d = new Date(r.pushed_at);
  const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  byMonth[k] = (byMonth[k] || 0) + 1;
}
const months = Object.keys(byMonth).sort();
const maxN = Math.max(1, ...Object.values(byMonth));

let x = 50;
let bars = "";
for (const m of months) {
  const h = Math.max(8, Math.round((110 * byMonth[m]) / maxN));
  const yy = 160 - h;
  const label = m.slice(5);
  bars += `<rect x="${x}" y="${yy}" width="28" height="${h}" rx="4" fill="#0ea5e9"/>\n`;
  bars += `<text x="${x + 14}" y="178" text-anchor="middle" fill="#64748b" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="10">${label}</text>\n`;
  x += 40;
}

const priv = active.filter((r) => r.private).length;
const pub = active.length - priv;
let listY = 210;
let list = "";
for (const r of active.slice(0, 8)) {
  const tag = r.private ? "private" : "public ";
  const name = String(r.name)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  list += `<text x="40" y="${listY}" fill="#94a3b8" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="12"><tspan fill="#0ea5e9">[${tag}]</tspan>  ${name}</text>\n`;
  listY += 20;
}

const h = listY + 24;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="${h}" viewBox="0 0 620 ${h}" role="img">
  <rect width="620" height="${h}" rx="16" fill="#0b1220" stroke="#1e293b"/>
  <text x="40" y="36" fill="#7dd3fc" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="14">$ shipping --since 1y</text>
  <text x="40" y="54" fill="#64748b" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="11">${active.length} repos touched · ${priv} private · ${pub} public</text>
${bars}
  <text x="40" y="200" fill="#e2e8f0" font-family="ui-sans-serif,system-ui,sans-serif" font-size="13" font-weight="700">Recent pushes</text>
${list}
</svg>`;

fs.writeFileSync(path.join(root, "shipping-year.svg"), svg);
console.log(JSON.stringify({ repos: own.length, active: active.length, priv, pub, months }));
