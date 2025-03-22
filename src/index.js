const fs = require("fs-extra");
const { program } = require("commander");
const {
  captureScreenshot,
  captureAllDeviceTypes,
} = require("./services/screenshotService");

async function processUrlsFromFile(filePath) {
  const content = await fs.readFile(filePath, "utf-8");
  const urls = content.split("\n").filter((url) => url.trim());
  return urls;
}

async function main() {
  program
    .option("-f, --file <path>", "Path to file containing URLs")
    .option(
      "-d, --device <type>",
      "Device type (desktop, mobile, tablet, all)",
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
    urls = ["https://example.com", "https://google.com"];
  }

  const deviceType = options.device;
  if (!["desktop", "mobile", "tablet", "all"].includes(deviceType)) {
    console.error("Invalid device type. Use: desktop, mobile, tablet, or all");
    process.exit(1);
  }

  console.log(`Processing ${urls.length} URLs...`);
  if (options.debug) {
    console.log("Debug mode enabled - browser window will be visible");
  }

  for (const url of urls) {
    try {
      if (deviceType === "all") {
        await captureAllDeviceTypes(url, options.debug);
      } else {
        await captureScreenshot(url, deviceType, options.debug);
      }
    } catch (error) {
      console.error(`Failed to process ${url}:`, error.message);
    }
  }

  console.log("\nScreenshot capture completed!");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });
}

module.exports = {
  captureScreenshot,
  captureAllDeviceTypes,
};
