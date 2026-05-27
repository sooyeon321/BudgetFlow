// src/modules/ai_ocr/ai_ocr.service.ts

// 승엽님과 합의한 스키마 v4 규격을 타입스크립트 인터페이스로 선언
export interface ParsedExpenseResult {
  amount: number;
  item: string;
  confidence: number;
  date: string; // YYYY-MM-DD
}

export const aiOcrService = {
  /**
   * [LLM/OCR 팀 담당] 슬랙 봇이 수신한 영수증 이미지를 분석하여 텍스트 및 메타데이터를 추출합니다.
   * @param fileUrl S3에 업로드된 영수증 이미지 주소
   */
  parseImage: async (fileUrl: string): Promise<ParsedExpenseResult> => {
    // TODO: LLM/OCR 팀원분이 Naver CLOVA OCR이나 OpenAI API 호출 로직을 여기에 구현하시면 됩니다.
    console.log(`[LLM/OCR] 이미지 분석 요청 접수: ${fileUrl}`);

    // 임시 Mock 리턴 데이터 (2주차 코드 통합 전까지 전체 서버가 정상 작동하도록 뼈대 제공)
    return {
      amount: 25500,
      item: "스타벅스 인하대점",
      confidence: 0.95,
      date: "2026-05-24"
    };
  }
};