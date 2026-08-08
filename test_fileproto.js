const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('pageerror', err => errors.push(err.message));

    const filePath = 'file:///' + __dirname.replace(/\\/g, '/') + '/index.html';
    console.log('Loading:', filePath);

    try {
        await page.goto(filePath, { waitUntil: 'networkidle', timeout: 5000 });
        await page.waitForTimeout(300);
    } catch(e) {
        errors.push('NAV: ' + e.message);
    }

    const results = await page.evaluate(() => {
        return {
            hasFilterBar: !!document.getElementById('filterBar'),
            hasApp: typeof App !== 'undefined',
            hasDataStore: typeof App !== 'undefined' && !!App.DataStore,
            hasPractice: typeof App !== 'undefined' && !!App.PracticeMode,
            hasExcelParser: typeof App !== 'undefined' && !!App.ExcelParser,
            hasHomePage: typeof App !== 'undefined' && !!App.HomePage,
            pageDisplay: document.getElementById('page-home')?.style.display || 'unknown'
        };
    }).catch(e => ({ error: e.message }));

    console.log('Results:', JSON.stringify(results, null, 2));
    console.log('Errors:', errors.length > 0 ? errors.join(' | ') : 'none');

    await browser.close();
})().catch(e => console.error(e));