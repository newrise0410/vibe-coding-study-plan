'use client';

// 클릭·상태가 필요하니 클라이언트 컴포넌트다.
// 여기 검증은 '친절'이다. 진짜 방어선은 lib/validate.js 쪽이다.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from './ImageUpload.js';

export default function SubmitForm({ day, fields, required, initial }) {
  const router = useRouter();
  const [values, setValues] = useState(() => {
    const base = {};
    for (const f of fields) base[f.key] = initial?.fields?.[f.key] ?? '';
    return base;
  });
  const [images, setImages] = useState(() => initial?.images ?? {});
  const [minutes, setMinutes] = useState(initial?.minutesSpent ?? '');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day,
          fields: values,
          images,
          minutesSpent: minutes === '' ? null : Number(minutes),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(data.errors ?? { _: data.message ?? '제출에 실패했습니다' });
        return;
      }
      setDone(true);
      router.refresh();
    } catch {
      setErrors({ _: '네트워크 오류입니다. 잠시 후 다시 시도해주세요' });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card ok">
        <h2>Day {day} 인증 완료</h2>
        <p>#인증 채널에도 요약이 올라갔습니다.</p>
        <a href="/me">내 진행 상황 보기 →</a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="form">
      {errors._ && <p className="err banner">{errors._}</p>}

      {fields.map((f) => {
        const isRequired = required.includes(f.key);
        return (
          <div key={f.key} className="field">
            <label htmlFor={f.key}>
              {f.label}
              {isRequired && <span className="req"> *</span>}
            </label>
            {f.hint && <p className="hint">{f.hint}</p>}

            {f.kind === 'image' ? (
              <ImageUpload
                day={day}
                fieldKey={f.key}
                value={images[f.key]}
                onChange={(urls) => setImages((m) => ({ ...m, [f.key]: urls }))}
              />
            ) : f.kind === 'long' ? (
              <textarea id={f.key} rows={4} value={values[f.key]} onChange={set(f.key)} />
            ) : (
              <input
                id={f.key}
                type={f.kind === 'url' ? 'url' : 'text'}
                value={values[f.key]}
                onChange={set(f.key)}
                placeholder={f.kind === 'url' ? 'https://' : ''}
              />
            )}

            {errors[f.key] && <p className="err">{errors[f.key]}</p>}
          </div>
        );
      })}

      <div className="field">
        <label htmlFor="minutes">오늘 걸린 시간 (분)</label>
        <p className="hint">대략이면 됩니다. 다음 기수 난이도를 조정하는 데 씁니다</p>
        <input
          id="minutes"
          type="number"
          min="0"
          max="600"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
        {errors.minutesSpent && <p className="err">{errors.minutesSpent}</p>}
      </div>

      <button type="submit" disabled={busy}>
        {busy ? '보내는 중…' : initial ? '다시 제출' : '인증 제출'}
      </button>
    </form>
  );
}
