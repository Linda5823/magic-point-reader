
# 🪄 Magic Point-to-Read | 魔法点读笔

An interactive web application that turns any image into a "point-to-read" learning material using Google Gemini's advanced Vision and TTS capabilities.

一个利用 Google Gemini 的视觉（OCR）和语音合成（TTS）能力，将任何图片变成“点读教材”的交互式网页应用。

## ✨ Features | 功能特点

- **Smart OCR**: Automatically detects all text areas in an uploaded image.
- **Interactive Reading**: Click on any text area to hear it spoken aloud.
- **Multilingual Support**: Supports reading in original language or translating to English/Chinese before reading.
- **Fluid UI**: Clean, responsive design built with Tailwind CSS.

## 🚀 Quick Start | 快速启动

1. **Clone the repo**:
   ```bash
   git clone https://github.com/Linda5823/magic-point-reader.git
   cd magic-point-reader
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set Environment Variable**:
   - **部署到 Vercel**：在项目 Settings → Environment Variables 中配置 `API_KEY`（你的 Gemini API 密钥），密钥仅保存在服务端，不会暴露给前端。
   - **本地开发**：安装 [Vercel CLI](https://vercel.com/cli) 后，在项目根目录创建 `.env` 文件，内容为 `API_KEY=your_gemini_api_key`。

4. **安装 Vercel CLI**（如果还没有）：
   ```bash
   npm install
   ```
   这会自动安装 `vercel` CLI 作为开发依赖。

5. **Run development server**:
   ```bash
   # ⚠️ 重要：本地开发必须使用 vercel dev（会同时启动前端和 API）
   npm run dev:full
   # 或者直接使用：npx vercel dev
   ```
   
   **注意**：不要使用 `npm run dev`，因为它只启动前端，API 路由不会运行，会导致 "Failed to recognize text" 错误。

## 🛠 Tech Stack | 技术栈

- **Core**: React 19
- **AI**: [Google Gemini API](https://ai.google.dev/) (gemini-3-flash, gemini-2.5-flash-tts)
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

## 📄 License

MIT
