async function handleModals(page) {
  console.log("Checking for modals...");

  const modalSelectors = [
    ".overlay",
    '[role="dialog"]',
    '[aria-modal="true"]',
    '[class*="overlay"]',
    '[class*="backdrop"]',
    '[class*="modal-backdrop"]',
    '[class*="popup-backdrop"]',
    '[class*="modal-overlay"]',
    '[class*="popup-overlay"]',
    '[class*="modal-wrapper"]',
    '[class*="popup-wrapper"]',
    '[class*="modal-container"]',
    '[class*="popup-container"]',
  ];

  const closeButtonSelectors = [
    '[aria-label="Close"]',
    '[aria-label="close"]',
    '[aria-label="Dismiss"]',
    '[aria-label="dismiss"]',
    'button[aria-label*="Close"]',
    'button[aria-label*="close"]',
    'button[aria-label*="Dismiss"]',
    'button[aria-label*="dismiss"]',
    '[class*="close-button"]',
    '[class*="closeButton"]',
    '[class*="modal-close"]',
    '[class*="modalClose"]',
    '[class*="dialog-close"]',
    '[class*="dialogClose"]',
    'button[class*="close"]',
    'button[class*="dismiss"]',
    'button[class*="modal-close"]',
    'button[class*="dialog-close"]',
  ];

  try {
    // First try clicking outside modals
    await page.evaluate((selectors) => {
      const clickOutsideModal = (modal) => {
        if (modal && modal.offsetParent !== null) {
          // Create a click event at the top-right corner of the viewport
          // (usually outside the modal)
          const clickEvent = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: window.innerWidth - 10,
            clientY: 10,
          });

          // Dispatch click event on the document body
          document.body.dispatchEvent(clickEvent);
          return true;
        }
        return false;
      };

      // Try clicking outside each modal
      selectors.forEach((selector) => {
        const modals = document.querySelectorAll(selector);
        modals.forEach(clickOutsideModal);
      });
    }, modalSelectors);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // First try to close modals using close buttons
    await page.evaluate((selectors) => {
      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          if (element.offsetParent !== null) {
            element.click();
          }
        });
      });
    }, closeButtonSelectors);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Then handle any remaining modals by hiding them (but not removing)
    await page.evaluate((selectors) => {
      const hideModal = (element) => {
        // Store original styles
        element.dataset.originalDisplay = element.style.display;
        element.dataset.originalVisibility = element.style.visibility;
        element.dataset.originalOpacity = element.style.opacity;
        element.dataset.originalPointerEvents = element.style.pointerEvents;

        // Hide the element
        element.style.display = "none";
        element.style.visibility = "hidden";
        element.style.opacity = "0";
        element.style.pointerEvents = "none";
      };

      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          if (element.offsetParent !== null) {
            hideModal(element);
          }
        });
      });
    }, modalSelectors);

    // wait for 3 seconds
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log("Handled modals and overlays");
  } catch (error) {
    console.log("Modal handling failed:", error.message);
  }
}

module.exports = {
  handleModals,
};
