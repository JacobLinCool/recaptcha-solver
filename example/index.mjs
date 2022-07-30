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
