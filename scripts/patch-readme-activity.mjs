import fs from "node:fs";
const rm = fs.readFileSync("README.md", "utf8");
const start = rm.indexOf('## `$ git log --since="1 year ago"` · Activity');
const end = rm.indexOf("## `$ connect --socials`");
if (start < 0 || end < 0) { console.error(start, end); process.exit(1); }
const streak = "https://streak-stats.demolab.com/?user=iska1234&theme=dark&hide_border=true&ring=037bdc&fire=07bef3&currStreakLabel=07bef3";
const mid = `## \`$ git log --since="1 year ago"\` · Activity

**6,343 commits** · \`iska1234\` · privados incluidos · brand SS Digital Labs  
Courier animado en el SVG. Click → tooltips.

<p align="center">
  <a href="https://iska1234.github.io/iska1234/contrib.html">
    <img src="assets/contrib-year.svg" width="920" alt="6,343 commits authored by iska1234 — SS Digital Labs" />
  </a>
</p>

<p align="center"><sub><a href="https://iska1234.github.io/iska1234/contrib.html">Open interactive grid</a></sub></p>

<p align="center">
  <img src="assets/shipping-year.svg" width="620" alt="Shipping activity" />
</p>

<p align="center">
  <img src="assets/top-langs.svg" width="620" alt="Top languages" />
</p>

<p align="center">
  <img height="165" src="${streak}" alt="GitHub streak" />
</p>

`;
fs.writeFileSync("README.md", rm.slice(0, start) + mid + rm.slice(end));
console.log("readme ok");
