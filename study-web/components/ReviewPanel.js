'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 되돌려보낼 땐 톤을 가볍게.
 * "다시 하세요"가 아니라 "이거 되게 재밌으니까 이것만 해보고 오세요".
 * 비동기 스터디에서 한 번 민망해지면 그대로 사라진다.
 */
const TEMPLATES = [
  {
    label: '해부가 비었을 때',
    text: '해부 칸만 채워주시면 통과예요. 파일명이랑 줄 번호까지 적어주시면 됩니다. 5분이면 돼요',
  },
  {
    label: '부숴보기가 비었을 때',
    text: '부숴보기가 사실 제일 재밌는 부분인데 비어 있어요. 하나만 망가뜨려보고 뭐가 어떻게 됐는지만 적어주세요',
  },
  {
    label: '시키기만 한 것 같을 때',
    text: 'AI가 만들어준 결과는 잘 나왔네요. 근데 그게 코드 어디에 있는지 직접 찾아서 지목해주시면 완성입니다',
  },
  {
    label: '너무 짧을 때',
    text: '한 줄만 더 적어주세요. "뭘 바꿨더니 → 뭐가 어떻게 됐다" 이 형태면 충분해요',
  },
];

export default function ReviewPanel({ id, status, initialNote }) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote ?? '');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function send(action) {
    setBusy(action);
    setError('');
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? '실패했습니다');
        return;
      }
      setResult(data.status);
      router.refresh();
    } catch {
      setError('네트워크 오류입니다');
    } finally {
      setBusy(null);
    }
  }

  if (result) {
    return (
      <div className={`card ${result === 'returned' ? 'returned' : 'ok'}`}>
        <strong>{result === 'returned' ? '되돌려보냈습니다' : '통과 처리했습니다'}</strong>
        {result === 'returned' && <p className="note">#인증 채널에도 알림이 갔습니다.</p>}
        <a href="/admin">← 대시보드로</a>
      </div>
    );
  }

  return (
    <section className="card">
      <h2>검토</h2>
      <p className="note">
        현재 상태: <strong>{status === 'returned' ? '되돌려보냄' : status === 'accepted' ? '통과' : '검토 대기'}</strong>
      </p>

      <div className="chips">
        {TEMPLATES.map((t) => (
          <button key={t.label} type="button" className="chip" onClick={() => setNote(t.text)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="field">
        <label htmlFor="note">되돌려보낼 때 남길 한 줄</label>
        <p className="hint">
          무엇을 더 해오면 되는지 구체적으로. 메모 없이는 되돌려보낼 수 없습니다
        </p>
        <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      {error && <p className="err">{error}</p>}

      <div className="actions">
        <button type="button" onClick={() => send('return')} disabled={busy !== null} className="danger">
          {busy === 'return' ? '보내는 중…' : '되돌려보내기'}
        </button>
        <button type="button" onClick={() => send('accept')} disabled={busy !== null}>
          {busy === 'accept' ? '처리 중…' : '통과'}
        </button>
      </div>
    </section>
  );
}
