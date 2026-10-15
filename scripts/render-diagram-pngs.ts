import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const executablePath = fs.existsSync("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe")
  ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  : "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";

const ARTIFACTS_DIR = "C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\be14fac0-3cf0-45d6-a0d0-4affb3c76e8b\\diagrams";

async function renderDiagram(svgPath: string, pngPath: string, width: number, height: number) {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });

  const svgContent = fs.readFileSync(svgPath, "utf8");
  const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #090d16; display: flex; align-items: center; justify-content: center; width: 100vw; height: 100vh; overflow: hidden; }
    svg { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;

  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.screenshot({ path: pngPath, type: "png" });

  const baseName = path.basename(pngPath);
  const artifactTarget = path.join(ARTIFACTS_DIR, baseName);
  fs.copyFileSync(pngPath, artifactTarget);

  console.log(`✓ Rendered ${baseName} (${width}x${height} @ 2x)`);
  await browser.close();
}

async function run() {
  await renderDiagram(
    path.resolve(process.cwd(), "diagrams", "flow.svg"),
    path.resolve(process.cwd(), "diagrams", "flow.png"),
    1600,
    960
  );

  await renderDiagram(
    path.resolve(process.cwd(), "diagrams", "architecture.svg"),
    path.resolve(process.cwd(), "diagrams", "architecture.png"),
    1600,
    1080
  );

  console.log("Both diagrams rendered as high-resolution PNGs!");
}

run().catch((err) => {
  console.error("Render error:", err);
  process.exit(1);
});
