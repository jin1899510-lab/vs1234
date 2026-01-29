
import { GoogleGenAI } from "@google/genai";

export class StudioVisionService {
  /**
   * API 키 유효성 검사 (무료 모델인 flash-preview로 테스트)
   */
  async testConnection(apiKey: string): Promise<boolean> {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'test',
        config: { maxOutputTokens: 1 }
      });
      return !!response.text;
    } catch (error) {
      console.error('API Key Test Error:', error);
      return false;
    }
  }

  /**
   * 이미지 변환 실행
   */
  async transformImage(base64Image: string, prompt: string): Promise<string> {
    try {
      // 1. 로컬 저장소 키 확인 -> 2. 환경 변수 확인
      const savedKey = localStorage.getItem('_sv_api_key_');
      const apiKey = savedKey ? atob(savedKey) : process.env.API_KEY;

      if (!apiKey) throw new Error('API 키가 설정되지 않았습니다. 설정에서 입력해주세요.');

      const ai = new GoogleGenAI({ apiKey });
      
      // 범용성이 높은 gemini-2.5-flash-image 사용
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image.split(',')[1],
                mimeType: 'image/png',
              },
            },
            {
              text: `${prompt} (중요: 원본의 형태를 유지하면서 조명과 배경을 스튜디오급으로 개선해줘. 결과는 반드시 이미지로 응답해줘.)`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      let resultImageUrl = '';
      if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            resultImageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!resultImageUrl) {
        throw new Error('AI가 이미지를 생성하지 못했습니다. 프롬프트나 키 권한을 확인해주세요.');
      }

      return resultImageUrl;
    } catch (error: any) {
      console.error('Transformation Error:', error);
      if (error.message?.includes('403') || error.message?.includes('permission')) {
        throw new Error('API 키 권한 오류입니다. 유료 결제가 필요한 모델이거나 키가 제한되었습니다.');
      }
      throw error;
    }
  }
}

export const studioService = new StudioVisionService();
