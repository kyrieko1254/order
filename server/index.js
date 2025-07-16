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
  ssl: { rejectUnauthorized: false }
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

// 1. 커피 메뉴 목록 불러오기
app.get('/api/menus', async (req, res) => {
  try {
    const menuResult = await pool.query('SELECT * FROM Menus ORDER BY menu_id');
    const optionResult = await pool.query('SELECT * FROM Options ORDER BY option_id');
    // 메뉴별 옵션 매핑
    const menus = menuResult.rows.map(menu => ({
      ...menu,
      options: optionResult.rows.filter(opt => opt.menu_id === menu.menu_id)
    }));
    res.json(menus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '메뉴를 불러오지 못했습니다.' });
  }
});

// 2, 3. 주문 저장 및 재고 수정
app.post('/api/orders', async (req, res) => {
  const { content, total_price, items } = req.body;
  // items: [{ menu_id, quantity }]
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // 1) 재고 확인 및 차감
    for (const item of items) {
      // 현재 재고 확인
      const stockRes = await client.query(
        'SELECT stock FROM Menus WHERE menu_id = $1 FOR UPDATE',
        [item.menu_id]
      );
      if (stockRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '존재하지 않는 메뉴입니다.' });
      }
      if (stockRes.rows[0].stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: '재고가 부족합니다.' });
      }
      // 재고 차감
      await client.query(
        'UPDATE Menus SET stock = stock - $1 WHERE menu_id = $2',
        [item.quantity, item.menu_id]
      );
    }
    // 2) 주문 저장
    const orderRes = await client.query(
      'INSERT INTO Orders (content, total_price) VALUES ($1, $2) RETURNING *',
      [JSON.stringify(content), total_price]
    );
    await client.query('COMMIT');
    res.status(201).json({ order: orderRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// 1. 재고 현황 조회
app.get('/api/admin/stocks', async (req, res) => {
  try {
    const result = await pool.query('SELECT menu_id, name, stock FROM Menus ORDER BY menu_id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '재고 정보를 불러오지 못했습니다.' });
  }
});

// 2. 주문 현황 조회
app.get('/api/admin/orders', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT order_id, content, total_price, ordered_at, status FROM Orders ORDER BY ordered_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '주문 정보를 불러오지 못했습니다.' });
  }
});

// 3, 4. 주문 상태 변경
app.post('/api/admin/orders/:order_id/status', async (req, res) => {
  const { order_id } = req.params;
  const { status } = req.body; // '제조 중' 또는 '완료'
  if (!['제조 중', '완료'].includes(status)) {
    return res.status(400).json({ error: '잘못된 상태값입니다.' });
  }
  try {
    const result = await pool.query(
      'UPDATE Orders SET status = $1 WHERE order_id = $2 RETURNING *',
      [status, order_id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '주문 상태를 변경하지 못했습니다.' });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
}); 