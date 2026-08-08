const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function startServer() {
    const server = http.createServer((req, res) => {
        let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
        const ext = path.extname(filePath);
        const mimeTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
        if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        res.end(fs.readFileSync(filePath, 'utf8'));
    });
    return new Promise(r => server.listen(0, '127.0.0.1', () => r(server)));
}

async function main() {
    const server = await startServer();
    const port = server.address().port;
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];

    page.on('console', msg => {
        if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text());
    });
    page.on('pageerror', err => errors.push('PAGE: ' + err.message));

    // Navigate and seed data
    await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    await page.evaluate(() => {
        const questions = [];
        for (let i = 1; i <= 10; i++) {
            questions.push({ id: i, type: '单选', question: '单选题目' + i, options: ['A', 'B'], answer: 'A', keyPoints: [], score: 1 });
        }
        for (let i = 11; i <= 15; i++) {
            questions.push({ id: i, type: '判断', question: '判断题目' + i, options: ['正确', '错误'], answer: 'A', keyPoints: [], score: 1 });
        }
        localStorage.setItem('exam_treasure_data', JSON.stringify({
            questions: questions, wrongBook: {},
            stats: { totalPracticeCount: 0, totalAccuracy: 0, accuracyByType: {}, examRecords: [] }
        }));
    });

    // Reload to pick up data
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    const infoText = await page.evaluate(() => {
        const el = document.getElementById('load-info-text');
        return el ? el.textContent : 'NOT FOUND';
    });
    console.log('Data loaded:', infoText);

    // Uncheck all except 判断 via manual label clicks
    const filterChips = await page.$$('.filter-chip');
    for (let i = 0; i < filterChips.length; i++) {
        const isChecked = await page.evaluate(el => {
            return el.querySelector('input[type="checkbox"]').checked;
        }, filterChips[i]);
        const text = await page.evaluate(el => el.textContent.trim(), filterChips[i]);

        if (text !== '判断' && isChecked) {
            await filterChips[i].click();
            await page.waitForTimeout(100);
            console.log('Unchecked:', text);
        }
    }

    const finalStates = await page.evaluate(() => {
        const cbs = document.querySelectorAll('#filterBar input[type="checkbox"]');
        return Array.from(cbs).map(cb => ({ value: cb.value, checked: cb.checked }));
    });
    console.log('Filter state:', JSON.stringify(finalStates));

    // Click practice mode
    const errorsBefore = errors.length;
    await page.click('#btnPractice');
    await page.waitForTimeout(500);

    if (errors.length > errorsBefore) {
        console.log('ERRORS after clicking practice:');
        errors.slice(errorsBefore).forEach(e => console.log('  ', e));
    }

    const practiceDisplay = await page.evaluate(() => {
        return document.getElementById('page-practice').style.display;
    });
    console.log('Practice page:', practiceDisplay);

    // Navigate through all questions
    let types = [];
    for (let i = 0; i < 20; i++) {
        const t = await page.evaluate(() => {
            const el = document.querySelector('.q-type');
            return el ? el.textContent : null;
        });
        if (t) types.push(t);

        const isLast = await page.evaluate(() => {
            const btn = document.getElementById('practice-next');
            return btn && (btn.textContent.includes('查看结果') || btn.disabled);
        });
        if (isLast) break;

        const next = await page.$('#practice-next');
        if (next) {
            const btnText = await page.evaluate(el => el.textContent, next);
            if (btnText.includes('查看结果') || btnText.includes('返回')) break;
            const isDisabled = await page.evaluate(el => el.disabled, next);
            if (isDisabled) break;
            await next.click();
            await page.waitForTimeout(100);
        } else {
            break;
        }
    }

    console.log('Question types:', JSON.stringify(types));
    const allJudgment = types.every(t => t === '判断');
    if (allJudgment && types.length > 0) {
        console.log('✅ PRACTICE FILTER: All questions are 判断');
    } else {
        console.log('❌ PRACTICE FILTER: Expected all 判断, got mix:', JSON.stringify(types));
    }

    if (errors.length > 0) {
        console.log('\n=== ERRORS ===');
        errors.forEach(e => console.log(e));
    } else {
        console.log('✅ No errors');
    }

    await browser.close();
    server.close();
}

main().catch(e => { console.error(e); process.exit(1); });