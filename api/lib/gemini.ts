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
  const langMap: Record<TranslationMode, string> = {
    ORIGINAL: "",
    TRANSLATE_EN: "English",
    TRANSLATE_ZH: "Chinese",
    TRANSLATE_ES: "Spanish",
  };
  const targetLang = langMap[mode] || "English";

  const response = await ai.models.generateContent({
    model: REASONING_MODEL,
    contents: `Translate the following text to ${targetLang}. Only return the translated text without any explanation: "${text}"`,
  });

  return response.text?.trim() || text;
}

export async function generateSpeech(text: string): Promise<Uint8Array> {
  const ai = getAIClient();

  // 验证输入文本
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error(`TTS 失败: 输入文本为空或无效。text: "${text}"`);
  }

  const cleanText = text.trim();
  console.log(`TTS Request: text="${cleanText}", length=${cleanText.length}`);

  try {
    // 使用非流式 API 获取 TTS 音频数据
    // TTS 模型只需要纯文本，不需要 parts 格式
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: cleanText,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    console.log("TTS Response:", JSON.stringify({
      hasCandidates: !!response.candidates,
      candidatesLength: response.candidates?.length,
      firstCandidate: response.candidates?.[0] ? {
        finishReason: response.candidates[0].finishReason,
        hasContent: !!response.candidates[0].content,
        contentKeys: response.candidates[0].content ? Object.keys(response.candidates[0].content) : [],
        hasParts: !!response.candidates[0].content?.parts,
        partsLength: response.candidates[0].content?.parts?.length,
        firstPart: response.candidates[0].content?.parts?.[0] ? {
          hasInlineData: !!response.candidates[0].content.parts[0].inlineData,
          hasData: !!response.candidates[0].content.parts[0].inlineData?.data,
          dataLength: response.candidates[0].content.parts[0].inlineData?.data?.length,
        } : null,
      } : null,
    }, null, 2));

    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) {
      throw new Error(`TTS 失败: 响应中没有内容。finishReason: ${candidate?.finishReason || "unknown"}`);
    }

    // 收集所有音频数据
    const audioChunks: Uint8Array[] = [];
    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        const buf = Buffer.from(part.inlineData.data, "base64");
        audioChunks.push(new Uint8Array(buf));
        console.log(`Found audio chunk, size: ${buf.length} bytes`);
      }
    }

    if (audioChunks.length === 0) {
      throw new Error(`TTS 失败: 响应中未找到音频数据。finishReason: ${candidate.finishReason}`);
    }

    // 合并所有音频块
    const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of audioChunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    console.log(`TTS 成功: 总音频大小 ${totalLength} 字节`);
    return result;
  } catch (err) {
    console.error("generateSpeech error:", err);
    throw err;
  }
}
