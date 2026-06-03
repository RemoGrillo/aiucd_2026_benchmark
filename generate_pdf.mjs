#!/usr/bin/env node
/**
 * generate_pdf.mjs — Export presentation.html to a print-perfect PDF.
 *
 * It drives the system Google Chrome / Chromium in headless mode and prints the
 * deck (opened with ?print so the @media print CSS lays out one 1280x720 slide
 * per page and the charts render in their final state). No npm dependencies.
 *
 * Usage:   node generate_pdf.mjs            → writes presentation.pdf
 *          node generate_pdf.mjs out.pdf    → custom output name
 *
 * Re-run it whenever you edit presentation.html — the PDF always reflects the
 * current slides.
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { platform } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(here, "presentation.html");
const outPath = resolve(here, process.argv[2] || "presentation.pdf");

if (!existsSync(htmlPath)) {
  console.error("✗ presentation.html not found next to this script.");
  process.exit(1);
}

// --- locate a Chromium-family browser across platforms ----------------------
const CANDIDATES = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  ],
  linux: [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
  ],
  win32: [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ],
};

const chrome =
  (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH) && process.env.CHROME_PATH) ||
  (CANDIDATES[platform()] || []).find(existsSync);

if (!chrome) {
  console.error(
    "✗ No Chrome/Chromium/Edge found.\n  Set CHROME_PATH=/path/to/chrome and retry."
  );
  process.exit(1);
}

// file:// URL (spaces etc. handled by pathToFileURL) + ?print flag
const url = pathToFileURL(htmlPath).href + "?print=1";

const args = [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--hide-scrollbars",
  "--force-color-profile=srgb",
  // fast-forward fonts/layout so the snapshot is fully settled before printing
  "--virtual-time-budget=6000",
  "--run-all-compositor-stages-before-draw",
  `--print-to-pdf=${outPath}`,
  url,
];

console.log(`• Browser : ${chrome}`);
console.log(`• Source  : ${htmlPath}`);
console.log(`• Output  : ${outPath}`);

const res = spawnSync(chrome, args, { stdio: ["ignore", "ignore", "inherit"] });

if (res.error) {
  console.error("✗ Failed to launch browser:", res.error.message);
  process.exit(1);
}
if (res.status !== 0 || !existsSync(outPath)) {
  console.error(`✗ PDF was not produced (exit ${res.status}).`);
  process.exit(1);
}
console.log("✓ PDF generated successfully.");
