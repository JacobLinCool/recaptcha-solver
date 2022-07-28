const { firefox } = require("playwright-core");
const { resolve } = require("recaptcha-resolver");

const EXAMPLE_PAGE = "https://www.google.com/recaptcha/api2/demo";

main();

async function main() {
    const browser = await firefox.launch({ headless: true });

    for (let i = 0; i < 10; i++) {
        const page = await browser.newPage();
        await page.goto(EXAMPLE_PAGE);
        await page.screenshot({ path: `artifacts/${i + 1}-0-before.png` });
        console.time("resolve reCAPTCHA");
        await resolve(page);
        console.log("solved!");
        console.timeEnd("resolve reCAPTCHA");
        await page.screenshot({ path: `artifacts/${i + 1}-1-after.png` });
        await page.close();
    }

    await browser.close();
}
