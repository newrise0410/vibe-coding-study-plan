import SessionBar from '../../components/SessionBar.js';

/** 로그인한 사람만 오는 구역. 공개 페이지(/, /login)는 이 레이아웃을 안 쓴다. */
export default function Layout({ children }) {
  return (
    <>
      <SessionBar />
      {children}
    </>
  );
}
