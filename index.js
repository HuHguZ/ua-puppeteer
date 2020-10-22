import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import RecaptchaPlugin from 'puppeteer-extra-plugin-recaptcha';
import crypto from 'crypto';
import fs from 'fs';

const [, , proxy, token] = process.argv;

puppeteer.use(
    RecaptchaPlugin({
        provider: {
            id: '2captcha',
            token
        },
        visualFeedback: true // colorize reCAPTCHAs (violet = detected, green = solved)
    })
);

puppeteer.use(StealthPlugin());

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
    browser.on('targetcreated', async target => {
        const page = await target.page();
        if (!page) {
            return;
        }
        await page.authenticate({
            username,
            password
        });
        const sercretClickId = crypto.randomBytes(8).toString('hex');
        await page.evaluateOnNewDocument((func) => {
            window.addEventListener('DOMContentLoaded', () => {
                const button = document.createElement('button');
                button.style.position = 'fixed';
                button.style.left = '10px';
                button.style.top = '10px';
                button.innerText = 'Решить капчу';
                button.style.zIndex = 999999;
                button.style.fontSize = '20px';
                button.style.backgroundColor = 'green';
                button.style.border = 'none';
                button.style.borderRadius = '10px';
                button.style.padding = '10px'
                button.style.cursor = 'pointer';
                button.addEventListener('click', new Function(func));
                document.body.appendChild(button);
            });
        }, `console.log("${sercretClickId}")`);
        page.on('console', async event => {
            if (event.text() === sercretClickId) {
                await page.solveRecaptchas();
            }
        });
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