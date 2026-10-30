import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const assets = path.join(root, "assets");
const docs = path.join(root, "docs");
fs.mkdirSync(docs, { recursive: true });

const data = JSON.parse(
  fs.readFileSync(path.join(assets, "contrib-year.json"), "utf8")
);
const counts = data.counts || {};

const end = new Date();
end.setUTCHours(0, 0, 0, 0);
const start = new Date(end);
start.setUTCDate(start.getUTCDate() - 364);
while (start.getUTCDay() !== 0) start.setUTCDate(start.getUTCDate() - 1);

const levels = (n) => (!n ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : 4);
const palette = ["#161b22", "#0e3a5a", "#0369a1", "#0ea5e9", "#7dd3fc"];
const cell = 11;
const gap = 3;
const step = cell + gap;
const padL = 36;
const padT = 48;
const week0 = start.getTime();
const weeks = Math.ceil((end - start) / 864e5 / 7) + 1;
const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const fmt = (key, n) => {
  const d = new Date(`${key}T12:00:00Z`);
  const label = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  if (!n) return `No commits on ${label}`;
  return `${n} commit${n === 1 ? "" : "s"} on ${label}`;
};

const days = [];
for (let t = start.getTime(); t <= end.getTime(); t += 864e5) {
  const d = new Date(t);
  const key = d.toISOString().slice(0, 10);
  const n = counts[key] || 0;
  days.push({ key, n, level: levels(n), dow: d.getUTCDay(), time: t });
}

let rects = "";
const activeCells = [];
const htmlCells = [];
for (const day of days) {
  const week = Math.floor((day.time - week0) / (7 * 864e5));
  const x = padL + week * step;
  const y = padT + day.dow * step;
  const tip = fmt(day.key, day.n)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
  rects += `<rect class="day" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${palette[day.level]}" data-date="${day.key}" data-count="${day.n}"><title>${tip}</title></rect>\n`;
  if (day.n > 0) activeCells.push({ x: x + cell / 2, y: y + cell / 2 });
  htmlCells.push({ ...day, week, tip: fmt(day.key, day.n) });
}

const monthLabels = [];
let lastM = -1;
for (const day of days) {
  const d = new Date(day.time);
  if (d.getUTCDate() > 7 || d.getUTCMonth() === lastM) continue;
  lastM = d.getUTCMonth();
  const week = Math.floor((day.time - week0) / (7 * 864e5));
  monthLabels.push(
    `<text x="${padL + week * step}" y="36" fill="#64748b" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="11">${monthNames[d.getUTCMonth()]}</text>`
  );
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

let anim = "";
if (activeCells.length > 1) {
  const dur = Math.min(24, Math.max(8, activeCells.length * 0.15));
  const path = `M${activeCells[0].x},${activeCells[0].y} ${activeCells
    .slice(1)
    .map((c) => `L${c.x},${c.y}`)
    .join(" ")}`;
  anim = `
  <circle r="3.5" fill="#f0f9ff" opacity="0.95"><animateMotion dur="${dur}s" repeatCount="indefinite" path="${path}"/></circle>
  <circle r="8" fill="#0ea5e9" opacity="0.25"><animateMotion dur="${dur}s" repeatCount="indefinite" path="${path}"/></circle>`;
}

const legend = [0, 1, 2, 3, 4]
  .map(
    (lv, i) =>
      `<rect x="${width - 140 + i * 14}" y="${height - 28}" width="11" height="11" rx="2" fill="${palette[lv]}"/>`
  )
  .join("");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
  <title>iska1234 commits · ${total} in last year (public + private)</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <style><![CDATA[
      .day { cursor: help; }
      .day:hover { stroke: #f0f9ff; stroke-width: 1.5; }
    ]]></style>
  </defs>
  <rect width="${width}" height="${height}" rx="16" fill="url(#bg)" stroke="#1e293b"/>
  <text x="16" y="22" fill="#e2e8f0" font-family="ui-sans-serif,system-ui,sans-serif" font-size="15" font-weight="700">Contribution grid · custom</text>
  <text x="16" y="${height - 18}" fill="#64748b" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="11">${total} commits · ${activeDays} active days · private included · hover a cell</text>
  ${monthLabels.join("\n")}
  ${dowLabels}
  ${rects}
  ${anim}
  <text x="${width - 168}" y="${height - 18}" fill="#475569" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="10">Less</text>
  ${legend}
  <text x="${width - 28}" y="${height - 18}" fill="#475569" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="10">More</text>
</svg>`;

fs.writeFileSync(path.join(assets, "contrib-year.svg"), svg);

const cellsHtml = htmlCells
  .map((d) => {
    const tip = d.tip.replace(/"/g, "&quot;");
    return `<button class="c l${d.level}" style="grid-column:${d.week + 2};grid-row:${d.dow + 2}" data-tip="${tip}" aria-label="${tip}"></button>`;
  })
  .join("\n");

const monthHtml = [];
lastM = -1;
for (const day of days) {
  const d = new Date(day.time);
  if (d.getUTCDate() > 7 || d.getUTCMonth() === lastM) continue;
  lastM = d.getUTCMonth();
  const week = Math.floor((day.time - week0) / (7 * 864e5));
  monthHtml.push(
    `<span class="m" style="grid-column:${week + 2}">${monthNames[d.getUTCMonth()]}</span>`
  );
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>iska1234 · contribution grid</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    background: #020617; color: #e2e8f0;
    font-family: ui-sans-serif, system-ui, Segoe UI, sans-serif; padding: 24px;
  }
  .card {
    background: linear-gradient(135deg, #0b1220, #111827);
    border: 1px solid #1e293b; border-radius: 16px; padding: 20px;
    max-width: 920px; width: 100%;
  }
  h1 { margin: 0 0 4px; font-size: 18px; }
  .sub {
    margin: 0 0 16px; color: #64748b;
    font: 12px/1.4 ui-monospace, Menlo, Consolas, monospace;
  }
  .grid {
    display: grid;
    grid-template-columns: 28px repeat(${weeks}, 12px);
    grid-template-rows: 18px repeat(7, 12px);
    gap: 3px; width: max-content; max-width: 100%;
    overflow: auto; padding-bottom: 8px;
  }
  .m {
    font: 10px/1 ui-monospace, Menlo, Consolas, monospace;
    color: #64748b; align-self: end;
  }
  .d {
    font: 10px/12px ui-monospace, Menlo, Consolas, monospace;
    color: #475569;
  }
  .c {
    width: 11px; height: 11px; border: 0; padding: 0;
    border-radius: 2px; cursor: pointer; appearance: none;
  }
  .c:hover, .c:focus-visible {
    outline: 1.5px solid #f0f9ff; outline-offset: 1px; z-index: 1;
  }
  .l0 { background: #161b22; }
  .l1 { background: #0e3a5a; }
  .l2 { background: #0369a1; }
  .l3 { background: #0ea5e9; }
  .l4 { background: #7dd3fc; }
  .foot {
    display: flex; justify-content: space-between; gap: 12px;
    align-items: center; margin-top: 14px; color: #64748b;
    font: 11px/1.4 ui-monospace, Menlo, Consolas, monospace; flex-wrap: wrap;
  }
  .legend { display: flex; align-items: center; gap: 4px; }
  .legend i {
    width: 11px; height: 11px; border-radius: 2px; display: inline-block;
  }
  #tip {
    position: fixed; pointer-events: none; z-index: 50;
    transform: translate(-50%, calc(-100% - 10px));
    background: #0f172a; color: #f8fafc; border: 1px solid #334155;
    border-radius: 8px; padding: 8px 10px;
    font: 12px/1.35 ui-monospace, Menlo, Consolas, monospace;
    box-shadow: 0 10px 30px rgba(0,0,0,.45);
    opacity: 0; transition: opacity .08s ease; white-space: nowrap;
  }
  #tip.on { opacity: 1; }
  #tip:after {
    content: ""; position: absolute; left: 50%; bottom: -6px;
    transform: translateX(-50%);
    border: 6px solid transparent; border-top-color: #0f172a;
  }
  a { color: #7dd3fc; }
</style>
</head>
<body>
  <div class="card">
    <h1>Contribution grid · interactive</h1>
    <p class="sub">${total} commits · ${activeDays} active days · private included · hover any day</p>
    <div class="grid" id="grid">
      <span></span>
      ${monthHtml.join("\n")}
      <span class="d" style="grid-row:3">Mon</span>
      <span class="d" style="grid-row:5">Wed</span>
      <span class="d" style="grid-row:7">Fri</span>
      ${cellsHtml}
    </div>
    <div class="foot">
      <span>Generated ${data.generatedAt || ""}</span>
      <span class="legend">Less
        <i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i>
        More</span>
    </div>
    <p class="sub" style="margin-top:12px">
      GitHub README embeds SVG as &lt;img&gt; (no cell hover). This page = real tooltips.
    </p>
  </div>
  <div id="tip" role="tooltip"></div>
  <script>
    const tip = document.getElementById("tip");
    const grid = document.getElementById("grid");
    function show(e) {
      const t = e.target.getAttribute("data-tip");
      if (!t) return;
      tip.textContent = t;
      tip.classList.add("on");
      move(e);
    }
    function move(e) {
      tip.style.left = e.clientX + "px";
      tip.style.top = e.clientY + "px";
    }
    function hide() { tip.classList.remove("on"); }
    grid.addEventListener("pointerover", (e) => {
      if (e.target.classList.contains("c")) show(e);
    });
    grid.addEventListener("pointermove", (e) => {
      if (e.target.classList.contains("c")) move(e);
    });
    grid.addEventListener("pointerout", (e) => {
      if (e.target.classList.contains("c")) hide();
    });
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(docs, "contrib.html"), html);
fs.writeFileSync(
  path.join(docs, "index.html"),
  `<!doctype html><meta http-equiv="refresh" content="0; url=contrib.html"><a href="contrib.html">contrib</a>`
);

console.log(JSON.stringify({ total, activeDays, weeks, ok: true }));
