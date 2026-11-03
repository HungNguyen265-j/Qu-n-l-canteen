// ============================================================
// script.js — Logic ứng dụng căng tin
// Phụ thuộc: data.js phải được load trước file này
// ============================================================

// ---------- Trạng thái ứng dụng ----------
let currentRole = 'admin';
let currentPage = 'home';
let cart = [];
let weekOffset = 0;

// ============================================================
// AUTH
// ============================================================

function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('formLogin').style.display = isLogin ? '' : 'none';
  document.getElementById('formRegister').style.display = isLogin ? 'none' : '';
  document.getElementById('tabLogin').style.cssText = isLogin
    ? 'flex:1;padding:10px;border:none;background:none;font-size:14px;font-weight:700;color:var(--primary);border-bottom:2px solid var(--primary);margin-bottom:-2px;cursor:pointer'
    : 'flex:1;padding:10px;border:none;background:none;font-size:14px;font-weight:600;color:var(--text-muted);cursor:pointer';
  document.getElementById('tabRegister').style.cssText = isLogin
    ? 'flex:1;padding:10px;border:none;background:none;font-size:14px;font-weight:600;color:var(--text-muted);cursor:pointer'
    : 'flex:1;padding:10px;border:none;background:none;font-size:14px;font-weight:700;color:var(--primary);border-bottom:2px solid var(--primary);margin-bottom:-2px;cursor:pointer';
}

function doRegister() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const pass  = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;
  const agree = document.getElementById('regAgree').checked;
  if (!name)                        { showToast('Vui lòng nhập họ tên!', 'error'); return; }
  if (!email || !email.includes('@')){ showToast('Email không hợp lệ!', 'error'); return; }
  if (!phone || phone.length < 9)   { showToast('Số điện thoại không hợp lệ!', 'error'); return; }
  if (pass.length < 8)              { showToast('Mật khẩu tối thiểu 8 ký tự!', 'error'); return; }
  if (pass !== pass2)               { showToast('Mật khẩu xác nhận không khớp!', 'error'); return; }
  if (!agree)                       { showToast('Vui lòng đồng ý điều khoản sử dụng!', 'error'); return; }
  // TODO: POST /api/auth/register { name, email, phone, password: pass }
  showToast('🎉 Đăng ký thành công! Chào mừng ' + name, 'success');
  setTimeout(() => { enterApp('customer', name); }, 800);
}

function doLoginCustomer() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value;
  if (!user) { showToast('Vui lòng nhập email hoặc số điện thoại!', 'error'); return; }
  if (!pass) { showToast('Vui lòng nhập mật khẩu!', 'error'); return; }
  // TODO: POST /api/auth/login { email: user, password: pass }  → { token, name, role }
  const displayName = user.includes('@') ? user.split('@')[0] : user;
  const name = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  showToast('🎉 Đăng nhập thành công! Chào ' + name, 'success');
  setTimeout(() => { enterApp('customer', name); }, 500);
}

function doLoginStaff() {
  const user = document.getElementById('staffUser').value.trim();
  const pass = document.getElementById('staffPass').value;
  const role = document.getElementById('staffRole').value;
  if (!user) { showToast('Vui lòng nhập tài khoản!', 'error'); return; }
  if (!pass) { showToast('Vui lòng nhập mật khẩu!', 'error'); return; }
  // TODO: POST /api/auth/staff-login { email: user, password: pass, role }
  const r = ROLES[role];
  showToast('🔑 Đăng nhập thành công! Chào ' + r.label, 'success');
  setTimeout(() => { enterApp(role, r.label); }, 500);
}

/** Vào app sau khi đăng nhập thành công */
function enterApp(role, displayName) {
  currentRole = role;
  const r = ROLES[role];
  document.getElementById('authPage').style.display = 'none';
  document.getElementById('appWrap').classList.add('active');
  document.getElementById('sidebarRole').textContent   = r.label.toUpperCase();
  document.getElementById('userNameSB').textContent    = displayName;
  document.getElementById('userRoleSB').textContent    = r.label;
  document.getElementById('userAvatarSB').textContent  = displayName.charAt(0).toUpperCase();
  document.getElementById('topbarUser').textContent    = displayName;
  buildNav(role);
  const startPage = role === 'customer' ? 'banhang' : 'home';
  navigateTo(startPage);
  setInterval(updateTime, 1000);
  updateTime();
  renderMenu();
}

function showStaffLogin() {
  document.getElementById('cardCustomer').style.display = 'none';
  document.getElementById('cardStaff').style.display = '';
}

function showCustomerLogin() {
  document.getElementById('cardStaff').style.display = 'none';
  document.getElementById('cardCustomer').style.display = '';
}

function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁'; }
}

function doLogout() {
  document.getElementById('appWrap').classList.remove('active');
  document.getElementById('authPage').style.display = '';
  document.getElementById('cardCustomer').style.display = '';
  document.getElementById('cardStaff').style.display = 'none';
  switchTab('login');
  // TODO: POST /api/auth/logout  (xóa token)
}

// ============================================================
// NAVIGATION
// ============================================================

function buildNav(role) {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = '';
  ROLES[role].nav.forEach(key => {
    const item = NAV_ITEMS[key];
    const a = document.createElement('a');
    a.href = '#';
    a.dataset.page = key;
    a.innerHTML = `<span class="nav-icon">${item.icon}</span><span>${item.label}</span>`;
    a.onclick = e => { e.preventDefault(); navigateTo(key); };
    nav.appendChild(a);
  });
}

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  document.querySelectorAll('#sidebarNav a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
  const item = NAV_ITEMS[page];
  if (item) document.getElementById('topbarTitle').textContent = item.icon + ' ' + item.label;
  // Render lịch ca khi mở trang calamviec
  if (page === 'calamviec') renderWeekSchedule();
}

function updateTime() {
  const now = new Date();
  const d = now.toLocaleDateString('vi-VN', {weekday:'short', day:'2-digit', month:'2-digit', year:'numeric'});
  const t = now.toLocaleTimeString('vi-VN');
  document.getElementById('topbarDate').textContent = d + ' ' + t;
}

// ============================================================
// BÁN HÀNG — Menu & Giỏ hàng
// ============================================================

function renderMenu(filter = '') {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;
  const cat = document.getElementById('menuCat')?.value || '';
  // TODO: GET /api/menu?cat=...&search=...
  const items = MENU_DATA.filter(m =>
    (!filter || m.name.toLowerCase().includes(filter)) &&
    (!cat    || m.cat === cat)
  );
  grid.innerHTML = items.map(m => `
    <div class="menu-item ${m.status === 'out' ? 'out-of-stock' : ''}" onclick="addToCart(${m.id})">
      <div class="thumb">${m.icon}</div>
      <div class="info">
        <h4>${m.name}</h4>
        <div class="price">${m.price.toLocaleString('vi-VN')}đ</div>
        ${m.status === 'out' ? '<div class="status" style="color:var(--danger);font-size:11px">Tạm hết</div>' : ''}
      </div>
    </div>`).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('menuCat')?.addEventListener('change', () => renderMenu());

  // Đóng modal khi click ngoài
  document.querySelectorAll('.modal-bg').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
  });
});

function addToCart(id) {
  const item = MENU_DATA.find(m => m.id === id);
  if (!item) return;
  const existing = cart.find(c => c.id === id);
  if (existing) existing.qty++;
  else cart.push({...item, qty:1});
  renderCart();
  showToast('Đã thêm ' + item.name, 'success');
}

function renderCart() {
  const el    = document.getElementById('cartItems');
  const total = document.getElementById('cartTotal');
  if (!el) return;
  if (cart.length === 0) {
    el.innerHTML = '<div class="empty-state"><div class="icon">🛒</div><p>Chưa có món nào</p></div>';
    if (total) total.textContent = '0đ';
    return;
  }
  el.innerHTML = cart.map((c, i) => `
    <div class="cart-item">
      <span style="font-size:18px">${c.icon}</span>
      <div class="name">${c.name}</div>
      <div class="qty-ctrl">
        <button onclick="changeQty(${i},-1)">−</button>
        <span>${c.qty}</span>
        <button onclick="changeQty(${i},1)">+</button>
      </div>
      <div style="font-size:13px;font-weight:600;color:var(--primary);min-width:65px;text-align:right">${(c.price*c.qty).toLocaleString('vi-VN')}đ</div>
    </div>`).join('');
  const sum = cart.reduce((a, c) => a + c.price * c.qty, 0);
  if (total) total.textContent = sum.toLocaleString('vi-VN') + 'đ';
}

function changeQty(i, d) {
  cart[i].qty += d;
  if (cart[i].qty <= 0) cart.splice(i, 1);
  renderCart();
}

function clearCart() { cart = []; renderCart(); showToast('Đã xóa giỏ hàng', 'success'); }

function placeOrder() {
  if (cart.length === 0) { showToast('Vui lòng chọn ít nhất 1 món!', 'error'); return; }
  // TODO: POST /api/orders  { items: cart, customerId: ... }
  cart = [];
  renderCart();
  showToast('🎉 Đặt món thành công! Vui lòng chờ xác nhận.', 'success');
}

// ============================================================
// NHÀ BẾP — Kanban
// ============================================================

function moveKitchen(btn, state) {
  const card = btn.closest('.kitchen-card');
  const col  = state === 'cooking'
    ? document.querySelector('.kitchen-col.cooking')
    : document.querySelector('.kitchen-col.done');
  card.className = 'kitchen-card ' + state;
  if (state === 'cooking') {
    btn.parentElement.innerHTML = '<button class="btn btn-success btn-sm" onclick="moveKitchen(this,\'done\')">✅ Hoàn thành</button>';
    showToast('Bắt đầu chế biến!', 'success');
  } else {
    btn.parentElement.innerHTML = '<span class="badge badge-success">Đã giao</span>';
    showToast('Món đã hoàn thành! Thông báo đã gửi khách.', 'success');
    // TODO: PATCH /api/orders/:id/status  { status: 'done' }
  }
  col.querySelector('h3').after(card);
}

function showOrderDetail() { openModal('modalOrderDetail'); }

// ============================================================
// MODAL
// ============================================================

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ============================================================
// BẢNG LỊCH CA TUẦN
// ============================================================

function getWeekDates(offset) {
  const now    = new Date();
  const dow    = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  return Array.from({length:7}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function renderWeekSchedule() {
  // TODO: GET /api/schedule?weekStart=<monday ISO>  thay thế WEEK_DATA
  const days     = getWeekDates(weekOffset);
  const todayStr = new Date().toDateString();
  const fmt      = d => d.getDate() + '/' + (d.getMonth() + 1);

  document.getElementById('weekLabel').textContent =
    'Tuần ' + fmt(days[0]) + ' – ' + fmt(days[6]) + '/' + days[6].getFullYear();

  // Header row
  const headerRow = document.getElementById('weekHeaderRow');
  headerRow.innerHTML = '<th style="width:110px;padding:12px 14px;background:#f8f9fa;border-bottom:2px solid var(--border)">Ca / Vị trí</th>';
  days.forEach(d => {
    const isToday = d.toDateString() === todayStr;
    const th = document.createElement('th');
    th.className = 'day-header-cell' + (isToday ? ' today' : '');
    th.innerHTML = `<div class="dow">${DOW_VI[d.getDay()]}</div><div class="date">${d.getDate()}/${d.getMonth()+1}</div>`;
    headerRow.appendChild(th);
  });

  // Body rows
  const tbody = document.getElementById('weekScheduleBody');
  tbody.innerHTML = '';
  SHIFTS.forEach(shift => {
    const tr      = document.createElement('tr');
    const tdLabel = document.createElement('td');
    tdLabel.className = 'week-ca-label';
    tdLabel.innerHTML = `${shift.label}<small>${shift.time}</small>`;
    tr.appendChild(tdLabel);

    days.forEach(d => {
      const isToday = d.toDateString() === todayStr;
      const key     = d.getDay() + '-' + shift.key;
      const slots   = WEEK_DATA[key] || [];
      const td      = document.createElement('td');
      td.className  = 'week-cell' + (isToday ? ' today-col' : '');
      td.innerHTML  = slots.length === 0
        ? '<span style="color:#ccc;font-size:12px">—</span>'
        : slots.map(s => `
            <div class="week-shift-slot ${s.st}">
              <div class="sv-name">${s.name}</div>
              <div class="sv-pos">${s.pos}</div>
            </div>`).join('');
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  const tlabel = document.getElementById('todayDateLabel');
  if (tlabel) tlabel.textContent = new Date().toLocaleDateString('vi-VN', {
    weekday:'long', day:'2-digit', month:'2-digit', year:'numeric'
  });
}

function changeWeek(dir) { weekOffset += dir; renderWeekSchedule(); }

// ============================================================
// TOAST NOTIFICATION
// ============================================================

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 2800);
}
