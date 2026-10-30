import { execSync } from "node:child_process";
import fs from "node:fs";

function gh(args) {
  return execSync(`gh ${args}`, { encoding: "utf8", maxBuffer: 30 * 1024 * 1024 });
}

let page = 1;
let repos = [];
for (;;) {
  const chunk = JSON.parse(
    gh(`api "user/repos?per_page=100&page=${page}&affiliation=owner,collaborator,organization_member"`)
  );
  if (!chunk.length) break;
  repos = repos.concat(chunk);
  if (chunk.length < 100) break;
  page += 1;
}
repos = repos.filter((r) => !r.fork && !r.archived);
const since = "2025-10-30T00:00:00Z";
const sinceMs = Date.parse(since);
const candidates = repos
  .filter((r) => r.pushed_at && Date.parse(r.pushed_at) >= sinceMs - 14 * 864e5)
  .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at));

console.log(JSON.stringify({ repos: repos.length, candidates: candidates.length }));

const counts = {};
const perRepo = [];
let scanned = 0;
for (const r of candidates) {
  let n = 0;
  let p = 1;
  const days = {};
  for (;;) {
    let raw;
    try {
      raw = gh(
        `api "repos/${r.full_name}/commits?author=iska1234&since=${encodeURIComponent(since)}&per_page=100&page=${p}"`
      );
    } catch {
      break;
    }
    const chunk = JSON.parse(raw);
    if (!Array.isArray(chunk) || !chunk.length) break;
    for (const c of chunk) {
      const d = (c.commit?.author?.date || "").slice(0, 10);
      if (!d) continue;
      days[d] = (days[d] || 0) + 1;
      counts[d] = (counts[d] || 0) + 1;
      n += 1;
    }
    if (chunk.length < 100) break;
    p += 1;
    if (p > 50) break; // hard safety ~5000/repo
  }
  if (n > 0) perRepo.push({ repo: r.full_name, n, private: r.private });
  scanned += 1;
  if (scanned % 20 === 0) console.log(`scanned ${scanned}/${candidates.length}`);
}

perRepo.sort((a, b) => b.n - a.n);
const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(
  JSON.stringify(
    {
      total,
      activeDays: Object.keys(counts).length,
      topRepos: perRepo.slice(0, 15),
      repoWithCommits: perRepo.length,
    },
    null,
    2
  )
);
fs.writeFileSync(
  "assets/contrib-year.json",
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      total,
      activeDays: Object.keys(counts).length,
      scanned,
      counts,
      perRepo,
    },
    null,
    2
  )
);
