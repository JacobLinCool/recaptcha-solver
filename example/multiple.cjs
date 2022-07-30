const { firefox } = require("playwright-core");
const { solve } = require("recaptcha-solver");

const EXAMPLE_PAGE = "https://www.google.com/recaptcha/api2/demo";

main();

async function main() {
    const browser = await firefox.launch({ headless: true });

    for (let i = 0; i < 10; i++) {
        const page = await browser.newPage();
        await page.goto(EXAMPLE_PAGE);
        await page.screenshot({ path: `artifacts/${i + 1}-0-before.png` });
        console.time("solve reCAPTCHA");
        await solve(page);
        console.log("solved!");
        console.timeEnd("solve reCAPTCHA");
        await page.screenshot({ path: `artifacts/${i + 1}-1-after.png` });
        await page.close();
    }

    await browser.close();
}
