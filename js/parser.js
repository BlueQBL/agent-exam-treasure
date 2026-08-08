/**
 * Exam Treasure - Parser Module
 * Handles Excel file parsing, shuffling utilities, and helper functions.
 */

// ─── Helpers ──────────────────────────────────
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Shuffle questions within each type group
function shuffleByType(questions) {
    const grouped = {};
    questions.forEach(q => {
        const t = q.type || '未知';
        if (!grouped[t]) grouped[t] = [];
        grouped[t].push(q);
    });
    const result = [];
    Object.keys(grouped).forEach(type => {
        const shuffled = shuffle(grouped[type]);
        shuffled.forEach(q => result.push(q));
    });
    return result;
}

// Shuffle options and remap answer letters
function shuffleOptionsWithAnswer(q) {
    if (!q.options || q.options.length < 2) return;
    const oldOptions = [...q.options];
    const indices = oldOptions.map((_, i) => i);
    const shuffledIndices = shuffle(indices);
    const origToNew = {};
    shuffledIndices.forEach((origPos, newPos) => { origToNew[origPos] = newPos; });
    q.options = shuffledIndices.map(origPos => oldOptions[origPos]);
    if (q.type === '单选' || q.type === '多选') {
        const ansLetters = q.answer.replace(/[^A-D]/ig, '').toUpperCase().split('');
        const newLetters = ansLetters.map(letter => {
            const origPos = letter.charCodeAt(0) - 65;
            const newPos = origToNew[origPos];
            return newPos !== undefined ? String.fromCharCode(65 + newPos) : letter;
        });
        q.answer = newLetters.sort().join('');
    }
}

// Normalize 判断题 answer to display text
function getJudgmentDisplayText(answer) {
    const s = answer.toUpperCase().replace(/[\s,，、;；.．]/g, '');
    if (['T', 'TRUE', '对', '正确', 'YES', 'A'].includes(s)) return '正确';
    if (['F', 'FALSE', '错', '错误', 'NO', 'B'].includes(s)) return '错误';
    return answer;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ─── Excel Parser ─────────────────────────────
App.ExcelParser = {
    async parse(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const questions = [];
                    workbook.SheetNames.forEach(sheetName => {
                        const sheet = workbook.Sheets[sheetName];
                        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                        if (rows.length === 0) return;
                        const colMap = this.detectColumnMap(rows[0]);
                        const sheetType = this.inferType(sheetName);
                        rows.forEach((row, i) => {
                            const q = this.parseRow(row, colMap, sheetType, i);
                            if (q) questions.push(q);
                        });
                    });
                    resolve(questions);
                } catch (err) { reject(err); }
            };
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    },
    inferType(sheetName) {
        const n = sheetName.toLowerCase();
        if (n.includes('单选')) return '单选';
        if (n.includes('多选')) return '多选';
        if (n.includes('判断') || n.includes('是非')) return '判断';
        if (n.includes('简答') || n.includes('问答') || n.includes('主观')) return '简答';
        return '单选';
    },
    detectColumnMap(headers) {
        const map = { question: '', type: '', answer: '', options: '', explanation: '', source: '', score: '' };
        const rules = [
            { target: 'question', keywords: ['题干', '题目', 'question', '问题', '试题内容'] },
            { target: 'type',     keywords: ['题型', '题目分类', 'type', '类别', '试题类型'] },
            { target: 'answer',   keywords: ['正确答案', '参考答案', '标准答案', '答案'] },
            { target: 'explanation', keywords: ['试题解析', '判断题解析', '答案解析', '题目解析', '解析', '解释', 'explanation'] },
            { target: 'options',  keywords: ['选项', 'options', '备选答案'] },
            { target: 'source',   keywords: ['来源', '一级纲要', '二级纲要', 'source', '出处'] },
            { target: 'score',    keywords: ['分数', '分值', '试题分数', 'score'] },
        ];
        const keys = Object.keys(headers);

        if (!map.options) {
            const abcd = keys.filter(k => /选项[A-D]/i.test(k) || /^[A-D]$/i.test(k));
            if (abcd.length >= 2) {
                map.options = 'SPLIT';
            }
        }

        keys.forEach(key => {
            const k = key.trim();
            if (map.options === 'SPLIT' && (/选项[A-D]/i.test(k) || /^[A-D]$/i.test(k))) return;

            let bestTarget = null;
            let bestKwLen = 0;

            rules.forEach(rule => {
                rule.keywords.forEach(kw => {
                    if (k.includes(kw) && kw.length > bestKwLen) {
                        bestTarget = rule.target;
                        bestKwLen = kw.length;
                    }
                });
            });

            if (bestTarget && !map[bestTarget]) {
                map[bestTarget] = k;
            }
        });

        return map;
    },

    parseRow(row, colMap, inferredType, index) {
        const question = colMap.question ? (row[colMap.question] || '') : '';
        if (!question) {
            console.warn(`第 ${index + 2} 行缺少题干，已跳过`);
            return null;
        }
        const answer = colMap.answer ? (row[colMap.answer] || '').toString().trim() : '';

        let finalType = inferredType;
        if (colMap.type) {
            const tv = (row[colMap.type] || '').toString();
            if (tv.includes('多选')) finalType = '多选';
            else if (tv.includes('判断')) finalType = '判断';
            else if (tv.includes('简答') || tv.includes('问答')) finalType = '简答';
            else if (tv.includes('单选') || tv.includes('选择')) finalType = '单选';
        }
        if (!colMap.type && finalType === '单选' && answer) {
            const upperAns = answer.toUpperCase().replace(/[\s,，、]/g, '');
            if (/^[A-D]{2,}$/.test(upperAns)) {
                finalType = '多选';
            } else if (/^(对|错|正确|错误|T|F|TRUE|FALSE)$/i.test(answer.trim())) {
                finalType = '判断';
            }
        }

        const source = colMap.source ? (row[colMap.source] || '') : '';
        const explanation = colMap.explanation ? (row[colMap.explanation] || '') : '';
        const score = colMap.score ? parseInt(row[colMap.score]) || 1 : 1;

        const q = {
            id: index + 1,
            source: source,
            type: finalType,
            question: question,
            options: [],
            answer: answer,
            explanation: explanation,
            keyPoints: [],
            score: score,
        };

        if (colMap.options === 'SPLIT') {
            const abcd = Object.keys(row).filter(k => /^选项[A-D]$/i.test(k.trim())).sort();
            if (abcd.length >= 2) {
                q.options = abcd.map(k => row[k]).filter(o => o !== '');
            } else {
                const plain = Object.keys(row).filter(k => /^[A-D]$/i.test(k.trim())).sort();
                q.options = plain.map(k => row[k]).filter(o => o !== '');
            }
        } else if (colMap.options) {
            const raw = (row[colMap.options] || '').toString();
            if (raw) {
                q.options = raw.split(/[|｜\n\r；;]/).map(s => {
                    const t = s.trim();
                    if (!t) return '';
                    return t.replace(/^[A-Da-d][.、)）\s-]/, '').trim();
                }).filter(s => s);
            }
        }
        if (q.options.length === 0 && q.type === '判断') {
            q.options = ['正确', '错误'];
        }
        if (q.type === '简答') {
            q.keyPoints = answer.split(/[|；;]/).map(s => s.trim()).filter(s => s);
        }
        // Normalize answer for lookup: remove separators for consistency
        if (q.type === '多选' || q.type === '单选') {
            q.answer = q.answer.replace(/[，,、\s;；.．-]/g, '').toUpperCase();
        }
        return q;
    }
};