# Index.html 重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将单文件 `index.html`（2857 行 CSS+HTML+JS 内联）拆分为 HTML 骨架 + 外部 CSS + 6 个 JS 模块文件

**架构：** 功能零变更，所有代码仍在 `App.*` 命名空间下，通过 `<script>` 按依赖顺序加载

**约束：**
- 所有现有功能完整保留，不修改任何函数逻辑、参数、返回值、DOM id/class
- 本地双击（`file://`）和 GitHub Pages（`https://`）均正常工作
- 不引入任何构建工具或外部依赖
- JS 文件加载顺序必须严格：store → parser → renderer → ui → modes → main

---

### 文件创建清单

| 文件 | 来源 | 内容 |
|------|------|------|
| `css/style.css` | index.html:8-1294 | 全部 CSS 样式 |
| `js/store.js` | index.html:1608-1713 | App 命名空间 + DataStore + initStats |
| `js/parser.js` | index.html:1611-1668, 1716-1892 | 辅助函数 + ExcelParser |
| `js/renderer.js` | index.html:1895-2012 | QuestionRenderer |
| `js/ui.js` | index.html:1679-1683, 2015-2105, 2682-2713, 2716-2763 | showPage + HomePage + Modal + downloadTemplate |
| `js/modes.js` | index.html:2108-2679 | PracticeMode + ExamMode + WrongBookMode |
| `js/main.js` | index.html:2766-2854 | DOMContentLoaded 事件绑定 + 初始化 |

---

### Task 1: 创建 css/style.css

- [ ] **将 index.html:8-1294 的 `<style>` 内容提取到 `css/style.css`**

使用 Edit 或 Read/Write 精确摘取 CSS 代码（从 `/* CSS Reset */` 到末尾 `}`），添加区块注释分隔样式节。

**文件路径:** `css/style.css`

---

### Task 2: 创建 js/store.js

- [ ] **提取 DataStore + 命名空间到 store.js**

内容：`const App = {};` + `const STORE_KEY = ...` + `function initStats()` + `App.DataStore = { ... }`

**验证:** 无外部依赖，最先加载。

---

### Task 3: 创建 js/parser.js

- [ ] **提取辅助函数 + ExcelParser 到 parser.js**

内容：
- `function shuffle(arr)` — Fisher-Yates
- `function shuffleByType(questions)`
- `function shuffleOptionsWithAnswer(q)`
- `function getJudgmentDisplayText(answer)`
- `function escapeHtml(text)`
- `App.ExcelParser = { parse, inferType, detectColumnMap, parseRow }`

---

### Task 4: 创建 js/renderer.js

- [ ] **提取 QuestionRenderer 到 renderer.js**

内容：`App.QuestionRenderer = { render, buildHtml, renderFeedback, setupSelectAll, checkAnswer, getSelectedAnswer }`

**依赖:** parser.js（使用 `escapeHtml`, `getJudgmentDisplayText`）

---

### Task 5: 创建 js/ui.js

- [ ] **提取 showPage + HomePage + Modal + downloadTemplate 到 ui.js**

内容：
- `App.showPage = function(pageId) { ... }`
- `App.HomePage = { init, render, renderStats, handleFile }`
- `App.Modal = { open, close, show }`
- `App.downloadTemplate = function() { ... }`

**依赖:** store.js, renderer.js

---

### Task 6: 创建 js/modes.js

- [ ] **提取三种模式到 modes.js**

内容：
- `App.PracticeMode = { start, renderQuestion, bindAnswerCheck, prev, next, finish, updateWrongBook }`
- `App.ExamMode = { showConfig, start, renderQuestion, renderPanel, goTo, prev, next, startTimer, submit, finish, renderResult }`
- `App.WrongBookMode = { start, renderQuestion, bindAnswerCheck, prev, next, finish, clear, export }`

**依赖:** store.js, parser.js, renderer.js, ui.js

---

### Task 7: 重写 index.html

- [ ] **替换 index.html 内联样式和脚本为外部引用**

将文件重构为：
- head 中：`<link rel="stylesheet" href="css/style.css">` 替代 `<style>...</style>`
- body 末尾：6 个 `<script>` 替代内联 `<script>...</script>`
- 保留所有 DOM 结构（页面 div、模态框）不变

**完整 index.html 内容：（约 50 行有效 HTML + 6 个 script 标签）**

---

### Task 8: 验证

- [ ] **本地验证：** 双击 `index.html`，测试所有模式
- [ ] **验证清单：**
  - 首页正常显示，上传区域可点击
  - 下载模板功能正常
  - 练习模式：筛选/乱序/答题/反馈/导航均正常
  - 考试模式：配置/答题/计时/交卷/结果均正常
  - 错题本：显示/答题/清除/导出均正常
  - 返回按钮和模态框正常