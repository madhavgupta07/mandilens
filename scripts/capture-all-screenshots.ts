import puppeteer, { type Browser, type Page } from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./_env";

loadEnv();

const SCREENSHOTS_DIR = path.resolve(process.cwd(), "screenshots");
const ARTIFACTS_DIR = "C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\be14fac0-3cf0-45d6-a0d0-4affb3c76e8b\\screenshots";

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const executablePath = fs.existsSync("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe")
  ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  : "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";

console.log("Using browser binary:", executablePath);

async function injectCleanStyles(page: Page) {
  try {
    await page.addStyleTag({
      content: `
        /* Hide Next.js dev server indicator badges and overlays for clean presentation */
        next-route-announcer,
        [data-nextjs-toast],
        [data-next-badge],
        #__next-build-watcher,
        nextjs-portal,
        div[data-nextjs-dialog-overlay] {
          display: none !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `,
    });
  } catch {
    // ignore
  }
}

async function capture(page: Page, filename: string, options: { fullPage?: boolean; delayMs?: number } = {}) {
  if (options.delayMs) {
    await new Promise((r) => setTimeout(r, options.delayMs));
  }
  await injectCleanStyles(page);
  const localPath = path.join(SCREENSHOTS_DIR, filename);
  const artifactPath = path.join(ARTIFACTS_DIR, filename);

  await page.screenshot({ path: localPath, fullPage: options.fullPage ?? false });
  fs.copyFileSync(localPath, artifactPath);
  console.log(`  ✓ Saved: ${filename}`);
}

async function safeGoto(page: Page, url: string, waitTime = 1200) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await new Promise((r) => setTimeout(r, waitTime));
  await injectCleanStyles(page);
}

async function getAuthCookie(email: string, pass: string): Promise<string> {
  const res = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "http://localhost:3000" },
    body: JSON.stringify({ email, password: pass }),
  });
  const cookieHeader = res.headers.get("set-cookie");
  if (!cookieHeader) throw new Error("No cookie header for " + email);
  const match = cookieHeader.match(/mandilens_session=([^;]+)/);
  if (!match) throw new Error("Could not extract cookie value");
  return match[1];
}

async function main() {
  console.log("Authenticating demo users via API...");
  const farmerToken = await getAuthCookie("farmer@demo.mandilens.test", "DemoPass123");
  const adminToken = await getAuthCookie("admin@mandilens.test", "AdminSecure2026!");
  console.log("  ✓ Tokens obtained successfully!");

  const browser: Browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--hide-scrollbars"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });

  console.log("\n=======================================================");
  console.log("1. Capturing Public Pages");
  console.log("=======================================================");

  // 01. Landing Hero
  await safeGoto(page, "http://localhost:3000", 1500);
  await capture(page, "01_landing_hero.png");

  // 02. Landing Full Page
  await capture(page, "02_landing_full.png", { fullPage: true });

  // 03. Compare Workbench (Form prefilled)
  await safeGoto(page, "http://localhost:3000/compare?commodity=maize&quantity=50&unit=quintal", 1500);
  await capture(page, "03_compare_workbench_form.png");

  // 04. Compare Workbench (Calculated Results)
  try {
    console.log("  Calculating comparison on workbench...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const btn = buttons.find((b) => b.textContent?.includes("Estimate my best market"));
      if (btn) btn.click();
    });
    await new Promise((r) => setTimeout(r, 2500));
    await capture(page, "04_compare_calculated_results.png", { delayMs: 500 });
  } catch (err) {
    console.warn("  Could not calculate comparison:", err);
  }

  // 05. AI Copilot Overview
  await safeGoto(page, "http://localhost:3000/copilot", 1500);
  await capture(page, "05_ai_copilot_overview.png");

  // 06. AI Copilot Answered
  try {
    console.log("  Asking Copilot question...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const chip = buttons.find((b) => b.textContent?.includes("Which market pays the most"));
      if (chip) chip.click();
    });
    await new Promise((r) => setTimeout(r, 4000));
    await capture(page, "06_ai_copilot_grounded_response.png", { delayMs: 500 });
  } catch (err) {
    console.warn("  Could not trigger copilot suggestion:", err);
  }

  // 07. Commodities Explorer
  await safeGoto(page, "http://localhost:3000/commodities", 1500);
  await capture(page, "07_commodities_directory.png");

  // 08. Commodity Detail (Maize)
  await safeGoto(page, "http://localhost:3000/commodities/maize", 2000);
  await capture(page, "08_commodity_detail_maize.png");

  // 09. Markets Explorer
  await safeGoto(page, "http://localhost:3000/markets", 1500);
  await capture(page, "09_markets_directory.png");

  // 10. Market Detail (Samastipur APMC)
  await safeGoto(page, "http://localhost:3000/markets/samastipur-apmc", 2000);
  await capture(page, "10_market_detail_samastipur.png");

  // 11. Marketplace Listings
  await safeGoto(page, "http://localhost:3000/listings", 1500);
  await capture(page, "11_marketplace_listings.png");

  // 12. Create Listing Form
  await safeGoto(page, "http://localhost:3000/listings/new", 1500);
  await capture(page, "12_marketplace_create_listing.png");

  // 13. Login Page
  await safeGoto(page, "http://localhost:3000/login", 1200);
  await capture(page, "13_auth_login.png");

  // 14. Register Page
  await safeGoto(page, "http://localhost:3000/register", 1200);
  await capture(page, "14_auth_register.png");

  // 15. Methodology Page
  await safeGoto(page, "http://localhost:3000/methodology", 1500);
  await capture(page, "15_methodology_calculation_proof.png");

  // 16. Data Integrity Page
  await safeGoto(page, "http://localhost:3000/data", 1500);
  await capture(page, "16_data_integrity_provenance.png");

  console.log("\n=======================================================");
  console.log("2. Capturing Authenticated Farmer Pages");
  console.log("=======================================================");

  // Set Farmer Session Cookie
  await page.setCookie({
    name: "mandilens_session",
    value: farmerToken,
    domain: "localhost",
    path: "/",
    httpOnly: true,
  });

  // 17. Farmer Dashboard
  await safeGoto(page, "http://localhost:3000/dashboard", 2000);
  await capture(page, "17_farmer_dashboard.png");

  // 18. Farmer Watchlists
  await safeGoto(page, "http://localhost:3000/watchlists", 1500);
  await capture(page, "18_farmer_watchlists.png");

  // 19. Farmer Price Alerts
  await safeGoto(page, "http://localhost:3000/alerts", 1500);
  await capture(page, "19_farmer_price_alerts.png");

  // 20. Farmer Inquiries
  await safeGoto(page, "http://localhost:3000/inquiries", 1500);
  await capture(page, "20_farmer_inquiries_chat.png");

  // 21. Farmer Notifications
  await safeGoto(page, "http://localhost:3000/notifications", 1500);
  await capture(page, "21_farmer_notifications.png");

  // 22. Farmer Saved Comparisons
  await safeGoto(page, "http://localhost:3000/saved", 1500);
  await capture(page, "22_farmer_saved_comparisons.png");

  console.log("\n=======================================================");
  console.log("3. Capturing Admin Console Pages");
  console.log("=======================================================");

  // Set Admin Session Cookie
  await page.setCookie({
    name: "mandilens_session",
    value: adminToken,
    domain: "localhost",
    path: "/",
    httpOnly: true,
  });

  // 23. Admin Overview
  await safeGoto(page, "http://localhost:3000/admin", 2000);
  await capture(page, "23_admin_overview.png");

  // 24. Admin Data Sources
  await safeGoto(page, "http://localhost:3000/admin/sources", 1500);
  await capture(page, "24_admin_data_sources.png");

  // 25. Admin CSV/JSON Imports
  await safeGoto(page, "http://localhost:3000/admin/imports", 1500);
  await capture(page, "25_admin_csv_imports.png");

  // 26. Admin Moderation
  await safeGoto(page, "http://localhost:3000/admin/moderation", 1500);
  await capture(page, "26_admin_moderation.png");

  // 27. Admin User Management
  await safeGoto(page, "http://localhost:3000/admin/users", 1500);
  await capture(page, "27_admin_users.png");

  // 28. Admin Audit Log
  await safeGoto(page, "http://localhost:3000/admin/audit", 1500);
  await capture(page, "28_admin_audit_log.png");

  await browser.close();
  console.log("\n🎉 All 28 screenshots captured and saved to ./screenshots and artifact directory!");
}

main().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
