# Junwoo Kim — Academic Homepage

GitHub Pages용 정적 연구자 홈페이지입니다. 외부 패키지 설치 없이 동작하며, 생성된 HTML을 저장소에 함께 보관합니다.

## 로컬 미리보기

Node.js 18 이상에서 실행합니다. Git Bash, PowerShell 모두 같은 명령을 사용할 수 있습니다.

```sh
npm run build
npm run check
npm start
```

브라우저에서 http://127.0.0.1:4173 을 엽니다. Windows PowerShell 실행 정책이 `npm.ps1`을 막으면 `npm` 대신 `npm.cmd`를 사용하세요.

## 프로필 사진 추가

사진은 `assets/images/profile/`에 넣으세요. 현재 사진도 `01-main.png`로 이 폴더에 보관합니다. JPG, JPEG, PNG, WebP, AVIF, GIF를 지원하며 `01-main.png`, `02-conference.jpg`, `03-lab.webp`처럼 번호로 순서를 지정할 수 있습니다. 코드나 사진 목록을 직접 수정할 필요는 없습니다.

두 장 이상이면 이전·다음 버튼과 사진 번호가 나타나며, 프로필과 확대 화면에서 같은 사진을 유지합니다. 좌우 방향키와 터치 스와이프도 지원하고 자동 재생은 하지 않습니다. 사진이 한 장이면 이동 버튼은 숨깁니다. 원본은 확대 화면에서 잘리지 않고 표시됩니다.

`npm start` 실행 중에는 사진 추가·교체·삭제를 감지해 목록을 다시 생성합니다. 새로고침하면 확인할 수 있습니다. 공개 홈페이지에 반영하려면 `npm run build` 후 사진과 생성된 HTML을 함께 커밋·push하세요. 같은 파일명으로 사진을 교체해도 내용 기반 버전이 바뀌어 새 사진이 표시됩니다. 폴더에 사진이 하나도 없으면 기존 GitHub Release 프로필 사진으로 돌아갑니다.

## 수정하는 곳

- `templates/home.html`: 원본 홈 UI, 소개, 연구 주제, 진행 중인 연구, 학력, 특허, 주석 처리된 섹션
- `data/publications.json`: 논문 정보, Project 요약·접근 방법·핵심 결과, 출처
- `data/ongoing.json`: 제출·작성 중인 연구 주제, 익명 저자, 참여 역할과 상태
- `data/bibtex/`: 출판사 사이트에서 직접 가져온 BibTeX 원문
- `scripts/build.mjs`: 공통 메뉴와 푸터, 논문 목록, Project·인용 템플릿
- `assets/original.css`: 공개 홈페이지의 원본 디자인과 2열 레이아웃
- `assets/publication-tools.css`: 원본 UI에 추가되는 인용·필터 기능과 모바일 레이아웃 보정
- `assets/site.css`: 논문별 Project 페이지 디자인
- `assets/site.js`: BibTeX 복사, Publications 필터

수정 후 `npm run build`를 실행하면 다음 파일이 갱신됩니다.

- `index.html`, `publications.html`
- `projects/<slug>/index.html` — 논문별 독립 페이지
- `citations/<slug>.bib`, `citations/all-publications.bib`

새 논문은 JSON 배열에 기존 항목을 복사해 추가합니다. `id`, `slug`, `citationKey`는 고유하게 지정하고 연도순으로 배치하세요. 논문 정보와 생성된 HTML을 함께 커밋합니다. 빌드에 네트워크나 API 키는 필요하지 않습니다. 논문 삭제·slug 변경 시 이전 Project 폴더와 `.bib` 파일도 함께 정리하세요.

## 인용과 자료 출처

기출판 논문 5편의 BibTeX는 출판사에서 가져온 `data/bibtex/` 원본을 사용하며, 화면과 생성 파일에서는 인용 키를 `첫 저자 성 + 두 자리 인용 연도 + 키워드`로 바꿉니다(예: `Kim26CineHaptic`, `Lee24Telemetry`). 원본 파일은 그대로 보관하고, 화면·복사·생성된 BibTeX에서는 abstract와 keywords 필드를 제외합니다. 그 외 서지 필드는 출판사 원문을 유지합니다. IEEE 4편은 각 논문의 Cite This → BibTeX에서, Springer 1편은 Download citation → .BIB에서 가져왔습니다. 출처는 각 Citation 상자에 표시합니다. 출판 예정 2편은 공식 내보내기가 아직 없어 제공된 정보로 만든 임시 인용임을 표시합니다. 목록의 Citation 버튼은 BibTeX를 바로 복사하고 카드 아래에 원문을 펼칩니다. 복사 완료 시 체크 아이콘과 Copied를 표시합니다. 복사 상태는 페이지에서 가장 최근에 누른 버튼 하나에만 표시하며, 이전 버튼의 라벨과 알림은 초기화합니다. 한 번에 하나의 Citation만 펼치며, 다른 논문·필터·바깥 영역을 누르거나 Escape를 누르면 기존 원문을 접고 복사 알림을 초기화합니다. 열린 BibTeX 안에서는 선택과 복사를 계속할 수 있고, Citation · BibTeX 제목으로도 다시 접을 수 있습니다. Project 페이지에는 학술지·학회, 연도, 권·호·쪽수, DOI 등 확인된 서지정보와 선택 가능한 BibTeX를 표시합니다. 상단 메뉴는 홈페이지와 같은 Home / Publications이며, 상단에는 Paper와 Citation details만 표시합니다. Copy BibTeX 버튼은 하단 Citation 영역에 한 번만 표시합니다. 형식 선택과 개별·전체 다운로드 버튼은 제공하지 않습니다. 자동 복사는 HTTPS 또는 localhost에서 브라우저가 허용하는 경우 동작하며, 복사가 차단되면 원문을 펼쳐 선택합니다. JavaScript 없이도 Citation을 펼쳐 수동 복사할 수 있습니다.

EuroHaptics C3는 2024년 행사 및 온라인 공개를 기준으로 목록의 2024년에 배치하지만, Springer 공식 BibTeX의 연도는 2025이므로 인용에서는 2025를 그대로 유지합니다(`citationYear`). 인용 키도 `Kim25Azimuth`로 표시합니다. 원본은 DOI를 키로 사용하고 별도 DOI 필드가 없으므로, 키 변경 시 그 DOI를 `doi` 필드로 추가하여 보존합니다.

2026-09-22에 DOI 등록 정보(Crossref), Springer, PubMed에 수록된 출판 초록, POSTECH CSE 연구 소개를 확인하여 초기 데이터를 정리했습니다. 프로젝트별 `source`에 요약 출처를 기록했습니다. Project 본문은 초록 전문이 아닌 짧은 편집 요약입니다. C3와 C2의 기존 홈페이지 목록에서 누락된 Junseok Park를 DOI 등록 정보에 맞춰 추가했습니다. C2 저자 순서는 Crossref 등록 순서를 따릅니다.

기존 논문 이미지와 CV는 이 저장소의 GitHub Release `images` 링크를 사용합니다. 프로필은 `assets/images/profile/`의 로컬 사진을 사용하고, 폴더가 비었을 때만 Release 프로필 사진을 사용합니다. Ongoing work의 상태는 기존 홈페이지 내용을 유지했습니다.

2027년에는 IEEE VR 제출 연구 2편(General Egocentric Direction, 4D Cinematic Experiences)과 Extreme Mechanics Letters 작성 연구 1편(Finger Contact Dynamics and Perception Analysis)을 표시합니다. 정식 논문 제목 대신 Research topic으로 표시하며 저자는 `Anonymous`입니다. Submitted/Writing 상태를 이미지 칸과 배지에 모두 표시합니다. IEEE VR의 풀명칭은 https://ieeevr.org/ 에서 확인했습니다. 정식 서지정보가 없으므로 Project·Paper·Citation 자료는 생성하지 않고, 해당 버튼을 회색 비활성 상태로 표시합니다. 첫 번째 IEEE VR 연구는 제1저자, 두 번째는 공동저자로 처리하고 EML은 기존 Ongoing Work의 제1저자 정보를 유지합니다. 연도는 사용자 지정 계획 연도이며 출판 확정을 뜻하지 않습니다.

All / Journal / Conference / 1st Papers에는 게재 확정된 논문만 표시하고 집계합니다. 출판된 논문과 To appear를 포함하여 All 7편, Journal 3편, Conference 4편, 1st Papers 4편입니다. 제출·작성 중인 연구는 Submitted 2 / Writing 1에서 각각 볼 수 있으며, 버튼의 개수는 해당 상태 데이터에서 계산합니다. 이 개수는 게재 확정 논문 수에 포함하지 않습니다. 2027년 배지는 Ongoing work로 표시합니다. Research Output의 Accepted Papers와 First Author도 게재 확정 기준으로 집계합니다. Ongoing Work의 세 논문 항목을 누르면 해당 상태 필터가 선택되고 2027년 카드로 이동합니다.

UIST'26 CineHaptic(C4)과 TVCG / ISMAR 2026 Compliance(J3)는 저자 제공 제목·저자·그림으로 추가했습니다. Publications의 출판 예정 표기는 박스 없는 큰 글씨의 `- To appear`입니다. 홈 Ongoing Work에서는 기존 파란색 `To appear` 배지를 유지합니다. TVCG / ISMAR 구분과 공동 제1저자 표기는 https://www.jiwanlee.me/ 에서, CineHaptic의 학회 정보는 https://ami.kaist.ac.kr/publications 에서 확인했습니다. 논문 URL, DOI, 권·호·쪽수가 미정인 항목은 해당 필드를 생략하며 인용에는 출판 예정 상태를 기록합니다. 모든 논문의 썸네일과 제목은 로컬 Project 페이지로 연결됩니다. Paper 버튼은 항상 표시하며 링크가 없으면 회색으로 비활성화합니다.

두 신규 이미지는 `assets/images/`에 저장했습니다. 목록의 썸네일은 원본 비율을 유지하며 이미지 박스 안에 전체 그림이 들어오도록 표시합니다(`object-fit: contain`). Project에서도 전체 그림을 표시하며 대표 이미지 영역은 최대 1200px까지 넓히고 내부 여백을 줄입니다. 신규 Project 설명은 제공된 제목과 그림에 근거한 연구 개요이며 실험 결과를 추가로 추정하지 않습니다. Ongoing Work의 해당 두 요약 항목도 `To appear`로 표시합니다. 논문 수는 출판 예정 논문을 포함합니다.

## 원본 사이트 유지 기준

공개 홈페이지의 프로필, 흰색 배경, 파란색 `#2563eb`, POSTECH 색상 `#c9006c`, Inter 글꼴, CV·Scholar·Email 버튼과 논문 카드 디자인을 유지합니다. 학력은 Ph.D. Student(2021.09~2028.02(Expected))와 B.S.(2014.03~2021.08)로 표시합니다. POSTECH은 대학 풀명칭과 함께 적되 POSTECH 약어에만 고유 색상을 적용합니다. Education과 Research Profile 소제목으로 학력과 소개를 구분합니다. 현재 박사과정은 파란색 포인트 카드와 큰 글씨로 강조하며, 이전 학사 정보는 Graduated 상태와 함께 차분한 회색 카드로 표시합니다. 두 학력 카드는 상태·기간, 학위·전공, 대학명 순서를 공유하며 두 학위명 전체를 굵게 표시하고 학사 대학명에서는 PNU를 굵게 표시합니다. 소개는 지각 실험·신호처리·멀티모달 AI, 센싱·시스템 개발·사용자 평가를 연결하는 연구 강점을 네 문장으로 설명하고 핵심 분야와 역량을 굵게 강조합니다. 분야 키워드는 HCI, Haptics, AI, System, Sensing, Perception, XR/VR/AR 순서로 표시합니다. 진행 중인 연구 6개 항목과 특허는 보존합니다. Research Output과 Current Research 아래에 Patents, Publications 순서로 배치합니다. 기존 P1 특허는 제목과 국가별 출원정보를 2열로 나눕니다. P2는 Audiovisual-to-Haptic Rendering System (Tentative title), Submitted, Inventors: Anonymous, Patent pending.으로 표시합니다. 미정인 출원번호·날짜·국가는 추가하지 않으며 Ongoing Work의 제출 특허 항목에서 P2로 연결합니다. 논문은 연도별 최신순으로 한 행에 한 편씩 전체 너비를 사용하며, 각 카드 안에서 이미지와 정보를 2열로 나눕니다. 모바일에서는 카드 내부를 한 열로 전환합니다.

홈과 Publications 페이지에서 All / Journal / Conference / 1st Papers / Submitted / Writing 중 하나만 선택할 수 있습니다. All / Journal / Conference / 1st Papers를 주요 필터로 표시하고 Submitted / Writing은 그 아래에 작게 배치합니다. 게재 확정 논문 수는 큰 파란색 글씨로 강조하며 설명 문장은 표시하지 않습니다. 다른 카테고리를 누르면 이전 선택이 해제되며, 1st Papers는 공동 제1저자를 포함합니다. 빈 연도는 숨기고 표시 논문 수를 갱신합니다. 게재 확정 논문의 연도 옆에는 `3 papers`처럼 의미가 명확한 개수 배지를 표시하며, 필터에 따라 `1 paper` 또는 `N papers`로 갱신합니다. 상단 표기는 `ACM UIST'26`, `IEEE ToH`, `IEEE TVCG (ISMAR'26)` 형식이며, 저자 바로 아래에 학술지·학회의 풀명칭 (약어), 연도를 표시합니다. Project와 Related research도 같은 약어 규칙을 사용합니다. Research Output의 논문 수와 제1저자 논문 수 역시 같은 데이터에서 계산합니다.

학술지·학회와 상태 배지는 이미지 위가 아닌 오른쪽 정보 칸의 맨 위에 표시합니다. 진행 중인 연구는 Research topic 바로 위, 게재 확정 논문은 제목 위에 배치합니다. 저널은 파랑, 학회는 POSTECH 색상과 어울리는 분홍 포인트를 사용하며 흰 배경을 유지합니다. 카드 본문은 왼쪽 이미지와 오른쪽 논문 제목·저자·풀명칭·링크의 가로 배치입니다. 프로필 사진은 260px로 표시하며 사진 폴더에서 구성되는 갤러리를 사용합니다. 논문 카드의 이미지 칸은 가로 공간의 약 44%를 사용합니다. 이미지와 정보는 최소 280px 높이를 공유하며 긴 내용이 있으면 함께 늘어납니다. 이미지는 원본 비율을 유지하면서 칸 안에 전체가 들어오도록 가운데 정렬합니다(`object-fit: contain`). 비율 차이로 남는 공간은 흰색으로 표시합니다. 수동 복사를 위해 펼친 인용문은 카드 전체 너비를 사용합니다. 제목은 진한 색과 큰 글씨, 저자는 중간 명도, 서지정보는 보조 색으로 구분합니다. Paper는 앰버(#b45309), Project는 퍼플(#7e22ce), Citation은 차콜(#334155)로 구분하며 기본 버튼에는 아이콘을 사용하지 않으며 복사 완료 상태에서만 체크 아이콘을 표시합니다. 사용할 수 없는 버튼은 회색 비활성 상태로 표시합니다. 공동 기여 표시는 저자 목록 뒤에 `(* Equal contribution)`을 이탤릭체로 붙이며, 문구와 저자별 별표는 굵게 표시합니다. 모든 Publications 항목과 Project의 저자 아래 서지정보는 풀명칭 (굵은 약어), 연도 형식을 사용합니다. Project의 Citation 상세정보에도 같은 약어를 굵게 추가합니다. 700px 이하 화면에서는 이미지 칸을 본문 위에 카드 전체 너비의 4:3 영역으로 넓혀 배치하고 그 안에서 원본 비율을 유지합니다.

Current Research는 Audiovisual-to-Haptic Rendering System, Haptic Rendering with Funneling Illusions in VR, Correlation Analysis with 3D DIC for Contact Dynamics and Perception, 3D Reconstruction of Haptic Object for Digital Twin의 네 항목입니다. Doctoral Research와 Technical Skills의 HTML은 `templates/home.html`에서 주석 처리하여 보관합니다. 다시 표시하려면 해당 섹션을 감싼 주석을 제거하고 빌드하세요.

원본의 `jounal` 오타와 지난 저작권 연도는 수정했습니다. 인용 정확성을 위해 출판사 기준으로 보완한 공동저자 정보는 유지합니다. 새 Project 페이지와 Citation 기능은 기존 내용에 추가한 기능입니다.

GitHub Pages에 반영하려면 저장소의 배포 브랜치에 변경 사항을 push해야 합니다. 로컬 수정과 미리보기만으로 공개 홈페이지가 바뀌지는 않습니다. 빌드는 각 CSS·JavaScript 링크에 파일 내용 기반 버전을 붙이며, 파일이 변경되면 방문자의 기존 캐시 대신 새 파일을 불러옵니다. 검증 과정에서도 자산 버전과 실제 내용이 일치하는지 확인합니다.
