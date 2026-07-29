import { dayHeadings } from '../lib/curriculum.js';
import { parseDate, dayToDate } from '../lib/schedule.js';

// 공개 페이지다. 로그인도 DB도 건드리지 않는다. 커리큘럼만 읽어서 한 시간 캐시한다.
export const revalidate = 3600;

export const metadata = {
  title: '들꽃 스터디 — AI가 짜준 코드를 해부하는 3주',
  description:
    '15일 뒤면 로그인부터 상품 등록, 이미지 업로드, 카드 결제까지 작동하는 웹사이트가 인터넷에 올라갑니다. ' +
    '이 스터디가 진짜 노리는 지점은 그다음입니다 — AI가 모든 걸 대신 해줘도 그 속에서 무슨 일이 벌어졌는지 아는 상태.',
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
          15일 뒤면 <strong>결제까지 작동하는 웹사이트</strong>가<br />
          인터넷에 올라갑니다.
        </h1>
        <p className="sub">
          사실 AI에 지시만 잘 내려도 여기까지는 어떻게든 만듭니다.
          <br />
          하지만 이 스터디가 진짜 노리는 지점은 그다음입니다 —
          <br />
          <b>AI가 모든 걸 대신 해줘도, 그 속에서 무슨 일이 벌어졌는지 똑똑히 아는 상태.</b>
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
          솔직히 짚고 넘어가겠습니다. <b>웬만한 구현은 AI가 다 처리해줍니다.</b>
          <br />
          &ldquo;쇼핑몰 하나 만들어줘&rdquo;라는 한마디에 그럴싸한 결과물이 뚝딱 나옵니다.
          이미 검증된 사실이니 굳이 여기서 다시 배울 이유가 없습니다.
        </p>
        <p className="lead">진짜 문제는 그 뒤에 터집니다.</p>
        <ul className="pains">
          <li>내 컴퓨터에선 멀쩡한데 배포만 하면 DB 연결이 끊긴다. 어디를 건드려야 할지 깜깜하다</li>
          <li>결제 완료 알림은 왔는데 DB에 주문 데이터가 빠져 있다. 어디서 꼬였는지 감조차 안 잡힌다</li>
          <li>API 키의 올바른 위치를 몰라 프론트엔드 코드에 그대로 노출한다</li>
          <li>
            <b>브라우저에서 결제 금액을 직접 넘기는 행위가 왜 치명적인지 깨닫지 못한다</b>
          </li>
        </ul>
        <p className="lead">
          마지막 문제는 <b>실제 금전 손실로 직결됩니다.</b> AI는 시키는 코드를 작성할 뿐,
          내 지식의 구멍까지 짚어주지 않습니다.
        </p>
        <p className="punch">
          결국 이 스터디는 코드를 직접 타이핑하는 자리가 아닙니다.
          <b> AI가 만들어낸 코드를 해부하는 과정입니다.</b>
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
          인증 기준은 &ldquo;만들어냈다&rdquo;가 아닌 <b>&ldquo;찾아냈다 / 관찰했다&rdquo;</b>입니다.
          단순히 완성 화면 스크린샷 제출로는 인증할 수 없습니다.
          AI에게 맡기기만 해서는 결코 답할 수 없는 질문을 던지기 때문입니다.
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
          Day 3 시점에 이미 첫 배포를 마칩니다. 그래야 이후 다루는 개념(API, DB 연결, 웹훅, 결제)을
          <b> 실제 작동하는 배포 환경에서 눈으로 관찰</b>할 수 있습니다.
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
          규모는 작아도 <b>진짜 서비스에 들어가는 필수 요소가 빠짐없이 집약되어 있습니다.</b>
          사용자 화면부터 API, DB, 파일 저장소, 인증 시스템, 결제 모듈, 최종 배포까지 모두 담깁니다.
        </p>
        <p className="note">
          판매 품목은 취향껏 바꿉니다. 원두 대신 개인 그림 작품이나 직접 만든 굿즈,
          원데이 클래스 예약 등 무엇이든 상관없습니다. 소프트웨어 뼈대는 동일하고 다루는 아이템만
          달라지므로 스터디원끼리 조언을 주고받기도 쉽습니다. 완성품은 온전히 나만의 포트폴리오가 됩니다.
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
            하루 <b>1~1.5시간.</b> 1주차는 가볍지만 2~3주차는 학습밀도가 꽤 높습니다
          </li>
          <li>주말에는 못다 한 학습을 밀도 있게 복습합니다</li>
          <li>
            <b>15분 룰</b> — 막히는 구간이 15분을 넘기면 지체 없이 도움을 요청합니다.
            혼자 끙끙 앓다 중도 포기하는 상황이야말로 이 스터디에서 경계해야 할 유일한 실패입니다
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
          특정 기능의 본질을 파악하는 가장 빠른 길은 <b>그 요소를 직접 제거해보는 일</b>입니다.
          <br />
          <code>&lt;script&gt;</code> 태그 위치를 슬쩍 바꾸거나, DB 접속 IP를 막아버리거나,
          브라우저상에서 결제 금액을 변조해봅니다. 매번 각기 다른 형태로 시스템이 틀어집니다.
          <b> 그 차이를 파악하는 일이 곧 구조를 이해하는 열쇠입니다.</b>
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
