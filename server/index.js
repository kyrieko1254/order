const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PostgreSQL 연결 설정
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// 연결 테스트
pool.connect()
  .then(client => {
    return client.query('SELECT NOW()')
      .then(res => {
        console.log('PostgreSQL 연결 성공:', res.rows[0]);
        client.release();
      })
      .catch(err => {
        client.release();
        console.error('PostgreSQL 연결 실패:', err.stack);
      });
  })
  .catch(err => {
    console.error('PostgreSQL 연결 실패:', err.stack);
  });

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ message: 'Order App Backend Server is running!' });
});

// API 라우트
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
}); 