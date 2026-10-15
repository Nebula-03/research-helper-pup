import * as esbuild from "esbuild";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";

const watch = process.argv.includes("--watch");
const releaseBuild = process.argv.includes("--release");

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist/content", { recursive: true });
mkdirSync("dist/notes", { recursive: true });

const options = {
  bundle: true,
  format: "iife",
  target: "chrome120",
  sourcemap: !releaseBuild,
  logLevel: "info",
  entryPoints: {
    background: "src/background.ts",
    "content/puppy": "src/content/puppy.ts",
    "notes/index": "src/notes/index.ts",
  },
  outdir: "dist",
};

// Fix 6 — QUALITY-04: wrap copyAssets in try/catch so a broken
// asset copy exits with a non-zero code and fails CI properly
function copyAssets() {
  try {
    cpSync("manifest.json", "dist/manifest.json");
    cpSync("src/content/puppy.css", "dist/content/puppy.css");
    cpSync("src/notes/index.html", "dist/notes/index.html");
    cpSync("src/notes/notes.css", "dist/notes/notes.css");
    if (existsSync("icons")) cpSync("icons", "dist/icons", { recursive: true });
    if (existsSync("data")) cpSync("data", "dist/data", { recursive: true });
  } catch (err) {
    console.error("Asset copy failed:", err);
    process.exit(1);
  }
}

copyAssets();

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(options);
  console.log("Build complete → dist/");
}
