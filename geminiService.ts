
import { GoogleGenAI } from "@google/genai";

export class StudioVisionService {
  /**
   * Transforms an image using gemini-3-pro-image-preview.
   * This model requires a paid API key selected via window.aistudio.openSelectKey().
   */
  async transformImage(base64Image: string, prompt: string): Promise<string> {
    try {
      // Create a new instance right before making the call to ensure the latest API key is used.
      // The API key is injected into process.env.API_KEY automatically after selection via AI Studio dialog.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image.split(',')[1],
                mimeType: 'image/png',
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      let resultImageUrl = '';
      // Iterate through parts to find the inlineData part as per guidelines.
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            resultImageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!resultImageUrl) throw new Error('이미지가 생성되지 않았습니다.');
      return resultImageUrl;
    } catch (error: any) {
      console.error('Error transforming image:', error);
      throw error;
    }
  }
}

export const studioService = new StudioVisionService();
