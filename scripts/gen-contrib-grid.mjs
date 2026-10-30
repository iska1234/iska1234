import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "assets");
const OUT = path.join(root, "contrib-year.svg");

function gh(cmd) {
  return execSync(`gh ${cmd}`, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
}

function listRepos() {
  let page = 1;
  let repos = [];
  for (;;) {
    const chunk = JSON.parse(gh(`api "user/repos?per_page=100&page=${page}&affiliation=owner,collaborator,organization_member"`));
    if (!chunk.length) break;
    repos = repos.concat(chunk);
    if (chunk.length < 100) break;
    page += 1;
  }
  return repos.filter((r) => !r.fork && !r.archived);
}

function commitsForRepo(fullName, sinceIso) {
  const days = {};
  let page = 1;
  try {
    for (;;) {
      // author filter uses GitHub login; also pulls co-authored when attributed
      const q = `api "repos/${fullName}/commits?author=iska1234&since=${encodeURIComponent(sinceIso)}&per_page=100&page=${page}"`;
      let raw;
      try {
        raw = gh(q);
      } catch {
        break;
      }
      const chunk = JSON.parse(raw);
      if (!Array.isArray(chunk) || !chunk.length) break;
      for (const c of chunk) {
        const d = (c.commit?.author?.date || c.commit?.committer?.date || "").slice(0, 10);
        if (!d) continue;
        days[d] = (days[d] || 0) + 1;
      }
      if (chunk.length < 100) break;
      page += 1;
      if (page > 5) break; // cap per repo
    }
  } catch {
    /* skip inaccessible */
  }
  return days;
}

const end = new Date();
end.setUTCHours(0, 0, 0, 0);
const start = new Date(end);
start.setUTCDate(start.getUTCDate() - 364);
// align to Sunday (GitHub-style)
while (start.getUTCDay() !== 0) start.setUTCDate(start.getUTCDate() - 1);
const sinceIso = start.toISOString();

const repos = listRepos();
const sinceMs = start.getTime();
const candidates = repos
  .filter((r) => r.pushed_at && Date.parse(r.pushed_at) >= sinceMs - 7 * 864e5)
  .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at));

console.log(`repos=${repos.length} candidates=${candidates.length}`);

const counts = {};
let scanned = 0;
for (const r of candidates) {
  const partial = commitsForRepo(r.full_name, sinceIso);
  for (const [d, n] of Object.entries(partial)) counts[d] = (counts[d] || 0) + n;
  scanned += 1;
  if (scanned % 15 === 0) console.log(`scanned ${scanned}/${candidates.length}`);
}

const levels = (n) => {
  if (!n) return 0;
  if (n === 1) return 1;
  if (n <= 3) return 2;
  if (n <= 6) return 3;
  return 4;
};

const palette = ["#161b22", "#0e3a5a", "#0369a1", "#0ea5e9", "#7dd3fc"];
const cell = 11;
const gap = 3;
const step = cell + gap;
const padL = 36;
const padT = 48;
const weeks = Math.ceil((end - start) / 864e5 / 7) + 1;

const days = [];
for (let t = start.getTime(); t <= end.getTime(); t += 864e5) {
  const d = new Date(t);
  const key = d.toISOString().slice(0, 10);
  const n = counts[key] || 0;
  days.push({ key, n, level: levels(n), dow: d.getUTCDay(), time: t });
}

const week0 = start.getTime();
let rects = "";
const activeCells = [];
for (const day of days) {
  const week = Math.floor((day.time - week0) / (7 * 864e5));
  const x = padL + week * step;
  const y = padT + day.dow * step;
  rects += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${palette[day.level]}" data-date="${day.key}" data-count="${day.n}"/>\n`;
  if (day.n > 0) activeCells.push({ x: x + cell / 2, y: y + cell / 2, n: day.n, key: day.key });
}

const monthLabels = [];
let lastM = -1;
for (const day of days) {
  const d = new Date(day.time);
  if (d.getUTCDate() > 7) continue;
  if (d.getUTCMonth() === lastM) continue;
  lastM = d.getUTCMonth();
  const week = Math.floor((day.time - week0) / (7 * 864e5));
  const names = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  monthLabels.push(`<text x="${padL + week * step}" y="36" fill="#64748b" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="11">${names[d.getUTCMonth()]}</text>`);
}

const dowLabels = [
  [1, "Mon"],
  [3, "Wed"],
  [5, "Fri"],
]
  .map(
    ([dow, label]) =>
      `<text x="8" y="${padT + dow * step + 9}" fill="#475569" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="10">${label}</text>`
  )
  .join("\n");

const total = Object.values(counts).reduce((a, b) => a + b, 0);
const activeDays = Object.keys(counts).length;
const width = padL + weeks * step + 24;
const height = padT + 7 * step + 56;

// subtle courier / snake: pulse along active cells in chronological order
let anim = "";
if (activeCells.length > 1) {
  const pts = activeCells.map((c) => `${c.x},${c.y}`).join(" ");
  anim = `
  <circle r="3.5" fill="#f0f9ff" opacity="0.95">
    <animateMotion dur="${Math.min(24, Math.max(8, activeCells.length * 0.15))}s" repeatCount="indefinite" path="M${activeCells[0].x},${activeCells[0].y} ${activeCells.slice(1).map((c) => `L${c.x},${c.y}`).join(" ")}"/>
  </circle>
  <circle r="8" fill="#0ea5e9" opacity="0.25">
    <animateMotion dur="${Math.min(24, Math.max(8, activeCells.length * 0.15))}s" repeatCount="indefinite" path="M${activeCells[0].x},${activeCells[0].y} ${activeCells.slice(1).map((c) => `L${c.x},${c.y}`).join(" ")}"/>
  </circle>`;
}

const legend = [0, 1, 2, 3, 4]
  .map((lv, i) => `<rect x="${width - 140 + i * 14}" y="${height - 28}" width="11" height="11" rx="2" fill="${palette[lv]}"/>`)
  .join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Custom contribution grid">
  <title>iska1234 commits · ${total} in last year (public + private)</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="16" fill="url(#bg)" stroke="#1e293b"/>
  <text x="16" y="22" fill="#e2e8f0" font-family="ui-sans-serif,system-ui,sans-serif" font-size="15" font-weight="700">Contribution grid · custom</text>
  <text x="16" y="${height - 18}" fill="#64748b" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="11">${total} commits · ${activeDays} active days · private included · SS Digital Labs</text>
  ${monthLabels.join("\n")}
  ${dowLabels}
  ${rects}
  ${anim}
  <text x="${width - 168}" y="${height - 18}" fill="#475569" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="10">Less</text>
  ${legend}
  <text x="${width - 28}" y="${height - 18}" fill="#475569" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="10">More</text>
</svg>`;

fs.writeFileSync(OUT, svg);
fs.writeFileSync(
  path.join(root, "contrib-year.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), total, activeDays, scanned, counts }, null, 2)
);
console.log(JSON.stringify({ total, activeDays, scanned, weeks, width, height, out: OUT }));
