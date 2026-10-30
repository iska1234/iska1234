import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
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

// GitHub dark contribution greens
const palette = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
const levels = (n) => (!n ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : n <= 12 ? 3 : 4);
const cell = 10;
const gap = 3;
const step = cell + gap;
const padL = 28;
const padT = 40;
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
const monthFull = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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
  const q =
    "query { viewer { contributionsCollection { contributionCalendar { totalContributions } } } }";
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
const width = padL + weeks * step + 16;
const height = padT + 7 * step + 40;
const font =
  "-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif";

let rects = "";
const htmlCells = [];
for (const day of days) {
  const week = Math.floor((day.time - week0) / (7 * 864e5));
  const x = padL + week * step;
  const y = padT + day.dow * step;
  const tip = tipText(day.key, day.n)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
  rects += `<rect class="day" x="${x}" y="${y}" width="${cell}" height="${cell}" rx="2" fill="${palette[day.level]}" data-date="${day.key}" data-count="${day.n}"><title>${tip}</title></rect>\n`;
  htmlCells.push({ ...day, week, tip: tipText(day.key, day.n) });
}

const monthLabels = [];
let lastM = -1;
for (const day of days) {
  const d = new Date(day.time);
  if (d.getUTCDate() > 7 || d.getUTCMonth() === lastM) continue;
  lastM = d.getUTCMonth();
  const week = Math.floor((day.time - week0) / (7 * 864e5));
  monthLabels.push(
    `<text x="${padL + week * step}" y="28" fill="#7d8590" font-family="${font}" font-size="12">${monthNames[d.getUTCMonth()]}</text>`
  );
}

const dowLabels = [
  [1, "Mon"],
  [3, "Wed"],
  [5, "Fri"],
]
  .map(
    ([dow, label]) =>
      `<text x="0" y="${padT + dow * step + 9}" fill="#7d8590" font-family="${font}" font-size="10">${label}</text>`
  )
  .join("\n");

const legend = [0, 1, 2, 3, 4]
  .map(
    (lv, i) =>
      `<rect x="${width - 118 + i * 13}" y="${height - 22}" width="10" height="10" rx="2" fill="${palette[lv]}"/>`
  )
  .join("");

const totalLabel = total.toLocaleString("en-US");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
  <title>${totalLabel} commits authored in the last year</title>
  <rect width="${width}" height="${height}" rx="6" fill="#0d1117" stroke="#30363d"/>
  <text x="12" y="18" fill="#e6edf3" font-family="${font}" font-size="14" font-weight="600">${totalLabel} commits authored in the last year</text>
  ${monthLabels.join("\n")}
  ${dowLabels}
  ${rects}
  <text x="12" y="${height - 12}" fill="#7d8590" font-family="${font}" font-size="11">API commits · GitHub calendar shows ${githubCalendarTotal}</text>
  <text x="${width - 148}" y="${height - 12}" fill="#7d8590" font-family="${font}" font-size="11">Less</text>
  ${legend}
  <text x="${width - 28}" y="${height - 12}" fill="#7d8590" font-family="${font}" font-size="11">More</text>
</svg>`;

fs.writeFileSync(path.join(assets, "contrib-year.svg"), svg);

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

const cellsHtml = htmlCells
  .map((d) => {
    const tip = d.tip.replace(/"/g, "&quot;");
    return `<button type="button" class="c l${d.level}" style="grid-column:${d.week + 2};grid-row:${d.dow + 2}" data-tip="${tip}" aria-label="${tip}"></button>`;
  })
  .join("\n");

const year = end.getUTCFullYear();
const years = [year, year - 1, year - 2, year - 3, year - 4];

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${totalLabel} commits authored in the last year</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; background: #010409; color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    padding: 32px 16px; display: grid; place-items: start center;
  }
  .wrap {
    width: min(980px, 100%);
    display: grid; grid-template-columns: 1fr 96px; gap: 16px; align-items: start;
  }
  @media (max-width: 720px) {
    .wrap { grid-template-columns: 1fr; }
    .years { flex-direction: row; flex-wrap: wrap; }
  }
  .card {
    background: #0d1117; border: 1px solid #30363d; border-radius: 6px; padding: 16px;
  }
  .head {
    display: flex; justify-content: space-between; align-items: center;
    gap: 12px; margin-bottom: 12px; flex-wrap: wrap;
  }
  .head h1 { margin: 0; font-size: 14px; font-weight: 400; color: #e6edf3; }
  .head h1 b { font-weight: 600; }
  .muted { color: #7d8590; font-size: 12px; }
  .grid {
    display: grid;
    grid-template-columns: 28px repeat(${weeks}, 11px);
    grid-template-rows: 16px repeat(7, 11px);
    gap: 3px; width: max-content; max-width: 100%; overflow: auto;
  }
  .m { font-size: 12px; color: #7d8590; align-self: end; line-height: 1; }
  .d { font-size: 9px; color: #7d8590; line-height: 11px; }
  .c {
    width: 10px; height: 10px; border: 0; padding: 0; border-radius: 2px;
    cursor: pointer; appearance: none; background: #161b22;
  }
  .c:hover, .c:focus-visible { outline: 1px solid #e6edf3; outline-offset: 1px; }
  .l0 { background: #161b22; }
  .l1 { background: #0e4429; }
  .l2 { background: #006d32; }
  .l3 { background: #26a641; }
  .l4 { background: #39d353; }
  .foot {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 12px; gap: 12px; flex-wrap: wrap;
  }
  .legend { display: flex; align-items: center; gap: 3px; color: #7d8590; font-size: 11px; }
  .legend i { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
  .years { display: flex; flex-direction: column; gap: 6px; }
  .years button {
    border: 0; background: transparent; color: #e6edf3; text-align: left;
    padding: 8px 12px; border-radius: 6px; font: 12px/1 inherit; cursor: default;
  }
  .years button.on { background: #1f6feb; font-weight: 600; }
  #tip {
    position: fixed; z-index: 50; pointer-events: none;
    transform: translate(-50%, calc(-100% - 10px));
    background: #161b22; color: #e6edf3; border: 1px solid #30363d;
    border-radius: 6px; padding: 8px 10px; font-size: 12px; line-height: 1.3;
    box-shadow: 0 8px 24px rgba(1,4,9,.45); opacity: 0; white-space: nowrap;
  }
  #tip.on { opacity: 1; }
  #tip:after {
    content: ""; position: absolute; left: 50%; bottom: -6px;
    transform: translateX(-50%);
    border: 6px solid transparent; border-top-color: #161b22;
  }
  .note { margin-top: 14px; color: #7d8590; font-size: 12px; max-width: 980px; }
  .note a { color: #2f81f7; }
</style>
</head>
<body>
  <div class="wrap">
    <section class="card" aria-label="Contribution graph">
      <div class="head">
        <h1><b>${totalLabel}</b> contributions in the last year</h1>
        <span class="muted">raw commits · GitHub calendar: ${githubCalendarTotal}</span>
      </div>
      <div class="grid" id="grid">
        <span></span>
        ${monthHtml.join("\n")}
        <span class="d" style="grid-row:3">Mon</span>
        <span class="d" style="grid-row:5">Wed</span>
        <span class="d" style="grid-row:7">Fri</span>
        ${cellsHtml}
      </div>
      <div class="foot">
        <span class="muted">Learn how we count contributions</span>
        <span class="legend">Less
          <i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i>
          More</span>
      </div>
    </section>
    <aside class="years" aria-label="Year">
      ${years
        .map(
          (y, i) =>
            `<button type="button" class="${i === 0 ? "on" : ""}"${i === 0 ? "" : ' disabled title="Only current year data generated"'}>${y}</button>`
        )
        .join("\n")}
    </aside>
  </div>
  <p class="note">
    Numbers = commits via API (author=iska1234), NOT GitHub’s contribution score. Official profile calendar currently
    (below the README) only fills after you verify commit email + enable private contributions —
    that one has native tooltips with no extra page.
  </p>
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
  `<!doctype html><meta http-equiv="refresh" content="0;url=contrib.html"><a href="contrib.html">contrib</a>`
);

console.log(
  JSON.stringify({
    total,
    activeDays,
    weeks,
    tipSample: tipText("2026-04-10", 92),
  })
);
