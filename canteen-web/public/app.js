const API = '';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let cart = [];
const ROLES = {
  admin: { label:'Quản trị viên', nav:['home','banhang','bep','lichsu','monan','kho','taichinh','baocao','calamviec','quantri','hoso'] },
  customer: { label:'Khách hàng', nav:['banhang','lichsu','hoso'] },
  phucvu: { label:'NV Phục vụ', nav:['home','bep','lichsu'] },
  bep: { label:'NV Bếp', nav:['home','bep','monan'] },
  kho: { label:'NV Kho', nav:['home','kho'] },
  ketoan: { label:'NV Kế toán', nav:['home','taichinh','baocao'] }
};
const NAV_ITEMS = {
  home:{label:'Tổng quan',icon:'🏠'},
  banhang:{label:'Bán hàng',icon:'🛒'},
  bep:{label:'Nhà bếp',icon:'🍳'},
  lichsu:{label:'Lịch sử đơn',icon:'📋'},
  monan:{label:'Quản lý món ăn',icon:'🍜'},
  kho:{label:'Kho nguyên liệu',icon:'📦'},
  taichinh:{label:'Tài chính',icon:'💰'},
  baocao:{label:'Báo cáo',icon:'📈'},
  calamviec:{label:'Ca làm việc',icon:'📅'},
  quantri:{label:'Quản trị',icon:'⚙️'},
  hoso:{label:'Hồ sơ',icon:'👤'}
};

function api(path, opts={}) {
  const headers = { 'Content-Type':'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  return fetch(API + path, { ...opts, headers: { ...headers, ...(opts.headers||{}) } }).then(async r => {
    const data = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error(data.error || 'Lỗi');
    return data;
  });
}
function toast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast ' + type + ' show';
  setTimeout(()=>t.classList.remove('show'), 2800);
}
function money(n){ return (n||0).toLocaleString('vi-VN') + 'đ'; }

// AUTH
function switchTab(tab){
  document.getElementById('formLogin').style.display = tab==='login'?'':'none';
  document.getElementById('formRegister').style.display = tab==='login'?'none':'';
}
function showStaffLogin(){ document.getElementById('cardCustomer').style.display='none'; document.getElementById('cardStaff').style.display=''; }
function showCustomerLogin(){ document.getElementById('cardStaff').style.display='none'; document.getElementById('cardCustomer').style.display=''; }
async function doLoginCustomer(){
  const email = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  try {
    const d = await api('/api/auth/login', { method:'POST', body: JSON.stringify({email,password}) });
    token = d.token; currentUser = d.user;
    localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(currentUser));
    enterApp();
  } catch(e){ toast(e.message,'error'); }
}
async function doRegister(){
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPass').value;
  try {
    await api('/api/auth/register', { method:'POST', body: JSON.stringify({name,email,password}) });
    toast('Đăng ký thành công');
    setTimeout(()=>{ document.getElementById('loginUser').value=email; switchTab('login'); }, 800);
  } catch(e){ toast(e.message,'error'); }
}
async function doLoginStaff(){
  const email = document.getElementById('staffUser').value.trim();
  const password = document.getElementById('staffPass').value;
  const role = document.getElementById('staffRole').value;
  try {
    const d = await api('/api/auth/login', { method:'POST', body: JSON.stringify({email,password}) });
    // verify role matches
    if (d.user.role !== role) { toast('Vai trò không khớp','error'); return; }
    token = d.token; currentUser = d.user;
    localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(currentUser));
    enterApp();
  } catch(e){ toast(e.message,'error'); }
}
function doLogout(){
  token=null; currentUser=null; localStorage.clear();
  document.getElementById('appWrap').classList.remove('active');
  document.getElementById('authPage').style.display='';
  showCustomerLogin(); switchTab('login');
}
function enterApp(){
  const r = ROLES[currentUser.role];
  document.getElementById('authPage').style.display='none';
  document.getElementById('appWrap').classList.add('active');
  document.getElementById('sidebarRole').textContent = r.label.toUpperCase();
  document.getElementById('userNameSB').textContent = currentUser.name;
  document.getElementById('userRoleSB').textContent = r.label;
  document.getElementById('userAvatarSB').textContent = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('topbarUser').textContent = currentUser.name;
  buildNav();
  const start = currentUser.role==='customer' ? 'banhang' : 'home';
  navigateTo(start);
  setInterval(()=>{ document.getElementById('topbarDate').textContent = new Date().toLocaleString('vi-VN'); }, 1000);
  renderMenu();
}
function buildNav(){
  const nav = document.getElementById('sidebarNav'); nav.innerHTML='';
  ROLES[currentUser.role].nav.forEach(key=>{
    const item = NAV_ITEMS[key];
    const a = document.createElement('a');
    a.href='#'; a.dataset.page=key;
    a.innerHTML = `<span class="nav-icon">${item.icon}</span><span>${item.label}</span>`;
    a.onclick = e => { e.preventDefault(); navigateTo(key); };
    nav.appendChild(a);
  });
}
function navigateTo(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const el = document.getElementById('page-'+page);
  if (el) el.classList.add('active');
  document.querySelectorAll('#sidebarNav a').forEach(a=>a.classList.toggle('active', a.dataset.page===page));
  const item = NAV_ITEMS[page]; if (item) document.getElementById('topbarTitle').textContent = item.icon+' '+item.label;
  loadPage(page);
}

async function loadPage(page){
  if (page==='home') loadHome();
  if (page==='banhang') { loadCategories(); renderMenu(); renderCart(); }
  if (page==='bep') loadKitchen();
  if (page==='lichsu') loadHistory();
  if (page==='kho') loadStock();
  if (page==='monan') loadDishes();
  if (page==='calamviec') loadShifts();
  if (page==='taichinh') loadFinance();
  if (page==='baocao') loadReport();
  if (page==='quantri') loadAdmin();
  if (page==='hoso') loadProfile();
}

// HOME
async function loadHome(){
  try {
    const s = await api('/api/reports/summary');
    document.getElementById('homeStats').innerHTML = `
      <div class="stat-card"><div class="stat-icon orange">💰</div><div><div class="stat-value">${money(s.revenue)}</div><div class="stat-label">Doanh thu</div></div></div>
      <div class="stat-card"><div class="stat-icon green">📋</div><div><div class="stat-value">${s.orders}</div><div class="stat-label">Đơn hàng</div></div></div>
      <div class="stat-card"><div class="stat-icon blue">👥</div><div><div class="stat-value">${s.users}</div><div class="stat-label">Người dùng</div></div></div>
      <div class="stat-card"><div class="stat-icon red">⚠️</div><div><div class="stat-value">${s.lowStock}</div><div class="stat-label">NL sắp hết</div></div></div>`;
  } catch(e){}
  try {
    const ings = await api('/api/ingredients');
    const low = ings.filter(i=>i.status==='low');
    document.getElementById('homeLowStock').innerHTML = low.length ? low.map(i=>`<div>${i.name}: ${i.stock} ${i.unit} (min ${i.min_stock})</div>`).join('') : 'Không có cảnh báo';
  } catch(e){}
}

// MENU
let menuData = [];
async function loadCategories(){
  const cats = await api('/api/categories');
  const sel = document.getElementById('menuCat');
  sel.innerHTML = '<option value="">Tất cả</option>' + cats.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
}
async function renderMenu(){
  const search = (document.getElementById('menuSearch')?.value||'').toLowerCase();
  const cat = document.getElementById('menuCat')?.value||'';
  const url = '/api/menu' + (cat?`?cat=${encodeURIComponent(cat)}`:'') + (search?`${cat?'&':'?'}search=${encodeURIComponent(search)}`:'');
  menuData = await api(url);
  const grid = document.getElementById('menuGrid');
  grid.innerHTML = menuData.map(m=>`
    <div class="menu-item ${m.status==='out'?'out-of-stock':''}" onclick="addToCart(${m.id})">
      <div class="thumb">${m.icon||'🍜'}</div>
      <div class="info"><h4>${m.name}</h4><div class="price">${money(m.price)}</div></div>
    </div>`).join('');
}
function addToCart(id){
  const item = menuData.find(m=>m.id===id);
  if (!item || item.status==='out') return;
  const ex = cart.find(c=>c.id===id);
  if (ex) ex.qty++; else cart.push({...item, qty:1});
  renderCart(); toast('Đã thêm '+item.name);
}
function renderCart(){
  const el = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  if (!cart.length){ el.innerHTML='<div class="empty-state"><div class="icon">🛒</div><p>Chưa có món nào</p></div>'; totalEl.textContent='0đ'; return; }
  el.innerHTML = cart.map((c,i)=>`
    <div class="cart-item">
      <span style="font-size:18px">${c.icon}</span>
      <div class="name">${c.name}</div>
      <div class="qty-ctrl">
        <button onclick="changeQty(${i},-1)">−</button><span>${c.qty}</span><button onclick="changeQty(${i},1)">+</button>
      </div>
      <div style="font-size:13px;font-weight:600;color:var(--primary);min-width:65px;text-align:right">${money(c.price*c.qty)}</div>
    </div>`).join('');
  totalEl.textContent = money(cart.reduce((a,c)=>a+c.price*c.qty,0));
}
function changeQty(i,d){ cart[i].qty+=d; if(cart[i].qty<=0) cart.splice(i,1); renderCart(); }
function clearCart(){ cart=[]; renderCart(); toast('Đã xóa giỏ hàng'); }
async function placeOrder(){
  if (!cart.length){ toast('Vui lòng chọn món','error'); return; }
  const body = {
    items: cart.map(c=>({id:c.id, name:c.name, price:c.price, qty:c.qty})),
    payment_method: document.getElementById('payMethod').value,
    pickup_slot: document.getElementById('pickupTime').value,
    note: document.getElementById('orderNote').value
  };
  try {
    const d = await api('/api/orders', { method:'POST', body: JSON.stringify(body) });
    cart=[]; renderCart(); toast('Đặt món thành công: '+d.code);
    loadHistory();
  } catch(e){ toast(e.message,'error'); }
}

// KITCHEN
async function loadKitchen(){
  const orders = await api('/api/kitchen/orders');
  const cols = { pending:[], paid:[], cooking:[], done:[] };
  orders.forEach(o=>{ if (o.status==='delivered') cols.done.push(o); else (cols[o.status]||cols.pending).push(o); });
  const container = document.getElementById('kitchenCols');
  container.innerHTML = `
    <div class="kitchen-col pending"><h3>⏳ Chờ xử lý (${cols.pending.length+cols.paid.length})</h3>${[...cols.pending,...cols.paid].map(kitchenCard).join('')}</div>
    <div class="kitchen-col cooking"><h3>🍳 Đang chế biến (${cols.cooking.length})</h3>${cols.cooking.map(kitchenCard).join('')}</div>
    <div class="kitchen-col done"><h3>✅ Hoàn thành (${cols.done.length})</h3>${cols.done.map(kitchenCard).join('')}</div>`;
}
function kitchenCard(o){
  const items = (o.items||[]).map(i=>`• ${i.name} x${i.quantity}`).join('<br>');
  let btn = '';
  const role = currentUser ? currentUser.role : '';
  if (role === 'phucvu') {
    if (o.status==='pending' || o.status==='paid') btn = `<button class="btn btn-info btn-sm" onclick="updateOrderStatus(${o.id},'paid')">✅ Xác nhận</button>`;
    else if (o.status==='done') btn = `<button class="btn btn-success btn-sm" onclick="updateOrderStatus(${o.id},'delivered')">🚚 Giao món</button>`;
    else btn = `<span class="badge badge-success">Đã xong</span>`;
  } else {
    if (o.status==='pending' || o.status==='paid') btn = `<button class="btn btn-warning btn-sm" onclick="updateOrderStatus(${o.id},'cooking')">🍳 Bắt đầu</button>`;
    else if (o.status==='cooking') btn = `<button class="btn btn-success btn-sm" onclick="updateOrderStatus(${o.id},'done')">✅ Hoàn thành</button>`;
    else btn = `<span class="badge badge-success">Đã xong</span>`;
  }
  return `<div class="kitchen-card ${o.status}"><div class="order-id">${o.code} — ${o.customer_name||''}</div><div class="items">${items}</div><div class="time">🕐 ${o.pickup_slot||''}</div><div style="margin-top:8px">${btn}</div></div>`;
}
async function updateOrderStatus(id,status){
  await api(`/api/orders/${id}/status`, { method:'PATCH', body: JSON.stringify({status}) });
  toast('Cập nhật thành công'); loadKitchen();
}

// HISTORY
async function loadHistory(){
  const orders = await api('/api/orders');
  document.getElementById('orderHistory').innerHTML = `<table><thead><tr><th>Mã đơn</th><th>Khách</th><th>Tổng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
    ${orders.map(o=>`<tr><td>${o.code}</td><td>${o.customer_name||''}</td><td>${money(o.total)}</td><td>${o.status}</td><td>
      <button class="btn btn-info btn-sm" onclick="viewOrder(${o.id})">Chi tiết</button>
      ${['pending','paid'].includes(o.status)?`<button class="btn btn-danger btn-sm" onclick="cancelOrder(${o.id})">Hủy</button>`:''}
      ${o.status==='done'?`<button class="btn btn-primary btn-sm" onclick="openReview(${o.id})">⭐ Đánh giá</button>`:''}
    </td></tr>`).join('')}</tbody></table>`;
}
function viewOrder(id){ toast('Xem đơn #'+id); }

// STOCK
async function loadStock(){
  const ings = await api('/api/ingredients');
  document.getElementById('stockTable').innerHTML = `<table><thead><tr><th>Mã</th><th>Nguyên liệu</th><th>Đơn vị</th><th>Tồn</th><th>Tối thiểu</th><th>Trạng thái</th><th>Chi tiết</th></tr></thead><tbody>
    ${ings.map(i=>`<tr><td>${i.code}</td><td>${i.name}</td><td>${i.unit}</td><td><b>${i.stock}</b></td><td>${i.min_stock}</td><td>${i.status}</td><td><button class="btn btn-info btn-sm" onclick="viewIngredient(${i.id},'${i.name}')">📋</button></td></tr>`).join('')}</tbody></table>
    <div id="ingDetail" style="margin-top:16px"></div>`;
  try { await loadSuppliers(); } catch(e){}
  try { await loadPO(); } catch(e){}
  try { await loadReceiptHistory(); } catch(e){}
}
async function loadReceiptHistory(){
  try {
    const rows = await api('/api/inventory/receipts/history');
    document.getElementById('receiptHistory').innerHTML = `<table><thead><tr><th>Ngày nhập</th><th>Nguyên liệu</th><th>Số lượng</th><th>Đơn vị</th><th>Lý do</th></tr></thead><tbody>
      ${rows.map(r=>`<tr><td>${r.created_at}</td><td>${r.ingredient_name}</td><td>${r.quantity}</td><td>${r.unit}</td><td>${r.reason}</td></tr>`).join('')}</tbody></table>`;
  } catch(e){ document.getElementById('receiptHistory').innerHTML='Không có quyền'; }
}
async function loadSuppliers(){
  try {
    const s = await api('/api/suppliers');
    document.getElementById('supplierTable').innerHTML = `<table><thead><tr><th>Tên</th><th>Liên hệ</th><th>Trạng thái</th></tr></thead><tbody>${s.map(x=>`<tr><td>${x.name}</td><td>${x.contact}</td><td>${x.status}</td></tr>`).join('')}</tbody></table>
      <button class="btn btn-success btn-sm" onclick="openSupplierModal()">➕ Thêm NCC</button>`;
  } catch(e){ document.getElementById('supplierTable').innerHTML='Không có quyền'; }
}
async function openSupplierModal(){
  openModal('modalAddSupplier');
}
async function submitSupplier(){
  const name = document.getElementById('supName').value.trim();
  const contact = document.getElementById('supContact').value.trim();
  if (!name) { toast('Thiếu tên','error'); return; }
  try { await api('/api/suppliers',{method:'POST',body:JSON.stringify({name,contact})}); toast('Đã thêm NCC'); closeModal('modalAddSupplier'); loadSuppliers(); }
  catch(e){ toast(e.message,'error'); }
}
async function openPOModal(){
  const suppliers = await api('/api/suppliers').catch(()=>[]);
  const ings = await api('/api/ingredients').catch(()=>[]);
  document.getElementById('poSupplier').innerHTML = suppliers.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
  document.getElementById('poIngredient').innerHTML = ings.map(i=>`<option value="${i.id}">${i.code} - ${i.name}</option>`).join('');
  openModal('modalCreatePO');
}
async function submitPO(){
  const supplier_id = parseInt(document.getElementById('poSupplier').value);
  const ingredient_id = parseInt(document.getElementById('poIngredient').value);
  const qty = parseFloat(document.getElementById('poQty').value);
  const price = parseFloat(document.getElementById('poPrice').value);
  if (!supplier_id||!ingredient_id||!qty) { toast('Thiếu thông tin','error'); return; }
  try {
    await api('/api/purchase-orders',{method:'POST',body:JSON.stringify({supplier_id,lines:[{ingredient_id,quantity:qty,unit_price:price}]})});
    toast('Đã tạo hóa đơn'); closeModal('modalCreatePO'); loadPO();
  } catch(e){ toast(e.message,'error'); }
}
async function loadPO(){
  try {
    const pos = await api('/api/purchase-orders');
    document.getElementById('poTable').innerHTML = `<table><thead><tr><th>ID</th><th>NCC</th><th>Tổng tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
      ${pos.map(p=>`<tr><td>${p.id}</td><td>${p.supplier_name}</td><td>${money(p.total_amount)}</td><td>${p.status}</td><td>${p.status!=='received'?`<button class="btn btn-success btn-sm" onclick="receivePO(${p.id})">Nhận hàng</button>`:''}</td></tr>`).join('')}</tbody></table>
      <button class="btn btn-primary btn-sm" onclick="openPOModal()">➕ Tạo hóa đơn</button>`;
  } catch(e){ document.getElementById('poTable').innerHTML='Không có quyền'; }
}
async function receivePO(id){
  try { await api(`/api/purchase-orders/${id}/receive`,{method:'PATCH'}); toast('Đã nhận hàng'); loadStock(); loadPO(); }
  catch(e){ toast(e.message,'error'); }
}
function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
async function stockAction(type){
  await populateStockSelects();
  if (type==='in') openModal('modalNhapKho');
  else openModal('modalXuatKho');
}
async function populateStockSelects(){
  try {
    const ings = await api('/api/ingredients');
    const suppliers = await api('/api/suppliers').catch(()=>[]);
    const opts = ings.map(i=>`<option value="${i.id}" data-unit="${i.unit}">${i.code} - ${i.name}</option>`).join('');
    document.getElementById('nkIngredient').innerHTML = opts;
    document.getElementById('xkIngredient').innerHTML = opts;
    document.getElementById('nkSupplier').innerHTML = suppliers.map(s=>`<option value="${s.id}">${s.name}</option>`).join('') || '<option value="">--</option>';
    document.getElementById('nkIngredient').onchange = () => {
      const sel = document.getElementById('nkIngredient');
      const unit = sel.options[sel.selectedIndex].dataset.unit;
      document.getElementById('nkUnit').value = unit || '';
    };
    document.getElementById('nkIngredient').dispatchEvent(new Event('change'));
  } catch(e){ toast(e.message,'error'); }
}
async function submitReceipt(){
  const ingredient_id = parseInt(document.getElementById('nkIngredient').value);
  const quantity = parseFloat(document.getElementById('nkQty').value);
  const expiry = document.getElementById('nkExpiry').value;
  const supplier = document.getElementById('nkSupplier').value;
  const note = document.getElementById('nkNote').value;
  if (!ingredient_id || !quantity) { toast('Thiếu thông tin','error'); return; }
  const reason = `Nhập kho - HSD: ${expiry} - NCC: ${supplier} - ${note}`;
  try {
    await api('/api/inventory/receipts', { method:'POST', body: JSON.stringify({ingredient_id, quantity, reason}) });
    toast('Nhập kho thành công'); closeModal('modalNhapKho'); loadStock();
  } catch(e){ toast(e.message,'error'); }
}
async function submitIssue(){
  const ingredient_id = parseInt(document.getElementById('xkIngredient').value);
  const quantity = parseFloat(document.getElementById('xkQty').value);
  const reason = document.getElementById('xkReason').value || 'Xuất kho';
  if (!ingredient_id || !quantity) { toast('Thiếu thông tin','error'); return; }
  try {
    await api('/api/inventory/issues', { method:'POST', body: JSON.stringify({ingredient_id, quantity, reason}) });
    toast('Xuất kho thành công'); closeModal('modalXuatKho'); loadStock();
  } catch(e){ toast(e.message,'error'); }
}

// FINANCE
async function loadFinance(){
  try {
    const w = await api('/api/wallet');
    document.getElementById('walletBalance').textContent = money(w.balance);
    document.getElementById('financeKpi').innerHTML = `<div class="kpi-card"><div class="value">${money(w.balance)}</div><div class="label">Số dư ví</div></div>`;
  } catch(e){}
  try {
    const tx = await api('/api/transactions');
    document.getElementById('txTable').innerHTML = `<table><thead><tr><th>Mã GD</th><th>Loại</th><th>Khách</th><th>Số tiền</th><th>Phương thức</th></tr></thead><tbody>
      ${tx.map(t=>`<tr><td>GD${t.id}</td><td>${t.type}</td><td>${t.full_name||''}</td><td>${money(t.amount)}</td><td>${t.method}</td></tr>`).join('')}</tbody></table>`;
  } catch(e){ document.getElementById('txTable').innerHTML = 'Không có quyền xem'; }
  loadTickets(); loadExpenses(); loadRecon();
}
async function loadTickets(){
  try {
    const pkgs = await api('/api/ticket-packages');
    const my = await api('/api/tickets');
    document.getElementById('ticketSection').innerHTML = `
      <div><b>Gói vé:</b></div>
      ${pkgs.map(p=>`<div>${p.name} - ${money(p.price)} (${p.meal_count} suất, ${p.duration_days} ngày) <button class="btn btn-sm btn-primary" onclick="buyTicket(${p.id})">Đăng ký</button></div>`).join('')}
      <div style="margin-top:8px"><b>Vé của tôi:</b></div>
      ${my.map(t=>`<div>${t.name}: ${t.start_date} → ${t.end_date} (${t.status})</div>`).join('')||'Chưa có'}`;
  } catch(e){ document.getElementById('ticketSection').innerHTML='Không có quyền'; }
}
function buyTicket(id){ api('/api/tickets',{method:'POST',body:JSON.stringify({package_id:id})}).then(()=>{toast('Đăng ký vé thành công');loadTickets();}).catch(e=>toast(e.message,'error')); }
async function loadExpenses(){
  try {
    const ex = await api('/api/expenses');
    document.getElementById('expenseSection').innerHTML = `<table><thead><tr><th>Mô tả</th><th>Số tiền</th><th>Nhóm</th></tr></thead><tbody>${ex.map(e=>`<tr><td>${e.description}</td><td>${money(e.amount)}</td><td>${e.category}</td></tr>`).join('')}</tbody></table>
      <button class="btn btn-success btn-sm" onclick="openModal('modalExpense')">➕ Thêm chi phí</button>`;
  } catch(e){ document.getElementById('expenseSection').innerHTML='Không có quyền'; }
}
async function submitExpense(){
  const desc = document.getElementById('expDesc').value.trim();
  const amount = parseFloat(document.getElementById('expAmount').value);
  const cat = document.getElementById('expCat').value.trim();
  if (!desc||!amount) { toast('Thiếu thông tin','error'); return; }
  try { await api('/api/expenses',{method:'POST',body:JSON.stringify({description:desc,amount,category:cat})}); toast('Đã thêm chi phí'); closeModal('modalExpense'); loadExpenses(); }
  catch(e){ toast(e.message,'error'); }
}
async function loadRecon(){
  try {
    const r = await api('/api/reconciliation');
    document.getElementById('reconSection').innerHTML = `<table><thead><tr><th>Kỳ</th><th>Hệ thống</th><th>Thực thu</th><th>Chênh lệch</th><th>Trạng thái</th></tr></thead><tbody>${r.map(x=>`<tr><td>${x.period}</td><td>${money(x.system_total)}</td><td>${money(x.actual_total)}</td><td>${money(x.diff)}</td><td>${x.status}</td></tr>`).join('')}</tbody></table>
      <button class="btn btn-primary btn-sm" onclick="openModal('modalRecon')">➕ Đối soát mới</button>`;
  } catch(e){ document.getElementById('reconSection').innerHTML='Không có quyền'; }
}
async function submitRecon(){
  const period = document.getElementById("reconPeriod").value.trim();
  const sys = parseFloat(document.getElementById("reconSystem").value);
  const act = parseFloat(document.getElementById("reconActual").value);
  if (!period) { toast("Thieu ky","error"); return; }
  try { await api("/api/reconciliation",{method:"POST",body:JSON.stringify({period:period,system_total:sys,actual_total:act})}); toast("Da doi soat"); closeModal("modalRecon"); loadRecon(); }
  catch(e){ toast(e.message,"error"); }
}


// REPORT
async function loadReport(){
  try {
    const r = await api('/api/reports/revenue');
    document.getElementById('reportKpi').innerHTML = `
      <div class="kpi-card"><div class="value">${money(r.total.revenue)}</div><div class="label">Doanh thu</div></div>
      <div class="kpi-card"><div class="value">${r.total.orders}</div><div class="label">Đơn hàng</div></div>`;
    document.getElementById('reportChart').innerHTML = r.byDay.map(d=>`<div>${d.day}: ${money(d.revenue)} (${d.orders} đơn)</div>`).join('');
  } catch(e){ document.getElementById('reportKpi').innerHTML='Không có quyền'; }
}

// ADMIN
async function loadAdmin(){
  try {
    const users = await api('/api/users');
    document.getElementById('usersTable').innerHTML = `<table><thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
      ${users.map(u=>`<tr><td>${u.full_name}</td><td>${u.email}</td><td>${u.role}</td><td>${u.status}</td>
        <td><button class="btn btn-warning btn-sm" onclick="toggleUser(${u.id},'${u.status==='active'?'locked':'active'}')">${u.status==='active'?'🔒':'🔓'}</button></td></tr>`).join('')}</tbody></table>`;
  } catch(e){ document.getElementById('usersTable').innerHTML='Không có quyền'; }
  try {
    const cfg = await api('/api/config');
    const form = document.getElementById('configForm');
    form.innerHTML = Object.entries(cfg).map(([k,v])=>`<div class="form-group"><label>${k}</label><input id="cfg_${k}" value="${v}"></div>`).join('') +
      `<button class="btn btn-primary" onclick="saveConfig()">💾 Lưu</button>`;
  } catch(e){}
  loadEmployees(); loadRoles();
}
async function loadEmployees(){
  try {
    const emps = await api('/api/employees');
    document.getElementById('empSection').innerHTML = `<table><thead><tr><th>Họ tên</th><th>Chức vụ</th><th>Bộ phận</th><th>Trạng thái</th></tr></thead><tbody>${emps.map(e=>`<tr><td>${e.full_name}</td><td>${e.position}</td><td>${e.department}</td><td>${e.status}</td></tr>`).join('')}</tbody></table>
      <button class="btn btn-success btn-sm" onclick="openModal('modalEmployee')">➕ Thêm nhân viên</button>`;
  } catch(e){ document.getElementById('empSection').innerHTML='Không có quyền'; }
}
async function submitEmployee(){
  const name = document.getElementById('empName').value.trim();
  const pos = document.getElementById('empPos').value.trim();
  const dept = document.getElementById('empDept').value.trim();
  if (!name) { toast('Thiếu tên','error'); return; }
  try { await api('/api/employees',{method:'POST',body:JSON.stringify({full_name:name,position:pos,department:dept,hire_date:new Date().toISOString().slice(0,10)})}); toast('Đã thêm nhân viên'); closeModal('modalEmployee'); loadEmployees(); }
  catch(e){ toast(e.message,'error'); }
}
async function loadRoles(){
  try {
    const roles = await api('/api/roles');
    document.getElementById('roleSection').innerHTML = `<table><thead><tr><th>Vai trò</th><th>Mô tả</th></tr></thead><tbody>${roles.map(r=>`<tr><td>${r.name}</td><td>${r.label}</td></tr>`).join('')}</tbody></table>`;
  } catch(e){ document.getElementById('roleSection').innerHTML='Không có quyền'; }
}
async function toggleUser(id,status){
  await api(`/api/users/${id}`, { method:'PATCH', body: JSON.stringify({status}) });
  toast('Đã cập nhật'); loadAdmin();
}
async function saveConfig(){
  const cfg = {};
  document.querySelectorAll('[id^="cfg_"]').forEach(inp=>{ cfg[inp.id.replace('cfg_','')] = inp.value; });
  await api('/api/config', { method:'PUT', body: JSON.stringify(cfg) });
  toast('Đã lưu cấu hình');
}

// PROFILE
async function loadProfile(){
  document.getElementById('profileName').textContent = currentUser.name;
  document.getElementById('profileEmail').textContent = currentUser.email;
  try { const w = await api('/api/wallet'); document.getElementById('profileWallet').textContent = money(w.balance); } catch(e){}
}


// DISHES
async function loadDishes(){
  const dishes = await api('/api/menu');
  document.getElementById('dishTable').innerHTML = `<table><thead><tr><th>Tên</th><th>Giá</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
    ${dishes.map(d=>`<tr><td>${d.name}</td><td>${money(d.price)}</td><td>${d.status==='active'?'✅ Còn hàng':'❌ Hết hàng'}</td><td>
      <button class="btn btn-sm ${d.status==='active'?'btn-warning':'btn-success'}" onclick="toggleDish(${d.id},'${d.status==='active'?'out':'active'}')">${d.status==='active'?'Tắt bán':'Bật bán'}</button>
      <button class="btn btn-danger btn-sm" onclick="deleteDish(${d.id})">🗑️</button>
    </td></tr>`).join('')}</tbody></table>`;
}
function editDish(id){
  const status = prompt('Trạng thái (active/out):');
  api(`/api/dishes/${id}`,{method:'PUT',body:JSON.stringify({status})}).then(()=>{toast('Đã sửa');loadDishes();}).catch(e=>toast(e.message,'error'));
}
function deleteDish(id){
  if (!confirm('Xóa món?')) return;
  api(`/api/dishes/${id}`,{method:'DELETE'}).then(()=>{toast('Đã xóa');loadDishes();}).catch(e=>toast(e.message,'error'));
}

// SHIFTS
async function loadShifts(){
  const defs = await api('/api/shift-definitions');
  const schedules = await api('/api/shifts/schedule').catch(()=>[]);
  // week dates
  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - (now.getDay()===0?6:now.getDay()-1));
  const days = Array.from({length:7},(_,i)=>{ const d=new Date(monday); d.setDate(monday.getDate()+i); return d; });
  const fmt = d => d.getDate()+'/'+(d.getMonth()+1);
  const byShiftDay = {};
  defs.forEach(sh=>{
    byShiftDay[sh.id] = {};
    days.forEach(d=>{ byShiftDay[sh.id][d.toISOString().slice(0,10)] = []; });
  });
  schedules.forEach(s=>{
    const ds = s.work_date;
    if (byShiftDay[s.shift_id] && byShiftDay[s.shift_id][ds]) byShiftDay[s.shift_id][ds].push(s);
  });
  let html = `<div style="overflow-x:auto"><table style="min-width:800px"><thead><tr><th>Ca / Vị trí</th>${days.map(d=>`<th style="text-align:center">${d.getDate()}/${d.getMonth()+1}</th>`).join('')}</tr></thead><tbody>`;
  defs.forEach(sh=>{
    html += `<tr><td style="font-weight:700">${sh.label}<br><small>${sh.start_time}-${sh.end_time}</small></td>`;
    days.forEach(d=>{
      const ds = d.toISOString().slice(0,10);
      const slots = byShiftDay[sh.id][ds] || [];
      html += `<td style="vertical-align:top">${slots.map(s=>`<div style="background:#d5f5e3;border-left:3px solid #27ae60;padding:4px 6px;margin:2px 0;border-radius:4px;font-size:12px">${s.full_name||''}</div>`).join('')||'<span style="color:#ccc">—</span>'}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table></div>';
  const att = await api('/api/attendance/history').catch(()=>[]);
  html += `<h4 style="margin-top:16px">Lịch sử chấm công</h4>
    <table><thead><tr><th>Vào ca</th><th>Ra ca</th><th>Trạng thái</th></tr></thead><tbody>
      ${att.map(a=>`<tr><td>${a.check_in||''}</td><td>${a.check_out||'—'}</td><td>${a.status}</td></tr>`).join('')}</tbody></table>
    <div style="margin-top:10px"><button class="btn btn-success btn-sm" onclick="checkIn()">Vào ca</button> <button class="btn btn-warning btn-sm" onclick="checkOut()">Ra ca</button></div>`;
  document.getElementById('shiftInfo').innerHTML = html;
}
async function checkIn(){
  try { await api('/api/attendance/check-in',{method:'POST',body:JSON.stringify({schedule_id:1})}); toast('Đã chấm công vào'); loadShifts(); }
  catch(e){ toast(e.message,'error'); }
}
async function checkOut(){
  toast('Cần attendance_id, demo chưa hỗ trợ tự động'); 
}

async function cancelOrder(id){
  if (!confirm('Hủy đơn?')) return;
  try { await api(`/api/orders/${id}/cancel`,{method:'PATCH'}); toast('Đã hủy'); loadHistory(); }
  catch(e){ toast(e.message,'error'); }
}

async function viewIngredient(id,name){
  try {
    const tx = await api(`/api/ingredients/${id}/transactions`);
    document.getElementById('ingDetail').innerHTML = `<h4>Lịch sử nhập/xuất: ${name}</h4>
      <table><thead><tr><th>Ngày</th><th>Loại</th><th>Số lượng</th><th>Lý do</th></tr></thead><tbody>
        ${tx.map(t=>`<tr><td>${t.created_at}</td><td>${t.type}</td><td>${t.quantity}</td><td>${t.reason}</td></tr>`).join('')}</tbody></table>`;
  } catch(e){ toast(e.message,'error'); }
}

async function openReview(orderId){
  const orders = await api('/api/orders');
  const o = orders.find(x=>x.id===orderId);
  const dishSel = document.getElementById('reviewDish');
  dishSel.innerHTML = (o.items||[]).map(i=>`<option value="${i.dish_id}">${i.name}</option>`).join('');
  document.getElementById('reviewOrder').value = orderId;
  document.getElementById('reviewRating').value = 5;
  openModal('modalReview');
}
async function submitReview(){
  const dish_id = parseInt(document.getElementById('reviewDish').value);
  const order_id = parseInt(document.getElementById('reviewOrder').value);
  const rating = parseInt(document.getElementById('reviewRating').value);
  const comment = document.getElementById('reviewComment').value;
  try {
    await api('/api/reviews',{method:'POST',body:JSON.stringify({dish_id,order_id,rating,comment})});
    toast('Đã gửi đánh giá'); closeModal('modalReview');
  } catch(e){ toast(e.message,'error'); }
}

async function submitDish(){
  const name=document.getElementById("dishName").value.trim();
  const category_id=parseInt(document.getElementById("dishCat").value);
  const price=parseInt(document.getElementById("dishPrice").value);
  const status=document.getElementById("dishStatus").value;
  if(!name||!price){toast("Thieu thong tin","error");return;}
  try{await api("/api/dishes",{method:"POST",body:JSON.stringify({category_id:category_id,name:name,price:price,icon:"🍜",status:status})});toast("Da them mon");closeModal("modalDish");loadDishes();}
  catch(e){toast(e.message,"error");}
}

async function openAdjustModal(){
  const ings = await api('/api/ingredients').catch(()=>[]);
  document.getElementById('adjIngredient').innerHTML = ings.map(i=>`<option value="${i.id}">${i.code} - ${i.name}</option>`).join('');
  openModal('modalAdjust');
}
async function submitAdjust(){
  const ingredient_id = parseInt(document.getElementById('adjIngredient').value);
  const diff = parseFloat(document.getElementById('adjDiff').value);
  const reason = document.getElementById('adjReason').value.trim();
  if (!ingredient_id || isNaN(diff) || !reason) { toast('Thiếu thông tin','error'); return; }
  try { await api('/api/inventory/adjustments',{method:'POST',body:JSON.stringify({ingredient_id,diff,reason})}); toast('Đã điều chỉnh'); closeModal('modalAdjust'); loadStock(); }
  catch(e){ toast(e.message,'error'); }
}

async function openStocktakeModal(){
  const ings = await api('/api/ingredients').catch(()=>[]);
  document.getElementById('stIngredient').innerHTML = ings.map(i=>`<option value="${i.id}">${i.code} - ${i.name}</option>`).join('');
  openModal('modalStocktake');
}
async function submitStocktake(){
  const ingredient_id = parseInt(document.getElementById('stIngredient').value);
  const actual_qty = parseFloat(document.getElementById('stActual').value);
  const reason = document.getElementById('stReason').value.trim();
  if (!ingredient_id || isNaN(actual_qty)) { toast('Thiếu thông tin','error'); return; }
  try { await api('/api/inventory/stocktake',{method:'POST',body:JSON.stringify({ingredient_id,actual_qty,reason})}); toast('Đã kiểm kê'); closeModal('modalStocktake'); loadStock(); }
  catch(e){ toast(e.message,'error'); }
}

async function toggleDish(id,status){
  try { await api(`/api/dishes/${id}`,{method:'PUT',body:JSON.stringify({status})}); toast('Đã cập nhật'); loadDishes(); }
  catch(e){ toast(e.message,'error'); }
}

// INIT
if (token && currentUser) {
  // validate by trying summary? just enter
  enterApp();
} else {
  document.getElementById('authPage').style.display='';
}
