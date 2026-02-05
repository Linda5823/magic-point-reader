import type { TextBlock, TranslationMode } from "../types";

const API_BASE = "";

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const isJson = res.headers.get("Content-Type")?.includes("application/json");
  const text = await res.text();
  const data = isJson && text ? (JSON.parse(text) as { error?: string }) : null;
  const errMsg = data?.error ?? (res.ok ? undefined : text || res.statusText);
  if (!res.ok || errMsg) {
    throw new Error(errMsg ?? "请求失败");
  }
  return (data ?? {}) as T;
}

export const analyzeImage = async (base64Image: string): Promise<TextBlock[]> => {
  const data = await apiPost<{ blocks: TextBlock[] }>("/analyze-image", {
    base64: base64Image,
  });
  return data.blocks ?? [];
};

export const processText = async (
  text: string,
  mode: TranslationMode
): Promise<string> => {
  if (mode === "ORIGINAL") return text;
  const data = await apiPost<{ text: string }>("/process-text", { text, mode });
  return data.text ?? text;
};

export const generateSpeech = async (text: string): Promise<Uint8Array> => {
  const res = await fetch(`${API_BASE}/api/generate-speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data?.error ?? "合成失败");
  }
  const ab = await res.arrayBuffer();
  return new Uint8Array(ab);
};

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
