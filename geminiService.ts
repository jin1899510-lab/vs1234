
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
      let apiKey = process.env.API_KEY;
      
      if (savedKey) {
        try {
          apiKey = atob(savedKey);
        } catch (e) {
          console.error('Failed to decode saved API key');
        }
      }

      if (!apiKey) throw new Error('API 키가 설정되지 않았습니다. [키 관리]에서 입력해주세요.');

      const ai = new GoogleGenAI({ apiKey });
      
      // 이미지 생성에 최적화된 gemini-2.5-flash-image 사용
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
              text: `${prompt} (중요: 반드시 단 한 장의 완성된 이미지만 생성해줘. 원본 피사체의 구도와 형태를 기반으로, 조명과 소품을 스튜디오급으로 완벽하게 연출해야 해.)`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      // 응답 데이터에서 이미지 파트 찾기 (더 공격적인 추출)
      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0];
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const mimeType = part.inlineData.mimeType || 'image/png';
              return `data:${mimeType};base64,${part.inlineData.data}`;
            }
          }
        }
        
        // 이미지가 없고 텍스트만 있는 경우 (Safety Filter 작동 등)
        if (candidate.content && candidate.content.parts[0]?.text) {
          throw new Error(`AI 응답: ${candidate.content.parts[0].text}`);
        }
      }

      throw new Error('AI가 이미지 데이터를 반환하지 않았습니다. 다시 시도하거나 다른 테마를 선택해주세요.');
    } catch (error: any) {
      console.error('Transformation Error:', error);
      if (error.message?.includes('403') || error.message?.includes('permission')) {
        throw new Error('API 키 사용 권한이 없습니다. 유료 모델 제한이나 키 상태를 확인하세요.');
      }
      throw error;
    }
  }
}

export const studioService = new StudioVisionService();
