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

  const customerKeyword = `${customer.name} ${customer.phone}`.trim().toLowerCase()
  const customerSuggestions = customerKeyword.length >= 2
    ? customers
        .filter((c) => `${c.name || ''} ${c.phone || ''}`.toLowerCase().includes(customerKeyword))
        .slice(0, 6)
    : []

  const productKeyword = productCode.trim().toLowerCase()
  const productSuggestions = productKeyword.length >= 1
    ? products
        .filter((p) => `${p.code || ''} ${p.name || ''} ${p.group_code || ''}`.toLowerCase().includes(productKeyword))
        .slice(0, 8)
    : []

  const groupSuggestions = productKeyword.length >= 1
    ? groups
        .filter((g) => `${g.code || ''} ${g.name || ''}`.toLowerCase().includes(productKeyword))
        .slice(0, 5)
    : []


  function show(text) {
    setNotice(text)
    window.setTimeout(() => setNotice(''), 3500)
  }

  function selectCustomerSuggestion(selected) {
    setCustomer({
      name: selected.name || '',
      phone: selected.phone || '',
      address: selected.address || '',
      note: selected.note || '',
    })
    show('Đã lấy thông tin khách hàng')
  }

  function selectProductSuggestion(product) {
    setProductCode(product.code)
    show(`Đã chọn sản phẩm ${product.name}`)
  }

  function selectGroupSuggestion(group) {
    setProductCode(group.code)
    show(`Đã chọn nhóm ${group.code}`)
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
    const keyword = productCode.trim().toLowerCase()
    const quantity = Number(qty)

    if (!keyword) return show('Nhập mã sản phẩm, tên sản phẩm hoặc nhóm sản phẩm')
    if (!quantity || quantity <= 0) return show('Số lượng phải lớn hơn 0')

    const group = groups.find((g) =>
      g.code.toLowerCase() === keyword ||
      g.name.toLowerCase() === keyword
    )

    if (group) {
      const groupProducts = products.filter((p) => (p.group_code || '').toLowerCase() === group.code.toLowerCase())
      if (!groupProducts.length) return show('Nhóm này chưa có sản phẩm')

      setCart((old) => {
        let next = [...old]
        groupProducts.forEach((product) => {
          const exists = next.find((item) => item.code === product.code)
          if (exists) {
            next = next.map((item) => item.code === product.code ? { ...item, quantity: Number(item.quantity) + quantity } : item)
          } else {
            next.push({ ...product, quantity })
          }
        })
        return next
      })

      setProductCode('')
      setQty(1)
      show(`Đã thêm nhóm ${group.code} vào hóa đơn`)
      return
    }

    let matched = products.find((p) => p.code.trim().toLowerCase() === keyword)

    if (!matched) {
      const byName = products.filter((p) => p.name.toLowerCase().includes(keyword))
      if (byName.length === 1) matched = byName[0]
      if (byName.length > 1) return show('Có nhiều sản phẩm trùng tên. Vui lòng nhập mã chính xác hơn.')
    }

    if (!matched) return show('Không tìm thấy mã, tên hoặc nhóm sản phẩm')

    setCart((old) => {
      const exists = old.find((item) => item.code === matched.code)
      if (exists) {
        return old.map((item) => item.code === matched.code ? { ...item, quantity: Number(item.quantity) + quantity } : item)
      }
      return [...old, { ...matched, quantity }]
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
    if (!newProduct.name) return show('Nhập tên sản phẩm')
    const autoCode = (newProduct.code || `${newProduct.group_code || 'sp'}-${newProduct.name}`).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (products.some((p) => p.code.toLowerCase() === autoCode.toLowerCase())) return show('Mã sản phẩm đã tồn tại')

    const row = {
      id: autoCode,
      code: autoCode,
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

  const visibleGroups = groups.filter((g) =>
    `${g.code || ''} ${g.name || ''}`.toLowerCase().includes(search.toLowerCase()) ||
    products.some((p) => (p.group_code || '') === g.code && `${p.code || ''} ${p.name || ''}`.toLowerCase().includes(search.toLowerCase()))
  )

  const ungroupedProducts = filteredProducts.filter((p) => !p.group_code)

  function productsInGroup(groupCode) {
    return filteredProducts.filter((p) => (p.group_code || '') === groupCode)
  }


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
                <Field label="Tên khách hàng" value={customer.name} onChange={(v) => setCustomer({ ...customer, name: v })} placeholder="Nhập tên để gợi ý khách cũ"/>
                <Field label="Số điện thoại" value={customer.phone} onChange={(v) => setCustomer({ ...customer, phone: v })} placeholder="Nhập SĐT để gợi ý khách cũ"/>
                {customerSuggestions.length > 0 && (
                  <div className="suggestions full">
                    <div className="suggest-title">Gợi ý khách hàng</div>
                    {customerSuggestions.map((c) => (
                      <button key={c.id} className="suggest-item" onClick={() => selectCustomerSuggestion(c)}>
                        <b>{c.name || 'Khách chưa đặt tên'}</b>
                        <span>{c.phone || 'Chưa có SĐT'}</span>
                        <small>{c.address || ''}</small>
                      </button>
                    ))}
                  </div>
                )}
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
              <div className="hint"><b>Online:</b> có thể nhập mã sản phẩm, tên sản phẩm hoặc nhóm sản phẩm. Ví dụ nhập <b>rncc</b> để thêm các mặt hàng trong nhóm rncc vào hóa đơn.</div>
              <div className="form3">
                <Field label="Nhập mã / tên / nhóm sản phẩm" value={productCode} onChange={setProductCode} placeholder="VD: VHL-LED-001 / thanh ray / rncc"/>
                <Field label="Số lượng" value={qty} onChange={setQty} type="number"/>
                <Field label="Giá tùy chỉnh" value="" onChange={() => {}} placeholder="Để sau"/>
              </div>

              {(groupSuggestions.length > 0 || productSuggestions.length > 0) && (
                <div className="suggestions product-suggestions">
                  {groupSuggestions.length > 0 && <div className="suggest-title">Gợi ý nhóm sản phẩm</div>}
                  {groupSuggestions.map((g) => (
                    <button key={g.id} className="suggest-item group" onClick={() => selectGroupSuggestion(g)}>
                      <b>{g.code}</b>
                      <span>{g.name}</span>
                      <small>Nhập nhóm này rồi bấm thêm để đưa các mặt hàng trong nhóm vào hóa đơn</small>
                    </button>
                  ))}

                  {productSuggestions.length > 0 && <div className="suggest-title">Gợi ý sản phẩm</div>}
                  {productSuggestions.map((p) => (
                    <button key={p.code} className="suggest-item" onClick={() => selectProductSuggestion(p)}>
                      <b>{p.name}</b>
                      <span>{p.code}</span>
                      <small>{p.group_code ? `Nhóm: ${p.group_code}` : 'Chưa nhóm'} • {money(p.price)}</small>
                    </button>
                  ))}
                </div>
              )}

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
          <h2>Quản lý danh mục sản phẩm VHLIGHTING</h2>

          <div className="group-panel">
            <h3>Tạo danh mục / nhóm sản phẩm</h3>
            <div className="form3">
              <Field label="Mã nhóm" value={newGroup.code} onChange={(v) => setNewGroup({ ...newGroup, code: v })} placeholder="VD: rncc"/>
              <Field label="Tên nhóm" value={newGroup.name} onChange={(v) => setNewGroup({ ...newGroup, name: v })} placeholder="VD: Thanh ray nam châm"/>
              <Field label="Ghi chú" value={newGroup.note} onChange={(v) => setNewGroup({ ...newGroup, note: v })} placeholder="VD: các mã hàng liên quan"/>
            </div>
            <div className="actions"><button className="btn blue" onClick={addGroup}>Tạo danh mục</button></div>
          </div>

          <div className="product-form">
            <h3>Thêm mã hàng vào danh mục</h3>
            <div className="form-product no-stock-form">
              <div className="field">
                <label>Danh mục sản phẩm</label>
                <select value={newProduct.group_code} onChange={(e) => setNewProduct({ ...newProduct, group_code: e.target.value })}>
                  <option value="">Không chọn danh mục</option>
                  {groups.map((g) => <option key={g.id} value={g.code}>{g.code} - {g.name}</option>)}
                </select>
              </div>
              <Field label="Tên sản phẩm / mã hàng" value={newProduct.name} onChange={(v) => setNewProduct({ ...newProduct, name: v })} placeholder="VD: thanh ray, tán quang, đầu nối"/>
              <Field label="Đơn vị tính" value={newProduct.unit} onChange={(v) => setNewProduct({ ...newProduct, unit: v })} placeholder="VD: cái / mét / bộ"/>
              <Field label="Giá tiền" value={newProduct.price} onChange={(v) => setNewProduct({ ...newProduct, price: v })} type="number"/>

              <div className="field full">
                <label>Mã sản phẩm</label>
                <input value={newProduct.code} onChange={(e) => setNewProduct({ ...newProduct, code: e.target.value })} placeholder="VD: rncc-thanh-ray hoặc bỏ trống để tự lấy theo tên"/>
              </div>
            </div>
            <div className="actions"><button className="btn green" onClick={addProduct}>Thêm vào danh mục</button></div>
          </div>

          <input className="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm danh mục hoặc mã hàng"/>

          <div className="category-list">
            {visibleGroups.map((g) => {
              const groupProducts = productsInGroup(g.code)
              const isOpen = openGroupCode === g.code
              return (
                <div className="category-card" key={g.id}>
                  <button className="category-head" onClick={() => setOpenGroupCode(isOpen ? '' : g.code)}>
                    <div>
                      <b>{g.name}</b>
                      <span>Mã nhóm: {g.code} • {groupProducts.length} mã hàng</span>
                    </div>
                    <strong>{isOpen ? 'Thu gọn' : 'Mở danh mục'}</strong>
                  </button>

                  {isOpen && (
                    <div className="category-body">
                      {groupProducts.length ? (
                        <div className="table-wrap">
                          <table className="table products-table compact">
                            <thead>
                              <tr>
                                <th>Tên sản phẩm</th>
                                <th>Đơn vị tính</th>
                                <th>Giá tiền</th>
                                <th>Mã</th>
                                <th>Thao tác</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupProducts.map((p) => (
                                <tr key={p.code}>
                                  {editingProductCode === p.code ? (
                                    <>
                                      <td><input className="cell-input" value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}/></td>
                                      <td><input className="cell-input" value={editingProduct.unit} onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}/></td>
                                      <td><input className="cell-input" type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}/></td>
                                      <td><input className="cell-input" value={editingProduct.code} onChange={(e) => setEditingProduct({ ...editingProduct, code: e.target.value })}/></td>
                                      <td>
                                        <div className="row-actions">
                                          <button className="btn small green" onClick={() => saveEditProduct(p.code)}><Save size={14}/> Lưu</button>
                                          <button className="btn small" onClick={() => setEditingProductCode(null)}><X size={14}/> Hủy</button>
                                        </div>
                                      </td>
                                    </>
                                  ) : (
                                    <>
                                      <td>{p.name}</td>
                                      <td>{p.unit}</td>
                                      <td>{money(p.price)}</td>
                                      <td><b>{p.code}</b></td>
                                      <td>
                                        <div className="row-actions">
                                          <button className="btn small blue" onClick={() => startEditProduct(p)}><Edit3 size={14}/> Sửa</button>
                                          <button className="btn small red" onClick={() => removeProduct(p)}><Trash2 size={14}/> Xóa</button>
                                        </div>
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="empty">Danh mục này chưa có mã hàng. Chọn danh mục ở form trên rồi thêm sản phẩm.</div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {ungroupedProducts.length > 0 && (
              <div className="category-card">
                <button className="category-head" onClick={() => setOpenGroupCode(openGroupCode === '__ungrouped' ? '' : '__ungrouped')}>
                  <div>
                    <b>Sản phẩm chưa gom nhóm</b>
                    <span>{ungroupedProducts.length} mã hàng chưa thuộc danh mục nào</span>
                  </div>
                  <strong>{openGroupCode === '__ungrouped' ? 'Thu gọn' : 'Mở danh mục'}</strong>
                </button>

                {openGroupCode === '__ungrouped' && (
                  <div className="category-body">
                    <div className="table-wrap">
                      <table className="table products-table compact">
                        <thead>
                          <tr>
                            <th>Tên sản phẩm</th>
                            <th>Đơn vị tính</th>
                            <th>Giá tiền</th>
                            <th>Mã</th>
                            <th>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ungroupedProducts.map((p) => (
                            <tr key={p.code}>
                              {editingProductCode === p.code ? (
                                <>
                                  <td><input className="cell-input" value={editingProduct.name} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}/></td>
                                  <td><input className="cell-input" value={editingProduct.unit} onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}/></td>
                                  <td><input className="cell-input" type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}/></td>
                                  <td><input className="cell-input" value={editingProduct.code} onChange={(e) => setEditingProduct({ ...editingProduct, code: e.target.value })}/></td>
                                  <td>
                                    <div className="row-actions">
                                      <button className="btn small green" onClick={() => saveEditProduct(p.code)}><Save size={14}/> Lưu</button>
                                      <button className="btn small" onClick={() => setEditingProductCode(null)}><X size={14}/> Hủy</button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td>{p.name}</td>
                                  <td>{p.unit}</td>
                                  <td>{money(p.price)}</td>
                                  <td><b>{p.code}</b></td>
                                  <td>
                                    <div className="row-actions">
                                      <button className="btn small blue" onClick={() => startEditProduct(p)}><Edit3 size={14}/> Sửa</button>
                                      <button className="btn small red" onClick={() => removeProduct(p)}><Trash2 size={14}/> Xóa</button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!visibleGroups.length && !ungroupedProducts.length && (
              <div className="empty">Chưa có danh mục hoặc sản phẩm phù hợp.</div>
            )}
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
