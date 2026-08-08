/**
 * Exam Treasure - Main Module
 * Event wiring, initialization, and DOMContentLoaded handler.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Home page buttons
    document.getElementById('btnViewAll')?.addEventListener('click', () => {
        const qs = App.DataStore.loadQuestions();
        if (qs.length === 0) { alert('暂无数据'); return; }
        let html = '<input type="text" id="searchInput" placeholder="🔍 搜索题目..." class="search-input">';
        html += '<div class="table-wrap"><table class="q-table"><thead><tr><th>#</th><th>题型</th><th>题目</th><th>答案</th></tr></thead><tbody>';
        qs.forEach(q => {
            const qtext = escapeHtml(q.question);
            html += `<tr><td>${q.id}</td><td>${q.type}</td><td>${qtext.length > 60 ? qtext.substring(0, 60) + '...' : qtext}</td><td>${escapeHtml(q.answer)}</td></tr>`;
        });
        html += '</tbody></table></div>';
        App.Modal.open(`全部题目 (${qs.length} 道)`, html);
        setTimeout(() => {
            document.getElementById('searchInput')?.addEventListener('input', function() {
                const kw = this.value.toLowerCase();
                document.querySelectorAll('.q-table tbody tr').forEach(row => {
                    const text = row.cells[2]?.textContent?.toLowerCase() || '';
                    const type = row.cells[1]?.textContent?.toLowerCase() || '';
                    row.style.display = (text.includes(kw) || type.includes(kw)) ? '' : 'none';
                });
            });
        }, 100);
    });

    // Template download
    document.getElementById('btnDownloadTemplate')?.addEventListener('click', App.downloadTemplate);

    // Back buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Check if exam is in progress (exam page visible with timer running)
            const examPage = document.getElementById('page-exam');
            if (examPage && examPage.style.display !== 'none' && App.ExamMode.timerInterval) {
                if (!confirm('考试正在进行中，确定要退出吗？\n退出后答题进度将丢失！')) return;
                clearInterval(App.ExamMode.timerInterval);
            }
            App.HomePage.render();
            App.showPage('page-home');
        });
    });

    // Modal close
    document.getElementById('modal-overlay')?.addEventListener('click', function(e) {
        if (e.target === this) App.Modal.close();
    });
    document.getElementById('modal-close')?.addEventListener('click', () => App.Modal.close());

    // Practice nav
    document.getElementById('practice-prev')?.addEventListener('click', () => App.PracticeMode.prev());
    document.getElementById('practice-next')?.addEventListener('click', () => App.PracticeMode.next());

    // Exam config
    document.getElementById('exam-start')?.addEventListener('click', () => App.ExamMode.start());

    // Exam nav
    document.getElementById('exam-prev')?.addEventListener('click', () => App.ExamMode.prev());
    document.getElementById('exam-next')?.addEventListener('click', () => App.ExamMode.next());
    document.getElementById('exam-submit')?.addEventListener('click', () => App.ExamMode.submit());

    // Exam result
    document.getElementById('result-home')?.addEventListener('click', () => { App.HomePage.render(); App.showPage('page-home'); });
    document.getElementById('result-wrongbook')?.addEventListener('click', () => App.WrongBookMode.start());

    // Wrong book nav
    document.getElementById('wrongbook-prev')?.addEventListener('click', () => App.WrongBookMode.prev());
    document.getElementById('wrongbook-next')?.addEventListener('click', () => App.WrongBookMode.next());
    document.getElementById('wrongbook-clear')?.addEventListener('click', () => App.WrongBookMode.clear());
    document.getElementById('wrongbook-export')?.addEventListener('click', () => App.WrongBookMode.export());

    // Filter chip visual toggle
    document.querySelectorAll('.filter-chip').forEach(label => {
        const cb = label.querySelector('input[type="checkbox"]');
        if (cb) {
            const update = () => label.classList.toggle('active', cb.checked);
            cb.addEventListener('change', update);
            update();
        }
    });

    // Config type chip visual toggle
    document.querySelectorAll('.config-type-chip').forEach(label => {
        const cb = label.querySelector('input[type="checkbox"]');
        if (cb) {
            const update = () => label.classList.toggle('active', cb.checked);
            cb.addEventListener('change', update);
            update();
        }
    });

    // Init
    App.HomePage.init();
    App.HomePage.render();
    App.showPage('page-home');
});