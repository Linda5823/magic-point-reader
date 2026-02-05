import { processText as processTextWithGemini } from "./lib/gemini";
import type { TranslationMode } from "../types";

export const config = { runtime: "nodejs" };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string; mode?: TranslationMode };
    const { text, mode } = body ?? {};
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "缺少 text" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const result = await processTextWithGemini(text, mode ?? "ORIGINAL");
    return new Response(JSON.stringify({ text: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "处理失败";
    const isKeyError = String(message).includes("API_KEY");
    return new Response(
      JSON.stringify({
        error: isKeyError ? "配置错误：API_KEY 缺失。" : message,
      }),
      { status: isKeyError ? 503 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
