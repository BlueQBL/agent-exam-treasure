/**
 * Exam Treasure - UI Module
 * Handles page switching, home page, modal dialogs, and template download.
 */

App.showPage = function(pageId) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
};

App.HomePage = {
    init() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('fileInput');
        if (!uploadArea || !fileInput) return;

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', e => e.preventDefault());
        uploadArea.addEventListener('drop', e => {
            e.preventDefault();
            if (e.dataTransfer.files[0]) this.handleFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', e => {
            if (e.target.files[0]) this.handleFile(e.target.files[0]);
        });

        document.getElementById('btnClearData').addEventListener('click', () => {
            if (confirm('确定清除所有数据？不可恢复！')) {
                App.DataStore.clear();
                this.render();
            }
        });
        document.getElementById('btnPractice').addEventListener('click', () => App.PracticeMode.start());
        document.getElementById('btnExam').addEventListener('click', () => App.ExamMode.showConfig());
        document.getElementById('btnWrongBook').addEventListener('click', () => App.WrongBookMode.start());
    },

    render() {
        document.querySelectorAll('#filterBar input[type="checkbox"]')
            .forEach(cb => { cb.checked = true; });
        const questions = App.DataStore.loadQuestions();
        const loadInfo = document.getElementById('load-info');
        const dataActions = document.getElementById('data-actions');
        if (questions.length > 0 && loadInfo) {
            loadInfo.style.display = 'flex';
            document.getElementById('load-info-text').textContent =
                `✅ 已加载 ${questions.length} 道题`;
            const types = {};
            questions.forEach(q => { types[q.type] = (types[q.type] || 0) + 1; });
            const breakdown = Object.entries(types).map(([k, v]) => `${k} ${v}道`).join(' ');
            const sub = loadInfo.querySelector('.type-breakdown') || (() => {
                const el = document.createElement('span');
                el.className = 'type-breakdown';
                loadInfo.appendChild(el);
                return el;
            })();
            sub.textContent = ' (' + breakdown + ')';
            dataActions.style.display = 'flex';
        } else {
            if (loadInfo) loadInfo.style.display = 'none';
            if (dataActions) dataActions.style.display = 'none';
        }
        this.renderStats();
    },

    renderStats() {
        const stats = App.DataStore.loadStats();
        const elTotal = document.getElementById('stat-total');
        const elAccuracy = document.getElementById('stat-accuracy');
        if (elTotal) {
            const qs = App.DataStore.loadQuestions();
            elTotal.textContent = qs.length || 0;
        }
        const elPracticed = document.getElementById('stat-practiced');
        if (elPracticed) {
            elPracticed.textContent = stats.totalPracticeCount || 0;
        }
        if (elAccuracy) {
            elAccuracy.textContent =
                stats.totalAccuracy > 0 ? Math.round(stats.totalAccuracy * 100) + '%' : '0%';
        }
    },

    handleFile(file) {
        if (!file.name.match(/\.xlsx?$/i)) { alert('请选择 .xlsx 或 .xls 文件'); return; }
        document.getElementById('load-info-text').textContent = '⏳ 正在解析...';
        document.getElementById('load-info').style.display = 'flex';
        App.ExcelParser.parse(file).then(questions => {
            const valid = questions.filter(q => q !== null);
            if (valid.length === 0) { alert('未解析到有效题目，请检查文件格式'); return; }
            App.DataStore.clear();
            App.DataStore.saveQuestions(valid);
            this.render();
            alert(`✅ 成功加载 ${valid.length} 道题！`);
        }).catch(err => {
            alert('文件解析失败：' + err.message);
            document.getElementById('load-info').style.display = 'none';
        });
    }
};

App.Modal = {
    open(title, content) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        const oldFooter = document.querySelector('.modal-footer');
        if (oldFooter) oldFooter.remove();
        document.getElementById('modal-overlay').style.display = 'flex';
    },
    close() { document.getElementById('modal-overlay').style.display = 'none'; },
    show(title, content, buttons) {
        document.getElementById('modal-title').textContent = title;
        const oldFooter = document.querySelector('.modal-footer');
        if (oldFooter) oldFooter.remove();
        document.getElementById('modal-body').innerHTML = content;
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        footer.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;padding:16px 24px;border-top:1px solid var(--border);margin-top:8px;';
        buttons.forEach(b => {
            const btn = document.createElement('button');
            btn.className = `btn ${b.class}`;
            btn.textContent = b.text;
            btn.addEventListener('click', b.action);
            footer.appendChild(btn);
        });
        document.querySelector('.modal').appendChild(footer);
        document.getElementById('modal-overlay').style.display = 'flex';
    }
};

App.downloadTemplate = function() {
    const templateData = [
        {
            '来源': '示例',
            '题目': '以下哪个是编程语言？',
            '选项A': 'Python',
            '选项B': 'HTML',
            '选项C': 'CSS',
            '选项D': 'JSON',
            '答案': 'A',
            '试题解析': 'Python 是通用编程语言，HTML/CSS/JSON 不是编程语言'
        },
        {
            '来源': '示例',
            '题目': 'TCP 协议属于哪一层？',
            '选项A': '应用层',
            '选项B': '传输层',
            '选项C': '网络层',
            '选项D': '数据链路层',
            '答案': 'B',
            '试题解析': 'TCP 位于传输层，提供可靠的面向连接的数据传输服务'
        },
        {
            '来源': '示例',
            '题目': '判断：JavaScript 和 Java 是同一门语言。',
            '选项A': '正确',
            '选项B': '错误',
            '答案': 'B',
            '试题解析': 'JavaScript 和 Java 是两种完全不同的编程语言'
        }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '题库模板');
    ws['!cols'] = [
        { wch: 10 },
        { wch: 40 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 8 },
        { wch: 50 },
    ];
    XLSX.writeFile(wb, '考试题库模板.xlsx');
};