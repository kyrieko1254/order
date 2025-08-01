import { useState, useEffect } from 'react'
import './App.css'

// MENU_LIST, INIT_STOCKS 등 더미 데이터는 제거 또는 주석 처리
// 관리자 대시보드 더미 데이터
const DASHBOARD = [
  { label: '총주문', value: 12 },
  { label: '주문 접수', value: 3 },
  { label: '제조 중', value: 2 },
  { label: '제조 완료', value: 7 },
]
// 재고 더미 데이터
const INIT_STOCKS = [
  { id: 1, name: '아메리카노 (HOT)', stock: 10 },
  { id: 2, name: '아메리카노 (ICE)', stock: 8 },
  { id: 3, name: '카페라떼', stock: 15 },
]
// 주문 현황 더미 데이터
const INIT_ORDERS = [
  { id: 1, date: '2024-07-13 10:12', menu: '아메리카노 (HOT)', price: 3000, status: '주문 접수' },
  { id: 2, date: '2024-07-13 10:15', menu: '카페라떼', price: 4000, status: '주문 접수' },
  { id: 3, date: '2024-07-13 10:18', menu: '아메리카노 (ICE)', price: 3500, status: '제조 중' },
]

const API_URL = 'https://order-app-backend-6rtw.onrender.com'; // 배포용 백엔드 주소
// const API_URL = 'http://localhost:3001'; // 개발용(로컬) 주소

function App() {
  const [tab, setTab] = useState('order')
  const [cart, setCart] = useState([])
  const [selectedOptions, setSelectedOptions] = useState({})
  const [stocks, setStocks] = useState([])
  const [orders, setOrders] = useState([])
  const [menus, setMenus] = useState([])

  // 앱 시작 시 메뉴 목록 fetch
  useEffect(() => {
    fetch(`${API_URL}/api/menus`)
      .then(res => res.json())
      .then(data => setMenus(data))
      .catch(() => setMenus([]))
  }, [])

  // 관리자 탭 진입 시 데이터베이스에서 재고/주문 현황 fetch
  useEffect(() => {
    if (tab === 'admin') {
      // 재고 현황
      fetch(`${API_URL}/api/admin/stocks`)
        .then(res => res.json())
        .then(data => setStocks(data))
        .catch(() => setStocks([]))
      // 주문 현황
      fetch(`${API_URL}/api/admin/orders`)
        .then(res => res.json())
        .then(data => setOrders(data))
        .catch(() => setOrders([]))
    }
  }, [tab])

  // handleOptionChange, handleAddToCart 등에서 MENU_LIST 대신 menus 사용
  const handleOptionChange = (menuId, optionId) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [menuId]: {
        ...prev[menuId],
        [optionId]: !prev[menuId]?.[optionId],
      },
    }))
  }

  const handleAddToCart = (menu) => {
    const options = selectedOptions[menu.menu_id] || {}
    setCart((prev) => [
      ...prev,
      { ...menu, options },
    ])
    // 옵션 선택 초기화
    setSelectedOptions((prev) => ({
      ...prev,
      [menu.menu_id]: {}
    }))
  }

  const handleRemoveFromCart = (idx) => {
    setCart((prev) => prev.filter((_, i) => i !== idx))
  }

  // 옵션 라벨, 장바구니 등에서 menus 사용하도록 수정
  const getOptionLabel = (option, checked) =>
    `${option.name || option.label}${option.price > 0 ? `(+${option.price.toLocaleString()})` : ''}${checked ? '' : ''}`

  const getCartTotal = () =>
    cart.reduce((sum, item) => {
      let optionSum = 0
      if (item.options) {
        Object.entries(item.options).forEach(([optionId, isSelected]) => {
          if (isSelected) {
            const menu = menus.find(m => m.menu_id === item.menu_id)
            // option_id를 문자열로 변환하여 비교
            const option = menu?.options?.find(o => String(o.option_id) === String(optionId))
            if (option) {
              optionSum += option.price
            }
          }
        })
      }
      return sum + item.price + optionSum
    }, 0)

  // 장바구니 그룹화: 같은 메뉴+옵션 조합은 하나로 묶음
  const getGroupedCart = () => {
    const map = new Map()
    cart.forEach(item => {
      const key = item.menu_id + '_' + JSON.stringify(item.options)
      if (!map.has(key)) {
        map.set(key, { ...item, count: 1 })
      } else {
        map.get(key).count++
      }
    })
    return Array.from(map.values())
  }

  // 재고 증감
  const handleStockChange = (menuId, diff) => {
    setStocks(stocks => stocks.map(s => s.menu_id === menuId ? { ...s, stock: Math.max(0, s.stock + diff) } : s))
  }

  // 주문 상태 변경
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (res.ok) {
        // 로컬 상태 업데이트
        setOrders(orders => orders.map(o => 
          o.order_id === orderId ? { ...o, status: newStatus } : o
        ));
      } else {
        alert('주문 상태 변경에 실패했습니다.');
      }
    } catch (err) {
      alert('서버와 통신할 수 없습니다.');
    }
  }

  // 주문하기 처리
  const handleOrder = async () => {
    if (cart.length === 0) return;
    // 주문 데이터 구성
    const grouped = getGroupedCart();
    const items = grouped.map(item => ({
      menu_id: item.menu_id,
      quantity: item.count
    }));
    const content = grouped.map(item => ({
      menu: item.name,
      options: Object.entries(item.options || {})
        .filter(([_, v]) => v)
        .map(([k]) => {
          const opt = menus.find(m => m.menu_id === item.menu_id)?.options.find(o => o.option_id === k)
          return opt ? opt.name : null
        })
        .filter(optionName => optionName !== null && optionName !== '')
    }));
    const total_price = getCartTotal();
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, total_price, items })
      });
      const data = await res.json();
      if (res.ok) {
        alert('주문이 완료되었습니다!');
        setCart([]);
        // TODO: 재고/주문 현황 갱신 필요시 추가 fetch
      } else {
        alert(data.error || '주문 처리 중 오류가 발생했습니다.');
      }
    } catch (err) {
      alert('서버와 통신할 수 없습니다.');
    }
  };

  return (
    <div className="app-container">
      {/* 내비게이션 바 */}
      <nav className="navbar">
        <div className="logo">COZY</div>
        <div className="nav-menu">
          <button className={tab === 'order' ? 'active' : ''} onClick={() => setTab('order')}>주문하기</button>
          <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}>관리자</button>
        </div>
      </nav>
      <div className="content-container">
        {/* 주문하기 화면 */}
        {tab === 'order' && (
          <>
            <div className="order-section">
              <div className="menu-list">
                {menus.map((menu) => (
                  <div className="menu-card" key={menu.menu_id}>
                    <img className="menu-img" src={menu.image_url} alt={menu.name} />
                    <div className="menu-title">{menu.name}</div>
                    <div className="menu-price">{menu.price.toLocaleString()}원</div>
                    <div className="menu-options">
                      {menu.options && menu.options.map((opt) => (
                        <label key={opt.option_id || opt.id}>
                          <input
                            type="checkbox"
                            checked={!!selectedOptions[menu.menu_id]?.[opt.option_id || opt.id]}
                            onChange={() => handleOptionChange(menu.menu_id, opt.option_id || opt.id)}
                          />
                          {getOptionLabel(opt, !!selectedOptions[menu.menu_id]?.[opt.option_id || opt.id])}
                        </label>
                      ))}
                    </div>
                    <button className="add-btn" onClick={() => handleAddToCart(menu)}>담기</button>
                  </div>
                ))}
              </div>
            </div>
            {/* 장바구니 - content-container 내부로 이동 */}
            <div className="cart-footer">
              <div className="cart-section">
                <div className="cart-left">
                  <h3>장바구니</h3>
                  {cart.length === 0 ? (
                    <div className="cart-empty">장바구니가 비어 있습니다.</div>
                  ) : (
                    <ul className="cart-list">
                                              {getGroupedCart().map((item, idx) => (
                          <li key={idx} className="cart-item">
                            <span>
                              {item.name}
                              {Object.entries(item.options || {})
                                .filter(([_, v]) => v)
                                .map(([k]) => {
                                  const opt = menus.find(m => m.menu_id === item.menu_id)?.options.find(o => String(o.option_id) === String(k))
                                  return opt ? (
                                    <span key={k} style={{ color: '#666', fontSize: '0.85rem' }}>
                                      {' '}({opt.name})
                                    </span>
                                  ) : null
                                })}
                              {item.count > 1 ? ` x${item.count}` : ''}
                            </span>
                            <span></span>
                            <span>{(() => {
                            let itemPrice = item.price
                            if (item.options) {
                              Object.entries(item.options).forEach(([optionId, isSelected]) => {
                                if (isSelected) {
                                  const menu = menus.find(m => m.menu_id === item.menu_id)
                                  // option_id를 문자열로 변환하여 비교
                                  const option = menu?.options?.find(o => String(o.option_id) === String(optionId))
                                  if (option) {
                                    itemPrice += option.price
                                  }
                                }
                              })
                            }
                            return (itemPrice * item.count).toLocaleString()
                          })()}원</span>
                          <button className="remove-btn" onClick={() => handleRemoveFromCart(cart.findIndex(c => c.menu_id === item.menu_id && JSON.stringify(c.options) === JSON.stringify(item.options)))}>X</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="cart-right">
                  <div className="cart-total">합계: {getCartTotal().toLocaleString()}원</div>
                  <button className="order-btn" onClick={handleOrder}>주문하기</button>
                </div>
              </div>
            </div>
          </>
        )}
        {/* 관리자 화면 */}
        {tab === 'admin' && (
          <div className="admin-section">
            {/* 대시보드 */}
            <div className="admin-dashboard">
              {DASHBOARD.map((item, i) => (
                <div className="dashboard-item" key={i}>
                  <div className="dashboard-label">{item.label}</div>
                  <div className="dashboard-value">{item.value}</div>
                </div>
              ))}
            </div>
            {/* 재고 현황 */}
            <div className="stock-section">
              <div className="stock-title">재고 현황</div>
              <div className="stock-list">
                {stocks.map(stock => (
                  <div className={`stock-item ${stock.stock === 0 ? 'soldout' : stock.stock < 5 ? 'warn' : 'normal'}`} key={stock.menu_id}>
                    <span className="stock-menu">{stock.name}</span>
                    <div className="stock-controls">
                      <button 
                        className="stock-btn minus" 
                        onClick={() => handleStockChange(stock.menu_id, -1)}
                        disabled={stock.stock <= 0}
                      >
                        -
                      </button>
                      <span className="stock-count">{stock.stock}개</span>
                      <button 
                        className="stock-btn plus" 
                        onClick={() => handleStockChange(stock.menu_id, 1)}
                      >
                        +
                      </button>
                    </div>
                    <span className="stock-status">
                      {stock.stock === 0 ? '품절' : stock.stock < 5 ? '주의' : '정상'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* 주문 현황 */}
            <div className="order-status-section">
              <div className="order-status-title">주문 현황</div>
              <table className="order-table">
                <thead>
                  <tr>
                    <th>주문일시</th>
                    <th>메뉴</th>
                    <th>금액</th>
                    <th>상태</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.order_id}>
                      <td>{(() => {
                        const date = new Date(order.ordered_at);
                        return date.toLocaleString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        });
                      })()}</td>
                      <td>
                        {Array.isArray(order.content)
                          ? order.content.map((c, i) => {
                              console.log('주문 내용:', c); // 디버깅용
                              return (
                                <div key={i} style={{ fontSize: '0.9rem' }}>
                                  {c.menu}
                                  {c.options && Array.isArray(c.options) && c.options.length > 0 && c.options.some(opt => opt && opt.trim() !== '') && (
                                    <span style={{ color: '#666', fontSize: '0.85rem' }}>
                                      {' '}({c.options.filter(opt => opt && opt.trim() !== '').join(', ')})
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          : ''}
                      </td>
                      <td>{order.total_price?.toLocaleString()}원</td>
                      <td>{order.status}</td>
                      <td>
                        {order.status === '주문 접수' && (
                          <button 
                            className="status-btn active" 
                            onClick={() => handleStatusChange(order.order_id, '제조 중')}
                          >
                            제조 시작
                          </button>
                        )}
                        {order.status === '제조 중' && (
                          <button 
                            className="status-btn active" 
                            onClick={() => handleStatusChange(order.order_id, '완료')}
                          >
                            제조 완료
                          </button>
                        )}
                        {order.status === '완료' && (
                          <button className="status-btn completed" disabled>
                            완료
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
