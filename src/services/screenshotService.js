const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");
const CONFIG = require("../config/config");
const { sanitizeFilename } = require("../utils/filenameUtils");
const { scrollToBottom, handleStickyElements } = require("../utils/pageUtils");
const { handleModals } = require("./modalService");
const { handleCookieConsent } = require("./cookieService");
const {
  default: fullPageScreenshot,
} = require("puppeteer-full-page-screenshot");

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
      ...(deviceType === "mobile" ? { width: 393, height: 852 } : {}),
      ...(deviceType === "tablet" ? { width: 768, height: 1024 } : {}),
    };
    await page.setViewport(viewport);

    console.log(`Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: ["domcontentloaded", "load"],
      timeout: CONFIG.timeout,
    });

    // Hide scrollbars
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.textContent = `
        * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        *::-webkit-scrollbar {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
    });

    let attempts = 0;
    while (true) {
      console.log("Running loop for clearing site from messy popups ");
      await handleCookieConsent(page);
      await handleModals(page);
      await handleStickyElements(page);
      // this makes sure that all images are loaded
      await scrollToBottom(page);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
      if (attempts > 4) {
        break;
      }
    }

    // const pageHeight = await page.evaluate("document.body.scrollHeight");
    // await page.setViewport({ ...viewport, height: pageHeight });
    // // wait for 5 s
    // await new Promise((resolve) => setTimeout(resolve, 5000));

    await fs.ensureDir(CONFIG.screenshotDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedUrl = sanitizeFilename(url);
    const filename = `${sanitizedUrl}_${deviceType}_${timestamp}.png`;
    const filepath = path.join(CONFIG.screenshotDir, filename);

    console.log(`Capturing screenshot for ${url}...`);

    // await page.screenshot({
    //   path: filepath,
    //   fullPage: true,
    // });

    await fullPageScreenshot(page, { path: filepath });

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
