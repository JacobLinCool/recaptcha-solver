# reCAPTCHA Solver

Solve reCAPTCHA challenges by using offline speech recognition.

> It can be very useful when you want to do E2E tests with your application protected by reCAPTCHA.

Requirements:

- `ffmpeg` installed

Features:

- Offline: A pretrained small model is included.
- Fast: Solve each challenge in less than 3 seconds.
- Accurate: Over 95% accuracy.
- Auto-retry: If the challenge is not solved, it will retry it.
- Supports reCAPTCHA v2 and v3 (invisible).

## Install

```sh
npm i recaptcha-solver
```

It will automatically download a 40 MB acoustic model which will be used to solve the challenges.

The model is from <https://alphacephei.com/vosk/models> (Apache 2.0).

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

With `VERBOSE` environment variable:

```sh
❯ VERBOSE=1 node example/index.mjs
[reCAPTCHA solver] bframe loaded: false
[reCAPTCHA solver] invisible: false
[reCAPTCHA solver] action required: true
[reCAPTCHA solver] [Mutex] init locked
[reCAPTCHA solver] [Mutex] ready waiting
[reCAPTCHA solver] [Mutex] get sound unlocked
[reCAPTCHA solver] [Mutex] ready locked
[reCAPTCHA solver] reconized: for their start urine
[reCAPTCHA solver] [Mutex] done waiting
[reCAPTCHA solver] [Mutex] verified unlocked
[reCAPTCHA solver] [Mutex] done locked
[reCAPTCHA solver] passed: true
solved!
solve reCAPTCHA: 4.072s
```

### Demo

[demo.mp4 (23s)](example/demo.mp4)

https://user-images.githubusercontent.com/28478594/181560802-a6be4c0f-3258-4cd6-b605-3d9671b04a8f.mp4
