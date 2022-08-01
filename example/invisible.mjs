import { chromium } from "playwright-core";
import { solve } from "recaptcha-solver";

const EXAMPLE_PAGE = "https://recaptcha-demo.appspot.com/recaptcha-v2-invisible.php";

main();

async function main() {
    const browser = await chromium.launch({ headless: false });

    for (let i = 0; i < 10; i++) {
        const page = await browser.newPage();
        await page.goto(EXAMPLE_PAGE);
        await page.screenshot({ path: `artifacts/${i + 1}-0-before.png` });

        await page.click("text=Submit ↦");

        console.time("solve reCAPTCHA");
        await solve(page);
        console.log("solved!");
        console.timeEnd("solve reCAPTCHA");

        await page.waitForTimeout(1000);
        await page.screenshot({ path: `artifacts/${i + 1}-1-after.png` });
        await page.close();
    }

    await browser.close();
}
