# Order App Backend Server

Express.js를 사용한 주문 앱 백엔드 서버입니다.

## 설치

```bash
npm install
```

## 개발 서버 실행

```bash
npm run dev
```

서버는 기본적으로 http://localhost:3001 에서 실행됩니다.

## 프로덕션 서버 실행

```bash
npm start
```

## API 엔드포인트

- `GET /` - 서버 상태 확인
- `GET /api/health` - 헬스 체크

## 환경 변수

- `PORT` - 서버 포트 (기본값: 3001)
- `NODE_ENV` - 환경 설정 (development/production)

## 의존성

- express - 웹 프레임워크
- cors - CORS 미들웨어
- dotenv - 환경 변수 관리
- nodemon - 개발 시 자동 재시작 (개발 의존성) 