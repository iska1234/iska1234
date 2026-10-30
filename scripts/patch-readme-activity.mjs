import fs from "node:fs";
const rm = fs.readFileSync("README.md", "utf8");
const start = rm.indexOf('## `$ git log --since="1 year ago"` · Activity');
const end = rm.indexOf("## `$ connect --socials`");
if (start < 0 || end < 0) {
  console.error("markers", start, end);
  process.exit(1);
}
const streak =
  "https://streak-stats.demolab.com/?user=iska1234&theme=dark&hide_border=true&ring=0ea5e9&fire=38bdf8&currStreakLabel=0ea5e9";
const mid = `## \`$ git log --since="1 year ago"\` · Activity

**Tu actividad es tuya.** Este heatmap = commits con author \`iska1234\` (privados incluidos) → **3,140** / 12 meses.
El calendario nativo de GitHub debajo del README usa otra regla y hoy marca **8** en [github.com/iska1234](https://github.com/iska1234) — no niega tu trabajo; solo no lo atribuye igual.

<p align="center">
  <a href="https://iska1234.github.io/iska1234/contrib.html" title="Interactive commit heatmap">
    <img src="assets/contrib-year.svg" width="900" alt="3,140 commits authored by iska1234 in the last year" />
  </a>
</p>

<p align="center"><sub><a href="https://iska1234.github.io/iska1234/contrib.html">Interactive tooltips</a></sub></p>

<p align="center">
  <img src="assets/shipping-year.svg" width="620" alt="Shipping activity last 12 months" />
</p>

<p align="center">
  <img src="assets/top-langs.svg" width="620" alt="Top languages" />
</p>

<p align="center">
  <img height="165" src="${streak}" alt="GitHub streak" />
</p>

<p align="center"><sub><code>signals: contrib_year · shipping_year · top_langs · streak</code></sub></p>

`;
fs.writeFileSync("README.md", rm.slice(0, start) + mid + rm.slice(end));
console.log("readme ok");
