# 安全版本实现 - 问题排查与解决方案总结

## 📋 背景

将项目从**前端直接调用 Gemini API**（使用 `VITE_API_KEY`）改为**服务端 API 层**（使用 `API_KEY`），确保 API 密钥不会暴露在前端代码中。

---

## 🔧 架构变更

### 之前（不安全）
```
前端 (浏览器) → 直接调用 Gemini API (VITE_API_KEY 暴露在代码中)
```

### 之后（安全）
```
前端 (浏览器) → Vercel Serverless API (/api/*) → Gemini API (API_KEY 仅在服务端)
```

---

## 🐛 遇到的问题与解决方案

### 1. TypeScript ESM 导入路径问题

**问题**：
```
error TS2835: Relative import paths need explicit file extensions 
when '--moduleResolution' is 'node16' or 'nodenext'.
```

**原因**：
- Node.js ESM 模式要求相对导入必须包含文件扩展名
- Vercel Serverless Functions 使用 Node.js ESM

**解决方案**：
```typescript
// ❌ 错误
import { analyzeImage } from "./lib/gemini";
import type { TranslationMode } from "../types";

// ✅ 正确
import { analyzeImage } from "./lib/gemini.js";
import type { TranslationMode } from "../types.js";
```

**修改文件**：
- `api/lib/gemini.ts`
- `api/analyze-image.ts`
- `api/process-text.ts`
- `api/generate-speech.ts`

---

### 2. Response Body 类型错误

**问题**：
```
Argument of type 'Uint8Array' is not assignable to parameter of type 'BodyInit'
```

**原因**：
- `generateSpeech` 返回 `Uint8Array`
- `new Response()` 需要 `ArrayBuffer` 或兼容类型
- TypeScript 类型检查严格

**解决方案**：
```typescript
// ❌ 错误
const audio = await generateSpeechWithGemini(text);
return new Response(audio, { ... });

// ✅ 正确
const audio = await generateSpeechWithGemini(text);
const audioBuffer = audio.buffer.slice(
  audio.byteOffset, 
  audio.byteOffset + audio.byteLength
) as ArrayBuffer;
return new Response(audioBuffer, { ... });
```

**关键点**：
- 使用 `Uint8Array.buffer.slice()` 提取对应的 `ArrayBuffer`
- 需要处理 `byteOffset` 和 `byteLength`，确保只返回实际数据部分

---

### 3. 本地开发环境配置

**问题**：
- `npm run dev` 只启动前端，API 路由不工作
- 需要同时运行前端和 API

**解决方案**：

#### 3.1 安装 Vercel CLI
```json
// package.json
{
  "devDependencies": {
    "vercel": "^39.0.0"
  },
  "scripts": {
    "dev:full": "vercel dev --listen 3000"
  }
}
```

#### 3.2 创建 `.env` 文件
```
API_KEY=your_gemini_api_key
```

**注意**：
- 本地开发：使用 `.env` 文件中的 `API_KEY`
- Vercel 部署：使用 Vercel 环境变量中的 `API_KEY`
- 两者互不影响

---

### 4. Vercel CLI 端口检测超时

**问题**：
```
Error: Detecting port 59113 timed out after 300000ms
```

**原因**：
- Vercel CLI 自动检测端口时遇到问题
- 可能是端口被占用或防火墙问题

**解决方案**：
```json
// package.json
{
  "scripts": {
    "dev:full": "vercel dev --listen 3000"  // 明确指定端口
  }
}
```

**替代方案**：
如果端口问题持续，可以：
1. 检查端口占用：`netstat -ano | findstr :3000`
2. 关闭占用进程：`taskkill /pid <PID> /F`
3. 使用其他端口：`vercel dev --listen 3001`

---

### 5. 网页空白 - CDN Importmap 问题

**问题**：
- 页面显示空白
- 控制台错误：`Failed to load resource: 404 (Not Found)` 对于 `@vite/client`, `index.tsx` 等

**原因**：
- `index.html` 使用了 CDN importmap（`<script type="importmap">`）
- Vite 开发服务器无法处理这些 CDN 导入
- 应该使用本地 `node_modules` 中的包

**解决方案**：

#### 5.1 移除 CDN Importmap
```html
<!-- ❌ 错误 -->
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@^19.2.4"
  }
}
</script>

<!-- ✅ 正确 -->
<!-- 移除 importmap，让 Vite 处理模块导入 -->
```

#### 5.2 创建 Vite 配置
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
});
```

#### 5.3 安装 React 插件
```json
// package.json
{
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0"
  }
}
```

**关键点**：
- Vite 会自动从 `node_modules` 读取依赖
- 开发时：Vite 转译和热更新
- 构建时：Vite 打包所有依赖到 `dist/`
- 部署时：Vercel 部署 `dist/` 目录

---

### 6. Vercel.json 配置冲突

**问题**：
- API 路由返回 404
- Vite 开发服务器的特殊路径（`/@vite/client`）也被重定向

**原因**：
- `vercel.json` 中的 `rewrites` 规则过于宽泛
- 把所有请求都重定向到 `/index.html`，包括 API 路由和 Vite 内部路径

**解决方案**：
```json
// ❌ 错误（开发时会出问题）
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}

// ✅ 正确（简化配置，让 Vercel 自动处理）
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

**关键点**：
- Vercel 会自动识别 `api/` 文件夹作为 Serverless Functions
- Vite 开发服务器会处理所有非 API 的请求
- 生产构建时，Vercel 会自动配置 SPA 路由

---

### 7. Config Runtime 警告

**问题**：
```
Error: api/analyze-image.ts: `config.runtime: "nodejs"` semantics will evolve soon. 
Please remove the `runtime` key to keep the existing behavior.
```

**原因**：
- Vercel 新版本不再需要显式指定 `runtime: "nodejs"`
- 默认就是 Node.js runtime

**解决方案**：
```typescript
// ❌ 错误
export const config = { runtime: "nodejs" };
export async function POST(request: Request) { ... }

// ✅ 正确
export async function POST(request: Request) { ... }
```

**修改文件**：
- `api/analyze-image.ts`
- `api/process-text.ts`
- `api/generate-speech.ts`

---

### 8. 环境变量名称错误

**问题**：
- API 返回 500 错误
- 错误信息：`FUNCTION_INVOCATION_FAILED`
- 实际上是 `API_KEY` 未找到

**原因**：
- `.env` 文件中使用了 `VITE_API_KEY`
- 但服务端 API 需要 `API_KEY`（没有 `VITE_` 前缀）

**解决方案**：
```bash
# ❌ 错误
VITE_API_KEY=your_key

# ✅ 正确
API_KEY=your_key
```

**关键点**：
- `VITE_*` 前缀：Vite 会注入到前端代码（暴露给浏览器）
- 无前缀：仅用于服务端（Node.js 环境变量）
- 安全版本中，API 密钥应该只在服务端使用

---

## 📚 学到的关键概念

### 1. ESM vs CommonJS
- **ESM (ES Modules)**：使用 `import/export`，需要文件扩展名
- **CommonJS**：使用 `require/module.exports`，不需要扩展名
- Vercel Serverless Functions 使用 ESM

### 2. 环境变量作用域
- **前端环境变量**（`VITE_*`）：会被打包进前端代码，用户可见
- **服务端环境变量**（无前缀）：仅在 Node.js 运行时可用，用户不可见

### 3. Vite 构建流程
```
开发：源代码 → Vite Dev Server → 浏览器（实时转译）
构建：源代码 → Vite Build → dist/（打包所有依赖）
部署：dist/ → Vercel → 用户访问
```

### 4. Vercel Serverless Functions
- `api/` 文件夹中的文件自动成为 API 路由
- 文件路径对应 URL 路径（如 `api/analyze-image.ts` → `/api/analyze-image`）
- 支持 `GET`, `POST`, `PUT`, `DELETE` 等 HTTP 方法

### 5. 类型安全
- TypeScript 的类型检查能提前发现很多问题
- `BodyInit` 类型要求使用 `ArrayBuffer` 而不是 `Uint8Array`
- 类型断言 `as ArrayBuffer` 可以解决兼容性问题

---

## ✅ 最终配置检查清单

- [x] API 路由使用 `.js` 扩展名导入
- [x] `generate-speech.ts` 返回 `ArrayBuffer` 而不是 `Uint8Array`
- [x] 安装了 `vercel` CLI 和 `@vitejs/plugin-react`
- [x] 创建了 `vite.config.ts`
- [x] `.env` 文件使用 `API_KEY`（不是 `VITE_API_KEY`）
- [x] 移除了所有 API 文件中的 `config.runtime`
- [x] `index.html` 移除了 CDN importmap
- [x] `vercel.json` 配置简化（让 Vercel 自动处理）

---

## 🎯 最佳实践总结

1. **安全性**：API 密钥永远不要出现在前端代码中
2. **类型安全**：充分利用 TypeScript 的类型检查
3. **配置简化**：让工具（Vite、Vercel）自动处理常见配置
4. **环境分离**：开发环境和生产环境使用不同的配置方式
5. **错误处理**：提供清晰的错误信息，便于调试

---

## 📖 参考资源

- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vite 配置指南](https://vitejs.dev/config/)
- [TypeScript ESM 模块](https://www.typescriptlang.org/docs/handbook/esm-node.html)
- [环境变量最佳实践](https://vercel.com/docs/concepts/projects/environment-variables)
