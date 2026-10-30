import { execSync } from "node:child_process";
import fs from "node:fs";

let page = 1;
let repos = [];
for (;;) {
  const chunk = JSON.parse(
    execSync(`gh api "user/repos?per_page=100&page=${page}"`, { encoding: "utf8" })
  );
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
const names = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
  "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

const chartW = 540;
const gap = 8;
const barW = Math.floor((chartW - (months.length - 1) * gap) / months.length);
let x = 40;
let bars = "";
for (const m of months) {
  const h = Math.max(10, Math.round((120 * byMonth[m]) / maxN));
  const yy = 175 - h;
  const op = (0.45 + 0.55 * (byMonth[m] / maxN)).toFixed(2);
  bars += `<rect x="${x}" y="${yy}" width="${barW}" height="${h}" rx="5" fill="url(#bar)" opacity="${op}"/>\n`;
  bars += `<text x="${x + barW / 2}" y="193" text-anchor="middle" fill="#64748b" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="10">${names[m.slice(5)]}</text>\n`;
  bars += `<text x="${x + barW / 2}" y="${yy - 6}" text-anchor="middle" fill="#7dd3fc" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="10">${byMonth[m]}</text>\n`;
  x += barW + gap;
}

const priv = active.filter((r) => r.private).length;
const pub = active.length - priv;
let listY = 230;
let list = "";
for (const r of active.slice(0, 8)) {
  const tag = (r.private ? "private" : "public").padEnd(7);
  const col = r.private ? "#38bdf8" : "#86efac";
  const name = String(r.name).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const when = new Date(r.pushed_at).toISOString().slice(0, 10);
  list += `<text x="40" y="${listY}" fill="#cbd5e1" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="12"><tspan fill="${col}">${tag}</tspan>  ${name}<tspan fill="#475569">  · ${when}</tspan></text>\n`;
  listY += 20;
}

const h = listY + 28;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="${h}" viewBox="0 0 620 ${h}" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0b1220"/><stop offset="100%" stop-color="#111827"/></linearGradient>
    <linearGradient id="bar" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#0369a1"/><stop offset="100%" stop-color="#38bdf8"/></linearGradient>
  </defs>
  <rect width="620" height="${h}" rx="16" fill="url(#bg)" stroke="#1e293b"/>
  <text x="40" y="34" fill="#e2e8f0" font-family="ui-sans-serif,system-ui,sans-serif" font-size="16" font-weight="700">Shipping · last 12 months</text>
  <text x="40" y="54" fill="#64748b" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="11">${active.length} repos · ${priv} private · ${pub} public · real push dates</text>
${bars}
  <text x="40" y="218" fill="#94a3b8" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12" font-weight="600">Recent pushes</text>
${list}
</svg>`;

fs.writeFileSync("assets/shipping-year.svg", svg);
console.log(JSON.stringify({ active: active.length, priv, pub, months: months.length, barW }));
