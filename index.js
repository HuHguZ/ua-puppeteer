import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import fs from 'fs';

const [, , proxy, token] = process.argv;

puppeteer.use(StealthPlugin());

puppeteer.use(
    RecaptchaPlugin({
        provider: {
            id: '2captcha',
            token
        },
        visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
    })
);

const main = async () => {
    const [ip, port, username, password] = proxy.split(':');
    const userAgents = (await fs.promises.readFile('useragents.txt', 'utf-8'))
        .split('\n')
        .map(e => e.slice(0, -1));
    const userAgent = userAgents[Math.random() * userAgents.length ^ 0];
    console.log('your useragent: ', userAgent);
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            `--proxy-server=http://${ip}:${port}`,
            `--user-agent=${userAgent}`,
            `--disable-extensions-except=${process.cwd()}/extension`,
            `--load-extension=${process.cwd()}/extension`,
        ]
    });
    const pages = new Map();
    browser.on('targetcreated', async target => {
        const page = await target.page();
        if (!page) {
            return;
        }
        page.id = Date.now();
        await page.authenticate({
            username,
            password
        });
        const timer = setInterval(async () => {
            await page.solveRecaptchas();
        }, 1000);
        pages.set(page.id, timer);
    });
    browser.on('targetdestroyed', async target => {
        const page = await target.page();
        if (!page) {
            return;
        }
        if (pages.get(page.id)) {
            clearInterval(pages.get(page.id));
            pages.delete(page.id);
        }
    });
    const [mainPage] = await browser.pages();
    await mainPage.authenticate({
        username,
        password
    });
    const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();
    await page.authenticate({
        username,
        password
    });
    await page.goto('https://vk.com');
};

main();