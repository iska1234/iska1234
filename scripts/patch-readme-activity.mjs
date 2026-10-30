import fs from "node:fs";
const rm = fs.readFileSync("README.md", "utf8");
const start = rm.indexOf('## `$ git log --since="1 year ago"` · Activity');
const end = rm.indexOf("## `$ connect --socials`");
if (start < 0 || end < 0) {
  console.error("markers missing", start, end);
  process.exit(1);
}
const streak =
  "https://streak-stats.demolab.com/?user=iska1234" +
  "&theme=dark&hide_border=true&ring=0ea5e9&fire=38bdf8&currStreakLabel=0ea5e9";
const mid = `## \`$ git log --since="1 year ago"\` · Activity

**Tooltip como GitHub:** el graph verde oficial vive *debajo* del README (UI nativa). Ahí el hover sí funciona.
Para llenarlo con privados: verifica \`sadhuisaac1@gmail.com\` + *Include private contributions*.

**Este heatmap custom** cuenta commits reales (público + privado). Dentro del README GitHub lo mete como \`<img>\` → **sin hover**.
Click abre un clone visual con tooltip idéntico (“N contributions on Month Dayth.”).

<p align="center">
  <a href="https://iska1234.github.io/iska1234/contrib.html" title="GitHub-style interactive contribution graph">
    <img src="assets/contrib-year.svg" width="900" alt="contributions in the last year — click for GitHub-style day tooltips" />
  </a>
</p>

<p align="center"><sub><a href="https://iska1234.github.io/iska1234/contrib.html">Open interactive graph</a></sub></p>

<p align="center">
  <img src="assets/shipping-year.svg" width="620" alt="Shipping activity last 12 months including private repos" />
</p>

<p align="center">
  <img src="assets/top-langs.svg" width="620" alt="Top languages across all repos including private" />
</p>

<p align="center">
  <img height="165" src="${streak}" alt="GitHub streak" />
</p>

<p align="center"><sub><code>signals: contrib_year · shipping_year · top_langs · streak</code></sub></p>

`;
fs.writeFileSync("README.md", rm.slice(0, start) + mid + rm.slice(end));
console.log("readme ok");
