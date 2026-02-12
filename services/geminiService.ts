import { GoogleGenAI, Type } from "@google/genai";
import { VoiceCommandResult, VoiceIntentType } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const parseVoiceCommand = async (
  audioBase64: string,
  mimeType: string,
  availableProductNames: string[],
  specificIntent?: VoiceIntentType
): Promise<VoiceCommandResult> => {
  if (!apiKey) {
    console.error("API Key missing");
    return { intent: VoiceIntentType.UNKNOWN };
  }

  try {
    // gemini-3-flash-preview is the current recommended model for general multimodal tasks
    const model = 'gemini-3-flash-preview';
    const productListString = availableProductNames.join(', ');

    let taskDescription = "";
    
    if (specificIntent === VoiceIntentType.CHECK_PRICE) {
      taskDescription = `
      Nhiệm vụ: 
      1. Người dùng ĐANG MUỐN TRA CỨU GIÁ. Intent bắt buộc là "CHECK_PRICE".
      2. Tìm tên sản phẩm trong danh sách khớp nhất với câu nói.
      `;
    } else if (specificIntent === VoiceIntentType.ADD_TO_CART) {
      taskDescription = `
      Nhiệm vụ: 
      1. Người dùng ĐANG MUỐN MUA HÀNG/THÊM VÀO GIỎ. Intent bắt buộc là "ADD_TO_CART".
      2. Tìm tên sản phẩm trong danh sách khớp nhất với câu nói.
      3. Xác định số lượng (mặc định là 1 nếu không nói rõ).
      `;
    } else {
      // Auto detect mode (fallback)
      taskDescription = `
      Nhiệm vụ:
      1. Xác định ý định: "CHECK_PRICE" (hỏi giá) hoặc "ADD_TO_CART" (mua/thêm).
      2. Tìm tên sản phẩm trong danh sách khớp nhất.
      3. Xác định số lượng nếu có.
      `;
    }

    const promptText = `
      Bạn là trợ lý bán hàng.
      Danh sách sản phẩm: [${productListString}]
      
      ${taskDescription}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          },
          { text: promptText }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: {
              type: Type.STRING,
              enum: [VoiceIntentType.CHECK_PRICE, VoiceIntentType.ADD_TO_CART, VoiceIntentType.UNKNOWN],
            },
            productName: {
              type: Type.STRING,
              description: "Tên sản phẩm chính xác từ danh sách được cung cấp",
            },
            quantity: {
              type: Type.INTEGER,
              description: "Số lượng sản phẩm (chỉ dùng khi mua hàng)",
            },
          },
          required: ["intent"],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) return { intent: VoiceIntentType.UNKNOWN };

    const result = JSON.parse(jsonText) as VoiceCommandResult;
    
    // Fallback: If AI returns unknown but we forced an intent, try to use the forced intent if product is found
    if (specificIntent && result.productName && result.intent === VoiceIntentType.UNKNOWN) {
        result.intent = specificIntent;
    }

    return result;

  } catch (error) {
    console.error("Gemini Error:", error);
    return { intent: VoiceIntentType.UNKNOWN };
  }
};