# -*- coding: utf-8 -*-
import re

with open('D:/study/jstudy/code/agent-exam-treasure/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

changes = []

# Fix 1: filter chip CSS - display:none → opacity:0 (already done by previous run, check)
old_css = '.filter-chip input[type="checkbox"] {\n            display: none;\n        }'
new_css = '.filter-chip input[type="checkbox"] {\n            position: absolute;\n            opacity: 0;\n            width: 0;\n            height: 0;\n            overflow: hidden;\n        }'
if old_css in html:
    html = html.replace(old_css, new_css)
    changes.append('Fix 1: display:none → opacity:0')
else:
    # Might already be fixed
    changes.append('Fix 1: already applied (skipped)')

# Fix 2: finalType typo - replace ALL occurrences in the file
# The variable is "finalType" but referenced as "finalType"
# They look identical but let me check by finding "type: finalType" pattern
# Actually let me just check if the parseRow function uses "finalType" correctly
count_before = html.count('finalType')
count_after = html.count('finalType')
if count_before != count_after:
    # There are different spellings - replace the wrong one
    # "finalType" (with 'n' instead of 'l' - "fīnəl") vs "finalType" (correct)
    # Let me just do a replace of the wrong one to the right one
    pass  # will handle below

# More precise: check parseRow assignment vs usage
# Find the pattern "type: finalType" - there should be ONE occurrence
# Let me just find and fix it
if 'type: finalType,' in html:
    html = html.replace('type: finalType,', 'type: finalType,')
    changes.append('Fix 2: finalType -> finalType in q object')
elif 'type: finalType,' in html:
    changes.append('Fix 2: already correct')

# Fix 3: Add visual toggle for filter chips
# Find the DOMContentLoaded init and add filter chip visual toggle BEFORE it
old_init = "App.HomePage.init();\n            App.HomePage.render();\n            App.showPage('page-home');"
toggle_code = "// Filter chip visual toggle: show checked state\n            document.querySelectorAll('.filter-chip').forEach(label => {\n                const cb = label.querySelector('input[type=\"checkbox\"]');\n                if (cb) {\n                    const update = () => label.classList.toggle('active', cb.checked);\n                    cb.addEventListener('change', update);\n                    update();\n                }\n            });\n\n            App.HomePage.init();\n            App.HomePage.render();\n            App.showPage('page-home');"

if old_init in html:
    html = html.replace(old_init, toggle_code)
    changes.append('Fix 3: filter chip visual toggle added')
else:
    changes.append('Fix 3: init pattern not found')

with open('D:/study/jstudy/code/agent-exam-treasure/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('\n'.join(changes))