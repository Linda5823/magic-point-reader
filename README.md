
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
   Create a `.env` file or export the API key:
   ```bash
   export API_KEY=your_gemini_api_key
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

## 🛠 Tech Stack | 技术栈

- **Core**: React 19
- **AI**: [Google Gemini API](https://ai.google.dev/) (gemini-3-flash, gemini-2.5-flash-tts)
- **Styling**: Tailwind CSS
- **Build Tool**: Vite

## 📄 License

MIT
