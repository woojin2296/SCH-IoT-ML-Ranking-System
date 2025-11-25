# SCH IoT 머신러닝 미니 프로젝트 랭킹 시스템

순천향대학교 사물인터넷학과 머신러닝 미니 프로젝트의 제출 점수 집계·랭킹·공지 관리용 웹 애플리케이션입니다. Next.js(App Router)와 SQLite를 사용하며, 참가자/관리자 권한에 따라 화면과 API가 분리됩니다.

## 주요 기능
- **인증/세션**: 학번 기반 회원가입·로그인, bcrypt 해시, 7일 세션 쿠키. 미들웨어가 로그인 없는 접근을 대부분 차단합니다.
- **공지사항**: 활성 공지 목록을 상단에 노출. 관리자는 공지 추가/수정/활성화 전환/삭제 가능.
- **랭킹 보드**: 프로젝트별(1~4) 각 사용자 최고 점수만 집계해 순위 표시, 상위 3위 강조, 내 최고 점수 요약 제공.
- **마이페이지**: 개인 제출 이력 조회(10개씩 페이지네이션), 제출 파일 다운로드, 기록 삭제. 결과 제출 시 `.ipynb`/`.py` 10MB 이하만 업로드 가능하며 기본 검증을 수행합니다.
- **관리자 페이지**:
  - 사용자 관리: 역할 변경(user/admin), 계정 삭제(본인 제외).
  - 공지 관리: 공지 CRUD와 활성 상태 토글.
  - 랭킹 관리: 프로젝트별 상위 기록 조회 및 삭제.
  - 제출 점수 관리: 전체 제출 조회, 학번 필터링, 기록 삭제.
  - 요청 로그: API 호출 기록 검색/페이지네이션(경로·메서드·IP·메타데이터).

## 기술 스택
- Next.js 15 / React 19 / TypeScript
- Tailwind CSS v4, shadcn/ui 컴포넌트
- SQLite3(`better-sqlite3`) 저장소, 파일 업로드는 기본 `uploads/evaluation-scores/` 하위에 보관
- ESLint / Docker

## 데이터 및 파일 저장
- **DB 위치**: `db/app.db`. 스키마는 `schema.sql` 참고.
- **초기화 스크립트**: `npm run db:reset` 또는 `node scripts/resetDb.js` 로 `schema.sql` 기반 DB 재생성.
- **업로드 경로**: 기본은 `uploads/evaluation-scores/<userId>/`이며, `UPLOAD_ROOT` 환경 변수로 루트를 바꿀 수 있습니다. 삭제 시 실제 파일도 제거 시도.

## 실행 방법 (로컬)
1) 의존성 설치: `npm install`  
2) DB 준비: `npm run db:reset` (최초 또는 재설정 시)  
3) 개발 서버: `npm run dev` 후 http://localhost:2025 접속  
4) 프로덕션 빌드/실행: `npm run build` → `npm run start`

> 최초 가입 사용자는 기본적으로 `user` 권한입니다. 관리자 계정이 필요하면 DB에서 `users.role`을 `admin`으로 직접 수정하거나, 시드 데이터를 추가해 주세요.

## Docker로 실행
- 빌드: `docker build -t sch-iot-ml-miniproject .`
- 단독 실행 예시:
  ```bash
  docker run -p 2025:2025 \
    -v /ABS/PATH/db:/app/db \
    -e UPLOAD_ROOT=/app/uploads/evaluation-scores \
    -v /ABS/PATH/uploads:/app/uploads/evaluation-scores \
    --name sch-iot-ml-miniproject \
    sch-iot-ml-miniproject
  ```
- `docker-compose up -d`로도 실행 가능하며, DB는 볼륨(`/home/iot/iot-ml-miniproject/db`)에 지속됩니다.

## 주요 API 개요
- 공개: `POST /api/auth/check`(학번 존재 여부), `POST /api/auth/login`, `POST /api/user`(회원가입), `GET /api/notice`
- 인증 필요: `GET/POST/DELETE /api/score/my`, `GET /api/score/my/[id]/file`, `GET /api/ranking`
- 관리자: `PATCH/DELETE /api/admin/users`, `GET/POST/PATCH/DELETE /api/admin/notices`, `DELETE /api/admin/scores`, `DELETE /api/admin/rankings`

## 구조 요약
- `src/app` – 페이지 및 API 라우트(`app/`, `admin/`, `login/`, `mypage/`, `/api/*`)
- `src/lib` – DB 접근(repositories), 서비스 로직, 인증/세션/업로드/로그 유틸
- `schema.sql` – SQLite 스키마, `scripts/resetDb.js` – 초기화 스크립트
- `uploads/` – 제출 파일 저장소 (런타임에 생성)

## 환경 변수
- `NEXT_PUBLIC_APP_URL` (선택): 서버 외부 접근 URL을 명시하면 내부 fetch에서 사용합니다.
- `COOKIE_SECURE` (선택): `"false"`/`"0"` 외의 값이면 secure 쿠키 적용. 기본은 `NODE_ENV === "production"`일 때만 secure.
- `UPLOAD_ROOT` (선택): 제출 파일을 저장할 절대/상대 경로 루트. 미지정 시 `<프로젝트>/uploads/evaluation-scores` 사용.
