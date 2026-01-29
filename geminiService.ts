
import { GoogleGenAI } from "@google/genai";

export class StudioVisionService {
  /**
   * API 키를 안전하게 가져오는 메서드
   */
  private getApiKey(): string {
    // 1. 사용자가 직접 입력한 로컬 스토리지 키 (최우선)
    const savedKey = localStorage.getItem('_sv_api_key_');
    if (savedKey) {
      try {
        return atob(savedKey);
      } catch (e) {
        console.error('Failed to decode stored API key');
      }
    }

    // 2. 환경 변수 (Vite/Vercel 대응)
    // @ts-ignore
    const viteKey = import.meta.env?.VITE_API_KEY;
    const processKey = process.env.API_KEY;

    return viteKey || processKey || '';
  }

  /**
   * API 키 유효성 테스트
   */
  async testConnection(apiKey: string): Promise<boolean> {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'hi',
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
      const apiKey = this.getApiKey();
      if (!apiKey) {
        throw new Error('API 키가 설정되지 않았습니다. [키 관리] 메뉴를 이용해주세요.');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // 이미지 생성을 위한 고성능 모델 사용
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
              text: `${prompt} (중요: 반드시 한 장의 이미지 데이터만 전송해. 텍스트 설명이나 인사는 생략해.)`,
            },
          ],
        },
      });

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('AI가 응답을 생성하지 못했습니다.');
      }

      const candidate = response.candidates[0];
      
      // 안전 필터링 확인
      if (candidate.finishReason === 'SAFETY') {
        throw new Error('안전 필터에 의해 생성이 차단되었습니다. 다른 사진을 시도해보세요.');
      }

      // 파트에서 이미지 찾기
      const parts = candidate.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          return `data:${mimeType};base64,${part.inlineData.data}`;
        }
      }

      // 텍스트만 온 경우 에러 메시지로 처리
      if (parts[0]?.text) {
        throw new Error(`AI 응답 오류: ${parts[0].text.substring(0, 100)}...`);
      }

      throw new Error('응답에서 이미지 데이터를 찾을 수 없습니다.');
    } catch (error: any) {
      console.error('Studio Service Error:', error);
      throw error;
    }
  }

  /**
   * 키 존재 여부 확인용
   */
  hasValidKeyConfig(): boolean {
    return !!this.getApiKey();
  }
}

export const studioService = new StudioVisionService();
