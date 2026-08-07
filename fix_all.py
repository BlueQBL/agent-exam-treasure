# -*- coding: utf-8 -*-
import re

with open('D:/study/jstudy/code/agent-exam-treasure/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

changes = []

# =============================================================
# FIX 1: Exam config type chips - add visual toggle CSS
# =============================================================
old_css = '''        .config-card .config-type-chip input[type="checkbox"] {
            display: none;
        }'''
new_css = '''        .config-card .config-type-chip input[type="checkbox"] {
            position: absolute;
            opacity: 0;
            width: 0;
            height: 0;
            overflow: hidden;
        }
        .config-card .config-type-chip.active {
            border-color: var(--primary);
            background: rgba(74, 144, 217, 0.1);
        }'''

if old_css in html:
    html = html.replace(old_css, new_css)
    changes.append('Fix 1: config-type-chip checkbox CSS')
else:
    changes.append('Fix 1: ❌ NOT FOUND')

# =============================================================
# FIX 2: Answer-based type inference fallback in parseRow
# =============================================================
old_type = '''                // Type: from column or inferred from sheet name
                let finalType = inferredType;
                if (colMap.type) {
                    const tv = (row[colMap.type] || '').toString();
                    if (tv.includes('多选')) finalType = '多选';
                    else if (tv.includes('判断')) finalType = '判断';
                    else if (tv.includes('简答') || tv.includes('问答')) finalType = '简答';
                    else if (tv.includes('单选') || tv.includes('选择')) finalType = '单选';
                }'''

new_type = '''                // Type: from column, or inferred from sheet name, or inferred from answer format
                let finalType = inferredType;
                if (colMap.type) {
                    const tv = (row[colMap.type] || '').toString();
                    if (tv.includes('多选')) finalType = '多选';
                    else if (tv.includes('判断')) finalType = '判断';
                    else if (tv.includes('简答') || tv.includes('问答')) finalType = '简答';
                    else if (tv.includes('单选') || tv.includes('选择')) finalType = '单选';
                }
                // If no type column and type is still default '单选', try to infer from answer
                if (!colMap.type && answer) {
                    const upperAns = answer.toUpperCase().replace(/[\\s,，、]/g, '');
                    if (/^[A-D]{2,}$/.test(upperAns)) {
                        finalType = '多选';  // AB, ABC, ABCD pattern
                    } else if (/^[对错TF]$/i.test(answer.trim())) {
                        finalType = '判断';
                    }
                }'''

if old_type in html:
    html = html.replace(old_type, new_type)
    changes.append('Fix 2: answer-based type inference')
else:
    changes.append('Fix 2: ❌ NOT FOUND')

# =============================================================
# FIX 3: Exam config visual toggle JS in DOMContentLoaded
# =============================================================
old_init = '''            App.HomePage.init();
            App.HomePage.render();
            App.showPage('page-home');
        });'''

new_init = '''            // Config type chip visual toggle
            document.querySelectorAll('.config-type-chip').forEach(label => {
                const cb = label.querySelector('input[type="checkbox"]');
                if (cb) {
                    const update = () => label.classList.toggle('active', cb.checked);
                    cb.addEventListener('change', update);
                    update();
                }
            });

            App.HomePage.init();
            App.HomePage.render();
            App.showPage('page-home');
        });'''

if old_init in html:
    html = html.replace(old_init, new_init)
    changes.append('Fix 3: config chip visual toggle')
else:
    changes.append('Fix 3: ❌ NOT FOUND')

# =============================================================
# ALSO fix: add type fallback in exam mode start()
# So the exam checkbox value("single"/"multi"/"judge") maps to
# the CORRECT Chinese type string for matching
# =============================================================
old_exam_type = '''document.querySelectorAll('#page-exam-config input[type="checkbox"]:checked')
                    .forEach(cb => types.push(cb.value === 'single' ? '单选' : cb.value === 'multi' ? '多选' : '判断'));'''

new_exam_type = '''document.querySelectorAll('#page-exam-config input[type="checkbox"]:checked')
                    .forEach(cb => {
                        if (cb.value === 'single') types.push('单选');
                        else if (cb.value === 'multi') types.push('多选');
                        else types.push('判断');
                    });'''

# This doesn't need changing, it's already correct. Let me skip it.
changes.append('Exam type mapping already correct, skipping')

with open('D:/study/jstudy/code/agent-exam-treasure/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('=== Applied ===')
for c in changes:
    print(' ', c)