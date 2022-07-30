# reCAPTCHA Solver

Solve reCAPTCHA challenges by using offline speech recognition.

> It can be very useful when you want to do E2E tests with your application protected by reCAPTCHA.

Requirements:

- `ffmpeg` installed

```sh
npm i recaptcha-solver
```

## Example

Checkout [`example/index.mjs`](example/index.mjs)!

```js
import { chromium } from "playwright-core";
import { solve } from "recaptcha-solver";

const EXAMPLE_PAGE = "https://www.google.com/recaptcha/api2/demo";

main();

async function main() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(EXAMPLE_PAGE);

    console.time("solve reCAPTCHA");
    await solve(page);
    console.log("solved!");
    console.timeEnd("solve reCAPTCHA");

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
solve reCAPTCHA: 4.285s
```

### Demo

[demo.mp4 (23s)](example/demo.mp4)

https://user-images.githubusercontent.com/28478594/181560802-a6be4c0f-3258-4cd6-b605-3d9671b04a8f.mp4
