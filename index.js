import puppeteer from 'puppeteer';
import fs from 'fs';

const main = async () => {
    const [ip, port, username, password] = (await fs.promises.readFile('proxy.txt', 'utf-8'))
        .split(':');
    const userAgents = (await fs.promises.readFile('useragents.txt', 'utf-8'))
        .split('\n')
        .map(e => e.slice(0, -1));
    const userAgent = userAgents[Math.random() * userAgents.length ^ 0];
    console.log('your useragent: ', userAgent);
    const browser = await puppeteer.launch({
        headless: false,
        args: [`--proxy-server=http://${ip}:${port}`, `--user-agent=${userAgent}`]
    });
    const [page] = await browser.pages();
    await page.authenticate({
        username,
        password
    });
    await page.goto('https://vk.com');
};

main();