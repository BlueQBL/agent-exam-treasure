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

    await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Simulate real Excel data: questions with various types
    await page.evaluate(() => {
        const questions = [];
        // 单选 1-10
        for (let i = 1; i <= 10; i++) {
            questions.push({
                id: i, source: '测试', type: '单选',
                question: '单选项' + i + ': 1+1=?',
                options: ['2', '3', '4', '5'],
                answer: 'A', explanation: '1+1=2', keyPoints: [], score: 1
            });
        }
        // 多选 11-15
        for (let i = 11; i <= 15; i++) {
            questions.push({
                id: i, source: '测试', type: '多选',
                question: '多选题' + i + ': 以下哪些是水果？',
                options: ['苹果', '香蕉', '椅子', '桌子'],
                answer: 'AB', explanation: '苹果和香蕉是水果', keyPoints: [], score: 1
            });
        }
        // 判断 16-20
        for (let i = 16; i <= 20; i++) {
            questions.push({
                id: i, source: '测试', type: '判断',
                question: '判断题' + i + ': 地球是圆的？',
                options: ['正确', '错误'],
                answer: 'A', explanation: '地球是圆的', keyPoints: [], score: 1
            });
        }
        // 简答 21-25
        for (let i = 21; i <= 25; i++) {
            questions.push({
                id: i, source: '测试', type: '简答',
                question: '简答题' + i + ': 简述JVM',
                options: [],
                answer: 'Java虚拟机', explanation: '', keyPoints: ['Java虚拟机'], score: 5
            });
        }
        localStorage.setItem('exam_treasure_data', JSON.stringify({
            questions: questions, wrongBook: {},
            stats: { totalPracticeCount: 0, totalAccuracy: 0, accuracyByType: {}, examRecords: [] }
        }));
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const loadInfo = await page.evaluate(() => {
        return document.getElementById('load-info-text')?.textContent || 'NOT FOUND';
    });
    console.log('Data loaded:', loadInfo);

    // ===== TEST 1: Practice mode with 判断 + 多选 selected =====
    console.log('\n===== TEST 1: Practice mode - select 判断 + 多选 =====');

    // Uncheck 单选 and 简答
    const chips = await page.$$('.filter-chip');
    for (const chip of chips) {
        const text = await page.evaluate(el => el.textContent.trim(), chip);
        const checked = await page.evaluate(el => {
            return el.querySelector('input[type="checkbox"]').checked;
        }, chip);
        if ((text === '单选' || text === '简答') && checked) {
            console.log('  Unchecking:', text);
            await chip.click();
            await page.waitForTimeout(100);
        }
    }

    const filterState = await page.evaluate(() => {
        const cbs = document.querySelectorAll('#filterBar input[type="checkbox"]');
        return Array.from(cbs).map(cb => ({ value: cb.value, checked: cb.checked }));
    });
    console.log('Filter state:', JSON.stringify(filterState));

    await page.click('#btnPractice');
    await page.waitForTimeout(500);

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
            const text = await page.evaluate(el => el.textContent, next);
            const disabled = await page.evaluate(el => el.disabled, next);
            if (text.includes('查看结果') || disabled) break;
            await next.click();
            await page.waitForTimeout(100);
        } else break;
    }
    console.log('Question types seen:', JSON.stringify(types));
    const hasOnlyExpected = types.every(t => t === '判断' || t === '多选');
    const hasJudgment = types.some(t => t === '判断');
    const hasMulti = types.some(t => t === '多选');
    const hasSingle = types.some(t => t === '单选');
    const hasQA = types.some(t => t === '简答');
    console.log('Has 单选 (should NOT):', hasSingle);
    console.log('Has 判断 (should):', hasJudgment);
    console.log('Has 多选 (should):', hasMulti);
    console.log('Has 简答 (should NOT):', hasQA);

    if (hasSingle || hasQA) {
        console.log('❌ FILTER BUG CONFIRMED: Wrong question types appeared!');
    } else if (hasJudgment && hasMulti && !hasSingle && !hasQA) {
        console.log('✅ TEST 1 PASSED: Only 判断 + 多选 appeared');
    } else {
        console.log('⚠️ Unexpected result');
    }

    // Now test the shuffle function specifically
    console.log('\n===== DEBUG: Check shuffleByType =====');
    const shuffleTest = await page.evaluate(() => {
        const qs = JSON.parse(localStorage.getItem('exam_treasure_data')).questions;
        const judgedOnly = qs.filter(q => q.type === '判断');
        const shuffled = typeof shuffleByType === 'function' ? shuffleByType(judgedOnly) : null;
        return {
            originalCount: judgedOnly.length,
            shuffledCount: shuffled ? shuffled.length : -1,
            shuffledTypes: shuffled ? shuffled.map(q => q.type) : []
        };
    });
    console.log('shuffleByType test:', JSON.stringify(shuffleTest));

    console.log('\n=== ALL ERRORS ===');
    if (errors.length === 0) console.log('✅ No JS errors');
    else errors.forEach(e => console.log(e));

    await browser.close();
    server.close();
}

main().catch(e => { console.error(e); process.exit(1); });