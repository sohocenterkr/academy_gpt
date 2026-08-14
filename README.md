# Academy-Gpt

한 학원에서 학생·보호자·강좌·수강·등원·대량문자·카드뉴스 업무를 관리하는 모바일 우선 웹서비스입니다.

## 현재 상태

- React + TypeScript + Vite
- Express API 서버
- 모바일 Edge-to-edge UI
- `/api/health` 상태 확인
- Vitest 자동 테스트
- Vercel Singapore 설정
- Drizzle 관리자 인증 스키마
- 최초 최고관리자 생성 완료

현재는 기반 프로젝트, 개발 DB 스키마, 최초 최고관리자 생성까지 완료됐습니다. 다음 단계에서 로그인·세션 API를 연결합니다.

## 실행과 검증

- 개발 실행: `npm run dev`
- TypeScript 검사: `npm run check`
- 자동 테스트: `npm run test`
- Production 빌드: `npm run build`

## 운영 원칙

- Replit 개발 DB와 Production Neon DB를 완전히 분리합니다.
- Production DB는 사용자 승인 없이 수정하지 않습니다.
- 날짜와 시간은 KST(`Asia/Seoul`) 기준으로 처리합니다.
- 모든 파일은 브라우저에서 Cloudinary로 직접 업로드합니다.
- Secret은 서버 환경변수에만 저장합니다.
- 하원 및 강좌별 출석 기능은 구현하지 않습니다.
- 실문자 발송은 관리자 최종 승인 후 진행합니다.
