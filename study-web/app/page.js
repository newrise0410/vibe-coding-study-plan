import { dayHeadings } from '../lib/curriculum.js';
import { parseDate, dayToDate } from '../lib/schedule.js';

// 공개 페이지다. 로그인도 DB도 건드리지 않는다. 커리큘럼만 읽어서 한 시간 캐시한다.
export const revalidate = 3600;

export const metadata = {
  title: '들꽃 스터디 — AI가 짜준 코드를 해부하는 3주',
  description:
    '15일 뒤에 로그인·상품등록·이미지업로드·결제가 되는 사이트가 인터넷에 있습니다. ' +
    '이 스터디가 노리는 건 그다음입니다 — AI가 알아서 다 해줘도 그 안에서 무슨 일이 일어난 건지 아는 것.',
};

const WEEKS = [
  { label: '1주차', theme: '브라우저가 하는 일', days: [1, 2, 3, 4, 5] },
  { label: '2주차', theme: '서버와 데이터', days: [6, 7, 8, 9, 10] },
  { label: '3주차', theme: '상거래와 운영', days: [11, 12, 13, 14, 15] },
];

const STEPS = [
  ['1. 원리 먼저', '원래 이건 이런 구조로 돌아간다'],
  ['2. 시켜보기', 'AI에게 요청한다. 여기는 빨리 지나간다'],
  ['3. 해부하기', '결과물에서 그 구조가 어디 있는지 직접 찾아 지목한다'],
  ['4. 부숴보기', '일부러 망가뜨리고 무엇이 무너지는지 관찰한다'],
  ['5. 스스로 답하기', '확인 질문 3개'],
];

const BADGES = [
  ['🌱', '새싹', 'Day 1–5 — 내 사이트가 인터넷에 있고 왜 뜨는지 안다'],
  ['🌿', '줄기', 'Day 6–10 — 데이터가 저장되고 로그인이 된다'],
  ['🌳', '나무', 'Day 11–15 완주 — 결제까지 도는 서비스가 있다'],
];

const STACK = [
  ['Next.js', '화면과 API를 한 프로젝트에서'],
  ['MongoDB Atlas', '무료 티어. 첫 DB로 진입장벽이 낮다'],
  ['Cloudinary', '이미지 저장·최적화·CDN이 한 번에'],
  ['Auth.js', '구글 로그인. 비밀번호를 직접 안 다룬다'],
  ['포트원 + 이니시스', '테스트 결제까지 계약 없이'],
  ['Vercel', '푸시하면 자동 배포'],
  ['Orca', 'AI가 쓴 줄을 표시해주는 IDE'],
  ['개발자 도구 (F12)', '사실상 이 스터디의 주력 도구'],
];

export default async function Landing() {
  const headings = await dayHeadings();
  const byDay = new Map(headings.map((h) => [h.day, h]));
  const day1 = parseDate(process.env.STUDY_DAY1_DATE || '2026-08-03');
  const start = dayToDate(day1, 0);
  const startText = `${start.getUTCMonth() + 1}월 ${start.getUTCDate()}일`;

  const title = (day) =>
    (byDay.get(day)?.title ?? `Day ${day}`).replace(/^Day\s*\d+\s*[·—-]\s*/, '');

  return (
    <main className="landing">
      <section className="hero">
        <p className="kicker">바이브코딩 3주 스터디</p>
        <h1>
          15일 뒤에 <strong>결제되는 사이트</strong>가<br />
          인터넷에 있습니다.
        </h1>
        <p className="sub">
          그건 사실 AI만 잘 시켜도 어느 정도 됩니다.
          <br />
          이 스터디가 진짜로 노리는 건 그다음입니다 —
          <br />
          <b>AI가 알아서 다 해줘도, 그 안에서 무슨 일이 일어난 건지 아는 것.</b>
        </p>
        <div className="cta">
          <a className="btn" href="/login">
            참가자 로그인
          </a>
          <span className="note">준비일 {startText} 시작 · 주 5일 × 3주</span>
        </div>
      </section>

      <section className="band">
        <h2>이 스터디의 전제</h2>
        <p className="lead">
          솔직하게 말하고 시작합니다. <b>웬만한 건 AI가 알아서 해줍니다.</b>
          <br />
          &ldquo;쇼핑몰 만들어줘&rdquo;라고 하면 그럴듯한 게 나옵니다. 그건 이미 확인된 사실이라 배울 게 없습니다.
        </p>
        <p className="lead">문제는 그다음입니다.</p>
        <ul className="pains">
          <li>로컬에선 되는데 배포하면 DB 연결이 안 된다. 어디를 봐야 할지 모른다</li>
          <li>결제가 됐다는데 주문이 DB에 안 들어갔다. 어디서 끊긴 건지 모른다</li>
          <li>API 키를 어디에 둬야 하는지 모른 채 프론트 코드에 박아둔다</li>
          <li>
            <b>결제 금액을 브라우저에서 보내고 있다는 게 왜 위험한지 모른다</b>
          </li>
        </ul>
        <p className="lead">
          마지막 항목은 <b>실제로 돈이 새는 문제</b>입니다. 그리고 AI는 시키는 대로 만들어줄 뿐,
          내가 뭘 모르는지는 알려주지 않습니다.
        </p>
        <p className="punch">
          그래서 이건 코드를 짜는 스터디가 아니라 <b>AI가 짜준 코드를 해부하는 스터디</b>입니다.
        </p>
      </section>

      <section>
        <h2>퀘스트는 이렇게 생겼습니다</h2>
        <p className="lead">매일 하나. 5단계를 지납니다.</p>
        <ol className="steps">
          {STEPS.map(([name, desc], i) => (
            <li key={name} className={i === 2 || i === 3 ? 'key' : ''}>
              <b>{name}</b>
              <span>{desc}</span>
            </li>
          ))}
        </ol>
        <p className="note">
          인증은 &ldquo;만들었다&rdquo;가 아니라 <b>&ldquo;찾아냈다 / 관찰했다&rdquo;</b>로 받습니다.
          결과 스크린샷만으로는 통과가 안 됩니다. AI에게 시키기만 해서는 답할 수 없는 걸 묻습니다.
        </p>
      </section>

      <section>
        <h2>15일 지도</h2>
        {WEEKS.map((w) => (
          <div key={w.label} className="week">
            <h3>
              {w.label} <span>{w.theme}</span>
            </h3>
            <ol className="days">
              {w.days.map((d) => (
                <li key={d}>
                  <span className="n">{d}</span>
                  <span className="t">{title(d)}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
        <p className="note">
          Day 3에 이미 배포가 끝납니다. 이후 모든 개념(API, DB, 웹훅, 결제)은
          <b> 배포된 사이트가 있어야 관찰이 가능</b>하기 때문입니다.
        </p>
      </section>

      <section className="band">
        <h2>만드는 것</h2>
        <p className="lead">
          공통 프로젝트는 동네 카페 <b>들꽃</b> 온라인 스토어입니다.
        </p>
        <pre className="flow">
{`방문자   상품 목록 → 상품 상세 → 로그인 → 주문 → 결제
관리자   로그인 → 상품 등록(이미지 업로드) → 주문 목록 확인`}
        </pre>
        <p className="lead">
          작지만 <b>실제 서비스가 가진 조각이 전부 들어있습니다.</b> 화면, API, DB, 파일 저장소,
          인증, 결제, 배포.
        </p>
        <p className="note">
          파는 물건은 각자 바꿉니다. 원두 대신 내 그림, 굿즈, 클래스 예약, 뭐든.
          코드 구조는 같고 도메인만 다르니 서로 도와줄 수 있고 결과물은 내 것이 됩니다.
        </p>
      </section>

      <section>
        <h2>쓰는 것</h2>
        <ul className="stack">
          {STACK.map(([name, why]) => (
            <li key={name}>
              <b>{name}</b>
              <span>{why}</span>
            </li>
          ))}
        </ul>
        <p className="note">
          결제는 <b>포트원 테스트 채널</b>로 승인·검증·웹훅까지 전 과정을 실습합니다.
          배우는 구조는 실거래와 같고, 실계약 시 바꾸는 건 채널 키와 상점 정보뿐입니다.
        </p>
      </section>

      <section>
        <h2>운영 방식</h2>
        <ul className="rules">
          <li>
            <b>주 5일 × 3주 = 15일.</b> 매일 퀘스트 하나
          </li>
          <li>
            하루 <b>1~1.5시간.</b> 1주차는 짧고 2~3주차가 무겁습니다
          </li>
          <li>주말은 밀린 걸 따라잡는 날입니다</li>
          <li>
            <b>15분 룰</b> — 15분 넘게 막히면 무조건 질문합니다.
            혼자 끙끙대다 조용히 사라지는 게 이 스터디의 유일한 실패입니다
          </li>
        </ul>

        <div className="badges">
          {BADGES.map(([mark, name, desc]) => (
            <div key={name}>
              <span className="mark">{mark}</span>
              <b>{name}</b>
              <span className="d">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="tail">
        <h2>가장 중요한 건 4단계입니다</h2>
        <p className="lead">
          무언가가 무슨 일을 하는지 가장 빨리 아는 방법은 <b>그걸 없애보는 것</b>입니다.
          <br />
          <code>&lt;script&gt;</code> 위치를 옮기면, DB 접속 IP 제한을 걸면,
          결제 금액을 브라우저에서 조작하면 — 각각 다른 방식으로 망가집니다.
          <b> 그 차이가 곧 구조입니다.</b>
        </p>
        <div className="cta">
          <a className="btn" href="/login">
            참가자 로그인
          </a>
          <a
            className="ghost"
            href="https://github.com/newrise0410/vibe-coding-study-plan"
            target="_blank"
            rel="noreferrer"
          >
            커리큘럼 전문 보기 ↗
          </a>
        </div>
      </section>
    </main>
  );
}
