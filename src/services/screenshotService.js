const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");
const CONFIG = require("../config/config");
const { sanitizeFilename } = require("../utils/filenameUtils");
const { waitForPageReady, scrollToBottom } = require("../utils/pageUtils");
const { handleModals } = require("./modalService");
const { handleCookieConsent } = require("./cookieService");

async function captureScreenshot(url, deviceType = "desktop", debug = false) {
  const browser = await puppeteer.launch({
    headless: debug ? false : "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: null,
  });

  try {
    const page = await browser.newPage();

    const viewport = {
      ...CONFIG.viewport,
      ...(deviceType === "mobile" ? { width: 375, height: 667 } : {}),
      ...(deviceType === "tablet" ? { width: 768, height: 1024 } : {}),
    };
    await page.setViewport(viewport);

    console.log(`Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: ["domcontentloaded", "load"],
      timeout: CONFIG.timeout,
    });

    await handleCookieConsent(page);
    console.log("Waiting for page to be ready...");
    await waitForPageReady(page);

    console.log("Scrolling to bottom...");
    await scrollToBottom(page);

    await page.evaluate("window.scrollTo(0, 0)");

    const pageHeight = await page.evaluate("document.body.scrollHeight");
    await page.setViewport({ ...viewport, height: pageHeight });

    await fs.ensureDir(CONFIG.screenshotDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedUrl = sanitizeFilename(url);
    const filename = `${sanitizedUrl}_${deviceType}_${timestamp}.png`;
    const filepath = path.join(CONFIG.screenshotDir, filename);

    console.log(`Capturing screenshot for ${url}...`);
    await handleModals(page);

    // wait 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await page.screenshot({
      path: filepath,
      fullPage: true,
    });

    console.log(`Screenshot saved: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error(`Error capturing screenshot for ${url}:`, error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

async function captureAllDeviceTypes(url, debug = false) {
  const deviceTypes = ["desktop", "mobile", "tablet"];
  console.log(`Processing ${url} for all device types...`);

  for (const deviceType of deviceTypes) {
    console.log(`\nCapturing ${deviceType} viewport...`);
    try {
      await captureScreenshot(url, deviceType, debug);
    } catch (error) {
      console.error(`Failed to capture ${deviceType} viewport:`, error.message);
    }
  }
}

module.exports = {
  captureScreenshot,
  captureAllDeviceTypes,
};
