# Webpage Screenshot Tool

A Node.js script that captures pixel-perfect, full-page screenshots of webpages using Puppeteer. The script handles lazy-loading, infinite scroll, and JavaScript-injected content.

## Features

- Captures full-page screenshots with precise height
- Handles lazy-loading and infinite scroll content
- Supports multiple device types (desktop, mobile, tablet)
- Processes multiple URLs from command line or file
- Includes timestamp in filenames
- Sanitizes filenames based on URLs
- Basic error handling and logging
- Debug mode to show browser window
- Automatic cookie consent handling
- Capture all device types at once

## Requirements

- Node.js 14 or higher
- npm or yarn

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

## Usage

### Basic Usage

```bash
node index.js
```

This will process the default example URLs (example.com and google.com) in desktop viewport.

### Process URLs from File

```bash
node index.js -f urls.txt
```

The `urls.txt` file should contain one URL per line.

### Specify Device Type

```bash
# Capture desktop viewport (default)
node index.js -d desktop

# Capture mobile viewport
node index.js -d mobile

# Capture tablet viewport
node index.js -d tablet

# Capture all device types at once
node index.js -d all
```

Available device types:

- `desktop` (default)
- `mobile`
- `tablet`
- `all` (captures all device types)

### Enable Debug Mode

```bash
node index.js -D
```

Debug mode will show the browser window while capturing screenshots, which is useful for:

- Debugging issues with specific pages
- Verifying the scrolling behavior
- Checking if content is loading correctly
- Inspecting the final page state before capture
- Monitoring cookie consent handling

### Cookie Consent Handling

The script automatically attempts to handle cookie consent popups by:

- Detecting common cookie consent banners and popups
- Looking for accept/allow buttons in both main page and iframes
- Supporting various cookie consent implementations
- Gracefully handling cases where cookie consent can't be found

### Combine Options

```bash
# Process URLs from file in tablet viewport with debug mode
node index.js -f urls.txt -d tablet -D

# Process URLs from file for all device types with debug mode
node index.js -f urls.txt -d all -D
```

## Output

Screenshots are saved in the `screenshots/` directory with filenames in the format:
`{sanitized-url}_{device-type}_{timestamp}.png`

When using `-d all`, you'll get three screenshots for each URL:

- `{url}_desktop_{timestamp}.png`
- `{url}_mobile_{timestamp}.png`
- `{url}_tablet_{timestamp}.png`

## Configuration

You can modify the following settings in `index.js`:

- `viewport`: Default viewport dimensions
- `timeout`: Maximum time to wait for page load (default: 30000ms)
- `scrollDelay`: Delay between scroll attempts (default: 1000ms)
- `maxScrollAttempts`: Maximum number of scroll attempts (default: 10)
- `screenshotDir`: Directory to save screenshots (default: 'screenshots')

## Error Handling

The script includes basic error handling for:

- Network timeouts
- Navigation failures
- File system errors
- Invalid device types
- Cookie consent handling failures

## Debug Tips

When using debug mode (`-D`), you can:

1. Watch the page loading process in real-time
2. See how the script handles cookie consent popups
3. Monitor the scrolling behavior
4. Verify that all content is being captured
5. Check if the final viewport height is correct

If you encounter issues:

- Use debug mode to see what's happening
- Check the console output for detailed logs
- Verify that the page is fully loaded before the screenshot
- Ensure cookie consent is being handled correctly
