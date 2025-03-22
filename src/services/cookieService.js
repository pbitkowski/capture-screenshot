async function handleCookieConsent(page) {
  console.log("Handling cookie consent...");

  const cookieSelectors = [
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
    '[data-testid*="cookie"] button',
    '[data-testid*="consent"] button',
    '[data-testid*="gdpr"] button',
    'iframe[id*="cookie"]',
    'iframe[id*="consent"]',
    'iframe[id*="gdpr"]',
  ];

  try {
    await Promise.race([
      ...cookieSelectors.map((selector) =>
        page.waitForSelector(selector, { timeout: 5000 }).catch(() => null)
      ),
    ]);

    const iframes = await page.$$(
      'iframe[id*="cookie"], iframe[id*="consent"], iframe[id*="gdpr"]'
    );
    for (const iframe of iframes) {
      try {
        const frame = await iframe.contentFrame();
        if (frame) {
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

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button"));
      const acceptButton = buttons.find((button) => {
        const text = button.textContent.toLowerCase();
        return (
          (text.includes("accept") ||
            text.includes("allow") ||
            text.includes("got it")) &&
          button.offsetParent !== null
        );
      });

      if (acceptButton) {
        acceptButton.click();
      }
    });
  } catch (error) {
    console.log("Cookie consent handling failed:", error.message);
  }
}

module.exports = {
  handleCookieConsent,
};
