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
    console.error("TTS Error:", err);
    const message = err instanceof Error ? err.message : "合成失败";
    const errorStr = String(err);
    const isKeyError = errorStr.includes("API_KEY");
    const isTtsError = errorStr.includes("TTS") || errorStr.includes("audio") || errorStr.includes("400");
    
    let errorMsg = message;
    if (isTtsError && errorStr.includes("generate text")) {
      errorMsg = "TTS 配置错误：模型尝试生成文本而不是音频。请检查 TTS 模型配置。";
    } else if (isKeyError) {
      errorMsg = "配置错误：API_KEY 缺失。";
    }
    
    return new Response(
      JSON.stringify({
        error: errorMsg,
        details: isTtsError ? errorStr : undefined,
      }),
      { status: isKeyError ? 503 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
