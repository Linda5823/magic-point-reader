
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
   - **本地完整测试**（前端 + API）：安装 [Vercel CLI](https://vercel.com/cli) 后执行 `vercel dev`，并在项目根目录创建 `.env`，内容为 `API_KEY=your_gemini_api_key`。
   - **仅本地跑前端**：`npm run dev`；此时需有后端 API（例如用 `vercel dev` 一起跑）。

4. **Run development server**:
   ```bash
   npm run dev
   ```
   或同时跑前端与 API（推荐）：`vercel dev`

## 🛠 Tech Stack | 技术栈

- **Core**: React 19
- **AI**: [Google Gemini API](https://ai.google.dev/) (gemini-3-flash, gemini-2.5-flash-tts)
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

## 📄 License

MIT
