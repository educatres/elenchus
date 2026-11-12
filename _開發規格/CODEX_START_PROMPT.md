# elenchus — 給 Codex 的第一個開發指令

請在這個 Repository 中開發 **elenchus：蘇格拉底式 AI 引導學習與思考評量系統**。

## 1. 開發前

1. 先完整閱讀根目錄 `DEVELOPMENT_SPEC.md` 與 `AGENTS.md`。
2. 以 `DEVELOPMENT_SPEC.md` 為需求與驗收的主要依據。
3. 不要只做畫面或 Mockup；請建立可運作、可測試、可部署的 React + TypeScript + Vite 專案。
4. 採用 GitHub Pages 純前端架構；不可引入必備後端。

## 2. 第一個任務：Phase 0

請先完成：

- React + TypeScript (strict) + Vite + Tailwind CSS 專案初始化。
- HashRouter、基本 Layout、繁體中文導覽。
- Dashboard、Courses、Materials、Chat、History、Student Report、Teacher、Settings、About 路由骨架。
- Dexie/IndexedDB 初始 Schema、Repository、Zod 資料模型。
- API Key 只保存在記憶體的狀態管理；不要使用 localStorage 保存金鑰。
- 可預測的 Mock Provider（明確標示示範模式）。
- Vitest、Testing Library、Playwright 基本測試設定。
- GitHub Actions CI/CD + GitHub Pages `/elenchus/` 子路徑部署設定。
- README.md、基本隱私與使用限制說明。

完成後，執行並回報以下結果：

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
```

若尚未產生 lockfile，第一次初始化可以先使用 `npm install` 以建立並提交 `package-lock.json`，之後應以 `npm ci` 做可重現建置。

## 3. 後續任務

Phase 0 通過後，依序完成：

- **Phase 1**：PDF/TXT/MD 教材匯入、文字分段、BM25、API Provider Adapter、Socratic Engine、ResponseGuard、聊天保存。
- **Phase 2**：獨立總結、知識遷移、五項 Rubric、證據式評量、JSON/Markdown/列印 PDF。
- **Phase 3**：教師教材包 ZIP、學生報告批次匯入、人工覆核、CSV、E2E 及文件。

每階段應使用該規格書的 AC 驗收條件驗證。遇到 API Provider CORS 或金鑰安全限制，不要用不可信 Proxy 繞過；請記錄限制、提供可理解的介面錯誤，並說明替代選項。

## 4. 不可違反的產品原則

AI 不能直接替學生作答。評量必須引用學生實際對話；不能把沒有資料的項目記為 0 分，也不能推斷學生的人格或確定他們是否使用其他 AI。所有資料預設留在本機，僅將必要教材片段與對話內容送給使用者指定的 AI 模型供應商。

請從 **Phase 0** 開始實作，完成後提供修改檔案、測試結果、執行方式和下一個 Phase 的待辦事項。
