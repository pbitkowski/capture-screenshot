const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");
const { program } = require("commander");
const { URL } = require("url");

// Configuration
const CONFIG = {
  viewport: {
    width: 1440,
    height: 900,
  },
  timeout: 30000,
  scrollDelay: 1000,
  maxScrollAttempts: 10,
  screenshotDir: "screenshots",
};

// Utility function to sanitize filenames
function sanitizeFilename(url) {
  const urlObj = new URL(url);
  return urlObj.hostname.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

// Function to wait for network to be idle
async function waitForNetworkIdle(page) {
  await page.waitForNetworkIdle({ timeout: CONFIG.timeout });
}

// Function to scroll to bottom and wait for content to load
async function scrollToBottom(page) {
  let previousHeight;
  let attempts = 0;

  while (attempts < CONFIG.maxScrollAttempts) {
    previousHeight = await page.evaluate("document.body.scrollHeight");
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await new Promise((resolve) => setTimeout(resolve, CONFIG.scrollDelay));

    const currentHeight = await page.evaluate("document.body.scrollHeight");
    if (currentHeight === previousHeight) {
      break;
    }

    attempts++;
  }
}

// Function to wait for page to be ready
async function waitForPageReady(page) {
  // Wait for the DOM to be ready
  await page.waitForFunction(() => document.readyState === "complete", {
    timeout: CONFIG.timeout,
  });
}

// Function to handle cookie consent
async function handleCookieConsent(page) {
  console.log("Handling cookie consent...");

  // Common cookie consent button selectors
  const cookieSelectors = [
    // Common class names and IDs
    '[id*="cookie"] button',
    '[class*="cookie"] button',
    '[id*="consent"] button',
    '[class*="consent"] button',
    '[id*="gdpr"] button',
    '[class*="gdpr"] button',
    '[id*="cookie-consent"] button',
    '[class*="cookie-consent"] button',
    '[id*="cookie-banner"] button',
    '[class*="cookie-banner"] button',

    // Common data attributes
    '[data-testid*="cookie"] button',
    '[data-testid*="consent"] button',
    '[data-testid*="gdpr"] button',

    // Common iframe selectors
    'iframe[id*="cookie"]',
    'iframe[id*="consent"]',
    'iframe[id*="gdpr"]',
  ];

  try {
    // Wait for any of the cookie consent elements to appear
    await Promise.race([
      ...cookieSelectors.map(
        (selector) =>
          page.waitForSelector(selector, { timeout: 5000 }).catch(() => null) // Ignore timeout errors
      ),
    ]);

    // Handle iframes first
    const iframes = await page.$$(
      'iframe[id*="cookie"], iframe[id*="consent"], iframe[id*="gdpr"]'
    );
    for (const iframe of iframes) {
      try {
        const frame = await iframe.contentFrame();
        if (frame) {
          // Try to find and click accept button in iframe
          const buttons = await frame.$$("button");
          for (const button of buttons) {
            const text = await frame.evaluate(
              (el) => el.textContent.toLowerCase(),
              button
            );
            if (
              text.includes("accept") ||
              text.includes("allow") ||
              text.includes("got it")
            ) {
              await button.click();
              console.log("Clicked accept button in iframe");
              return;
            }
          }
        }
      } catch (error) {
        console.log("Could not interact with iframe:", error.message);
      }
    }

    // Try to click accept buttons in main page
    for (const selector of cookieSelectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const isVisible = await element.isVisible();
          if (isVisible) {
            await element.click();
            console.log("Clicked cookie consent button");
            return;
          }
        }
      } catch (error) {
        console.log(
          `Could not interact with selector ${selector}:`,
          error.message
        );
      }
    }

    // If no buttons were clicked, try to accept cookies via JavaScript
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const acceptButton = buttons.find((button) => {
        const text = button.textContent.toLowerCase();
        return (
          (text.includes("accept") ||
            text.includes("allow") ||
            text.includes("got it")) &&
          button.offsetParent !== null
        ); // Check if button is visible
      });

      if (acceptButton) {
        acceptButton.click();
      }
    });
  } catch (error) {
    console.log("Cookie consent handling failed:", error.message);
  }
}

// Function to capture screenshot
async function captureScreenshot(url, deviceType = "desktop", debug = false) {
  const browser = await puppeteer.launch({
    headless: debug ? false : "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    defaultViewport: null, // This allows the window to be resizable in debug mode
  });

  try {
    const page = await browser.newPage();

    // Set viewport based on device type
    const viewport = {
      ...CONFIG.viewport,
      ...(deviceType === "mobile" ? { width: 375, height: 667 } : {}),
      ...(deviceType === "tablet" ? { width: 768, height: 1024 } : {}),
    };
    await page.setViewport(viewport);

    // Navigate to URL with better load strategy
    console.log(`Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: ["domcontentloaded", "load"],
      timeout: CONFIG.timeout,
    });

    // Handle cookie consent before proceeding
    await handleCookieConsent(page);

    // Wait for page to be fully ready
    console.log("Waiting for page to be ready...");
    await waitForPageReady(page);

    // Scroll to bottom and wait for content
    console.log("Scrolling to bottom...");
    await scrollToBottom(page);

    // Scroll back to top
    await page.evaluate("window.scrollTo(0, 0)");

    // Get the final page height
    const pageHeight = await page.evaluate("document.body.scrollHeight");
    await page.setViewport({ ...viewport, height: pageHeight });

    // Create screenshots directory if it doesn't exist
    await fs.ensureDir(CONFIG.screenshotDir);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedUrl = sanitizeFilename(url);
    const filename = `${sanitizedUrl}_${deviceType}_${timestamp}.png`;
    const filepath = path.join(CONFIG.screenshotDir, filename);

    // Take screenshot
    console.log(`Capturing screenshot for ${url}...`);
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

// Function to process URLs from file
async function processUrlsFromFile(filePath) {
  const content = await fs.readFile(filePath, "utf-8");
  const urls = content.split("\n").filter((url) => url.trim());
  return urls;
}

// Main function
async function main() {
  program
    .option("-f, --file <path>", "Path to file containing URLs")
    .option(
      "-d, --device <type>",
      "Device type (desktop, mobile, tablet)",
      "desktop"
    )
    .option("-D, --debug", "Enable debug mode (shows browser window)", false)
    .parse(process.argv);

  const options = program.opts();
  let urls = [];

  if (options.file) {
    try {
      urls = await processUrlsFromFile(options.file);
    } catch (error) {
      console.error("Error reading file:", error.message);
      process.exit(1);
    }
  } else {
    // Example URLs if no file is provided
    urls = ["https://www.upwork.com/"];
  }

  const deviceType = options.device;
  if (!["desktop", "mobile", "tablet"].includes(deviceType)) {
    console.error("Invalid device type. Use: desktop, mobile, or tablet");
    process.exit(1);
  }

  console.log(`Processing ${urls.length} URLs for ${deviceType} viewport...`);
  if (options.debug) {
    console.log("Debug mode enabled - browser window will be visible");
  }

  for (const url of urls) {
    try {
      await captureScreenshot(url, deviceType, options.debug);
    } catch (error) {
      console.error(`Failed to process ${url}:`, error.message);
    }
  }

  console.log("Screenshot capture completed!");
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
}

module.exports = {
  captureScreenshot,
  sanitizeFilename,
};
