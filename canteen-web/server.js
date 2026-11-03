const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
const path = require('path');

const app = express();
const JWT_SECRET = 'canteen-secret-key';
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(h.replace('Bearer ', ''), JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}
function role(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// AUTH
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!u || !bcrypt.compareSync(password, u.password_hash)) return res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' });
  if (u.status !== 'active') return res.status(403).json({ error: 'Tài khoản bị khóa' });
  const token = jwt.sign({ id: u.id, email: u.email, role: u.role, name: u.full_name }, JWT_SECRET, { expiresIn: '8h' });
  const wallet = db.prepare('SELECT balance FROM wallets WHERE user_id=?').get(u.id);
  res.json({ token, user: { id: u.id, email: u.email, name: u.full_name, role: u.role }, wallet: wallet ? wallet.balance : 0 });
});
app.post('/api/auth/register', (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Thiếu thông tin' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const r = db.prepare('INSERT INTO users(email,password_hash,full_name,role) VALUES(?,?,?,?)').run(email, hash, name, 'customer');
    db.prepare('INSERT INTO wallets(user_id,balance) VALUES(?,0)').run(r.lastInsertRowid);
    res.json({ message: 'Đăng ký thành công' });
  } catch (e) {
    res.status(400).json({ error: 'Email đã tồn tại' });
  }
});

// MENU
app.get('/api/menu', (req, res) => {
  const { cat, search } = req.query;
  let sql = 'SELECT d.*, c.name as category_name FROM dishes d LEFT JOIN menu_categories c ON d.category_id=c.id WHERE 1=1';
  const params = [];
  if (cat) { sql += ' AND c.name=?'; params.push(cat); }
  if (search) { sql += ' AND d.name LIKE ?'; params.push('%' + search + '%'); }
  res.json(db.prepare(sql).all(...params));
});
app.get('/api/categories', (req, res) => res.json(db.prepare('SELECT * FROM menu_categories').all()));

// ORDERS
app.post('/api/orders', auth, (req, res) => {
  const { items, payment_method, pickup_slot, note } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'Giỏ hàng trống' });
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const code = '#DH' + String(Date.now()).slice(-4);
  const r = db.prepare('INSERT INTO orders(code,customer_id,total,status,payment_method,pickup_slot,note) VALUES(?,?,?,?,?,?,?)')
    .run(code, req.user.id, total, 'pending', payment_method, pickup_slot, note);
  const ins = db.prepare('INSERT INTO order_items(order_id,dish_id,quantity,unit_price) VALUES(?,?,?,?)');
  items.forEach(i => ins.run(r.lastInsertRowid, i.id, i.qty, i.price));
  // wallet payment
  if (payment_method === 'Ví Canteen') {
    const w = db.prepare('SELECT balance FROM wallets WHERE user_id=?').get(req.user.id);
    if (!w || w.balance < total) {
      db.prepare('DELETE FROM order_items WHERE order_id=?').run(r.lastInsertRowid);
      db.prepare('DELETE FROM orders WHERE id=?').run(r.lastInsertRowid);
      return res.status(400).json({ error: 'Số dư ví không đủ' });
    }
    db.prepare('UPDATE wallets SET balance=balance-? WHERE user_id=?').run(total, req.user.id);
    db.prepare('INSERT INTO payments(order_id,type,amount,method,status) VALUES(?,?,?,?,?)').run(r.lastInsertRowid, 'payment', total, 'Ví Canteen', 'success');
    db.prepare("UPDATE orders SET status='paid' WHERE id=?").run(r.lastInsertRowid);
  }
  res.json({ id: r.lastInsertRowid, code, total });
});
app.get('/api/orders', auth, (req, res) => {
  let sql = `SELECT o.*, u.full_name as customer_name FROM orders o LEFT JOIN users u ON o.customer_id=u.id WHERE 1=1`;
  const params = [];
  if (req.user.role === 'customer') { sql += ' AND o.customer_id=?'; params.push(req.user.id); }
  if (req.query.status) { sql += ' AND o.status=?'; params.push(req.query.status); }
  sql += ' ORDER BY o.created_at DESC';
  const orders = db.prepare(sql).all(...params);
  // attach items
  orders.forEach(o => {
    o.items = db.prepare('SELECT oi.*, d.name, d.icon FROM order_items oi LEFT JOIN dishes d ON oi.dish_id=d.id WHERE oi.order_id=?').all(o.id);
  });
  res.json(orders);
});
app.patch('/api/orders/:id/status', auth, (req, res) => {
  db.prepare('UPDATE orders SET status=? WHERE id=?').run(req.body.status, req.params.id);
  res.json({ message: 'OK' });
});
app.patch('/api/orders/:id/cancel', auth, (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!o || o.customer_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (o.status !== 'pending') return res.status(400).json({ error: 'Không thể hủy' });
  db.prepare("UPDATE orders SET status='cancelled' WHERE id=?").run(o.id);
  // refund if paid
  if (o.status === 'paid') {
    db.prepare('UPDATE wallets SET balance=balance+? WHERE user_id=?').run(o.total, req.user.id);
  }
  res.json({ message: 'Đã hủy' });
});

// KITCHEN
app.get('/api/kitchen/orders', auth, (req, res) => {
  const orders = db.prepare(`SELECT o.*, u.full_name as customer_name FROM orders o LEFT JOIN users u ON o.customer_id=u.id WHERE o.status IN ('pending','paid','cooking','done','delivered') ORDER BY o.created_at DESC`).all();
  orders.forEach(o => {
    o.items = db.prepare('SELECT oi.*, d.name, d.icon FROM order_items oi LEFT JOIN dishes d ON oi.dish_id=d.id WHERE oi.order_id=?').all(o.id);
  });
  res.json(orders);
});

// INVENTORY
app.get('/api/ingredients', auth, (req, res) => res.json(db.prepare('SELECT * FROM ingredients ORDER BY id').all()));
app.post('/api/ingredients', auth, role('kho','admin'), (req, res) => {
  const { code, name, unit, stock, min_stock } = req.body;
  const r = db.prepare('INSERT INTO ingredients(code,name,unit,stock,min_stock,status) VALUES(?,?,?,?,?,?)').run(code, name, unit, stock, min_stock, stock < min_stock ? 'low' : 'ok');
  res.json({ id: r.lastInsertRowid });
});
app.post('/api/inventory/receipts', auth, role('kho','admin'), (req, res) => {
  const { ingredient_id, quantity } = req.body;
  db.prepare('UPDATE ingredients SET stock=stock+? WHERE id=?').run(quantity, ingredient_id);
  const ing = db.prepare('SELECT stock,min_stock FROM ingredients WHERE id=?').get(ingredient_id);
  db.prepare('UPDATE ingredients SET status=? WHERE id=?').run(ing.stock < ing.min_stock ? 'low' : 'ok', ingredient_id);
  db.prepare('INSERT INTO inventory_transactions(ingredient_id,type,quantity,reason,performed_by) VALUES(?,?,?,?,?)').run(ingredient_id,'receipt',quantity, req.body.reason || 'Nhập kho', req.user.id);
  res.json({ message: 'Nhập kho thành công' });
});
app.post('/api/inventory/stocktake', auth, role('kho','admin'), (req, res) => {
  const { ingredient_id, actual_qty, reason } = req.body;
  const ing = db.prepare('SELECT stock FROM ingredients WHERE id=?').get(ingredient_id);
  if (!ing) return res.status(404).json({ error: 'Not found' });
  const diff = actual_qty - ing.stock;
  db.prepare('UPDATE ingredients SET stock=? WHERE id=?').run(actual_qty, ingredient_id);
  const ing2 = db.prepare('SELECT stock,min_stock FROM ingredients WHERE id=?').get(ingredient_id);
  db.prepare('UPDATE ingredients SET status=? WHERE id=?').run(ing2.stock < ing2.min_stock ? 'low' : 'ok', ingredient_id);
  db.prepare('INSERT INTO stocktakes(ingredient_id,system_qty,actual_qty,diff,reason) VALUES(?,?,?,?,?)').run(ingredient_id, ing.stock, actual_qty, diff, reason);
  db.prepare('INSERT INTO inventory_transactions(ingredient_id,type,quantity,reason,performed_by) VALUES(?,?,?,?,?)').run(ingredient_id, 'stocktake', diff, reason || 'Kiểm kê', req.user.id);
  res.json({ message: 'Đã kiểm kê', diff });
});
app.post('/api/inventory/adjustments', auth, role('kho','admin'), (req, res) => {
  const { ingredient_id, diff, reason } = req.body;
  const ing = db.prepare('SELECT stock,min_stock FROM ingredients WHERE id=?').get(ingredient_id);
  if (!ing) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE ingredients SET stock=stock+? WHERE id=?').run(diff, ingredient_id);
  const ing2 = db.prepare('SELECT stock,min_stock FROM ingredients WHERE id=?').get(ingredient_id);
  db.prepare('UPDATE ingredients SET status=? WHERE id=?').run(ing2.stock < ing2.min_stock ? 'low' : 'ok', ingredient_id);
  db.prepare('INSERT INTO inventory_adjustments(ingredient_id,diff,reason,approved_by) VALUES(?,?,?,?)').run(ingredient_id, diff, reason, req.user.id);
  db.prepare('INSERT INTO inventory_transactions(ingredient_id,type,quantity,reason,performed_by) VALUES(?,?,?,?,?)').run(ingredient_id, 'adjustment', diff, reason || 'Điều chỉnh tồn', req.user.id);
  res.json({ message: 'Đã điều chỉnh' });
});
app.post('/api/inventory/issues', auth, role('kho','admin'), (req, res) => {
  const { ingredient_id, quantity } = req.body;
  const ing = db.prepare('SELECT stock FROM ingredients WHERE id=?').get(ingredient_id);
  if (!ing || ing.stock < quantity) return res.status(400).json({ error: 'Không đủ tồn kho' });
  db.prepare('UPDATE ingredients SET stock=stock-? WHERE id=?').run(quantity, ingredient_id);
  const ing2 = db.prepare('SELECT stock,min_stock FROM ingredients WHERE id=?').get(ingredient_id);
  db.prepare('UPDATE ingredients SET status=? WHERE id=?').run(ing2.stock < ing2.min_stock ? 'low' : 'ok', ingredient_id);
  db.prepare('INSERT INTO inventory_transactions(ingredient_id,type,quantity,reason,performed_by) VALUES(?,?,?,?,?)').run(ingredient_id,'issue',quantity, req.body.reason || 'Xuất kho', req.user.id);
  res.json({ message: 'Xuất kho thành công' });
});

// FINANCE
app.get('/api/wallet', auth, (req, res) => {
  const w = db.prepare('SELECT balance FROM wallets WHERE user_id=?').get(req.user.id);
  res.json({ balance: w ? w.balance : 0 });
});
app.post('/api/wallet/topup', auth, (req, res) => {
  const { amount } = req.body;
  if (!amount || amount < 20000) return res.status(400).json({ error: 'Số tiền tối thiểu 20.000đ' });
  db.prepare('INSERT INTO wallets(user_id,balance) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET balance=balance+?').run(req.user.id, amount, amount);
  res.json({ message: 'Nạp tiền thành công' });
});
app.get('/api/transactions', auth, role('ketoan','admin'), (req, res) => {
  const tx = db.prepare(`SELECT p.*, o.code, u.full_name FROM payments p LEFT JOIN orders o ON p.order_id=o.id LEFT JOIN users u ON o.customer_id=u.id ORDER BY p.created_at DESC`).all();
  res.json(tx);
});
app.get('/api/reports/revenue', auth, role('ketoan','admin'), (req, res) => {
  const total = db.prepare("SELECT COALESCE(SUM(total),0) as revenue, COUNT(*) as orders FROM orders WHERE status IN ('paid','done','cooking')").get();
  const byDay = db.prepare("SELECT date(created_at) as day, SUM(total) as revenue, COUNT(*) as orders FROM orders GROUP BY date(created_at) ORDER BY day DESC LIMIT 7").all();
  res.json({ total, byDay });
});
app.get('/api/reports/summary', auth, role('admin'), (req, res) => {
  const users = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const orders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const revenue = db.prepare("SELECT COALESCE(SUM(total),0) as r FROM orders WHERE status IN ('paid','done','cooking')").get().r;
  const lowStock = db.prepare("SELECT COUNT(*) as c FROM ingredients WHERE status='low'").get().c;
  res.json({ users, orders, revenue, lowStock });
});

// ADMIN
app.get('/api/users', auth, role('admin'), (req, res) => {
  res.json(db.prepare('SELECT id,email,full_name,role,status FROM users ORDER BY id').all());
});
app.patch('/api/users/:id', auth, role('admin'), (req, res) => {
  const { role: newRole, status } = req.body;
  if (newRole) db.prepare('UPDATE users SET role=? WHERE id=?').run(newRole, req.params.id);
  if (status) db.prepare('UPDATE users SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ message: 'OK' });
});
app.get('/api/config', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM system_config').all();
  const cfg = {};
  rows.forEach(r => cfg[r.key] = r.value);
  res.json(cfg);
});
app.put('/api/config', auth, role('admin'), (req, res) => {
  const upsert = db.prepare('INSERT INTO system_config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=?');
  Object.entries(req.body).forEach(([k,v]) => upsert.run(k, v, v));
  res.json({ message: 'Đã lưu' });
});

// SHIFTS (simplified)
app.get('/api/shifts/schedule', auth, (req, res) => {
  // simple static schedule
  res.json({ shifts: [
    { key:'sang', label:'Ca sáng', time:'06:00–14:00' },
    { key:'chieu', label:'Ca chiều', time:'14:00–22:00' }
  ]});
});

// DISHES CRUD
app.post('/api/dishes', auth, role('bep','admin'), (req,res)=>{
  const {category_id,name,price,icon,status} = req.body;
  const r = db.prepare('INSERT INTO dishes(category_id,name,price,icon,status,rating) VALUES(?,?,?,?,?,0)').run(category_id,name,price,icon,status||'active');
  res.json({id:r.lastInsertRowid});
});
app.put('/api/dishes/:id', auth, role('bep','admin'), (req,res)=>{
  const {name,price,status} = req.body;
  db.prepare('UPDATE dishes SET name=COALESCE(?,name), price=COALESCE(?,price), status=COALESCE(?,status) WHERE id=?').run(name,price,status,req.params.id);
  res.json({message:'OK'});
});
app.delete('/api/dishes/:id', auth, role('bep','admin'), (req,res)=>{
  db.prepare('DELETE FROM dishes WHERE id=?').run(req.params.id);
  res.json({message:'OK'});
});

// SUPPLIERS
app.get('/api/suppliers', auth, role('kho','admin'), (req,res)=> res.json(db.prepare('SELECT * FROM suppliers').all()));
app.post('/api/suppliers', auth, role('kho','admin'), (req,res)=>{
  const {name,contact} = req.body;
  const r = db.prepare('INSERT INTO suppliers(name,contact,status) VALUES(?,?,?)').run(name,contact,'active');
  res.json({id:r.lastInsertRowid});
});

// PURCHASE ORDERS
app.get('/api/purchase-orders', auth, role('kho','admin'), (req,res)=>{
  const pos = db.prepare('SELECT po.*, s.name as supplier_name FROM purchase_orders po LEFT JOIN suppliers s ON po.supplier_id=s.id').all();
  pos.forEach(po=>{ po.lines = db.prepare('SELECT pol.*, i.name FROM purchase_order_lines pol LEFT JOIN ingredients i ON pol.ingredient_id=i.id WHERE pol.po_id=?').all(po.id); });
  res.json(pos);
});
app.post('/api/purchase-orders', auth, role('kho','admin'), (req,res)=>{
  const {supplier_id, lines} = req.body;
  const total = lines.reduce((s,l)=>s+l.quantity*l.unit_price,0);
  const r = db.prepare('INSERT INTO purchase_orders(supplier_id,status,total_amount) VALUES(?,?,?)').run(supplier_id,'pending',total);
  const ins = db.prepare('INSERT INTO purchase_order_lines(po_id,ingredient_id,quantity,unit_price) VALUES(?,?,?,?)');
  lines.forEach(l=>ins.run(r.lastInsertRowid,l.ingredient_id,l.quantity,l.unit_price));
  res.json({id:r.lastInsertRowid});
});
app.patch('/api/purchase-orders/:id/receive', auth, role('kho','admin'), (req,res)=>{
  const po = db.prepare('SELECT * FROM purchase_orders WHERE id=?').get(req.params.id);
  if (!po) return res.status(404).json({error:'Not found'});
  const lines = db.prepare('SELECT * FROM purchase_order_lines WHERE po_id=?').all(po.id);
  lines.forEach(l=>{
    db.prepare('UPDATE ingredients SET stock=stock+? WHERE id=?').run(l.quantity,l.ingredient_id);
    const ing = db.prepare('SELECT stock,min_stock FROM ingredients WHERE id=?').get(l.ingredient_id);
    db.prepare('UPDATE ingredients SET status=? WHERE id=?').run(ing.stock<ing.min_stock?'low':'ok',l.ingredient_id);
  });
  db.prepare("UPDATE purchase_orders SET status='received' WHERE id=?").run(po.id);
  res.json({message:'Đã nhận hàng'});
});

// TICKET PACKAGES & MONTHLY TICKETS
app.get('/api/ticket-packages', (req,res)=> res.json(db.prepare('SELECT * FROM ticket_packages').all()));
app.post('/api/tickets', auth, (req,res)=>{
  const {package_id} = req.body;
  const pkg = db.prepare('SELECT * FROM ticket_packages WHERE id=?').get(package_id);
  if (!pkg) return res.status(404).json({error:'Gói không tồn tại'});
  // check existing active
  const existing = db.prepare("SELECT * FROM monthly_tickets WHERE customer_id=? AND status='active' AND end_date>=date('now')").get(req.user.id);
  if (existing) return res.status(400).json({error:'Đang sử dụng vé chưa hết hạn'});
  // wallet check
  const w = db.prepare('SELECT balance FROM wallets WHERE user_id=?').get(req.user.id);
  if (!w || w.balance < pkg.price) return res.status(400).json({error:'Số dư không đủ'});
  db.prepare('UPDATE wallets SET balance=balance-? WHERE user_id=?').run(pkg.price,req.user.id);
  const start = new Date().toISOString().slice(0,10);
  const end = new Date(Date.now()+pkg.duration_days*86400000).toISOString().slice(0,10);
  const r = db.prepare('INSERT INTO monthly_tickets(customer_id,package_id,start_date,end_date,status) VALUES(?,?,?,?,?)').run(req.user.id,package_id,start,end,'active');
  res.json({id:r.lastInsertRowid,start,end});
});
app.get('/api/tickets', auth, (req,res)=>{
  const t = db.prepare('SELECT mt.*, tp.name,tp.price,tp.meal_count FROM monthly_tickets mt LEFT JOIN ticket_packages tp ON mt.package_id=tp.id WHERE mt.customer_id=?').all(req.user.id);
  res.json(t);
});

// REVIEWS
app.post('/api/reviews', auth, (req,res)=>{
  const {dish_id,order_id,rating,comment} = req.body;
  // ensure order completed
  const o = db.prepare('SELECT * FROM orders WHERE id=? AND customer_id=?').get(order_id,req.user.id);
  if (!o || o.status!=='done') return res.status(400).json({error:'Đơn chưa hoàn thành'});
  db.prepare('INSERT INTO reviews(customer_id,dish_id,order_id,rating,comment) VALUES(?,?,?,?,?)').run(req.user.id,dish_id,order_id,rating,comment);
  // update avg rating
  const avg = db.prepare('SELECT AVG(rating) as a FROM reviews WHERE dish_id=?').get(dish_id).a;
  db.prepare('UPDATE dishes SET rating=? WHERE id=?').run(avg,dish_id);
  res.json({message:'OK'});
});
app.get('/api/reviews/:dish_id', (req,res)=> res.json(db.prepare('SELECT r.*, u.full_name FROM reviews r LEFT JOIN users u ON r.customer_id=u.id WHERE r.dish_id=?').all(req.params.dish_id)));

// EXPENSES
app.get('/api/expenses', auth, role('ketoan','admin'), (req,res)=> res.json(db.prepare('SELECT * FROM expenses ORDER BY created_at DESC').all()));
app.post('/api/expenses', auth, role('ketoan','admin'), (req,res)=>{
  const {description,amount,category} = req.body;
  const r = db.prepare('INSERT INTO expenses(description,amount,category,created_by) VALUES(?,?,?,?)').run(description,amount,category,req.user.id);
  res.json({id:r.lastInsertRowid});
});

// RECONCILIATION
app.post('/api/reconciliation', auth, role('ketoan','admin'), (req,res)=>{
  const {period,system_total,actual_total} = req.body;
  const diff = system_total - actual_total;
  const r = db.prepare('INSERT INTO reconciliations(period,system_total,actual_total,diff,status) VALUES(?,?,?,?,?)').run(period,system_total,actual_total,diff, diff===0?'matched':'diff');
  res.json({id:r.lastInsertRowid,diff});
});
app.get('/api/reconciliation', auth, role('ketoan','admin'), (req,res)=> res.json(db.prepare('SELECT * FROM reconciliations ORDER BY created_at DESC').all()));

// FINANCIAL REPORT
app.get('/api/reports/financial', auth, role('ketoan','admin'), (req,res)=>{
  const revenue = db.prepare("SELECT COALESCE(SUM(total),0) as r FROM orders WHERE status IN ('paid','done','cooking')").get().r;
  const expenses = db.prepare('SELECT COALESCE(SUM(amount),0) as e FROM expenses').get().e;
  const waste = db.prepare('SELECT COALESCE(SUM(diff),0) as w FROM inventory_adjustments WHERE diff<0').get().w; // placeholder
  res.json({revenue, expenses, waste, profit: revenue - expenses });
});

// EMPLOYEES
app.get('/api/employees', auth, role('admin'), (req,res)=> res.json(db.prepare('SELECT * FROM employees').all()));
app.post('/api/employees', auth, role('admin'), (req,res)=>{
  const {full_name,phone,position,department,hire_date} = req.body;
  const r = db.prepare('INSERT INTO employees(full_name,phone,position,department,hire_date,status) VALUES(?,?,?,?,?,?)').run(full_name,phone,position,department,hire_date,'active');
  res.json({id:r.lastInsertRowid});
});

// SHIFTS
app.get('/api/shift-definitions', (req,res)=> res.json(db.prepare('SELECT * FROM shift_definitions').all()));
app.post('/api/shifts/register', auth, (req,res)=>{
  const {shift_id,work_date} = req.body;
  // find employee by user
  const emp = db.prepare('SELECT * FROM employees WHERE user_id=?').get(req.user.id);
  if (!emp) return res.status(400).json({error:'Không phải nhân viên'});
  const r = db.prepare('INSERT INTO shift_registrations(employee_id,shift_id,work_date,status) VALUES(?,?,?,?)').run(emp.id,shift_id,work_date,'registered');
  res.json({id:r.lastInsertRowid});
});
app.get('/api/shifts/schedule', auth, (req,res)=>{
  const week = req.query.week;
  const schedules = db.prepare('SELECT ss.*, e.full_name, sd.label, sd.start_time, sd.end_time FROM shift_schedules ss LEFT JOIN employees e ON ss.employee_id=e.id LEFT JOIN shift_definitions sd ON ss.shift_id=sd.id').all();
  res.json(schedules);
});
app.post('/api/shifts/swap', auth, (req,res)=>{
  const {schedule_id,target_id,reason} = req.body;
  const emp = db.prepare('SELECT * FROM employees WHERE user_id=?').get(req.user.id);
  const r = db.prepare('INSERT INTO shift_swap_requests(requester_id,target_id,schedule_id,reason,status) VALUES(?,?,?,?,?)').run(emp?emp.id:null,target_id,schedule_id,reason,'pending');
  res.json({id:r.lastInsertRowid});
});

// ATTENDANCE
app.post('/api/attendance/check-in', auth, (req,res)=>{
  const {schedule_id} = req.body;
  const emp = db.prepare('SELECT * FROM employees WHERE user_id=?').get(req.user.id);
  if (!emp) return res.status(400).json({error:'Không phải nhân viên'});
  const r = db.prepare('INSERT INTO attendance(employee_id,schedule_id,check_in,status) VALUES(?,?,?,?)').run(emp.id,schedule_id,new Date().toISOString(),'ontime');
  res.json({id:r.lastInsertRowid});
});
app.post('/api/attendance/check-out', auth, (req,res)=>{
  const {attendance_id} = req.body;
  db.prepare('UPDATE attendance SET check_out=? WHERE id=?').run(new Date().toISOString(),attendance_id);
  res.json({message:'OK'});
});
app.get('/api/attendance/history', auth, (req,res)=>{
  const emp = db.prepare('SELECT * FROM employees WHERE user_id=?').get(req.user.id);
  if (!emp) return res.json([]);
  res.json(db.prepare('SELECT * FROM attendance WHERE employee_id=? ORDER BY check_in DESC').all(emp.id));
});

// CANCEL ORDER with refund
app.patch('/api/orders/:id/cancel', auth, (req,res)=>{
  const o = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!o) return res.status(404).json({error:'Not found'});
  if (o.customer_id !== req.user.id && req.user.role!=='admin') return res.status(403).json({error:'Forbidden'});
  if (!['pending','paid'].includes(o.status)) return res.status(400).json({error:'Không thể hủy'});
  db.prepare("UPDATE orders SET status='cancelled' WHERE id=?").run(o.id);
  if (o.status==='paid') {
    db.prepare('UPDATE wallets SET balance=balance+? WHERE user_id=?').run(o.total,o.customer_id);
    db.prepare('INSERT INTO payments(order_id,type,amount,method,status) VALUES(?,?,?,?,?)').run(o.id,'refund',o.total,'Ví Canteen','success');
  }
  res.json({message:'Đã hủy'});
});

// ROLES
app.get('/api/roles', auth, role('admin'), (req,res)=> res.json(db.prepare('SELECT * FROM roles').all()));
app.post('/api/roles', auth, role('admin'), (req,res)=>{
  const {name,label} = req.body;
  const r = db.prepare('INSERT INTO roles(name,label) VALUES(?,?)').run(name,label);
  res.json({id:r.lastInsertRowid});
});

// AUDIT helper
function audit(actor,action,target_type,target_id,result){
  db.prepare('INSERT INTO audit_logs(actor_id,action,target_type,target_id,result) VALUES(?,?,?,?,?)').run(actor,action,target_type,target_id,result);
}

app.get('/api/ingredients/:id/transactions', auth, (req,res)=>{
  res.json(db.prepare('SELECT * FROM inventory_transactions WHERE ingredient_id=? ORDER BY created_at DESC').all(req.params.id));
});
app.get('/api/inventory/receipts/history', auth, role('kho','admin'), (req,res)=>{
  res.json(db.prepare("SELECT t.*, i.name as ingredient_name, i.unit FROM inventory_transactions t LEFT JOIN ingredients i ON t.ingredient_id=i.id WHERE t.type='receipt' ORDER BY t.created_at DESC").all());
});

app.use((req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = 3000;
app.listen(PORT, () => console.log('Server running at http://localhost:' + PORT));
