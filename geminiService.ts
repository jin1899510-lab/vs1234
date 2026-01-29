
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
        contents: 'test connection',
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
      // 1. 로컬 저장소 키 최우선 확인
      const savedKey = localStorage.getItem('_sv_api_key_');
      let apiKey = '';
      
      if (savedKey) {
        try {
          apiKey = atob(savedKey);
        } catch (e) {
          console.error('Stored key corruption');
        }
      }
      
      // 2. 환경 변수 확인 (주입된 키)
      if (!apiKey) {
        apiKey = process.env.API_KEY || '';
      }

      if (!apiKey) {
        throw new Error('API 키가 없습니다. 오른쪽 상단 [키 관리] 버튼을 눌러 키를 설정해주세요.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // 이미지 생성 전용 모델
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
              text: `${prompt} (중요: 반드시 단 한 장의 완성된 이미지만 응답해줘. 텍스트 설명 없이 이미지 데이터만 보내야 함.)`,
            },
          ],
        },
      });

      // 후보군 및 안전 필터 체크
      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('AI가 응답 후보를 생성하지 못했습니다. (Empty Response)');
      }

      const candidate = response.candidates[0];
      
      // 안전 필터에 의해 차단된 경우
      if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'OTHER') {
        throw new Error(`이미지 생성이 차단되었습니다. (사유: ${candidate.finishReason}). 다른 사진이나 테마를 시도해보세요.`);
      }

      // 이미지 데이터 추출
      const parts = candidate.content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          const finalImageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
          console.log('Image generated successfully');
          return finalImageUrl;
        }
      }

      // 텍스트만 온 경우 (에러 메시지 포함 가능성)
      if (parts[0]?.text) {
        throw new Error(`AI가 이미지 대신 메시지를 보냈습니다: ${parts[0].text}`);
      }

      throw new Error('응답에서 이미지 데이터를 찾을 수 없습니다. 다시 시도해주세요.');
    } catch (error: any) {
      console.error('Studio Transformation Error:', error);
      // 구체적인 에러 메시지 반환
      if (error.message?.includes('403')) throw new Error('API 키가 만료되었거나 권한이 없습니다.');
      if (error.message?.includes('429')) throw new Error('할당량이 초과되었습니다. 잠시 후 다시 시도하세요.');
      throw error;
    }
  }
}

export const studioService = new StudioVisionService();
