import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function readStatusCsv(path, start, end) {
  const raw = readFileSync(new URL(path, import.meta.url), "utf8").trim();
  const lines = raw.split(/\r?\n/);
  assert.equal(lines[0], "cmd,domain,status", `${path}: CSV header`);
  const rows = lines.slice(1).map((line, index) => {
    const parts = line.split(",");
    assert.equal(parts.length, 3, `${path}: malformed row ${index + 2}`);
    const [cmdText, domain, status] = parts;
    const cmd = Number(cmdText);
    assert.ok(Number.isInteger(cmd), `${path}: invalid command number at row ${index + 2}`);
    assert.ok(domain.length > 0, `${path}: empty domain at row ${index + 2}`);
    assert.ok(
      ["PASS", "EXISTS AND VERIFIED", "PARTIAL", "BLOCKED", "NOT STARTED"].includes(status),
      `${path}: unexpected status "${status}" at row ${index + 2}`
    );
    return { cmd, status };
  });

  assert.equal(rows.length, end - start + 1, `${path}: expected row count`);
  assert.deepEqual(rows.map((r) => r.cmd), Array.from({ length: end - start + 1 }, (_, i) => start + i),
    `${path}: command IDs must be complete, ordered, and unique`);

  const counts = Object.fromEntries(
    ["PASS", "EXISTS AND VERIFIED", "PARTIAL", "BLOCKED", "NOT STARTED"]
      .map((status) => [status, rows.filter((r) => r.status === status).length])
  );
  return { counts, total: rows.length };
}

test("Ω commands 001–300 CSV has complete unique IDs and expected totals", () => {
  const result = readStatusCsv("../docs/NEXUS-OMEGA-001-300-STATUS.csv", 1, 300);
  assert.deepEqual(result.counts, {
    "PASS": 124,
    "EXISTS AND VERIFIED": 124,
    "PARTIAL": 28,
    "BLOCKED": 15,
    "NOT STARTED": 9
  });
  assert.equal(result.total, 300);
});

test("Ω commands 301–900 CSV has complete unique IDs and expected totals", () => {
  const result = readStatusCsv("../docs/NEXUS-OMEGA-301-900-STATUS.csv", 301, 900);
  assert.deepEqual(result.counts, {
    "PASS": 215,
    "EXISTS AND VERIFIED": 162,
    "PARTIAL": 160,
    "BLOCKED": 50,
    "NOT STARTED": 13
  });
  assert.equal(result.total, 600);
});

test("301–900 report summary agrees with its CSV classification", () => {
  const report = readFileSync(new URL("../docs/NEXUS-OMEGA-301-900-EXECUTION-REPORT.md", import.meta.url), "utf8");
  assert.match(report, /\| EXISTS AND VERIFIED \| 162 \|/);
  assert.match(report, /\| PASS \| 215 \|/);
  assert.match(report, /\| PARTIAL \| 160 \|/);
  assert.match(report, /\| BLOCKED \| 50 \|/);
  assert.match(report, /\| NOT STARTED \| 13 \|/);
  assert.match(report, /\*\*المجموع\*\* \| \*\*600\*\*/);
});
