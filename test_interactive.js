const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function startServer() {
    const server = http.createServer((req, res) => {
        let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
        const ext = path.extname(filePath);
        const mimeTypes = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };
        if (!fs.existsSync(filePath)) {
            console.log('404:', req.url);
            res.writeHead(404);
            res.end('404: ' + req.url);
            return;
        }
        let content = ext === '.js' || ext === '.css' ? fs.readFileSync(filePath, 'utf8') : fs.readFileSync(filePath, 'utf8');
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        res.end(content);
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
        // Also capture our debug logs
        if (msg.type() === 'log' && msg.text().includes('[DEBUG')) {
            console.log('  [BROWSER]', msg.text());
        }
    });
    page.on('pageerror', err => errors.push('PAGE: ' + err.message));

    await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Seed data: 10 单选 + 10 判断
    await page.evaluate(() => {
        const questions = [];
        for (let i = 1; i <= 10; i++) {
            questions.push({
                id: i, source: '', type: '单选',
                question: '单选第' + i + '题：计算 1+1',
                options: ['2', '3', '4', '5'],
                answer: 'A', explanation: '1+1=2', keyPoints: [], score: 1
            });
        }
        for (let i = 11; i <= 20; i++) {
            questions.push({
                id: i, source: '', type: '判断',
                question: '判断第' + (i-10) + '题：地球是圆的？',
                options: ['正确', '错误'],
                answer: 'A', explanation: '地球是圆的', keyPoints: [], score: 1
            });
        }
        localStorage.setItem('exam_treasure_data', JSON.stringify({
            questions, wrongBook: {},
            stats: { totalPracticeCount: 0, totalAccuracy: 0, accuracyByType: {}, examRecords: [] }
        }));
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    await page.evaluate(() => {
        console.log('[DEBUG] Data loaded:', document.getElementById('load-info-text')?.textContent);
    });

    // Simulate user: uncheck 单选, keep 判断 checked
    const chips = await page.$$('.filter-chip');
    for (const chip of chips) {
        const text = await page.evaluate(el => el.textContent.trim(), chip);
        const checked = await page.evaluate(el => el.querySelector('input[type="checkbox"]').checked, chip);
        console.log('  Chip:', text, checked ? '✅' : '❌');
        if (text === '单选' && checked) {
            await chip.click();
            await page.waitForTimeout(100);
            console.log('  -> Unchecked 单选');
        }
    }

    const filterState = await page.evaluate(() => {
        const cbs = document.querySelectorAll('#filterBar input[type="checkbox"]');
        return Array.from(cbs).map(cb => ({ v: cb.value, c: cb.checked }));
    });
    console.log('  Filter state:', JSON.stringify(filterState));

    // Click practice
    await page.click('#btnPractice');
    await page.waitForTimeout(500);

    let types = [], count = 0;
    for (let i = 0; i < 30; i++) {
        const t = await page.evaluate(() => {
            const el = document.querySelector('.q-type');
            return el ? el.textContent : null;
        });
        if (t) { types.push(t); count++; }

        const isLast = await page.evaluate(() => {
            const btn = document.getElementById('practice-next');
            return btn && (btn.textContent.includes('查看结果') || btn.disabled);
        });
        if (isLast) break;

        const next = await page.$('#practice-next');
        if (!next) break;
        const text = await page.evaluate(el => el.textContent, next);
        const disabled = await page.evaluate(el => el.disabled, next);
        if (text.includes('查看结果') || disabled) break;
        await next.click();
        await page.waitForTimeout(100);
    }

    console.log('\\n  Questions shown (' + count + '):', JSON.stringify(types));
    const badTypes = types.filter(t => t !== '判断');
    console.log('  Has only 判断:', badTypes.length === 0);
    console.log('  Wrong types:', badTypes.length > 0 ? JSON.stringify(badTypes) : 'none');

    console.log('\\n=== Errors:', errors.length === 0 ? '✅ none' : '');
    errors.forEach(e => console.log(' ', e));

    await browser.close();
    server.close();
}

main().catch(e => { console.error(e); process.exit(1); });