# elenchus

「問出理解，而不是給出答案」的純前端蘇格拉底式 AI 學習助教。

## 已實作的 MVP

- React + TypeScript + Vite + `HashRouter`，支援 GitHub Pages `/elenchus/` 子路徑。
- 課程、文字型 PDF／TXT／Markdown／直接貼上文字教材匯入，建立中文 2-gram／英文單字的本機檢索索引；PDF 保留頁碼引用，掃描 PDF 明確提示不支援 OCR。
- chatbot 風格三欄學習介面：教材引用、L0–L4 引導層級、提示按鈕、Enter 送出與學習歷程續談。
- 聊天訊息新增後自動捲至最底；學習進度固定在聊天左側。
- 「學習歷程」會依教材主軸產生開場問題群組，點選問題即可直接建立並開始對話。
- 離線示範 Mock Provider（明確標示，不假裝是真實 AI）、Gemini／CGU OpenAI-compatible adapter、API Key 測試與錯誤提示。
- Dexie／IndexedDB 保存課程、教材、chunks、對話與報告；Provider／模型偏好才使用 localStorage。
- API Key 預設只存在目前分頁的 React state；使用者可在設定頁勾選「記住此 Key」，將它保存於此瀏覽器的 localStorage。無論是否保存，都不會進入 DB、URL、log 或匯出檔。
- 五項形成性評量、獨立總結／遷移題／反思收束、`not_assessed` 證據不足狀態、JSON／Markdown／列印 PDF 匯出。

## 開發

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
```

開發時可選「離線示範（Mock）」快速驗收教材、聊天、保存和報告流程。若選 Gemini 或 CGU，請在設定頁貼入權限受限、可撤銷的 API Key；瀏覽器直連可能受到供應商 CORS 政策影響，網站不會使用公開 Proxy 繞過限制。

## 操作流程

1. 在「課程與教材」建立課程並匯入 `.txt`／`.md`，或直接貼入文字。
2. 在「設定」選擇 Mock 或真實 Provider；真實 Provider 需輸入 Key 並測試連線。
3. 「開始學習」選課程與主題，在聊天頁先說明自己的想法；需要時使用「給我小提示」。
4. 進入獨立總結後，於「學習報告」查看證據式規準，下載 JSON／Markdown 或列印成 PDF。

## 重要限制

這是無後端的本機工具，沒有身分驗證或防竄改保證。清除瀏覽器網站資料或換裝置可能遺失資料。AI 回應與自動評量都可能有誤，報告只描述本機對話的可觀察證據，教師仍需覆核。掃描型 PDF／OCR、DOCX、ZIP 教材包與完整教師批次匯入列為後續階段。
