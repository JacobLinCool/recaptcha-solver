# reCAPTCHA Resolver

Resolve reCAPTCHA challenges by using `vosk` speech recognition library.

Requirements:

- `ffmpeg` installed

```sh
npm i recaptcha-resolver
```

## Example

Checkout [`example/index.mjs`](example/index.mjs)!

```js
import { chromium } from "playwright-core";
import { resolve } from "recaptcha-resolver";

const EXAMPLE_PAGE = "https://www.google.com/recaptcha/api2/demo";

main();

async function main() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(EXAMPLE_PAGE);

    console.time("resolve reCAPTCHA");
    await resolve(page);
    console.log("solved!");
    console.timeEnd("resolve reCAPTCHA");

    await page.click("#recaptcha-demo-submit");

    page.on("close", async () => {
        await browser.close();
        process.exit(0);
    });
}
```

```sh
❯ node example/index.mjs
solved!
resolve reCAPTCHA: 4.285s
```

### Demo

[demo.mp4 (23s)](example/demo.mp4)

![demo](example/demo.mp4)
