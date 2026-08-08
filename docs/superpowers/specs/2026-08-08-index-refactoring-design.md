# 考试练习系统 — Index.html 重构设计

> 日期：2026-08-08
> 项目：agent-exam-treasure

---

## 1. 概述

将单文件 `index.html`（2857 行，CSS + HTML + JS 全部内联）重构为多文件结构：HTML 骨架 + 外部 CSS + 按功能拆分的 JS 模块。

**核心约束：**
- 所有现有功能完整保留，零变更
- 本地双击打开（`file://`）和 GitHub Pages 在线访问均正常工作
- 不引入任何构建工具、包管理器、Node.js 依赖

---

## 2. 重构原则

| 原则 | 说明 |
|------|------|
| 功能零变更 | 不修改任何函数逻辑、参数、返回值、DOM id/class |
| 高内聚 | 每个文件只包含一个关注点的代码 |
| 低耦合 | 模块间通过现有 `App.*` 命名空间通信，不增加新接口 |
| 渐进增强 | 页面骨架先加载 → CSS 渲染样式 → JS 渐进增强交互 |
| 零外部依赖 | 仅保留 SheetJS (xlsx) CDN，不新增任何外部库 |

---

## 3. 文件结构

```
agent-exam-treasure/
├── index.html              ← HTML 骨架（~50 行）
├── css/
│   └── style.css           ← 全部样式（原 <style> 内容，~1000 行）
└── js/
    ├── store.js            ← App.DataStore — localStorage 数据持久化
    ├── parser.js           ← App.ExcelParser — Excel 文件解析
    ├── renderer.js         ← App.QuestionRenderer — 题目渲染 + 答案校验
    ├── ui.js               ← App.HomePage + App.Modal + App.downloadTemplate
    ├── modes.js            ← App.PracticeMode + App.ExamMode + App.WrongBookMode
    └── main.js             ← DOMContentLoaded 事件绑定 + 初始化
```

---

## 4. JS 模块依赖顺序

```
store.js      → 无依赖（基础数据层）
parser.js     → 无依赖（纯解析逻辑，访问 XLSX 全局对象）
renderer.js   → 依赖 App 命名空间（已由前序 script 标签建立）
ui.js         → 依赖 store.js, renderer.js
modes.js      → 依赖 store.js, renderer.js, ui.js
main.js       → 依赖以上所有模块
```

HTML 中按此顺序加载：

```html
<script src="js/store.js"></script>
<script src="js/parser.js"></script>
<script src="js/renderer.js"></script>
<script src="js/ui.js"></script>
<script src="js/modes.js"></script>
<script src="js/main.js"></script>
```

---

## 5. 各模块职责

### 5.1 index.html — HTML 骨架

- DOCTYPE / html / head（charset, viewport, title）
- SheetJS CDN script 标签
- CSS 外部引用 `<link rel="stylesheet" href="css/style.css">`
- 6 个 page div 的结构：
  - `page-home` — 首页（header + 上传区 + 模板下载 + 筛选/配置 + 统计）
  - `page-practice` — 练习模式
  - `page-exam-config` — 考试配置
  - `page-exam` — 考试模式
  - `page-exam-result` — 考试结果
  - `page-wrongbook` — 错题本
- Modal overlay
- 6 个 JS script 标签

### 5.2 css/style.css — 全部样式

- CSS Reset + CSS Variables（`:root`）
- 基础布局（body, container, header）
- 上传区域样式
- Mode cards
- 按钮（btn, btn-primary, btn-secondary, btn-danger, btn-outline, btn-success）
- 筛选 chips + toggle switches
- 统计条 + 进度条 + 导航条
- 题目卡片 + 选项样式
- 考试布局 + 题号面板
- 计时器
- 结果页 + 错题本
- 模态框
- 响应式（768px / 480px）

### 5.3 js/store.js — 数据持久化

代码直接从原文件摘出，无任何修改：

```javascript
const STORE_KEY = 'exam_treasure_data';
const App = {};

App.DataStore = {
    load() { ... },
    save(data) { ... },
    clear() { ... },
    loadQuestions() { ... },
    saveQuestions(qs) { ... },
    loadWrongBook() { ... },
    saveWrongBook(wb) { ... },
    loadStats() { ... },
    saveStats(s) { ... }
};
```

**改动：** `const App = {};` 移至 `store.js` 顶部（原在 `<script>` 开头），后续模块增量添加属性到 `App` 对象上。

### 5.4 js/parser.js — Excel 解析

- `App.ExcelParser.parse(file)` — 读取并解析 Excel
- `App.ExcelParser.inferType(sheetName)` — 从 sheet 名推断题型
- `App.ExcelParser.detectColumnMap(headers)` — 自动映射列名
- `App.ExcelParser.parseRow(row, colMap, inferredType, index)` — 解析单行

**辅助函数也移入此文件：**
- `shuffle(arr)` — Fisher-Yates 洗牌
- `shuffleByType(questions)` — 同题型内乱序
- `shuffleOptionsWithAnswer(q)` — 选项乱序 + 答案修正
- `getJudgmentDisplayText(answer)` — 判断题答案格式化
- `escapeHtml(text)` — HTML 转义
- `initStats()` — 初始化统计数据

### 5.5 js/renderer.js — 题目渲染

- `App.QuestionRenderer.render(q, containerId, showAnswer, userAnswer)` — 渲染题目到指定容器
- `App.QuestionRenderer.buildHtml(q, userAnswer)` — 构建选项 HTML
- `App.QuestionRenderer.renderFeedback(q, userAnswer)` — 渲染反馈/解析
- `App.QuestionRenderer.setupSelectAll(q)` — 多选题全选功能
- `App.QuestionRenderer.checkAnswer(q, userAnswer)` — 答案校验
- `App.QuestionRenderer.getSelectedAnswer(q)` — 获取用户选中答案

### 5.6 js/ui.js — 首页 + 通用 UI

- `App.showPage(pageId)` — 页面切换
- `App.HomePage.init()` — 首页初始化（上传拖拽、按钮事件）
- `App.HomePage.render()` — 首页渲染（加载信息、统计数据）
- `App.HomePage.renderStats()` — 统计条更新
- `App.HomePage.handleFile(file)` — 文件上传处理
- `App.Modal.open(title, content)` — 模态框打开
- `App.Modal.close()` — 模态框关闭
- `App.Modal.show(title, content, buttons)` — 带按钮的模态框
- `App.downloadTemplate()` — 下载 Excel 模板

### 5.7 js/modes.js — 三种答题模式

**PracticeMode：**
- `App.PracticeMode.start()` — 开始练习
- `App.PracticeMode.renderQuestion()` — 渲染当前题目
- `App.PracticeMode.bindAnswerCheck(q)` — 绑定答案检测
- `App.PracticeMode.prev() / next()` — 导航
- `App.PracticeMode.finish()` — 完成统计
- `App.PracticeMode.updateWrongBook(q, isCorrect)` — 更新错题本

**ExamMode：**
- `App.ExamMode.showConfig()` — 显示考试配置
- `App.ExamMode.start()` — 开始考试
- `App.ExamMode.renderQuestion()` — 渲染题目
- `App.ExamMode.renderPanel()` — 渲染题号面板
- `App.ExamMode.goTo(index) / prev() / next()` — 导航
- `App.ExamMode.startTimer()` — 开始计时
- `App.ExamMode.submit()` — 提交试卷
- `App.ExamMode.finish()` — 交卷统计
- `App.ExamMode.renderResult(details, score, usedSeconds)` — 渲染结果页

**WrongBookMode：**
- `App.WrongBookMode.start()` — 开始错题练习
- `App.WrongBookMode.renderQuestion()` — 渲染题目
- `App.WrongBookMode.bindAnswerCheck(q)` — 绑定答案检测
- `App.WrongBookMode.prev() / next()` — 导航
- `App.WrongBookMode.finish()` — 完成统计
- `App.WrongBookMode.clear()` — 清空错题本
- `App.WrongBookMode.export()` — 导出错题 Excel

### 5.8 js/main.js — 初始化与事件绑定

- `DOMContentLoaded` 事件入口
- 查看全部题目（`btnViewAll` → modal 表格）
- 模板下载（`btnDownloadTemplate`）
- 返回按钮（所有 `.back-btn`）
- 模态框关闭（overlay 点击 + close 按钮）
- 练习导航（prev/next）
- 考试配置（`exam-start`）
- 考试导航（prev/next/submit）
- 考试结果页导航（home/review/wrongbook）
- 错题本导航（prev/next/clear/export）
- Filter chip / Config chip 视觉状态同步
- 调用 `App.HomePage.init()` + `App.HomePage.render()` + `App.showPage('page-home')`

---

## 6. 加载与兼容性

### 6.1 本地打开

```bash
# 双击 index.html 或直接 file:// 协议打开
# 相对路径引用对 file:// 协议完全兼容
```

### 6.2 GitHub Pages 访问

```
https://BlueQBL.github.io/agent-exam-treasure/
```

相对路径在 GitHub Pages 的 `https://` 环境下同样正常工作。

### 6.3 CORS 说明

- CSS 和 JS 均为同域加载，无跨域问题
- SheetJS 通过 CDN 加载（`https://cdn.jsdelivr.net`），已有跨域支持

---

## 7. 边界情况

| 场景 | 处理 |
|------|------|
| CSS 文件加载失败 | 页面显示无样式内容（纯 HTML 骨架），功能不受影响 |
| JS 文件加载顺序错误 | 依赖前置未加载时后置模块访问 `App.xxx` 会 `undefined`，脚本抛出错误 |
| 浏览器缓存旧文件 | 建议用户 Ctrl+F5 强制刷新 |
| 本地打开时 CDN 不可用 | XLSX 功能不可用，但不影响页面整体显示 |
| GitHub Pages 部署后 | 推送代码后等待 1-2 分钟自动生效，无需额外操作 |

---

## 8. 文件大小预估

| 文件 | 当前 | 重构后 | 说明 |
|------|------|--------|------|
| index.html | ~95KB | ~10KB | 仅保留骨架 + script 加载 |
| css/style.css | - | ~20KB | 从内联样式移出 |
| js/store.js | - | ~1KB | 数据持久化 |
| js/parser.js | - | ~12KB | Excel 解析 + 辅助函数 |
| js/renderer.js | - | ~8KB | 题目渲染 |
| js/ui.js | - | ~6KB | 首页 + 模态框 |
| js/modes.js | - | ~14KB | 三种模式 |
| js/main.js | - | ~4KB | 事件绑定 + 初始化 |
| **合计** | **~95KB** | **~75KB** | 略有减少，主要收益是可维护性 |