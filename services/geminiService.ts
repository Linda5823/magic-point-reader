
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { TextBlock, TranslationMode } from "../types";

// 模型配置
const OCR_MODEL = 'gemini-3-flash-preview';
const REASONING_MODEL = 'gemini-3-flash-preview';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';


const getAIClient = () => {
  const apiKey = (import.meta as { env?: { VITE_API_KEY?: string } }).env?.VITE_API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING: 未检测到 API 密钥。请设置环境变量 VITE_API_KEY（Vercel/本地），并重新构建部署。");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeImage = async (base64Image: string): Promise<TextBlock[]> => {
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
        { inlineData: { mimeType: 'image/png', data: base64Image } },
        { text: prompt }
      ]
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
              maxItems: 4
            }
          },
          required: ["text", "box_2d"]
        }
      }
    }
  });

  try {
    const text = response.text || '[]';
    return JSON.parse(text);
  } catch (e) {
    console.error("OCR 解析失败:", e);
    return [];
  }
};

export const processText = async (text: string, mode: TranslationMode): Promise<string> => {
  if (mode === 'ORIGINAL') return text;

  const ai = getAIClient();
  const targetLang = mode === 'TRANSLATE_EN' ? 'English' : 'Chinese';
  
  const response = await ai.models.generateContent({
    model: REASONING_MODEL,
    contents: `Translate the following text to ${targetLang}. Only return the translated text without any explanation: "${text}"`,
  });

  return response.text?.trim() || text;
};

export const generateSpeech = async (text: string): Promise<Uint8Array> => {
  const ai = getAIClient();
  
  const response = await ai.models.generateContent({
    model: TTS_MODEL,
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("TTS 失败: 未返回音频数据");

  return decodeBase64(base64Audio);
};

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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
