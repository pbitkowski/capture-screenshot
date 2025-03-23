async function handleModals(page) {
  console.log("Checking for modals...");

  try {
    await page.mouse.click(0, 0);

    console.log("Handled modals and overlays");
  } catch (error) {
    console.log("Modal handling failed:", error.message);
  }
}

module.exports = {
  handleModals,
};
