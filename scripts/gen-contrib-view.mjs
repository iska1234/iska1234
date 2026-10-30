import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const assets = path.join(root, "assets");
const docs = path.join(root, "docs");
fs.mkdirSync(docs, { recursive: true });

const data = JSON.parse(fs.readFileSync(path.join(assets, "contrib-year.json"), "utf8"));
const counts = data.counts || {};

const end = new Date();
end.setUTCHours(0, 0, 0, 0);
const start = new Date(end);
start.setUTCDate(start.getUTCDate() - 364);
while (start.getUTCDay() !== 0) start.setUTCDate(start.getUTCDate() - 1);

// SS Digital Labs brand scale (navy → deep → primary → mid → bright)
const palette = ["#132337", "#0031c5", "#037bdc", "#2d5bcb", "#07bef3"];
const levels = (n) => (!n ? 0 : n <= 2 ? 1 : n <= 6 ? 2 : n <= 14 ? 3 : 4);
const cell = 11;
const gap = 3;
const step = cell + gap;
const padL = 32;
const padT = 52;
const week0 = start.getTime();
const weeks = Math.ceil((end - start) / 864e5 / 7) + 1;
const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthFull = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function tipText(key, n) {
  const d = new Date(`${key}T12:00:00Z`);
  const label = `${monthFull[d.getUTCMonth()]} ${ordinal(d.getUTCDate())}`;
  if (!n) return `No commits on ${label}.`;
  return `${n.toLocaleString("en-US")} commit${n === 1 ? "" : "s"} on ${label}.`;
}

const days = [];
for (let t = start.getTime(); t <= end.getTime(); t += 864e5) {
  const d = new Date(t);
  const key = d.toISOString().slice(0, 10);
  const n = counts[key] || 0;
  days.push({ key, n, level: levels(n), dow: d.getUTCDay(), time: t });
}

const total = Object.values(counts).reduce((a, b) => a + b, 0);
let githubCalendarTotal = 0;
try {
  const q = "query { viewer { contributionsCollection { contributionCalendar { totalContributions } } } }";
  githubCalendarTotal = Number(
    execSync(
      `gh api graphql -f query=${JSON.stringify(q)} --jq .data.viewer.contributionsCollection.contributionCalendar.totalContributions`,
      { encoding: "utf8", shell: true }
    ).trim()
  );
} catch {
  githubCalendarTotal = Number(process.env.GH_CALENDAR_TOTAL || 0);
}

const activeDays = Object.keys(counts).length;
const width = padL + weeks * step + 20;
const height = padT + 7 * step + 44;
const font = "ui-sans-serif,system-ui,Segoe UI,Helvetica,Arial,sans-serif";

let rects = "";
const activeCells = [];
const htmlCells = [];
for (const day of days) {
  const week = Math.floor((day.time - week0) / (7 * 864e5));
  const x = padL + week * step;
  const y = padT + day.dow * step;
  const tip = tipText(day.key, day.n).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const stroke = day.level === 0 ? ' stroke="#1e3a5f" stroke-width="0.75"' : "";
  rects += `<rect class="day" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2.5" fill="${palette[day.level]}"${stroke} data-date="${day.key}" data-count="${day.n}"><title>${tip}</title></rect>\n`;
  if (day.n > 0) activeCells.push({ x: x + cell / 2, y: y + cell / 2 });
  htmlCells.push({ ...day, week, tip: tipText(day.key, day.n) });
}

const monthLabels = [];
let lastM = -1;
for (const day of days) {
  const d = new Date(day.time);
  if (d.getUTCDate() > 7 || d.getUTCMonth() === lastM) continue;
  lastM = d.getUTCMonth();
  const week = Math.floor((day.time - week0) / (7 * 864e5));
  monthLabels.push(`<text x="${padL + week * step}" y="34" fill="#94a3b8" font-family="${font}" font-size="12" font-weight="600">${monthNames[d.getUTCMonth()]}</text>`);
}
const dowLabels = [[1,"Mon"],[3,"Wed"],[5,"Fri"]]
  .map(([dow, label]) => `<text x="2" y="${padT + dow * step + 9}" fill="#94a3b8" font-family="${font}" font-size="11" font-weight="600">${label}</text>`)
  .join("\n");

const legend = [0,1,2,3,4].map((lv,i) => `<rect x="${width - 126 + i * 14}" y="${height - 24}" width="11" height="11" rx="2.5" fill="${palette[lv]}"${lv===0?' stroke="#1e3a5f" stroke-width="0.75"':''}/>`).join("");

let anim = "";
if (activeCells.length > 1) {
  // sample path for performance (every Nth active day) but keep chronological feel
  const stepN = Math.max(1, Math.floor(activeCells.length / 80));
  const pathCells = activeCells.filter((_, i) => i % stepN === 0 || i === activeCells.length - 1);
  const dur = Math.min(28, Math.max(10, pathCells.length * 0.18));
  const path = `M${pathCells[0].x},${pathCells[0].y} ${pathCells.slice(1).map((c) => `L${c.x},${c.y}`).join(" ")}`;
  anim = `
  <circle r="9" fill="#07bef3" opacity="0.22"><animateMotion dur="${dur}s" repeatCount="indefinite" path="${path}"/></circle>
  <circle r="4.2" fill="#e0f7ff" stroke="#037bdc" stroke-width="1.5"><animateMotion dur="${dur}s" repeatCount="indefinite" path="${path}"/></circle>`;
}

const totalLabel = total.toLocaleString("en-US");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
  <title>${totalLabel} commits authored in the last year</title>
  <defs>
    <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1a2b"/>
      <stop offset="100%" stop-color="#0f2744"/>
    </linearGradient>
    <style><![CDATA[
      .day { cursor: help; }
      .day:hover { stroke: #e0f7ff; stroke-width: 1.6; }
    ]]></style>
  </defs>
  <rect width="${width}" height="${height}" rx="12" fill="url(#card)" stroke="#037bdc" stroke-opacity="0.55"/>
  <text x="14" y="22" fill="#f8fafc" font-family="${font}" font-size="15" font-weight="700">${totalLabel} commits · last year</text>
  <text x="${width - 14}" y="22" text-anchor="end" fill="#07bef3" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="11">SS Digital Labs</text>
  ${monthLabels.join("\n")}
  ${dowLabels}
  ${rects}
  ${anim}
  <text x="14" y="${height - 12}" fill="#cbd5e1" font-family="${font}" font-size="11">iska1234 · private included · GitHub.com calendar: ${githubCalendarTotal}</text>
  <text x="${width - 150}" y="${height - 12}" fill="#94a3b8" font-family="${font}" font-size="11">Less</text>
  ${legend}
  <text x="${width - 26}" y="${height - 12}" fill="#94a3b8" font-family="${font}" font-size="11">More</text>
</svg>`;
fs.writeFileSync(path.join(assets, "contrib-year.svg"), svg);

const monthHtml = [];
lastM = -1;
for (const day of days) {
  const d = new Date(day.time);
  if (d.getUTCDate() > 7 || d.getUTCMonth() === lastM) continue;
  lastM = d.getUTCMonth();
  const week = Math.floor((day.time - week0) / (7 * 864e5));
  monthHtml.push(`<span class="m" style="grid-column:${week + 2}">${monthNames[d.getUTCMonth()]}</span>`);
}
const cellsHtml = htmlCells.map((d) => {
  const tip = d.tip.replace(/"/g, "&quot;");
  return `<button type="button" class="c l${d.level}" style="grid-column:${d.week + 2};grid-row:${d.dow + 2}" data-tip="${tip}" aria-label="${tip}"></button>`;
}).join("\n");

const year = end.getUTCFullYear();
const years = [year, year - 1, year - 2, year - 3, year - 4];

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${totalLabel} commits · SS Digital Labs</title>
<style>
:root{color-scheme:dark;--navy:#0b1a2b;--deep:#0031c5;--primary:#037bdc;--mid:#2d5bcb;--bright:#07bef3;--ink:#f8fafc;--muted:#94a3b8}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(1200px 600px at 20% -10%,#037bdc33,transparent),#020617;color:var(--ink);
font-family:ui-sans-serif,system-ui,Segoe UI,Helvetica,Arial,sans-serif;padding:32px 16px;display:grid;place-items:start center}
.wrap{width:min(980px,100%);display:grid;grid-template-columns:1fr 96px;gap:16px;align-items:start}
@media(max-width:720px){.wrap{grid-template-columns:1fr}.years{flex-direction:row;flex-wrap:wrap}}
.card{background:linear-gradient(145deg,#0b1a2b,#0f2744);border:1px solid color-mix(in srgb,var(--primary) 55%,#1e293b);border-radius:12px;padding:18px;box-shadow:0 0 0 1px #07bef322,0 20px 50px #0008}
.head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.head h1{margin:0;font-size:16px;font-weight:700}.head h1 b{color:var(--bright)}
.brand{color:var(--bright);font:600 12px/1 ui-monospace,Menlo,Consolas,monospace}
.grid{display:grid;grid-template-columns:32px repeat(${weeks},12px);grid-template-rows:18px repeat(7,12px);gap:3px;width:max-content;max-width:100%;overflow:auto}
.m{font-size:12px;color:var(--muted);align-self:end;font-weight:600}.d{font-size:11px;color:var(--muted);line-height:12px;font-weight:600}
.c{width:11px;height:11px;border:0;padding:0;border-radius:2.5px;cursor:pointer;appearance:none}
.c:hover,.c:focus-visible{outline:2px solid #e0f7ff;outline-offset:1px}
.l0{background:#132337;box-shadow:inset 0 0 0 .75px #1e3a5f}.l1{background:#0031c5}.l2{background:#037bdc}.l3{background:#2d5bcb}.l4{background:#07bef3}
.foot{display:flex;justify-content:space-between;align-items:center;margin-top:14px;gap:12px;flex-wrap:wrap;color:#cbd5e1;font-size:12px}
.legend{display:flex;align-items:center;gap:4px;color:var(--muted)}.legend i{width:11px;height:11px;border-radius:2.5px;display:inline-block}
.years{display:flex;flex-direction:column;gap:6px}
.years button{border:0;background:transparent;color:var(--ink);text-align:left;padding:8px 12px;border-radius:8px;font:12px/1 inherit;cursor:default}
.years button.on{background:var(--primary);font-weight:700}
#tip{position:fixed;z-index:50;pointer-events:none;transform:translate(-50%,calc(-100% - 10px));background:#0b1a2b;color:#f8fafc;border:1px solid var(--primary);border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.3;box-shadow:0 12px 30px #0009;opacity:0;white-space:nowrap}
#tip.on{opacity:1}#tip:after{content:"";position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);border:6px solid transparent;border-top-color:#0b1a2b}
.note{margin-top:14px;color:var(--muted);font-size:12px;max-width:980px}.note b{color:var(--bright)}
</style></head><body>
<div class="wrap">
<section class="card">
<div class="head"><h1><b>${totalLabel}</b> commits · last year</h1><span class="brand">SS Digital Labs</span></div>
<div class="grid" id="grid"><span></span>${monthHtml.join("\n")}
<span class="d" style="grid-row:3">Mon</span><span class="d" style="grid-row:5">Wed</span><span class="d" style="grid-row:7">Fri</span>
${cellsHtml}</div>
<div class="foot"><span>iska1234 · private included · GitHub.com calendar: ${githubCalendarTotal}</span>
<span class="legend">Less <i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> More</span></div>
</section>
<aside class="years">${years.map((y,i)=>`<button type="button" class="${i===0?"on":""}"${i===0?"":" disabled"}>${y}</button>`).join("\n")}</aside>
</div>
<p class="note">These are <b>your</b> commits (author=iska1234). Courier animation on the SVG README card. Hover tooltips here.</p>
<div id="tip" role="tooltip"></div>
<script>
const tip=document.getElementById("tip"),grid=document.getElementById("grid");
function show(e){const t=e.target.getAttribute("data-tip");if(!t)return;tip.textContent=t;tip.classList.add("on");move(e)}
function move(e){tip.style.left=e.clientX+"px";tip.style.top=e.clientY+"px"}
function hide(){tip.classList.remove("on")}
grid.addEventListener("pointerover",e=>{if(e.target.classList.contains("c"))show(e)});
grid.addEventListener("pointermove",e=>{if(e.target.classList.contains("c"))move(e)});
grid.addEventListener("pointerout",e=>{if(e.target.classList.contains("c"))hide()});
</script></body></html>`;
fs.writeFileSync(path.join(docs, "contrib.html"), html);
fs.writeFileSync(path.join(docs, "index.html"), `<!doctype html><meta http-equiv="refresh" content="0;url=contrib.html"><a href="contrib.html">contrib</a>`);
console.log(JSON.stringify({ total, activeDays, weeks, animPoints: activeCells.length, brand: true }));
