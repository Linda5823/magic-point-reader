import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { TextBlock, TranslationMode } from "../../types.js";

const OCR_MODEL = "gemini-3-flash-preview";
const REASONING_MODEL = "gemini-3-flash-preview";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

function getAIClient() {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING: 服务端未配置 API_KEY 环境变量");
  }
  return new GoogleGenAI({ apiKey });
}

export async function analyzeImage(base64Image: string): Promise<TextBlock[]> {
  const ai = getAIClient();
  const prompt = `
    Find all the text in this image. 
    For each distinct phrase or block of text, provide the exact text and its bounding box in [ymin, xmin, ymax, xmax] format.
    The coordinates should be normalized from 0 to 1000.
    Return the result as a JSON array of objects with keys "text" and "box_2d".
  `;

  const response = await ai.models.generateContent({
    model: OCR_MODEL,
    contents: {
      parts: [
        { inlineData: { mimeType: "image/png", data: base64Image } },
        { text: prompt },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            box_2d: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER },
              minItems: 4,
              maxItems: 4,
            },
          },
          required: ["text", "box_2d"],
        },
      },
    },
  });

  try {
    const text = response.text || "[]";
    return JSON.parse(text);
  } catch {
    return [];
  }
}

export async function processText(
  text: string,
  mode: TranslationMode
): Promise<string> {
  if (mode === "ORIGINAL") return text;

  const ai = getAIClient();
  const targetLang = mode === "TRANSLATE_EN" ? "English" : "Chinese";

  const response = await ai.models.generateContent({
    model: REASONING_MODEL,
    contents: `Translate the following text to ${targetLang}. Only return the translated text without any explanation: "${text}"`,
  });

  return response.text?.trim() || text;
}

export async function generateSpeech(text: string): Promise<Uint8Array> {
  const ai = getAIClient();

  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Kore" },
        },
      },
    },
  });

  const base64Audio =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("TTS 失败: 未返回音频数据");

  const buf = Buffer.from(base64Audio, "base64");
  return new Uint8Array(buf);
}
