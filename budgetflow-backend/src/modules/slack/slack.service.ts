// src/modules/slack/slack.service.ts

export const slackService = {
  /**
   * [봇 팀 담당] 영수증 분석 완료 알림 또는 검토 필요 알림을 슬랙 DM으로 전송합니다.
   * @param slackUserId 슬랙 사용자의 고유 ID (예: U12345678)
   * @param message 전송할 텍스트 메시지 본문
   */
  sendDirectMessage: async (slackUserId: string, message: string): Promise<void> => {
    // TODO: 슬랙 봇 팀원분이 슬랙 Webhook 또는 chat.postMessage API를 여기에 구현하시면 됩니다.
    console.log(`[SlackBot] ${slackUserId}에게 메시지 전송 요청 완료: ${message}`);
    
    // 임시 Mock 구현 (2주차 봇팀 결합 전까지 에러 방지)
    return Promise.resolve();
  }
};