import React, { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ShoppingCart, Package, ClipboardList, Users, Trash2, FileText } from 'lucide-react'

const SUPABASE_URL = 'https://jrkmhalznaxsskazyggt.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_VHNiWKy9mwV3rZAvLs85pQ_fKKFFQQh'

const supabaseReady = SUPABASE_URL.startsWith('https://') && SUPABASE_URL.includes('.supabase.co') && SUPABASE_ANON_KEY.startsWith('sb_publishable_')
const supabase = supabaseReady ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

const seedProducts = [
  { id:'VHL-LED-001', code:'VHL-LED-001', name:'Đèn LED âm trần 9W', unit:'cái', price:95000, stock:100 },
  { id:'VHL-LED-002', code:'VHL-LED-002', name:'Đèn LED panel 18W', unit:'cái', price:185000, stock:80 },
  { id:'VHL-DAY-001', code:'VHL-DAY-001', name:'Dây LED 12V', unit:'mét', price:42000, stock:300 }
]

const keys = { products:'vh_products_backup_v2', customers:'vh_customers_backup_v2', orders:'vh_orders_backup_v2' }

function loadLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function money(value) {
  return Number(value || 0).toLocaleString('vi-VN') + ' đ'
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`
}

function Field({ label, value, onChange, type = 'text', placeholder = '', readOnly = false }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input readOnly={readOnly} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState('sale')
  const [products, setProducts] = useState(() => loadLocal(keys.products, seedProducts))
  const [customers, setCustomers] = useState(() => loadLocal(keys.customers, []))
  const [orders, setOrders] = useState(() => loadLocal(keys.orders, []))
  const [notice, setNotice] = useState('')
  const [dbMode, setDbMode] = useState(supabaseReady ? 'online' : 'local')
  const [loading, setLoading] = useState(false)
  const [editingOrderId, setEditingOrderId] = useState(null)

  const [customer, setCustomer] = useState({ name: '', phone: '', address: '', note: '' })
  const [productCode, setProductCode] = useState('')
  const [qty, setQty] = useState(1)
  const [cart, setCart] = useState([])
  const [discount, setDiscount] = useState(0)
  const [shipping, setShipping] = useState(0)
  const [paid, setPaid] = useState(0)
  const [search, setSearch] = useState('')

  const [newProduct, setNewProduct] = useState({ code: '', name: '', unit: 'cái', price: '', stock: '' })
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '', note: '' })

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0), [cart])
  const total = Math.max(0, subtotal - Number(discount || 0) + Number(shipping || 0))
  const debt = Math.max(0, total - Number(paid || 0))

  function show(text) {
    setNotice(text)
    window.setTimeout(() => setNotice(''), 3500)
  }

  useEffect(() => {
    async function loadDb() {
      if (!supabase) {
        setDbMode('local')
        return
      }

      setLoading(true)
      try {
        const [p, c, o] = await Promise.all([
          supabase.from('products').select('*').order('created_at', { ascending: false }),
          supabase.from('customers').select('*').order('created_at', { ascending: false }),
          supabase.from('orders').select('*').order('created_at', { ascending: false }),
        ])

        if (p.error) throw p.error
        if (c.error) throw c.error
        if (o.error) throw o.error

        setProducts(p.data && p.data.length ? p.data : seedProducts)
        setCustomers(c.data || [])
        setOrders((o.data || []).map((row) => ({
          id: row.id,
          status: row.status,
          customer: row.customer || {},
          items: row.items || [],
          discount: row.discount || 0,
          shipping_fee: row.shipping_fee || 0,
          paid: row.paid || 0,
          total: row.total || 0,
          created_at: row.created_at,
          updated_at: row.updated_at,
        })))

        setDbMode('online')
      } catch (error) {
        console.error('Supabase connection error:', error)
        setDbMode('local')
        show('Không kết nối được Supabase. Kiểm tra SQL policy hoặc key.')
      } finally {
        setLoading(false)
      }
    }

    loadDb()
  }, [])

  useEffect(() => localStorage.setItem(keys.products, JSON.stringify(products)), [products])
  useEffect(() => localStorage.setItem(keys.customers, JSON.stringify(customers)), [customers])
  useEffect(() => localStorage.setItem(keys.orders, JSON.stringify(orders)), [orders])

  async function upsert(table, row) {
    if (!supabase) return
    const { error } = await supabase.from(table).upsert(row)
    if (error) throw error
  }

  async function saveCustomerIfNeeded(info) {
    if (!info.name && !info.phone) return
    if (customers.some((c) => c.phone && info.phone && c.phone === info.phone)) return

    const row = {
      id: uid('KH'),
      name: info.name,
      phone: info.phone,
      address: info.address,
      note: info.note,
    }

    setCustomers((old) => [row, ...old])

    try {
      await upsert('customers', row)
      setDbMode('online')
    } catch (error) {
      console.error(error)
      setDbMode('local')
    }
  }

  function addToCart() {
    const product = products.find((p) => p.code.trim().toLowerCase() === productCode.trim().toLowerCase())
    const quantity = Number(qty)

    if (!product) return show('Không tìm thấy mã sản phẩm')
    if (!quantity || quantity <= 0) return show('Số lượng phải lớn hơn 0')
    if (Number(product.stock || 0) < quantity) return show('Tồn kho không đủ')

    setCart((old) => {
      const exists = old.find((item) => item.code === product.code)
      if (exists) {
        return old.map((item) => item.code === product.code ? { ...item, quantity: Number(item.quantity) + quantity } : item)
      }
      return [...old, { ...product, quantity }]
    })

    setProductCode('')
    setQty(1)
  }

  async function saveOrder(status, printAfter = true) {
    if (!cart.length) return show('Chưa có sản phẩm trong hóa đơn')
    if (!customer.name && !customer.phone) return show('Vui lòng nhập thông tin khách hàng')

    const order = {
      id: editingOrderId || uid(status === 'sold' ? 'HD' : 'TAM'),
      status,
      customer,
      items: cart,
      discount: Number(discount || 0),
      shipping_fee: Number(shipping || 0),
      paid: Number(paid || 0),
      total,
      created_at: editingOrderId ? (orders.find((o) => o.id === editingOrderId)?.created_at || new Date().toISOString()) : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      await upsert('orders', order)
      setDbMode('online')
    } catch (error) {
      console.error(error)
      setDbMode('local')
      show('Database lỗi, đơn vẫn được lưu cục bộ')
    }

    setOrders((old) => editingOrderId ? old.map((o) => o.id === editingOrderId ? order : o) : [order, ...old])
    await saveCustomerIfNeeded(customer)

    if (status === 'sold' && !editingOrderId) {
      const nextProducts = products.map((p) => {
        const sold = cart.find((item) => item.code === p.code)
        return sold ? { ...p, stock: Math.max(0, Number(p.stock || 0) - Number(sold.quantity || 0)) } : p
      })

      setProducts(nextProducts)

      try {
        await Promise.all(nextProducts.map((p) => upsert('products', p)))
        setDbMode('online')
      } catch (error) {
        console.error(error)
        setDbMode('local')
      }
    }

    show(status === 'sold' ? 'Đã lưu đơn bán hàng' : 'Đã lưu hóa đơn tạm tính')
    if (printAfter) window.setTimeout(() => printInvoice(order), 100)
  }

  function editOrder(order) {
    setEditingOrderId(order.id)
    setCustomer(order.customer || { name: '', phone: '', address: '', note: '' })
    setCart(order.items || [])
    setDiscount(order.discount || 0)
    setShipping(order.shipping_fee || 0)
    setPaid(order.paid || 0)
    setTab('sale')
    show('Đã mở đơn để sửa')
  }

  function resetSale() {
    setEditingOrderId(null)
    setCustomer({ name: '', phone: '', address: '', note: '' })
    setCart([])
    setProductCode('')
    setQty(1)
    setDiscount(0)
    setShipping(0)
    setPaid(0)
  }

  function printInvoice(order = null) {
    const data = order || {
      id: 'XEM-TRUOC',
      status: 'draft',
      customer,
      items: cart,
      discount: Number(discount || 0),
      shipping_fee: Number(shipping || 0),
      paid: Number(paid || 0),
      total,
      created_at: new Date().toISOString(),
    }

    const remain = Math.max(0, Number(data.total || 0) - Number(data.paid || 0))
    const invoiceCode = data.id || `VH${Date.now()}`
    const invoiceDate = new Date(data.created_at || Date.now()).toLocaleDateString('vi-VN')

    const rows = (data.items || []).map((item, index) => `
      <tr>
        <td class="center">${index + 1}</td>
        <td>${item.code || ''}</td>
        <td>${item.name || ''}</td>
        <td class="center">${item.unit || ''}</td>
        <td class="center">${item.quantity || 0}</td>
        <td class="right">${money(item.price)}</td>
        <td class="right bold">${money(Number(item.price || 0) * Number(item.quantity || 0))}</td>
      </tr>
    `).join('')

    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>${invoiceCode}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            * { box-sizing: border-box; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              margin: 0;
              background: white;
              font-size: 13px;
            }
            .invoice {
              width: 100%;
              min-height: 270mm;
              padding: 0;
              position: relative;
            }
            .top {
              display: grid;
              grid-template-columns: 1fr 220px;
              gap: 20px;
              align-items: start;
            }
            .brand {
              font-size: 30px;
              font-weight: 900;
              letter-spacing: 1px;
              margin: 0 0 6px;
            }
            .company {
              line-height: 1.45;
              font-size: 13px;
            }
            .meta {
              line-height: 1.7;
              font-size: 13px;
              padding-top: 2px;
            }
            .meta b { font-weight: 900; }
            .rule {
              border-top: 3px solid #111827;
              margin: 20px 0 14px;
            }
            .title {
              text-align: center;
              margin: 0;
              font-size: 26px;
              font-weight: 900;
              letter-spacing: 1px;
            }
            .thanks {
              text-align: center;
              color: #6b7280;
              margin-top: 6px;
              margin-bottom: 18px;
            }
            .customer {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 34px;
              margin-bottom: 16px;
              font-size: 14px;
              font-weight: 700;
            }
            .customer .full { grid-column: 1 / -1; }
            .dots {
              display: inline-block;
              min-width: 170px;
              border-bottom: 1px dotted #111827;
              font-weight: 400;
              padding-left: 6px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 9px 8px;
              vertical-align: middle;
            }
            th {
              background: #f3f4f6;
              font-weight: 900;
              text-align: center;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: 900; }
            .bottom {
              display: grid;
              grid-template-columns: 1.1fr 1fr;
              gap: 16px;
              margin-top: 12px;
              align-items: start;
            }
            .qrbox {
              border: 1px solid #d1d5db;
              border-radius: 5px;
              padding: 12px;
              min-height: 174px;
            }
            .qrtitle {
              font-size: 14px;
              font-weight: 900;
              margin-bottom: 8px;
            }
            .qrcontent {
              display: grid;
              grid-template-columns: 128px 1fr;
              gap: 14px;
              align-items: center;
            }
            .qr {
              width: 128px;
              height: 128px;
              border: 2px solid #6b7280;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #9ca3af;
              font-size: 11px;
            }
            .bank {
              line-height: 1.35;
              font-size: 12px;
            }
            .bank b { font-weight: 900; }
            .summaryBox {
              border: 1px solid #d1d5db;
              border-radius: 5px;
              overflow: hidden;
            }
            .sumline {
              display: grid;
              grid-template-columns: 1fr 140px;
              border-bottom: 1px solid #d1d5db;
              min-height: 36px;
              align-items: center;
            }
            .sumline span:first-child { padding-left: 10px; }
            .sumline span:last-child { padding-right: 10px; text-align: right; font-weight: 900; }
            .sumline.total {
              border-bottom: 0;
              min-height: 48px;
              font-size: 21px;
              font-weight: 900;
            }
            .footer {
              position: absolute;
              bottom: 24mm;
              left: 0;
              right: 0;
              text-align: center;
              font-size: 15px;
              font-weight: 900;
              color: #374151;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="top">
              <div>
                <h1 class="brand">VŨ HOÀNG LIGHTING</h1>
                <div class="company">
                  Cung cấp Ray Nam Châm - Nhôm Định Hình - Nguồn<br/>
                  12V/24V - Đèn Trang Trí - Quạt Trần - LED 12V/24V/220V<br/>
                  Hotline: 08779 333 62
                </div>
              </div>
              <div class="meta">
                <div><b>Mã hóa đơn:</b> ${invoiceCode}</div>
                <div><b>Ngày:</b> ${invoiceDate}</div>
                <div><b>Hình thức:</b> ${data.status === 'sold' ? 'Bán hàng' : 'Tạm tính'}</div>
              </div>
            </div>

            <div class="rule"></div>

            <h2 class="title">${data.status === 'sold' ? 'HÓA ĐƠN BÁN HÀNG' : 'HÓA ĐƠN TẠM TÍNH'}</h2>
            <div class="thanks">Cảm ơn quý khách đã tin tưởng và mua hàng</div>

            <div class="customer">
              <div>Khách hàng: <span class="dots">${data.customer?.name || ''}</span></div>
              <div>SĐT: <span class="dots">${data.customer?.phone || ''}</span></div>
              <div>Địa chỉ: <span class="dots">${data.customer?.address || ''}</span></div>
              <div class="full">Ghi chú: <span class="dots">${data.customer?.note || ''}</span></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>ST<br/>T</th>
                  <th>Mã</th>
                  <th>Tên sản phẩm</th>
                  <th>ĐVT</th>
                  <th>SL</th>
                  <th>Đơn giá</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <div class="bottom">
              <div class="qrbox">
                <div class="qrtitle">Quét QR thanh toán</div>
                <div class="qrcontent">
                  <div class="qr"></div>
                  <div class="bank">
                    <b>STK:</b><br/>577626198<br/><br/>
                    <b>CTK:</b> HKD HOANG VU LIGHTING<br/>
                    <b>Ngân hàng:</b> VP BANK
                  </div>
                </div>
              </div>

              <div class="summaryBox">
                <div class="sumline"><span>Tạm tính</span><span>${money(data.total - Number(data.shipping_fee || 0) + Number(data.discount || 0))}</span></div>
                <div class="sumline"><span>Chiết khấu</span><span>${money(data.discount)}</span></div>
                <div class="sumline"><span>Phí vận chuyển</span><span>${money(data.shipping_fee)}</span></div>
                <div class="sumline"><span>Đã thanh toán</span><span>${money(data.paid)}</span></div>
                <div class="sumline"><span>Còn lại</span><span>${money(remain)}</span></div>
                <div class="sumline total"><span>Tổng tiền</span><span>${money(data.total)}</span></div>
              </div>
            </div>

            <div class="footer">VŨ HOÀNG LIGHTING - UY TÍN TẠO NIỀM TIN</div>
          </div>

          <script>
            window.onload = function() {
              window.print()
            }
          </script>
        </body>
      </html>`

    const win = window.open('about:blank', '_blank')
    if (!win) return show('Trình duyệt chặn cửa sổ in. Hãy cho phép pop-up.')
    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  async function addProduct() {
    if (!newProduct.code || !newProduct.name) return show('Nhập mã và tên sản phẩm')
    if (products.some((p) => p.code.toLowerCase() === newProduct.code.toLowerCase())) return show('Mã sản phẩm đã tồn tại')

    const row = {
      id: newProduct.code,
      code: newProduct.code,
      name: newProduct.name,
      unit: newProduct.unit || 'cái',
      price: Number(newProduct.price || 0),
      stock: Number(newProduct.stock || 0),
    }

    setProducts((old) => [row, ...old])

    try {
      await upsert('products', row)
      setDbMode('online')
      show('Đã thêm sản phẩm vào database')
    } catch (error) {
      console.error(error)
      setDbMode('local')
      show('Đã thêm cục bộ, database chưa ghi được')
    }

    setNewProduct({ code: '', name: '', unit: 'cái', price: '', stock: '' })
  }

  async function removeProduct(product) {
    setProducts(products.filter((p) => p.code !== product.code))

    try {
      if (supabase) {
        const { error } = await supabase.from('products').delete().eq('id', product.id || product.code)
        if (error) throw error
      }
      setDbMode('online')
    } catch (error) {
      console.error(error)
      setDbMode('local')
    }
  }

  async function addCustomer() {
    if (!newCustomer.name && !newCustomer.phone) return show('Nhập tên hoặc số điện thoại')

    const row = {
      id: uid('KH'),
      name: newCustomer.name,
      phone: newCustomer.phone,
      address: newCustomer.address,
      note: newCustomer.note,
    }

    setCustomers((old) => [row, ...old])

    try {
      await upsert('customers', row)
      setDbMode('online')
      show('Đã thêm khách hàng vào database')
    } catch (error) {
      console.error(error)
      setDbMode('local')
      show('Đã thêm cục bộ, database chưa ghi được')
    }

    setNewCustomer({ name: '', phone: '', address: '', note: '' })
  }

  const filteredProducts = products.filter((p) => `${p.code} ${p.name}`.toLowerCase().includes(search.toLowerCase()))
  const filteredOrders = orders.filter((o) => `${o.id} ${o.customer?.name || ''} ${o.status}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="app">
      <div className="top">
        <div>
          <span className="badge">Website bán hàng nội bộ</span>
          <h1>VHLIGHTING Sales</h1>
          <span className={'db ' + dbMode}>
            {loading ? 'Đang tải database...' : dbMode === 'online' ? 'Database online: Supabase' : 'Chế độ cục bộ: chưa ghi được Supabase'}
          </span>
          <p className="muted">Bán hàng nhanh, quản lý sản phẩm, đơn hàng đã lưu, khách hàng và in PDF.</p>
        </div>
        {notice && <div className="notice">{notice}</div>}
      </div>

      <div className="tabs">
        <button className={'tab ' + (tab === 'sale' ? 'active' : '')} onClick={() => setTab('sale')}><ShoppingCart size={16}/> Bán hàng nhanh</button>
        <button className={'tab ' + (tab === 'products' ? 'active' : '')} onClick={() => setTab('products')}><Package size={16}/> Quản lý sản phẩm</button>
        <button className={'tab ' + (tab === 'orders' ? 'active' : '')} onClick={() => setTab('orders')}><ClipboardList size={16}/> Đơn hàng đã lưu</button>
        <button className={'tab ' + (tab === 'customers' ? 'active' : '')} onClick={() => setTab('customers')}><Users size={16}/> Khách hàng</button>
      </div>

      {tab === 'sale' && (
        <div className="grid-sale">
          <div className="stack">
            <div className="card">
              <h2>1. Thông tin khách hàng</h2>
              <div className="form2">
                <Field label="Tên khách hàng" value={customer.name} onChange={(v) => setCustomer({ ...customer, name: v })}/>
                <Field label="Số điện thoại" value={customer.phone} onChange={(v) => setCustomer({ ...customer, phone: v })}/>
                <div className="full"><Field label="Địa chỉ" value={customer.address} onChange={(v) => setCustomer({ ...customer, address: v })}/></div>
                <div className="field full">
                  <label>Ghi chú</label>
                  <textarea value={customer.note} onChange={(e) => setCustomer({ ...customer, note: e.target.value })}/>
                </div>
              </div>
              <div className="actions">
                <button className="btn green" onClick={() => saveCustomerIfNeeded(customer)}>Lưu thông tin khách</button>
                <button className="btn blue" onClick={() => setTab('customers')}>Quản lý khách hàng</button>
              </div>
            </div>

            <div className="card">
              <h2>2. Nhập mã sản phẩm</h2>
              <div className="hint"><b>Online:</b> sản phẩm lấy từ Supabase. Nếu database lỗi, app vẫn lưu tạm trên trình duyệt.</div>
              <div className="form3">
                <Field label="Nhập mã sản phẩm" value={productCode} onChange={setProductCode} placeholder="VD: VHL-LED-001"/>
                <Field label="Số lượng" value={qty} onChange={setQty} type="number"/>
                <Field label="Giá tùy chỉnh" value="" onChange={() => {}} placeholder="Để sau"/>
              </div>
              <div className="actions">
                <button className="btn yellow" onClick={addToCart}>Thêm vào hóa đơn</button>
                <button className="btn" onClick={() => { setProductCode(''); setQty(1) }}>Xóa ô nhập</button>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>3. Hóa đơn bán hàng {editingOrderId && <span className="edit-title">(đang sửa: {editingOrderId})</span>}</h2>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>STT</th><th>Mã</th><th>Tên sản phẩm</th><th>ĐVT</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th><th></th></tr></thead>
                <tbody>
                  {cart.map((item, index) => (
                    <tr key={item.code}>
                      <td>{index + 1}</td>
                      <td><b>{item.code}</b></td>
                      <td>{item.name}</td>
                      <td>{item.unit}</td>
                      <td>{item.quantity}</td>
                      <td>{money(item.price)}</td>
                      <td><b>{money(Number(item.price) * Number(item.quantity))}</b></td>
                      <td><button className="delete" onClick={() => setCart(cart.filter((x) => x.code !== item.code))}><Trash2 size={16}/></button></td>
                    </tr>
                  ))}
                  {!cart.length && <tr><td colSpan="8" className="empty">Chưa có sản phẩm</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="summary">
              <div>
                <div className="form2">
                  <Field label="Chiết khấu" value={discount} onChange={setDiscount} type="number"/>
                  <Field label="Phí vận chuyển" value={shipping} onChange={setShipping} type="number"/>
                  <Field label="Đã thanh toán" value={paid} onChange={setPaid} type="number"/>
                  <Field label="Còn phải thu" value={money(debt)} onChange={() => {}} readOnly/>
                </div>
                <div className="actions">
                  <button className="btn green" onClick={() => saveOrder('sold', true)}>Bán hàng / Lưu PDF</button>
                  <button className="btn blue" onClick={() => saveOrder('draft', true)}>Hóa đơn tạm tính</button>
                  <button className="btn red" onClick={resetSale}>Tạo đơn mới</button>
                </div>
                <p className="muted">Bán hàng sẽ trừ tồn kho. Hóa đơn tạm tính lưu nháp và in báo giá.</p>
              </div>
              <div className="totalbox">
                <div className="line"><span>Tạm tính</span><b>{money(subtotal)}</b></div>
                <div className="line"><span>Chiết khấu</span><b>{money(discount)}</b></div>
                <div className="line"><span>Phí vận chuyển</span><b>{money(shipping)}</b></div>
                <div className="line"><span>Đã thanh toán</span><b>{money(paid)}</b></div>
                <div className="line"><span>Còn lại</span><b>{money(debt)}</b></div>
                <div className="line grand"><span>Tổng tiền</span><span>{money(total)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="card">
          <h2>Quản lý sản phẩm VHLIGHTING</h2>
          <div className="form3">
            <Field label="Mã SP" value={newProduct.code} onChange={(v) => setNewProduct({ ...newProduct, code: v })}/>
            <Field label="Tên sản phẩm" value={newProduct.name} onChange={(v) => setNewProduct({ ...newProduct, name: v })}/>
            <Field label="ĐVT" value={newProduct.unit} onChange={(v) => setNewProduct({ ...newProduct, unit: v })}/>
            <Field label="Giá" value={newProduct.price} onChange={(v) => setNewProduct({ ...newProduct, price: v })} type="number"/>
            <Field label="Tồn kho" value={newProduct.stock} onChange={(v) => setNewProduct({ ...newProduct, stock: v })} type="number"/>
          </div>
          <div className="actions"><button className="btn green" onClick={addProduct}>Thêm sản phẩm</button></div>
          <input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo mã hoặc tên sản phẩm"/>
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table className="table">
              <thead><tr><th>Mã</th><th>Tên</th><th>ĐVT</th><th>Giá</th><th>Tồn</th><th></th></tr></thead>
              <tbody>{filteredProducts.map((p) => <tr key={p.code}><td><b>{p.code}</b></td><td>{p.name}</td><td>{p.unit}</td><td>{money(p.price)}</td><td>{p.stock}</td><td><button className="delete" onClick={() => removeProduct(p)}><Trash2 size={16}/></button></td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="card">
          <h2>Đơn hàng đã lưu</h2>
          <input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã đơn, khách hàng, trạng thái"/>
          <div className="cards" style={{ marginTop: 14 }}>
            {filteredOrders.map((o) => (
              <div className="order" key={o.id}>
                <div>
                  <b>{o.id}</b>
                  <div className="muted">{new Date(o.created_at || Date.now()).toLocaleString('vi-VN')} • {o.customer?.name || 'Khách lẻ'}</div>
                </div>
                <div className="actions" style={{ marginTop: 0 }}>
                  <span className={'status ' + o.status}>{o.status === 'sold' ? 'Đã bán' : 'Tạm tính'}</span>
                  <b>{money(o.total)}</b>
                  <button className="btn small" onClick={() => editOrder(o)}>Sửa đơn</button>
                  <button className="btn small dark" onClick={() => printInvoice(o)}><FileText size={14}/> In file</button>
                </div>
              </div>
            ))}
            {!orders.length && <div className="empty">Chưa có đơn hàng</div>}
          </div>
        </div>
      )}

      {tab === 'customers' && (
        <div className="card">
          <h2>Khách hàng</h2>
          <div className="form2">
            <Field label="Tên khách hàng" value={newCustomer.name} onChange={(v) => setNewCustomer({ ...newCustomer, name: v })}/>
            <Field label="Số điện thoại" value={newCustomer.phone} onChange={(v) => setNewCustomer({ ...newCustomer, phone: v })}/>
            <Field label="Địa chỉ" value={newCustomer.address} onChange={(v) => setNewCustomer({ ...newCustomer, address: v })}/>
            <Field label="Ghi chú" value={newCustomer.note} onChange={(v) => setNewCustomer({ ...newCustomer, note: v })}/>
          </div>
          <div className="actions"><button className="btn green" onClick={addCustomer}>Thêm khách hàng</button></div>
          <div className="two" style={{ marginTop: 14 }}>
            {customers.map((c) => (
              <div className="card" key={c.id} style={{ boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                <b>{c.name || 'Khách chưa đặt tên'}</b>
                <div className="muted">{c.phone}</div>
                <div>{c.address}</div>
                <div className="muted">{c.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
