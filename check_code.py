# -*- coding: utf-8 -*-
import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Check detectColumnMap - verify SPLIT detection is BEFORE keyword matching
idx = html.find('detectColumnMap')
if idx > 0:
    block = html[idx:idx+800]
    # Check if SPLIT detection is before rules.forEach
    split_pos = block.find("map.options = 'SPLIT'")
    rules_pos = block.find('rules.forEach')
    if split_pos > 0 and rules_pos > 0:
        if split_pos < rules_pos:
            print('✅ detectColumnMap: SPLIT before keyword matching')
        else:
            print('❌ detectColumnMap: SPLIT AFTER keyword matching (bug!)')
    else:
        print('❌ detectColumnMap: SPLIT or rules.forEach not found')

# 2. Check parseRow - verify inferredType is used correctly
parse_idx = html.find("parseRow(row, colMap, inferredType, index)")
if parse_idx > 0:
    block = html[parse_idx:parse_idx+200]
    # Extract the "let finalType" line
    lines = block.split('\n')
    for i, line in enumerate(lines):
        if 'let finalType' in line.replace(' ', ''):
            print(f'✅ Type variable declaration: {line.strip()}')
        if 'type: finalType' in line.replace(' ', ''):
            print(f'✅ Type usage: {line.strip()}')
        if 'type: finalType' in line.replace(' ', '') and 'finalType' in line:
            parts = line.strip().split()
            for p in parts:
                if 'finalType' in p:
                    print(f'  → found "{p}"')
            print(f'⚠️ Type usage MAY BE WRONG: {line.strip()}')

# 3. Check exam mode config checkbox values
exam_config = html.find('class="config-type-chip"')
if exam_config > 0:
    block = html[exam_config:exam_config+300]
    # Find all checkbox values
    values = re.findall(r'value="([^"]+)"', block)
    print(f'📋 Exam config checkbox values: {values}')

print('\n--- Parsing test ---')
# Simulate parsing answer-based type inference
test_cases = [
    ('A', '单选'),
    ('D', '单选'),
    ('AB', '多选'),
    ('ABC', '多选'),
    ('ABD', '多选'),
    ('对', '判断'),
    ('错', '判断'),
    ('T', '判断'),
    ('F', '判断'),
    ('正确', '判断'),
    ('错误', '判断'),
]
for ans, expected in test_cases:
    upper = ans.upper().replace(' ', '').replace(',', '').replace('、', '')
    if re.match(r'^[A-D]{2,}$', upper):
        result = '多选'
    elif re.match(r'^(对|错|正确|错误|T|F|TRUE|FALSE)$', ans.strip(), re.I):
        result = '判断'
    elif re.match(r'^[A-D]$', ans.strip(), re.I):
        result = '单选'
    else:
        result = '?'
    status = '✅' if result == expected else '❌'
    print(f'  {status} answer="{ans}" → type="{result}" (expected "{expected}")')