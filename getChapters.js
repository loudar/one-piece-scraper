import puppeteer from 'puppeteer';
import fs from 'fs';
import fetch from 'node-fetch';
import path from 'path';

const knownPath = 'known.json';
let knownChapters = {};
if (!fs.existsSync(knownPath)) {
    fs.writeFileSync(knownPath, JSON.stringify(knownChapters, null, 2));
} else {
    const data = fs.readFileSync(knownPath, 'utf-8');
    knownChapters = JSON.parse(data);
}

const knownKeys = Object.keys(knownChapters);
const lastKey = parseInt(knownKeys.length > 0 ? knownKeys[knownKeys.length - 1] : 0);
let chapter = process.env.chapter ?? lastKey + 1; //Chapter to start with
let pages = process.env.pages ?? 10; //Number of pages to be fetched
let baseUrl = process.env.baseurl ?? 'https://ww3.op-manga.com/manga/one-piece-chapter-';

function getImage(url, current, index) {
    fetch(url)
        .then(res => {
            const dest = fs.createWriteStream(path.join('img', `chapter_${current}`, `page_${index + 1}.jpg`));
            res.body.pipe(dest);
            if (knownChapters[current] === undefined) {
                knownChapters[current] = [];
            }
            knownChapters[current].push(url);
        });
}

async function scrollToBottom(page) {
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            let totalHeight = 0;
            const distance = 300;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

async function fetchData(chapter, pages, saveHtml = false) {

    for(let i = 0; i < pages; i++) {
        const current = chapter + i;
        const url = `${baseUrl}${current}`;

        const browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();
        await page.goto(url);
        await page.setViewport({width: 1920, height: 1040});

        if (saveHtml) {
            const html = await page.content();
            if (!fs.existsSync('html')) {
                fs.mkdirSync('html');
            }
            fs.writeFileSync(`./html/page_${i+1}.html`, html);
        }

        await page.waitForSelector('#wp-manga-current-chap');
        await scrollToBottom(page);
        const imgUrls = await page.evaluate(() =>
            Array.from(document.querySelectorAll('.wp-manga-chapter-img')).map(img => img.src)
        );

        await browser.close();

        if (!fs.existsSync('img')) {
            fs.mkdirSync('img');
        }
        if (!fs.existsSync(path.join('img', `chapter_${current}`))) {
            fs.mkdirSync(path.join('img', `chapter_${current}`));
        }

        imgUrls.forEach((url, index) => {
            if (!url || url === '') {
                return;
            }
            // wait 3 seconds between each fetch
            console.log('fetching: ' + url);
            getImage(url, current, index);
        });

        fs.writeFileSync(knownPath, JSON.stringify(knownChapters, null, 2));
    }
}


fetchData(chapter, pages);