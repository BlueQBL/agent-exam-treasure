/**
 * Exam Treasure - Question Renderer Module
 * Handles rendering questions, options, feedback, and answer checking.
 */
App.QuestionRenderer = {
    render(q, containerId, showAnswer = false, userAnswer = null, questionIndex = null) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const html = this.buildHtml(q, userAnswer);
        const feedbackHtml = showAnswer && userAnswer != null ? this.renderFeedback(q, userAnswer) : '';

        // Determine correct ID suffixes based on container
        const mapId = (localId) => {
            const prefix = containerId.replace('-question', '');
            return `${prefix}-${localId}`;
        };

        const qnumHtml = questionIndex != null
            ? `<div class="question-number" id="${mapId('qnum')}">第 ${questionIndex} 题</div>`
            : '';

        container.innerHTML = `
            ${qnumHtml}
            <div class="question-header">
                <span class="q-type type-${q.type}">${q.type}</span>
                ${q.source ? `<span class="q-source">📖 ${escapeHtml(q.source)}</span>` : ''}
            </div>
            <div class="question-text" id="${mapId('qtext')}">${escapeHtml(q.question)}</div>
            <div class="options-list" id="${mapId('options')}">${html}</div>
            <div class="question-explanation" id="${mapId('feedback')}">${feedbackHtml}</div>
        `;
    },

    buildHtml(q, userAnswer) {
        if (q.type === '简答') {
            return `<textarea class="short-answer-input" id="answerInput-${q.id}"
                placeholder="请输入你的答案..." rows="4">${escapeHtml(userAnswer || '')}</textarea>`;
        }
        if (!q.options || q.options.length === 0) return '<p class="no-options">无选项</p>';
        const isMulti = q.type === '多选';
        const inputType = isMulti ? 'checkbox' : 'radio';
        const name = `q_${q.id}`;
        let html = q.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const value = (q.type === '判断') ? opt : letter;
            const checked = userAnswer ? userAnswer.includes(value) : false;
            return `<label class="option-item ${checked ? 'selected' : ''}">
                <input type="${inputType}" name="${name}" value="${value}" ${checked ? 'checked' : ''}>
                <span class="option-letter">${letter}</span>
                <span class="option-text">${escapeHtml(opt)}</span>
            </label>`;
        }).join('');
        if (isMulti && !userAnswer) {
            html += `<label class="option-item" style="border:1px dashed var(--border);background:var(--bg);cursor:pointer;user-select:none;">
                <input type="checkbox" id="select-all-${q.id}" style="width:18px;height:18px;cursor:pointer;">
                <span style="font-size:14px;color:var(--text-light);font-weight:500;">☑️ 全选</span>
            </label>`;
        }
        return html;
    },

    renderFeedback(q, userAnswer) {
        const isCorrect = this.checkAnswer(q, userAnswer);
        const icon = isCorrect ? '✅' : '❌';
        const color = isCorrect ? 'var(--success)' : 'var(--danger)';
        let extra = '';
        if (!isCorrect) {
            if (q.type === '简答' && q.keyPoints.length > 0) {
                extra = `<div class="key-points">得分点：${q.keyPoints.join('、')}</div>`;
            } else {
                extra = `<div>正确答案：<strong>${escapeHtml(q.type === '判断' ? getJudgmentDisplayText(q.answer) : q.answer)}</strong></div>`;
            }
        }
        const exp = q.explanation ? `<div class="exp-text">📖 ${escapeHtml(q.explanation)}</div>` : '';
        return `<div class="feedback" style="border-left:4px solid ${color};">
            <div class="fb-icon" style="color:${color};">${icon} ${isCorrect ? '正确' : '错误'}</div>
            ${extra}${exp}</div>`;
    },

    setupSelectAll(q) {
        const selectAll = document.getElementById(`select-all-${q.id}`);
        if (!selectAll || q.type !== '多选') return;
        const container = selectAll.closest('.options-list');
        if (!container) return;
        const checkboxes = Array.from(container.querySelectorAll('input[type="checkbox"]')).filter(cb => cb.id !== `select-all-${q.id}`);
        selectAll.addEventListener('change', () => {
            checkboxes.forEach(cb => { cb.checked = selectAll.checked; });
        });
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                if (!cb.checked) selectAll.checked = false;
                else if (Array.from(checkboxes).every(c => c.checked)) selectAll.checked = true;
            });
        });
    },

    checkAnswer(q, userAnswer) {
        if (!userAnswer) return false;
        if (q.type === '简答') {
            if (q.keyPoints.length === 0) return false;
            const matched = q.keyPoints.filter(kp =>
                userAnswer.toLowerCase().includes(kp.toLowerCase()));
            return matched.length / q.keyPoints.length >= 0.5;
        }
        const norm = s => s.replace(/[\s,，、；;.．]/g, '').toUpperCase();
        const user = norm(userAnswer);
        const ans = norm(q.answer);
        if (q.type === '判断') {
            const normalize = s => {
                if (['T', 'TRUE', '对', '正确', 'YES', 'A'].includes(s)) return '对';
                if (['F', 'FALSE', '错', '错误', 'NO', 'B'].includes(s)) return '错';
                return '错';
            };
            return normalize(user) === normalize(ans);
        }
        if (q.type === '多选') {
            return user.split('').sort().join('') === ans.split('').sort().join('');
        }
        return user === ans;
    },

    getOptionsContainer(q) {
        const selectAll = document.getElementById(`select-all-${q.id}`);
        return selectAll ? selectAll.closest('.options-list') : null;
    },
    getQuestionCard(q) {
        const container = this.getOptionsContainer(q);
        return container ? container.parentElement : null;
    },

    getSelectedAnswer(q) {
        if (q.type === '简答') {
            return document.getElementById(`answerInput-${q.id}`)?.value || '';
        }
        const checked = document.querySelectorAll(`input[name="q_${q.id}"]:checked`);
        const vals = Array.from(checked).map(i => i.value);
        if (q.type === '单选' || q.type === '判断') return vals[0] || '';
        return vals.sort().join('');
    }
};