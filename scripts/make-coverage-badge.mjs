import { readFile, writeFile, mkdir } from "node:fs/promises";

function colorFor(pct) {
  if (pct >= 90) return "brightgreen";
  if (pct >= 80) return "green";
  if (pct >= 70) return "yellowgreen";
  if (pct >= 60) return "yellow";
  if (pct >= 50) return "orange";
  return "red";
}

const summary = JSON.parse(await readFile("coverage/coverage-summary.json", "utf-8"));
const pct = summary.total.lines.pct;

const badge = {
  schemaVersion: 1,
  label: "coverage",
  message: `${pct.toFixed(1)}%`,
  color: colorFor(pct)
};

await mkdir("badges", { recursive: true });
await writeFile("badges/coverage.json", JSON.stringify(badge));
console.log(`Wrote badges/coverage.json: ${badge.message} (${badge.color})`);
