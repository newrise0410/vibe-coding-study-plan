export const metadata = { title: '메일을 확인해주세요' };

export default function CheckEmail() {
  return (
    <main className="wrap narrow">
      <h1>메일을 보냈습니다</h1>
      <p className="lead">
        받은 메일의 링크를 누르면 로그인됩니다.
        <br />이 창은 닫아도 됩니다.
      </p>

      <div className="card">
        <p className="note" style={{ margin: 0 }}>
          <b>안 왔나요?</b>
          <br />· 스팸함을 확인해주세요
          <br />· 주소에 오타가 없었는지 확인해주세요
          <br />· 링크는 <b>30분</b> 동안만 유효합니다
        </p>
      </div>

      <a href="/login">← 다시 보내기</a>
    </main>
  );
}
