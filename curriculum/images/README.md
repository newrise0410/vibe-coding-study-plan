# 커리큘럼 이미지

커리큘럼 본문에 `> 🖼 파일명 — 설명` 형태로 자리를 잡아뒀다. 이 폴더에 같은 이름으로 넣으면 된다.

```markdown
![Atlas 연결 문자열](images/day07-atlas-connect.png)
```

넣을 때 자리표시 줄(`> 🖼 …`)을 위 형태로 바꾼다. 아직 안 넣은 자리는 **자리표시 그대로 둬도 읽는 데 지장이 없다.**

---

## 촬영 목록 10장

`operator-guide.md`가 병목으로 꼽은 지점만 골랐다. 없어도 굴러가지만, 있으면 질문이 눈에 띄게 준다.

| 파일명 | Day | 무엇을 | 언제 |
|---|---|---|---|
| `day00-orca-download.png` | 0 | 다운로드 페이지에서 내 OS 빌드를 고르는 화면 | 🔁 |
| `day00-orca-addrepo.png` | 0 | 저장소가 추가되고 워크트리 하나가 열린 사이드바 | 🔁 |
| `day01-orca-diff.png` | 1 | diff 뷰어. **거터의 AI 마커**가 보이게 | 🔁 |
| `day02-styles-strikethrough.png` | 2 | 규칙 셋이 뜨고 **진 규칙에 취소선**이 그어진 Styles 패널 | 🔁 |
| `day03-vercel-import.png` | 3 | Vercel Import 화면 | 📸 프로젝트당 1회 |
| `day03-deploy-done.png` | 3 | 배포 성공 직후 주소가 뜬 화면 | 📸 |
| `day03-case-sensitivity.png` | 3 | 같은 페이지를 로컬·배포에서 나란히 (한쪽만 깨짐) | 💥 |
| `day05-create-next-app.png` | 5 | `recommended defaults?` **선택지 세 개가 다 보이는** 화면 | 📸 |
| `day07-atlas-connect.png` | 7 | `Connect → Drivers` 연결 문자열 | 📸 클러스터당 1회 |
| `day09-upload-network.png` | 9 | Network 탭 요청 셋의 **Size 열 차이** | 🔁 |
| `day10-redirect-uri.png` | 10 | localhost와 배포 주소가 **둘 다** 들어간 구글 콘솔 | 📸 |
| `day13-amount-tamper.png` | 13 | 결제창 100원 / Atlas 주문 36000원이 나란히 | 💥 |

📸 = 지금 아니면 다시 못 찍는다 · 🔁 = 언제든 재현 가능 · 💥 = 일부러 고장 내서 찍는다

---

## 찍을 때

**키를 가린다.** Atlas 연결 문자열, Cloudinary Secret, 구글 OAuth Secret이 그대로 찍힌다.
찍고 **바로** 모자이크하고, 미심쩍으면 그 키는 재발급한다.
가장 안전한 건 **교보재용 더미 계정**을 따로 파서 찍는 것이다.

**나머지**

- 브라우저 너비를 1280px 정도로 고정한다. 크기가 들쭉날쭉하면 읽기 나쁘다
- 에러 메시지는 **전문이 보이게**. 잘린 에러는 검색이 안 된다
- 파일 크기는 한 장 300KB 이하로. GitHub에서 느려진다
- 콘솔 UI는 자주 바뀐다. **찍은 날짜를 파일명 뒤에 붙여도 좋다** (`day07-atlas-connect-2607.png`)

운영자가 이 스터디를 굴리며 직접 겪는 화면들이라, 자세한 촬영 계획은
`docs/study-web/SHOOTING-GUIDE.md`에 따로 있다.
