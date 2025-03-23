// Common text patterns for accept/reject buttons
const CONSENT_BUTTON_TEXT = [
  "accept",
  "allow",
  "got it",
  "close",
  "dismiss",
  "ok",
  "reject",
  "agree",
  "continue",
];

// Enhanced selectors for better coverage
const cookieSelectors = [
  // Original selectors for buttons
  '[id*="cookie"] button',
  '[class*="cookie"] button',
  '[id*="consent"] button',
  '[class*="consent"] button',
  '[id*="gdpr"] button',
  '[class*="gdpr"] button',
  // Direct element selectors (not just buttons)
  '[id*="cookie-banner"]',
  '[class*="cookie-banner"]',
  '[aria-label*="cookie"]',
  // Common cookie consent service selectors
  "#onetrust-accept-btn-handler",
  ".cc-accept",
  "#CybotCookiebotDialogBodyButtonAccept",
  ".cookieconsent-button",
];

async function handleCookieConsent(page) {
  console.log("Handling cookie consent...");

  try {
    // Wait for any cookie-related element with a longer timeout
    await Promise.race([
      ...cookieSelectors.map((selector) =>
        page.waitForSelector(selector, { timeout: 10000 }).catch(() => null)
      ),
    ]);

    // First try handling iframes
    if (await handleIframeCookies(page)) return;

    // Then try direct selectors
    if (await handleDirectSelectors(page)) return;

    // Finally try DOM traversal as fallback
    await handleDOMTraversal(page);
  } catch (error) {
    console.log("Cookie consent handling failed:", error.message);
  }
}

async function handleIframeCookies(page) {
  const iframes = await page.$$(
    'iframe[id*="cookie"], iframe[id*="consent"], iframe[id*="gdpr"]'
  );

  for (const iframe of iframes) {
    try {
      const frame = await iframe.contentFrame();
      if (!frame) continue;

      const buttons = await frame.$$('button, [role="button"]');
      for (const button of buttons) {
        const text = await frame.evaluate(
          (el) => el.textContent?.toLowerCase() || "",
          button
        );
        if (CONSENT_BUTTON_TEXT.some((pattern) => text.includes(pattern))) {
          await button.click();
          console.log("Clicked consent button in iframe");
          return true;
        }
      }
    } catch (error) {
      console.log("Iframe interaction failed:", error.message);
    }
  }
  return false;
}

async function handleDirectSelectors(page) {
  for (const selector of cookieSelectors) {
    try {
      const elements = await page.$$(selector);
      for (const element of elements) {
        if (await element.isVisible()) {
          const text = await page.evaluate(
            (el) => el.textContent?.toLowerCase() || "",
            element
          );
          if (CONSENT_BUTTON_TEXT.some((pattern) => text.includes(pattern))) {
            await element.click();
            console.log(`Clicked consent button with selector: ${selector}`);
            return true;
          }
        }
      }
    } catch (error) {
      console.log(`Selector interaction failed (${selector}):`, error.message);
    }
  }
  return false;
}

async function handleDOMTraversal(page) {
  await page.evaluate((buttonPatterns) => {
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0" &&
        element.offsetParent !== null
      );
    };

    const buttons = Array.from(
      document.querySelectorAll('button, [role="button"], a[href="#"]')
    );
    const acceptButton = buttons.find((button) => {
      const text = button.textContent?.toLowerCase() || "";
      return (
        buttonPatterns.some((pattern) => text.includes(pattern)) &&
        isVisible(button)
      );
    });

    if (acceptButton) {
      acceptButton.click();
      return true;
    }
    return false;
  }, CONSENT_BUTTON_TEXT);
}

module.exports = {
  handleCookieConsent,
};
