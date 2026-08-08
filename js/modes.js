/**
 * Exam Treasure - Modes Module
 * Handles Practice, Exam, and Wrong Book modes.
 */

// ─── Practice Mode ────────────────────────────
App.PracticeMode = {
    questions: [], currentIndex: 0, answers: {}, results: {},
    correctCount: 0, totalAnswered: 0,
    started: false,

    start() {
        const allQ = App.DataStore.loadQuestions();
        if (allQ.length === 0) { alert('请先上传题库！'); return; }
        const selectedTypes = [];
        document.querySelectorAll('#filterBar input[type="checkbox"]:checked')
            .forEach(cb => selectedTypes.push(cb.value));
        console.log('[DEBUG PracticeMode] selectedTypes:', JSON.stringify(selectedTypes));
        console.log('[DEBUG PracticeMode] all question types:', JSON.stringify([...new Set(allQ.map(q => q.type))]));
        this.questions = allQ.filter(q => selectedTypes.includes(q.type));
        console.log('[DEBUG PracticeMode] filtered count:', this.questions.length, 'types:', JSON.stringify([...new Set(this.questions.map(q => q.type))]));
        if (this.questions.length === 0) { alert('没有匹配的题目，请调整筛选条件'); return; }
        if (document.getElementById('shuffleQuestions').checked)
            this.questions = shuffleByType(this.questions);
        if (document.getElementById('shuffleOptions').checked)
            this.questions.forEach(q => { shuffleOptionsWithAnswer(q); });
        this.currentIndex = 0; this.answers = {}; this.results = {};
        this.correctCount = 0; this.totalAnswered = 0; this.started = true;
        App.showPage('page-practice');
        this.renderQuestion();
    },

    renderQuestion() {
        if (!this.started || this.currentIndex >= this.questions.length) return;
        const q = this.questions[this.currentIndex];
        const userAnswer = this.answers[q.id] || null;
        const showAnswer = userAnswer != null;
        App.QuestionRenderer.render(q, 'practice-question', showAnswer, userAnswer, this.currentIndex + 1);
        document.getElementById('practice-progress').textContent =
            `${this.currentIndex + 1}/${this.questions.length}`;
        const pct = ((this.currentIndex + 1) / this.questions.length) * 100;
        document.getElementById('practice-progress-bar').style.width = pct + '%';
        document.getElementById('practice-prev').disabled = this.currentIndex === 0;
        const isLast = this.currentIndex === this.questions.length - 1;
        document.getElementById('practice-next').textContent = isLast ? '📊 查看结果' : '下一题 ➡';
        this.bindAnswerCheck(q);
    },

    bindAnswerCheck(q) {
        if (this.answers[q.id] !== undefined) return;

        if (q.type === '多选') {
            setTimeout(() => {
                App.QuestionRenderer.setupSelectAll(q);
                const container = App.QuestionRenderer.getOptionsContainer(q);
                if (!container) return;
                const card = container.parentElement;
                const old = card.querySelector('.multi-confirm-btn');
                if (old) old.remove();
                const btn = document.createElement('button');
                btn.className = 'btn btn-primary multi-confirm-btn';
                btn.textContent = '✅ 确定选择';
                btn.style.cssText = 'margin-top:12px;width:100%;';
                btn.addEventListener('click', () => {
                    const answer = App.QuestionRenderer.getSelectedAnswer(q);
                    if (!answer) { alert('请先选择答案'); return; }
                    this.answers[q.id] = answer;
                    const isCorrect = App.QuestionRenderer.checkAnswer(q, answer);
                    this.results[q.id] = isCorrect;
                    this.totalAnswered++;
                    if (isCorrect) this.correctCount++;
                    App.QuestionRenderer.render(q, 'practice-question', true, answer, this.currentIndex + 1);
                    this.updateWrongBook(q, isCorrect);
                    btn.style.display = 'none';
                });
                card.appendChild(btn);
            }, 50);
            return;
        }

        const check = () => {
            const answer = App.QuestionRenderer.getSelectedAnswer(q);
            if (!answer) return;
            this.answers[q.id] = answer;
            const isCorrect = App.QuestionRenderer.checkAnswer(q, answer);
            this.results[q.id] = isCorrect;
            this.totalAnswered++;
            if (isCorrect) this.correctCount++;
            App.QuestionRenderer.render(q, 'practice-question', true, answer, this.currentIndex + 1);
            this.updateWrongBook(q, isCorrect);
            if (isCorrect) {
                const savedIndex = this.currentIndex;
                setTimeout(() => {
                    if (this.currentIndex === savedIndex) {
                        this.next();
                    }
                }, 600);
            }
        };
        setTimeout(() => {
            if (q.type === '简答') {
                document.getElementById(`answerInput-${q.id}`)
                    ?.addEventListener('blur', check);
            } else {
                document.querySelectorAll(`input[name="q_${q.id}"]`).forEach(el => {
                    el.addEventListener('change', check);
                });
            }
        }, 50);
    },

    prev() {
        if (this.currentIndex > 0) { this.currentIndex--; this.renderQuestion(); }
    },
    next() {
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++; this.renderQuestion();
        } else {
            this.finish();
        }
    },

    finish() {
        const total = this.questions.length;
        const rate = total > 0 ? Math.round((this.correctCount / total) * 100) : 0;
        const stats = App.DataStore.loadStats();
        stats.totalPracticeCount++;
        stats.totalAccuracy = (stats.totalAccuracy * (stats.totalPracticeCount - 1) + rate / 100) / stats.totalPracticeCount;
        App.DataStore.saveStats(stats);
        document.getElementById('practice-question').innerHTML = `
            <div class="finish-screen">
                <div class="finish-icon">🎉</div>
                <h2>练习完成！</h2>
                <div class="finish-stats">
                    <p>共 <strong>${total}</strong> 题</p>
                    <p>答对 <strong>${this.correctCount}</strong> 题</p>
                    <p>正确率 <strong class="${rate >= 70 ? 'text-success' : 'text-danger'}">${rate}%</strong></p>
                    <p>错题 <strong>${Object.keys(App.DataStore.loadWrongBook()).length}</strong> 道</p>
                </div>
                <button class="btn btn-primary" onclick="App.PracticeMode.start()">再来一次</button>
                <button class="btn btn-secondary" onclick="App.HomePage.render();App.showPage('page-home');">返回首页</button>
            </div>`;
        document.getElementById('practice-next').style.display = 'none';
        document.getElementById('practice-prev').style.display = 'none';
    },

    updateWrongBook(q, isCorrect) {
        if (q.type === '简答') return;
        const wb = App.DataStore.loadWrongBook();
        const key = String(q.id);
        if (!isCorrect) {
            if (!wb[key]) wb[key] = { wrongCount: 0, correctCount: 0 };
            wb[key].wrongCount++;
        } else {
            if (wb[key]) {
                wb[key].correctCount++;
                if (wb[key].correctCount >= 3) delete wb[key];
            }
        }
        App.DataStore.saveWrongBook(wb);
    }
};

// ─── Exam Mode ────────────────────────────────
App.ExamMode = {
    questions: [], currentIndex: 0, answers: {},
    scorePerQuestion: 5, totalScore: 0,
    timerInterval: null, remainingSeconds: 0, durationMinutes: 0,

    showConfig() {
        const allQ = App.DataStore.loadQuestions();
        if (allQ.length === 0) { alert('请先上传题库！'); return; }
        document.querySelectorAll('#page-exam-config input[type="checkbox"]')
            .forEach(cb => { cb.checked = true; });
        const available = allQ.filter(q => q.type !== '简答');
        const countEl = document.getElementById('examCount');
        countEl.max = available.length;
        countEl.value = Math.min(parseInt(countEl.value) || 20, available.length);
        App.showPage('page-exam-config');
    },

    start() {
        const allQ = App.DataStore.loadQuestions();
        const types = [];
        document.querySelectorAll('#page-exam-config .config-type-options input[type="checkbox"]:checked')
            .forEach(cb => types.push(cb.value === 'single' ? '单选' : cb.value === 'multi' ? '多选' : '判断'));
        console.log('[DEBUG ExamMode] Selected types:', JSON.stringify(types), '| Source checkbox values:', JSON.stringify(Array.from(document.querySelectorAll('#page-exam-config .config-type-options input[type=\"checkbox\"]:checked')).map(cb => cb.value)));
        if (types.length === 0) { alert('请至少选择一种题型'); return; }
        const count = Math.min(parseInt(document.getElementById('examCount').value) || 20, allQ.length);
        this.scorePerQuestion = parseInt(document.getElementById('examScore').value) || 5;
        this.durationMinutes = parseInt(document.getElementById('examDuration').value) || 30;
        const poolByType = {};
        types.forEach(t => {
            const typed = allQ.filter(q => q.type === t);
            poolByType[t] = shuffle(typed);
        });
        this.questions = [];
        let totalPicked = 0;
        const idx = {};
        types.forEach(t => { idx[t] = 0; });
        while (totalPicked < count) {
            let anyAvailable = false;
            for (const t of types) {
                if (totalPicked >= count) break;
                if (idx[t] < poolByType[t].length) {
                    this.questions.push(poolByType[t][idx[t]++]);
                    totalPicked++;
                    anyAvailable = true;
                }
            }
            if (!anyAvailable) break;
        }
        if (document.getElementById('exam-shuffleQuestions').checked)
            this.questions = shuffleByType(this.questions);
        if (document.getElementById('exam-shuffleOptions').checked)
            this.questions.forEach(q => { shuffleOptionsWithAnswer(q); });
        this.currentIndex = 0; this.answers = {};
        this.totalScore = count * this.scorePerQuestion;
        this.remainingSeconds = this.durationMinutes * 60;
        App.showPage('page-exam');
        this.renderQuestion();
        this.renderPanel();
        this.startTimer();
    },

    renderQuestion() {
        const q = this.questions[this.currentIndex];
        const userAnswer = this.answers[q.id] || null;
        App.QuestionRenderer.render(q, 'exam-question', false, userAnswer, this.currentIndex + 1);
        document.getElementById('exam-progress').textContent =
            `${this.currentIndex + 1}/${this.questions.length}`;
        document.getElementById('exam-prev').disabled = this.currentIndex === 0;
        this.renderPanel();
        setTimeout(() => {
            if (this.answers[q.id] !== undefined) return;
            document.querySelectorAll(`input[name="q_${q.id}"]`).forEach(el => {
                el.addEventListener('change', () => {
                    this.answers[q.id] = App.QuestionRenderer.getSelectedAnswer(q);
                    this.renderPanel();
                });
            });
            if (q.type === '多选') {
                App.QuestionRenderer.setupSelectAll(q);
                const container = App.QuestionRenderer.getOptionsContainer(q);
                if (!container) return;
                const card = container.parentElement;
                const old = card.querySelector('.multi-confirm-btn');
                if (old) old.remove();
                const btn = document.createElement('button');
                btn.className = 'btn btn-primary multi-confirm-btn';
                btn.textContent = '✅ 确定';
                btn.addEventListener('click', () => {
                    const answer = App.QuestionRenderer.getSelectedAnswer(q);
                    if (!answer) { alert('请先选择答案'); return; }
                    this.answers[q.id] = answer;
                    this.renderPanel();
                });
                card.appendChild(btn);
            }
        }, 50);
    },

    renderPanel() {
        const grid = document.getElementById('exam-qnum-grid');
        if (!grid) return;
        grid.innerHTML = this.questions.map((q, i) => {
            const answered = this.answers[q.id] !== undefined;
            const isCurrent = i === this.currentIndex;
            return `<div class="panel-num ${answered ? 'answered' : ''} ${isCurrent ? 'current' : ''}"
                onclick="App.ExamMode.goTo(${i})">${i + 1}</div>`;
        }).join('');
    },

    goTo(index) { this.currentIndex = index; this.renderQuestion(); },
    prev() { if (this.currentIndex > 0) { this.currentIndex--; this.renderQuestion(); } },
    next() { if (this.currentIndex < this.questions.length - 1) { this.currentIndex++; this.renderQuestion(); } },

    startTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.remainingSeconds--;
            if (this.remainingSeconds <= 0) {
                clearInterval(this.timerInterval);
                alert('⏰ 时间到！自动交卷');
                this.finish(); return;
            }
            const m = Math.floor(this.remainingSeconds / 60);
            const s = this.remainingSeconds % 60;
            const timerEl = document.getElementById('exam-timer');
            if (timerEl) {
                timerEl.textContent = `⏱ ${m}:${String(s).padStart(2, '0')}`;
                if (this.remainingSeconds < 60) timerEl.style.color = 'var(--danger)';
            }
        }, 1000);
    },

    submit() {
        const unanswered = this.questions.filter(q => this.answers[q.id] === undefined).length;
        if (unanswered > 0 && !confirm(`还有 ${unanswered} 题未作答，确定提交吗？`)) return;
        clearInterval(this.timerInterval);
        this.finish();
    },

    finish() {
        clearInterval(this.timerInterval);
        const used = this.durationMinutes * 60 - this.remainingSeconds;
        const details = this.questions.map(q => {
            const ua = this.answers[q.id] || '';
            return { q, userAnswer: ua, isCorrect: App.QuestionRenderer.checkAnswer(q, ua) };
        });
        const correctCount = details.filter(d => d.isCorrect).length;
        const score = correctCount * this.scorePerQuestion;
        const stats = App.DataStore.loadStats();
        stats.examRecords.push({
            date: new Date().toISOString().split('T')[0],
            score, total: this.totalScore,
            duration: Math.round(used / 60),
            detailsCount: details.length
        });
        App.DataStore.saveStats(stats);
        details.forEach(d => {
            if (d.q.type !== '简答' && !d.isCorrect) {
                const wb = App.DataStore.loadWrongBook();
                const key = String(d.q.id);
                if (!wb[key]) wb[key] = { wrongCount: 0, correctCount: 0 };
                wb[key].wrongCount++;
                App.DataStore.saveWrongBook(wb);
            }
        });
        this.renderResult(details, score, used);
    },

    renderResult(details, score, usedSeconds) {
        const rate = this.totalScore > 0 ? Math.round((score / this.totalScore) * 100) : 0;
        const min = Math.floor(usedSeconds / 60);
        const sec = usedSeconds % 60;
        document.getElementById('result-score').textContent = `${score}/${this.totalScore}`;
        document.getElementById('result-total').textContent = `正确率 ${rate}%`;
        document.getElementById('result-correct').textContent = details.filter(d => d.isCorrect).length;
        document.getElementById('result-incorrect').textContent = details.filter(d => !d.isCorrect && d.userAnswer).length;
        document.getElementById('result-time').textContent = `${min}分${sec}秒`;
        const icon = document.getElementById('result-icon');
        if (icon) icon.textContent = rate >= 60 ? '🎉' : '😅';

        const list = document.getElementById('result-list');
        list.innerHTML = details.map((d, i) => {
            const icon = d.isCorrect ? '✅' : '❌';
            const color = d.isCorrect ? 'var(--success)' : 'var(--danger)';
            return `<div class="result-item" style="border-left:3px solid ${color};">
                <div class="ri-header">
                    <span>#${i + 1} <span class="q-type-sm">${d.q.type}</span></span>
                    <span class="${d.isCorrect ? 'text-success' : 'text-danger'}">${icon} ${d.isCorrect ? '+' + this.scorePerQuestion + '分' : '0分'}</span>
                </div>
                <div class="ri-q">${escapeHtml(d.q.question)}</div>
                ${!d.isCorrect ? `<div class="ri-ans">正确答案: <strong>${escapeHtml(d.q.type === '判断' ? getJudgmentDisplayText(d.q.answer) : d.q.answer)}</strong></div>` : ''}
                ${d.q.explanation ? `<div class="ri-exp">📖 ${escapeHtml(d.q.explanation)}</div>` : ''}
            </div>`;
        }).join('');
        App.showPage('page-exam-result');
    }
};

// ─── Wrong Book Mode ──────────────────────────
App.WrongBookMode = {
    questions: [], currentIndex: 0, answers: {}, results: {}, correctCount: 0,

    start() {
        let wb = App.DataStore.loadWrongBook();
        // Remove entries where correctCount >= 3 (mastered)
        let changed = false;
        Object.keys(wb).forEach(key => {
            if (wb[key].correctCount >= 3) {
                delete wb[key];
                changed = true;
            }
        });
        if (changed) App.DataStore.saveWrongBook(wb);
        const keys = Object.keys(wb);
        const hasItems = keys.length > 0;
        App.showPage('page-wrongbook');
        document.getElementById('wrongbook-total').textContent = `📚 共 ${keys.length} 道错题`;
        document.getElementById('wrongbook-clear').disabled = !hasItems;
        document.getElementById('wrongbook-export').disabled = !hasItems;
        if (!hasItems) {
            document.getElementById('wrongbook-empty').style.display = 'block';
            document.getElementById('wrongbook-question').style.display = 'none';
            document.getElementById('wrongbook-nav').style.display = 'none';
            document.getElementById('wrongbook-progress').textContent = '0/0';
            document.getElementById('wrongbook-progress-bar').style.width = '0%';
            return;
        }
        const allQ = App.DataStore.loadQuestions();
        this.questions = allQ.filter(q => keys.includes(String(q.id)) && q.type !== '简答');
        if (this.questions.length === 0) {
            document.getElementById('wrongbook-empty').style.display = 'block';
            document.getElementById('wrongbook-question').style.display = 'none';
            document.getElementById('wrongbook-nav').style.display = 'none';
            return;
        }
        if (document.getElementById('shuffleQuestions').checked)
            this.questions = shuffleByType(this.questions);
        if (document.getElementById('shuffleOptions').checked)
            this.questions.forEach(q => { shuffleOptionsWithAnswer(q); });
        this.currentIndex = 0; this.answers = {}; this.results = {}; this.correctCount = 0;
        document.getElementById('wrongbook-empty').style.display = 'none';
        document.getElementById('wrongbook-question').style.display = 'block';
        document.getElementById('wrongbook-nav').style.display = 'flex';
        document.getElementById('wrongbook-total').textContent = `📚 共 ${this.questions.length} 道错题`;
        this.renderQuestion();
    },

    renderQuestion() {
        const q = this.questions[this.currentIndex];
        const userAnswer = this.answers[q.id] || null;
        App.QuestionRenderer.render(q, 'wrongbook-question', userAnswer != null, userAnswer, this.currentIndex + 1);
        const wb = App.DataStore.loadWrongBook();
        const rec = wb[String(q.id)] || {};
        const info = document.createElement('div');
        info.className = 'wrongbook-info';
        info.innerHTML = `❌ 已错 ${rec.wrongCount || 0} 次 | ✅ 已对 ${rec.correctCount || 0}/3 次`;
        document.getElementById('wrongbook-question').appendChild(info);
        document.getElementById('wrongbook-progress').textContent =
            `${this.currentIndex + 1}/${this.questions.length}`;
        const pct = ((this.currentIndex + 1) / this.questions.length) * 100;
        document.getElementById('wrongbook-progress-bar').style.width = pct + '%';
        document.getElementById('wrongbook-prev').disabled = this.currentIndex === 0;
        const isLast = this.currentIndex === this.questions.length - 1;
        document.getElementById('wrongbook-next').textContent = isLast ? '📊 查看结果' : '下一题 ➡';
        this.bindAnswerCheck(q);
    },

    bindAnswerCheck(q) {
        if (q.type === '多选') {
            setTimeout(() => {
                App.QuestionRenderer.setupSelectAll(q);
                const container = App.QuestionRenderer.getOptionsContainer(q);
                if (!container) return;
                const card = container.parentElement;
                const old = card.querySelector('.multi-confirm-btn');
                if (old) old.remove();
                const btn = document.createElement('button');
                btn.className = 'btn btn-primary multi-confirm-btn';
                btn.textContent = '✅ 确定选择';
                btn.style.cssText = 'margin-top:12px;width:100%;';
                btn.addEventListener('click', () => {
                    const answer = App.QuestionRenderer.getSelectedAnswer(q);
                    if (!answer) { alert('请先选择答案'); return; }
                    this.answers[q.id] = answer;
                    const isCorrect = App.QuestionRenderer.checkAnswer(q, answer);
                    this.results[q.id] = isCorrect;
                    if (isCorrect) this.correctCount++;
                    this.updateWrongBook(q, isCorrect);
                    App.QuestionRenderer.render(q, 'wrongbook-question', true, answer, this.currentIndex + 1);
                    const wb = App.DataStore.loadWrongBook();
                    const key = String(q.id);
                    const rec = wb[key] || { wrongCount: 0, correctCount: 0 };
                    const info = document.createElement('div');
                    info.className = 'wrongbook-info';
                    info.innerHTML = `❌ 已错 ${rec.wrongCount} 次 | ✅ 已对 ${rec.correctCount}/3 次`;
                    document.getElementById('wrongbook-question').appendChild(info);
                    btn.style.display = 'none';
                    if (isCorrect) {
                        const savedIndex = this.currentIndex;
                        setTimeout(() => {
                            if (this.currentIndex === savedIndex) {
                                this.next();
                            }
                        }, 600);
                    }
                });
                card.appendChild(btn);
            }, 50);
            return;
        }
        const check = () => {
            const answer = App.QuestionRenderer.getSelectedAnswer(q);
            if (!answer) return;
            this.answers[q.id] = answer;
            const isCorrect = App.QuestionRenderer.checkAnswer(q, answer);
            this.results[q.id] = isCorrect;
            if (isCorrect) this.correctCount++;
            this.updateWrongBook(q, isCorrect);
            App.QuestionRenderer.render(q, 'wrongbook-question', true, answer, this.currentIndex + 1);
            const wb = App.DataStore.loadWrongBook();
            const key = String(q.id);
            const rec = wb[key] || { wrongCount: 0, correctCount: 0 };
            const info = document.createElement('div');
            info.className = 'wrongbook-info';
            info.innerHTML = `❌ 已错 ${rec.wrongCount} 次 | ✅ 已对 ${rec.correctCount}/3 次`;
            document.getElementById('wrongbook-question').appendChild(info);
            if (isCorrect) {
                const savedIndex = this.currentIndex;
                setTimeout(() => {
                    if (this.currentIndex === savedIndex) {
                        this.next();
                    }
                }, 600);
            }
        };
        setTimeout(() => {
            document.querySelectorAll(`input[name="q_${q.id}"]`).forEach(el => {
                el.addEventListener('change', check, { once: true });
            });
        }, 50);
    },

    updateWrongBook(q, isCorrect) {
        if (q.type === '简答') return;
        const wb = App.DataStore.loadWrongBook();
        const key = String(q.id);
        if (!isCorrect) {
            if (!wb[key]) wb[key] = { wrongCount: 0, correctCount: 0 };
            wb[key].wrongCount++;
        } else {
            if (wb[key]) {
                wb[key].correctCount++;
                if (wb[key].correctCount >= 3) delete wb[key];
            }
        }
        App.DataStore.saveWrongBook(wb);
    },

    prev() { if (this.currentIndex > 0) { this.currentIndex--; this.renderQuestion(); } },
    next() {
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++; this.renderQuestion();
        } else { this.finish(); }
    },

    finish() {
        const remaining = Object.keys(App.DataStore.loadWrongBook()).length;
        const total = this.questions.length;
        const html = remaining === 0
            ? `<div class="finish-screen"><div class="finish-icon">🎉</div><h2>错题已清零！</h2><p>太棒了，所有错题都已熟练掌握！</p></div>`
            : `<div class="finish-screen"><div class="finish-icon">📚</div><h2>错题练习完成</h2><p>本轮 ${total} 题中做对 ${this.correctCount} 题</p><p>仍有 <strong>${remaining}</strong> 道错题需继续练习</p></div>`;
        document.getElementById('wrongbook-question').innerHTML = html;
        document.getElementById('wrongbook-next').style.display = 'none';
        document.getElementById('wrongbook-prev').style.display = 'none';
    },

    clear() {
        App.Modal.show('确认清空', '确定要清空所有错题吗？此操作不可撤销！', [
            { text: '取消', class: 'btn-secondary', action: () => App.Modal.close() },
            { text: '确认清空', class: 'btn-danger', action: () => {
                App.DataStore.saveWrongBook({});
                App.Modal.close();
                this.questions = [];
                this.currentIndex = 0;
                document.getElementById('wrongbook-question').style.display = 'none';
                document.getElementById('wrongbook-nav').style.display = 'none';
                document.getElementById('wrongbook-empty').style.display = 'block';
                document.getElementById('wrongbook-total').textContent = '📚 共 0 道错题';
                document.getElementById('wrongbook-clear').disabled = true;
                document.getElementById('wrongbook-export').disabled = true;
                document.getElementById('wrongbook-progress').textContent = '0/0';
                document.getElementById('wrongbook-progress-bar').style.width = '0%';
            }}
        ]);
    },

    export() {
        const wb = App.DataStore.loadWrongBook();
        const keys = Object.keys(wb);
        if (keys.length === 0) { alert('🎉 暂无错题可导出！'); return; }
        const allQ = App.DataStore.loadQuestions();
        const wrongQs = allQ.filter(q => keys.includes(String(q.id)));
        const rows = wrongQs.map(q => {
            const rec = wb[String(q.id)] || {};
            const opts = q.options || [];
            return {
                '题号': q.id,
                '题型': q.type,
                '题目': q.question,
                '正确答案': q.answer,
                '选项A': opts[0] || '',
                '选项B': opts[1] || '',
                '选项C': opts[2] || '',
                '选项D': opts[3] || '',
                '解析': q.explanation || '',
                '已错次数': rec.wrongCount || 0,
                '已对次数': rec.correctCount || 0
            };
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wbFile = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wbFile, ws, '错题');
        const colWidths = [
            { wch: 6 }, { wch: 8 }, { wch: 50 },
            { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 },
            { wch: 40 }, { wch: 10 }, { wch: 10 }
        ];
        ws['!cols'] = colWidths;
        XLSX.writeFile(wbFile, `错题本_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
};