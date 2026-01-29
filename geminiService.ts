
import { GoogleGenAI } from "@google/genai";

export class StudioVisionService {
  /**
   * API 키 유효성 테스트
   */
  async testConnection(apiKey: string): Promise<boolean> {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'ping',
        config: { maxOutputTokens: 1 }
      });
      return !!response.text;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * 이미지 변환 (무료/유료 범용 모델 사용)
   */
  async transformImage(base64Image: string, prompt: string): Promise<string> {
    try {
      const savedKey = localStorage.getItem('_sv_api_key_');
      const apiKey = savedKey ? atob(savedKey) : process.env.API_KEY;

      if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.');

      const ai = new GoogleGenAI({ apiKey });
      
      // 무료 등급에서도 가장 안정적인 gemini-2.5-flash-image 사용
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
              text: `${prompt} (중요: 반드시 한 장의 이미지만 생성해줘. 원본 피사체의 특징을 유지하면서 배경과 조명을 스튜디오 퀄리티로 바꿔야 해.)`,
            },
          ],
        },
      });

      let resultImageUrl = '';
      
      // 응답 후보군 확인
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          // 인라인 이미지 데이터가 있는지 확인
          if (part.inlineData) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            resultImageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!resultImageUrl) {
        // 이미지가 없는 경우 텍스트 응답 확인 (차단 사유 등)
        const textReason = response.text || '알 수 없는 이유로 이미지가 생성되지 않았습니다.';
        throw new Error(`이미지 생성 실패: ${textReason}`);
      }

      return resultImageUrl;
    } catch (error: any) {
      console.error('Transformation error:', error);
      if (error.message?.includes('403') || error.message?.includes('permission')) {
        throw new Error('API 키 권한이 없습니다. 유료 결제 설정이나 키 상태를 확인하세요.');
      }
      throw error;
    }
  }
}

export const studioService = new StudioVisionService();
