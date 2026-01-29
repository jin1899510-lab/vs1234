
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
        contents: 'test',
        config: { maxOutputTokens: 1 }
      });
      return !!response;
    } catch (error) {
      console.error('Connection test failed:', error);
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
      let apiKey = '';
      
      if (savedKey) {
        try {
          apiKey = atob(savedKey);
        } catch (e) {
          console.error('Key decoding error');
        }
      }
      
      if (!apiKey) {
        apiKey = process.env.API_KEY || '';
      }

      if (!apiKey) throw new Error('사용 가능한 API 키가 없습니다. [키 관리]에서 입력해주세요.');

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
              text: `${prompt} (중요: 반드시 단 한 장의 완성된 이미지만 생성해줘. 원본 피사체의 구도와 형태를 유지하되, 조명과 배경을 전문 스튜디오급으로 완벽하게 연출해야 함.)`,
            },
          ],
        },
      });

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('AI가 응답을 생성하지 못했습니다.');
      }

      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }

      // 이미지가 없고 텍스트만 있는 경우 에러 처리
      if (parts[0]?.text) {
        throw new Error(`AI 메시지: ${parts[0].text}`);
      }

      throw new Error('이미지 데이터를 찾을 수 없습니다.');
    } catch (error: any) {
      console.error('Studio Transformation Error:', error);
      throw error;
    }
  }
}

export const studioService = new StudioVisionService();
