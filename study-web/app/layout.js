import './globals.css';

export const metadata = {
  title: '들꽃 스터디',
  description: 'AI가 짜준 코드를 해부하는 3주 스터디 — 인증과 진행 상황',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
