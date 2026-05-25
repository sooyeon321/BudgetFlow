import { App } from '@slack/bolt';
import * as dotenv from 'dotenv';
dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN!,
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  port: 3000,
});

app.event('message', async ({ event, client }) => {
  // 봇 자신의 메시지는 무시 (무한루프 방지)
  if ('bot_id' in event) return;

  const msg = event as any;
  const text = msg.text || '';
  const files = msg.files || [];

  const hasText = text.trim().length > 0;
  const hasImage = files.some((f: any) => f.mimetype?.startsWith('image/'));

  if (hasImage && hasText) {
    console.log('📷📝 텍스트 + 이미지');
  } else if (hasImage) {
    console.log('📷 이미지만');
  } else if (hasText) {
    console.log('📝 텍스트만');
  }

  // 접수 확인 메시지 전송
  await client.chat.postMessage({
    channel: msg.channel,
    text: '✅ 접수됐습니다. 분석 중...',
  });
});

(async () => {
  await app.start();
  console.log('봇 실행 중!');
})();
