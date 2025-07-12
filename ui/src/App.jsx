import { useState } from 'react'
import './App.css'

const MENU_LIST = [
  {
    id: 1,
    name: '아메리카노 (HOT)',
    price: 3000,
    image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=400&q=80',
    options: [
      { id: 'shot', label: '샷 추가', price: 500 },
      { id: 'syrup', label: '시럽 추가', price: 0 },
    ],
  },
  {
    id: 2,
    name: '아메리카노 (ICE)',
    price: 3000,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80',
    options: [
      { id: 'shot', label: '샷 추가', price: 500 },
      { id: 'syrup', label: '시럽 추가', price: 0 },
    ],
  },
  {
    id: 3,
    name: '카페라떼',
    price: 4000,
    image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80',
    options: [
      { id: 'shot', label: '샷 추가', price: 500 },
      { id: 'syrup', label: '시럽 추가', price: 0 },
    ],
  },
]

function App() {
  const [tab, setTab] = useState('order')
  const [cart, setCart] = useState([])
  const [selectedOptions, setSelectedOptions] = useState({})

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
    const options = selectedOptions[menu.id] || {}
    setCart((prev) => [
      ...prev,
      { ...menu, options },
    ])
  }

  const handleRemoveFromCart = (idx) => {
    setCart((prev) => prev.filter((_, i) => i !== idx))
  }

  const getOptionLabel = (option, checked) =>
    `${option.label}${option.price > 0 ? `(+${option.price.toLocaleString()})` : ''}${checked ? '' : ''}`

  const getCartTotal = () =>
    cart.reduce((sum, item) => {
      let optionSum = 0
      for (const opt of item.options ? Object.entries(item.options) : []) {
        if (opt[1]) {
          const found = item.options && item.options[opt[0]]
          const optionObj = item.options && MENU_LIST.find(m => m.id === item.id)?.options.find(o => o.id === opt[0])
          if (optionObj && found) optionSum += optionObj.price
        }
      }
      return sum + item.price + optionSum
    }, 0)

  // 장바구니 그룹화: 같은 메뉴+옵션 조합은 하나로 묶음
  const getGroupedCart = () => {
    const map = new Map()
    cart.forEach(item => {
      const key = item.id + '_' + JSON.stringify(item.options)
      if (!map.has(key)) {
        map.set(key, { ...item, count: 1 })
      } else {
        map.get(key).count++
      }
    })
    return Array.from(map.values())
  }

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
        <h1 className="main-title">COZY – 커피 주문 앱</h1>
        {/* 주문하기 화면 */}
        {tab === 'order' && (
          <>
            <div className="order-section">
              <div className="menu-list">
                {MENU_LIST.map((menu) => (
                  <div className="menu-card" key={menu.id}>
                    <img className="menu-img" src={menu.image} alt={menu.name} />
                    <div className="menu-title">{menu.name}</div>
                    <div className="menu-price">{menu.price.toLocaleString()}원</div>
                    <div className="menu-options">
                      {menu.options.map((opt) => (
                        <label key={opt.id}>
                          <input
                            type="checkbox"
                            checked={!!selectedOptions[menu.id]?.[opt.id]}
                            onChange={() => handleOptionChange(menu.id, opt.id)}
                          />
                          {getOptionLabel(opt, !!selectedOptions[menu.id]?.[opt.id])}
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
                          <span>{item.name}{item.count > 1 ? ` x${item.count}` : ''}</span>
                          <span>
                            {Object.entries(item.options || {})
                              .filter(([_, v]) => v)
                              .map(([k]) => {
                                const opt = MENU_LIST.find(m => m.id === item.id)?.options.find(o => o.id === k)
                                return opt ? `+${opt.label}` : ''
                              })
                              .join(' ')}
                          </span>
                          <span>{((item.price + Object.entries(item.options || {}).reduce((sum, [k, v]) => {
                            if (v) {
                              const opt = MENU_LIST.find(m => m.id === item.id)?.options.find(o => o.id === k)
                              return sum + (opt ? opt.price : 0)
                            }
                            return sum
                          }, 0)) * item.count).toLocaleString()}원</span>
                          <button className="remove-btn" onClick={() => handleRemoveFromCart(cart.findIndex(c => c.id === item.id && JSON.stringify(c.options) === JSON.stringify(item.options)))}>X</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="cart-right">
                  <div className="cart-total">합계: {getCartTotal().toLocaleString()}원</div>
                  <button className="order-btn">주문하기</button>
                </div>
              </div>
            </div>
          </>
        )}
        {/* 관리자 화면 (추후 구현) */}
        {tab === 'admin' && (
          <div className="admin-section">
            <h2>관리자 화면 (준비 중)</h2>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
