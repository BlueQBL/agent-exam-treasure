/**
 * Exam Treasure - Data Store Module
 * Handles localStorage persistence for questions, wrong book, and stats.
 */
const App = {};
const STORE_KEY = 'exam_treasure_data';

function initStats() {
    return { totalPracticeCount: 0, totalAccuracy: 0, accuracyByType: {}, examRecords: [] };
}

App.DataStore = {
    load() {
        const raw = localStorage.getItem(STORE_KEY);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    },
    save(data) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch {
            alert('存储空间不足，请清除数据后重试');
        }
    },
    clear() { localStorage.removeItem(STORE_KEY); },
    loadQuestions() { const d = this.load(); return d ? d.questions : []; },
    saveQuestions(qs) {
        const d = this.load() || { questions: [], wrongBook: {}, stats: initStats() };
        d.questions = qs; this.save(d);
    },
    loadWrongBook() { const d = this.load(); return d ? d.wrongBook : {}; },
    saveWrongBook(wb) {
        const d = this.load() || { questions: [], wrongBook: {}, stats: initStats() };
        d.wrongBook = wb; this.save(d);
    },
    loadStats() { const d = this.load(); return d ? d.stats : initStats(); },
    saveStats(s) {
        const d = this.load() || { questions: [], wrongBook: {}, stats: initStats() };
        d.stats = s; this.save(d);

    }
};