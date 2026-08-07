# -*- coding: utf-8 -*-
import re

with open('D:/study/jstudy/code/agent-exam-treasure/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

changes = []

# Fix 1: detectColumnMap - fix the detectColumnMap method
# Add SPLIT detection BEFORE the keyword matching loop
old_detect = '''                rules.forEach(rule => {
                    for (const key of keys) {
                        const k = key.trim();
                        if (rule.keywords.some(kw => k.includes(kw) || kw.includes(k))) {
                            map[rule.target] = k;
                            break;
                        }
                    }
                });
                // Detect 选项A/选项B/选项C/选项D or A/B/C/D pattern
                if (!map.options) {
                    const abcd = keys.filter(k => /选项[A-D]/i.test(k) || /^[A-D]$/i.test(k));
                    if (abcd.length >= 2) map.options = 'SPLIT';
                }'''

new_detect = '''                // First: detect 选项A/选项B/选项C/选项D or A/B/C/D split pattern
                // This must come BEFORE keyword matching so 选项A/B/C/D aren't caught by '选项' keyword
                if (!map.options) {
                    const abcd = keys.filter(k => /选项[A-D]/i.test(k) || /^[A-D]$/i.test(k));
                    if (abcd.length >= 2) {
                        map.options = 'SPLIT';
                    }
                }
                rules.forEach(rule => {
                    // Skip options keyword matching if split pattern already detected
                    if (rule.target === 'options' && map.options === 'SPLIT') return;
                    for (const key of keys) {
                        const k = key.trim();
                        if (rule.keywords.some(kw => k.includes(kw) || kw.includes(k))) {
                            map[rule.target] = k;
                            break;
                        }
                    }
                });'''

if old_detect in html:
    html = html.replace(old_detect, new_detect)
    changes.append('Fix 1: SPLIT detection moved BEFORE keyword matching')
else:
    changes.append('Fix 1: pattern NOT FOUND')

# Fix 2: parseRow - ensure SPLIT options use correct column keys
old_split = '''                if (colMap.options === 'SPLIT') {
                    // 选项A/选项B/选项C/选项D or A/B/C/D columns
                    const keys = Object.keys(row).filter(k => /选项[A-D]/i.test(k) || /^[A-D]$/i.test(k)).sort();
                    q.options = keys.map(k => row[k]).filter(o => o !== '');'''

new_split = '''                if (colMap.options === 'SPLIT') {
                    // 选项A/选项B/选项C/选项D columns
                    // Match keys that start with '选项' and end with letter A/B/C/D
                    const abcd = Object.keys(row).filter(k => /^选项[A-D]$/i.test(k.trim())).sort();
                    if (abcd.length >= 2) {
                        q.options = abcd.map(k => row[k]).filter(o => o !== '');
                    } else {
                        // Fallback: try plain A/B/C/D columns
                        const plain = Object.keys(row).filter(k => /^[A-D]$/i.test(k.trim())).sort();
                        q.options = plain.map(k => row[k]).filter(o => o !== '');
                    }'''

if old_split in html:
    html = html.replace(old_split, new_split)
    changes.append('Fix 2: SPLIT parsing stricter column matching')
else:
    changes.append('Fix 2: pattern NOT FOUND')

# Also: ensure detectColumnMap has correct fallback for SPLIT detection
# in the parse flow for single-sheet uploads

with open('D:/study/jstudy/code/agent-exam-treasure/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('== Applied ==')
for c in changes:
    print(' ', c)