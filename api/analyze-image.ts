import { analyzeImage as analyzeImageWithGemini } from "./lib/gemini";

export const config = { runtime: "nodejs" };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { base64?: string };
    const base64 = body?.base64;
    if (!base64 || typeof base64 !== "string") {
      return new Response(
        JSON.stringify({ error: "缺少 base64 图片数据" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const blocks = await analyzeImageWithGemini(base64);
    return new Response(JSON.stringify({ blocks }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "分析失败";
    const isKeyError = String(message).includes("API_KEY");
    return new Response(
      JSON.stringify({
        error: isKeyError ? "配置错误：未检测到 API_KEY，请检查环境变量设置。" : message,
      }),
      { status: isKeyError ? 503 : 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
