const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

async function startServer() {
    const server = http.createServer((req, res) => {
        let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
        const ext = path.extname(filePath);
        const mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
        };
        if (!fs.existsSync(filePath)) {
            res.writeHead(404);
            res.end('Not found: ' + req.url);
            return;
        }
        let content = fs.readFileSync(filePath, 'utf8');
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
        res.end(content);
    });
    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve(server));
    });
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

    // Seed localStorage with test data (10 单选 + 5 判断 questions)
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.evaluate(() => {
        const questions = [];
        for (let i = 1; i <= 10; i++) {
            questions.push({
                id: i,
                source: '测试',
                type: '单选',
                question: '单选题 ' + i + ': 1+1=?',
                options: ['2', '3', '4', '5'],
                answer: 'A',
                explanation: '1+1=2',
                keyPoints: [],
                score: 1
            });
        }
        for (let i = 11; i <= 15; i++) {
            questions.push({
                id: i,
                source: '测试',
                type: '判断',
                question: '判断题 ' + i + ': 地球是圆的？',
                options: ['正确', '错误'],
                answer: 'A',
                explanation: '地球是圆的',
                keyPoints: [],
                score: 1
            });
        }
        const data = {
            questions: questions,
            wrongBook: {},
            stats: { totalPracticeCount: 0, totalAccuracy: 0, accuracyByType: {}, examRecords: [] }
        };
        localStorage.setItem('exam_treasure_data', JSON.stringify(data));
    });

    // Reload to pick up the seeded data
    await page.reload({ waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(300);

    if (errors.length > 0) {
        console.log('=== ERRORS ON LOAD ===');
        errors.forEach(e => console.log(e));
    } else {
        console.log('✅ No JS errors on load');
    }

    // Check the page structure
    const pageHome = await page.$('#page-home');
    const display = pageHome ? await page.evaluate(el => el.style.display, pageHome) : 'MISSING';
    console.log('Home page display:', display);

    // Check filter bar and its checkboxes
    const filterValues = await page.evaluate(() => {
        const cbs = document.querySelectorAll('#filterBar input[type="checkbox"]');
        return Array.from(cbs).map(cb => ({ value: cb.value, checked: cb.checked }));
    });
    console.log('Filter values:', JSON.stringify(filterValues));

    // Now uncheck everything except "判断"
    await page.evaluate(() => {
        const cbs = document.querySelectorAll('#filterBar input[type="checkbox"]');
        cbs.forEach(cb => { cb.checked = (cb.value === '判断'); });
    });

    const checkedAfter = await page.evaluate(() => {
        const cbs = document.querySelectorAll('#filterBar input[type="checkbox"]:checked');
        return Array.from(cbs).map(cb => cb.value);
    });
    console.log('After filter (only 判断):', JSON.stringify(checkedAfter));

    // Click practice mode
    await page.click('#btnPractice');
    await page.waitForTimeout(500);

    // Check what page we're on
    const isOnPractice = await page.evaluate(() => {
        const pp = document.getElementById('page-practice');
        return pp ? pp.style.display : 'NOT FOUND';
    });
    console.log('Practice page display:', isOnPractice);

    // Read the question type being displayed
    const qType = await page.evaluate(() => {
        const el = document.querySelector('.q-type');
        return el ? el.textContent : 'NO .q-type FOUND';
    });

    // Get all questions in the current practice session
    const practiceInfo = await page.evaluate(() => {
        const p = document.getElementById('practice-progress');
        return p ? p.textContent : 'NO PROGRESS';
    });
    console.log('Practice progress:', practiceInfo);
    console.log('Question type shown:', qType);

    // ⭐ KEY TEST: Only 判断 should appear after filtering!
    // Let's navigate through all questions to check their types
    let types = [];
    for (let i = 0; i < 15; i++) {
        const t = await page.evaluate(() => {
            const el = document.querySelector('.q-type');
            if (!el) return null;
            const text = el.textContent;
            // Check if "下一题" button is visible to decide if we can go further
            return text;
        });
        if (t) types.push(t);

        const nextBtn = await page.$('#practice-next');
        if (nextBtn) {
            const isDisabled = await page.evaluate(el => {
                // Check if it says "查看结果" instead of "下一题"
                return el.textContent.includes('查看结果');
            }, nextBtn);
            if (isDisabled) break;
            await nextBtn.click();
            await page.waitForTimeout(100);
        } else {
            break;
        }
    }

    console.log('Question types encountered:', JSON.stringify(types));

    const allAreJudgment = types.every(t => t === '判断');
    if (allAreJudgment && types.length > 0) {
        console.log('✅ FILTER WORKS! All questions are 判断');
    } else {
        console.log('❌ FILTER BROKEN! Expected all 判断, got:', JSON.stringify(types));
    }

    // Now Test EXAM mode
    console.log('\n=== Testing EXAM mode filter ===');

    // Go back home first
    await page.evaluate(() => {
        App.HomePage.render();
        App.showPage('page-home');
    });
    await page.waitForTimeout(300);

    // Click exam mode
    await page.click('#btnExam');
    await page.waitForTimeout(300);

    const isOnConfig = await page.evaluate(() => {
        const pec = document.getElementById('page-exam-config');
        return pec ? pec.style.display : 'NOT FOUND';
    });
    console.log('Exam config page display:', isOnConfig);

    // Uncheck all except "判断题" (value="judge")
    await page.evaluate(() => {
        const cbs = document.querySelectorAll('#page-exam-config .config-type-options input[type="checkbox"]');
        cbs.forEach(cb => { cb.checked = (cb.value === 'judge'); });
    });

    const examTypes = await page.evaluate(() => {
        const cbs = document.querySelectorAll('#page-exam-config .config-type-options input[type="checkbox"]:checked');
        return Array.from(cbs).map(cb => cb.value);
    });
    console.log('Exam config selected types:', JSON.stringify(examTypes));

    // Click "开始考试"
    await page.click('#exam-start');
    await page.waitForTimeout(500);

    const isOnExam = await page.evaluate(() => {
        const pe = document.getElementById('page-exam');
        return pe ? pe.style.display : 'NOT FOUND';
    });
    console.log('Exam page display:', isOnExam);

    const examQType = await page.evaluate(() => {
        const el = document.querySelector('#exam-question .q-type');
        return el ? el.textContent : 'NO .q-type FOUND';
    });
    console.log('Exam question type:', examQType);

    // Navigate through exam questions
    let examQTypes = [];
    for (let i = 0; i < 15; i++) {
        const t = await page.evaluate(() => {
            const el = document.querySelector('#exam-question .q-type');
            return el ? el.textContent : null;
        });
        if (t) examQTypes.push(t);

        const nextBtn = await page.$('#exam-next');
        if (nextBtn) {
            const isDisabled = await page.evaluate(el => el.disabled, nextBtn);
            if (isDisabled) break;
            await nextBtn.click();
            await page.waitForTimeout(100);
        } else {
            break;
        }
    }

    console.log('Exam question types encountered:', JSON.stringify(examQTypes));

    const allExamAreJudgment = examQTypes.every(t => t === '判断');
    if (allExamAreJudgment && examQTypes.length > 0) {
        console.log('✅ EXAM FILTER WORKS! All questions are 判断');
    } else {
        console.log('❌ EXAM FILTER BROKEN! Expected all 判断, got:', JSON.stringify(examQTypes));
    }

    console.log('\n=== ALL ERRORS ===');
    if (errors.length === 0) {
        console.log('✅ No errors encountered');
    } else {
        errors.forEach(e => console.log(e));
    }

    await browser.close();
    server.close();
}

main().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});