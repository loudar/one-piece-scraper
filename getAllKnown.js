import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const knownPath = 'known.json';
let knownChapters = {};
if (!fs.existsSync(knownPath)) {
    fs.writeFileSync(knownPath, JSON.stringify(knownChapters, null, 2));
} else {
    const data = fs.readFileSync(knownPath, 'utf-8');
    knownChapters = JSON.parse(data);
}

const knownKeys = Object.keys(knownChapters);
if (!fs.existsSync('img')) {
    fs.mkdirSync('img');
}
for (let i = 0; i < knownKeys.length; i++) {
    const key = knownKeys[i];
    const urls = knownChapters[key];
    console.log(`Chapter ${key} has ${urls.length} pages`);
    const current = key;
    for (let url of urls) {
        const index = urls.indexOf(url);
        if (!fs.existsSync(path.join('img', `chapter_${current}`))) {
            fs.mkdirSync(path.join('img', `chapter_${current}`));
        }
        if (fs.existsSync(path.join('img', `chapter_${current}`, `page_${index+1}.jpg`))) {
            console.log(`Skipping ${url}`);
            continue;
        }
        fetch(url).then(res => {
            const dest = fs.createWriteStream(path.join('img', `chapter_${current}`, `page_${index+1}.jpg`));
            res.body.pipe(dest);
        });
    }
}