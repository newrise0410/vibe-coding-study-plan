/**
 * Discord 웹훅 알림.
 *
 * 인증을 웹으로 받으면 "남의 인증을 본다"는 사회적 효과가 사라진다.
 * 그래서 제출될 때 #인증 채널에 요약만 흘려보낸다. 전문은 웹에서 본다.
 *
 * 실패해도 제출은 성공해야 한다. 부르는 쪽에서 catch 로 삼킨다.
 */

const BADGE_DAY = { 5: '🌱', 10: '🌿', 15: '🌳' };

export async function notifySubmission({ name, day, resubmitted }) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;

  const mark = BADGE_DAY[day] ? ` ${BADGE_DAY[day]}` : '';
  const verb = resubmitted ? '다시 제출' : '완료';
  const content = `**${name}** — Day ${day} ${verb}${mark}`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
  });
}

export async function notifyReturned({ name, day, note }) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `**${name}** — Day ${day} 되돌려보냄: ${note}`,
      allowed_mentions: { parse: [] },
    }),
  });
}
