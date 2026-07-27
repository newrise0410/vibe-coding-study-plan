'use client';

import { useState } from 'react';
import { resized } from '../lib/imageUrl.js';

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 6;

/**
 * 브라우저 → Cloudinary 직접 업로드.
 *
 * 파일은 우리 서버를 거치지 않는다. 우리 서버는 허가증(서명)만 발급한다.
 * Network 탭을 열어두고 올려보면 큰 요청이 res.cloudinary.com 으로 나가는 게 보인다.
 */
export default function ImageUpload({ day, fieldKey, value, onChange }) {
  const urls = value ?? [];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function uploadOne(file) {
    // 1. 우리 서버에 허가증을 받으러 간다 (작은 요청)
    const signRes = await fetch('/api/upload/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day, fieldKey }),
    });
    const cfg = await signRes.json();
    if (!signRes.ok) throw new Error(cfg.message ?? '서명을 받지 못했습니다');

    // 2. 파일 + 서명을 들고 Cloudinary 로 간다 (큰 요청)
    //    서명에 넣은 값(folder·timestamp·transformation)을 똑같이 보내야 통과한다.
    const fd = new FormData();
    fd.append('file', file);
    fd.append('api_key', cfg.apiKey);
    fd.append('timestamp', cfg.timestamp);
    fd.append('signature', cfg.signature);
    fd.append('folder', cfg.folder);
    fd.append('transformation', cfg.transformation);

    const up = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/image/upload`, {
      method: 'POST',
      body: fd,
    });
    const data = await up.json();
    if (!up.ok) throw new Error(data?.error?.message ?? '업로드에 실패했습니다');

    // 3. 받은 주소만 폼에 담는다. 파일이 아니라 URL 이 DB 로 간다.
    return data.secure_url;
  }

  async function onPick(e) {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;

    if (urls.length + files.length > MAX_FILES) {
      setError(`최대 ${MAX_FILES}장까지입니다`);
      return;
    }
    const tooBig = files.find((f) => f.size > MAX_BYTES);
    if (tooBig) {
      setError(`${tooBig.name} 이 10MB를 넘습니다`);
      return;
    }

    setBusy(true);
    setError('');
    try {
      const added = [];
      for (const f of files) added.push(await uploadOne(f));
      onChange([...urls, ...added]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="upload">
      <div className="thumbs">
        {urls.map((u) => (
          <div key={u} className="thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resized(u, 'w_240,h_160,c_fill,q_auto,f_auto')} alt="올린 스크린샷" />
            <button type="button" onClick={() => onChange(urls.filter((x) => x !== u))}>
              지우기
            </button>
          </div>
        ))}
      </div>

      <label className="picker">
        <input type="file" accept="image/*" multiple onChange={onPick} disabled={busy} />
        <span>{busy ? '올리는 중…' : urls.length ? '더 올리기' : '스크린샷 올리기'}</span>
      </label>

      {error && <p className="err">{error}</p>}
    </div>
  );
}

