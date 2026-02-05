import { generateSpeech as generateSpeechWithGemini } from "./lib/gemini.js";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string };
    const text = body?.text;
    if (!text || typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: "缺少 text" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const audio = await generateSpeechWithGemini(text);
    const audioBuffer = audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer;
    return new Response(audioBuffer, {
      status: 200,
      headers: { "Content-Type": "application/octet-stream" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "合成失败";
    const isKeyError = String(message).includes("API_KEY");
    return new Response(
      JSON.stringify({
        error: isKeyError ? "配置错误：API_KEY 缺失。" : message,
      }),
      { status: isKeyError ? 503 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
