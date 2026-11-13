import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

function isIgnored(relativePath) {
  const result = spawnSync(
    "git",
    ["check-ignore", "--no-index", "--quiet", "--", relativePath],
    { cwd: repositoryRoot, encoding: "utf8" },
  );

  assert.equal(result.error, undefined, "Git must be available to validate .gitignore rules");
  assert.ok(
    result.status === 0 || result.status === 1,
    `git check-ignore failed for ${relativePath}: ${result.stderr || "unknown error"}`,
  );
  return result.status === 0;
}

test("local environment files are ignored at root and in nested workspaces", () => {
  for (const path of [
    ".env",
    ".env.local",
    ".env.production",
    ".dev.vars",
    ".dev.vars.local",
    ".dev.vars.production",
    "worker/.env",
    "engine/.env",
    "worker/.dev.vars",
    "worker/.dev.vars.production",
  ]) {
    assert.equal(isIgnored(path), true, `${path} should be ignored`);
  }
});

test("safe environment examples remain eligible for version control", () => {
  for (const path of [
    ".env.example",
    "worker/.env.example",
    "worker/.env.production.example",
    "engine/.env.example",
    ".env.production.example",
    ".dev.vars.example",
    ".dev.vars.production.example",
    "worker/.dev.vars.example",
    "worker/.dev.vars.production.example",
  ]) {
    assert.equal(isIgnored(path), false, `${path} should remain trackable`);
  }
});

test("generated dependencies, caches, media outputs, and logs are ignored", () => {
  for (const path of [
    "node_modules/example/index.js",
    "worker/.wrangler/state.json",
    "engine/.venv/bin/python",
    "engine/venv/bin/python",
    "engine/__pycache__/app.cpython-311.pyc",
    "engine/.pytest_cache/v/cache/nodeids",
    "outputs/scene.mp4",
    "renders/final.mp4",
    "uploads/creator-video.mp4",
    "tmp/debug.tmp",
    "temp/cache.bin",
    "worker/debug.log",
    ".coverage",
    "htmlcov/index.html",
  ]) {
    assert.equal(isIgnored(path), true, `${path} should be ignored`);
  }
});
