const CONFIG = require("../config/config");

async function waitForPageReady(page) {
  await page.waitForFunction(() => document.readyState === "complete", {
    timeout: CONFIG.timeout,
  });
}

async function waitForLazyImages(page) {
  console.log("Waiting for lazy images to load...");

  await page.evaluate(async () => {
    const loadLazyImages = () => {
      return new Promise((resolve) => {
        const images = Array.from(document.getElementsByTagName("img"));
        let loadedImages = 0;
        const totalImages = images.length;

        if (totalImages === 0) {
          resolve();
          return;
        }

        const imageLoaded = () => {
          loadedImages++;
          if (loadedImages === totalImages) {
            resolve();
          }
        };

        images.forEach((img) => {
          if (img.complete) {
            imageLoaded();
            return;
          }

          if (img.dataset.src) img.src = img.dataset.src;
          if (img.dataset.srcset) img.srcset = img.dataset.srcset;
          if (img.dataset.original) img.src = img.dataset.original;
          if (img.dataset.lazySrc) img.src = img.dataset.lazySrc;

          if (img.loading === "lazy") {
            img.loading = "eager";
          }

          img.addEventListener("load", imageLoaded);
          img.addEventListener("error", imageLoaded);
        });
      });
    };

    const scrollThroughPage = async () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      let currentScroll = 0;

      while (currentScroll < scrollHeight) {
        window.scrollTo(0, currentScroll);
        await new Promise((resolve) => setTimeout(resolve, 100));
        currentScroll += viewportHeight;
      }

      window.scrollTo(0, 0);
    };

    await scrollThroughPage();
    await loadLazyImages();
  });
}

async function handleStickyElements(page) {
  // detect sticky elements and make them non-sticky
  const stickyInfo = await page.evaluate(() => {
    const stickyElements = Array.from(document.querySelectorAll("*")).filter(
      (element) => {
        const computedStyle = window.getComputedStyle(element);
        return computedStyle.position === "sticky";
      }
    );

    return {
      count: stickyElements.length,
      elements: stickyElements.map((el) => ({
        tag: el.tagName,
        classes: el.className,
        computedPosition: window.getComputedStyle(el).position,
      })),
    };
  });

  console.log("Sticky elements found:", stickyInfo);

  // Now apply the changes in a separate evaluate call
  await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll("*")).filter(
      (element) => {
        const computedStyle = window.getComputedStyle(element);
        return (
          computedStyle.position === "sticky" ||
          computedStyle.position === "fixed"
        );
      }
    );

    const viewportHeight = window.innerHeight;
    const threshold = viewportHeight * 0.5; // 50% of viewport height

    elements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const elementTop = rect.top;

      if (elementTop < threshold) {
        // Preserve top elements
        element.style.position = "absolute";
        element.style.top = "0";
        element.style.width = "100%";
        element.style.zIndex = "1000";
      } else {
        // Remove bottom elements
        element.remove();
      }
    });
  });
}

async function scrollToBottom(page) {
  let previousHeight;
  let attempts = 0;

  while (attempts < CONFIG.maxScrollAttempts) {
    previousHeight = await page.evaluate("document.body.scrollHeight");

    await page.evaluate(() => {
      return new Promise((resolve) => {
        const duration = 1000;
        const start = window.pageYOffset;
        const end = document.body.scrollHeight - window.innerHeight;
        const startTime = performance.now();

        function scroll(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);

          const easeInOutCubic =
            progress < 0.5
              ? 4 * progress * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 3) / 2;

          window.scrollTo(0, start + (end - start) * easeInOutCubic);

          if (progress < 1) {
            requestAnimationFrame(scroll);
          } else {
            resolve();
          }
        }

        requestAnimationFrame(scroll);
      });
    });

    await new Promise((resolve) => setTimeout(resolve, CONFIG.scrollDelay));

    const currentHeight = await page.evaluate("document.body.scrollHeight");
    if (currentHeight === previousHeight) {
      break;
    }

    attempts++;
  }

  console.log("Waiting for lazy images to load...");
}

module.exports = {
  waitForPageReady,
  waitForLazyImages,
  scrollToBottom,
  handleStickyElements,
};
