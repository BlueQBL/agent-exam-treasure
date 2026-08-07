import re

with open('D:/study/jstudy/code/agent-exam-treasure/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

changes = []

# Fix 1: filter-chip checkbox display:none -> position:absolute + opacity:0
old1 = '.filter-chip input[type="checkbox"] {\n            display: none;\n        }'
new1 = '.filter-chip input[type="checkbox"] {\n            position: absolute;\n            opacity: 0;\n            width: 0;\n            height: 0;\n            overflow: hidden;\n        }'
if old1 in html:
    html = html.replace(old1, new1)
    changes.append('Fix 1: checkbox display:none -> opacity:0')
else:
    changes.append('Fix 1: NOT FOUND')

# Fix 2: finalType typo (change "finalType" to "finalType")
html = html.replace('type: finalType,', 'type: finalType,')
changes.append('Fix 2: finalType -> finalType')

# Fix 3: Add filter-chip active visual toggle JS after DOMContentLoaded init
old3 = "App.HomePage.init();\n                App.HomePage.render();\n                App.showPage('page-home');"
new3 = "// Filter chip visual toggle\n            document.querySelectorAll('.filter-chip').forEach(label => {\n                const cb = label.querySelector('input');\n                if (cb) {\n                    const update = () => label.classList.toggle('active', cb.checked);\n                    cb.addEventListener('change', update);\n                    update();\n                }\n            });\n\n            App.HomePage.init();\n            App.HomePage.render();\n            App.showPage('page-home');"
if old3 in html:
    html = html.replace(old3, new3)
    changes.append('Fix 3: added visual toggle code')
else:
    changes.append('Fix 3: NOT FOUND')

with open('D:/study/jstudy/code/agent-exam-treasure/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('=== Applied', len([c for c in changes if 'NOT' not in c]), 'changes ===')
for c in changes:
    print(' ', c)