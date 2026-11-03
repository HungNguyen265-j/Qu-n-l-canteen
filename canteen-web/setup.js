const db = require('./db');
const fs = require('fs');
const path = require('path');

const schema = `
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'active'
);
CREATE TABLE IF NOT EXISTS menu_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS dishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  icon TEXT,
  status TEXT DEFAULT 'active',
  rating REAL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  stock REAL DEFAULT 0,
  min_stock REAL DEFAULT 0,
  status TEXT DEFAULT 'ok'
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  customer_id INTEGER,
  total INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  pickup_slot TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  dish_id INTEGER,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER,
  type TEXT,
  amount INTEGER,
  method TEXT,
  status TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS wallets (
  user_id INTEGER PRIMARY KEY,
  balance INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

db.exec(schema);

// seed roles
const roles = [
  ['admin','Quản trị viên'],
  ['customer','Khách hàng'],
  ['phucvu','NV Phục vụ'],
  ['bep','NV Bếp'],
  ['kho','NV Kho'],
  ['ketoan','NV Kế toán']
];
const insRole = db.prepare('INSERT OR IGNORE INTO roles(name,label) VALUES(?,?)');
roles.forEach(r => insRole.run(...r));

// seed users
const bcrypt = require('bcryptjs');
const users = [
  ['admin@canteen.vn','123456','Admin Hệ thống','admin'],
  ['hai@phenikaa.edu.vn','123456','Nguyễn Đình Hải','customer'],
  ['bep@canteen.vn','123456','Trần Thị Bếp','bep'],
  ['kho@canteen.vn','123456','Nguyễn Văn Kho','kho'],
  ['ketoan@canteen.vn','123456','Lê Thị Kế Toán','ketoan'],
  ['phucvu@canteen.vn','123456','Phạm Phục Vụ','phucvu']
];
const insUser = db.prepare('INSERT OR IGNORE INTO users(email,password_hash,full_name,role) VALUES(?,?,?,?)');
users.forEach(([email,pass,name,role]) => {
  const hash = bcrypt.hashSync(pass, 10);
  insUser.run(email, hash, name, role);
});

// seed menu categories
const cats = ['Món chính','Đồ uống','Ăn vặt'];
const insCat = db.prepare('INSERT OR IGNORE INTO menu_categories(id,name) VALUES(?,?)');
cats.forEach((c,i) => insCat.run(i+1, c));

// seed dishes
const dishes = [
  [1,'Bún bò Huế',35000,'🍜','active',4.8],
  [1,'Cơm sườn nướng',30000,'🍚','active',4.6],
  [1,'Phở bò',40000,'🍲','active',4.7],
  [1,'Cơm gà',28000,'🍗','active',4.5],
  [2,'Trà sữa Thái',20000,'🧋','active',4.9],
  [2,'Sinh tố xoài',18000,'🥭','active',4.7],
  [2,'Nước cam',15000,'🍊','active',4.6],
  [3,'Bánh mì thịt',15000,'🥖','out',4.5],
  [3,'Chè thái',15000,'🍮','active',4.8],
  [3,'Xôi mặn',20000,'🍙','active',4.7]
];
const insDish = db.prepare('INSERT OR IGNORE INTO dishes(category_id,name,price,icon,status,rating) VALUES(?,?,?,?,?,?)');
dishes.forEach(d => insDish.run(...d));

// seed ingredients
const ings = [
  ['NL001','Gạo tẻ','kg',5,20,'low'],
  ['NL002','Thịt bò','kg',1.5,10,'low'],
  ['NL003','Bún tươi','kg',15,5,'ok'],
  ['NL004','Dầu ăn','lít',3,10,'low'],
  ['NL005','Muối','kg',8,2,'ok'],
  ['NL006','Hành tây','kg',12,3,'ok']
];
const insIng = db.prepare('INSERT OR IGNORE INTO ingredients(code,name,unit,stock,min_stock,status) VALUES(?,?,?,?,?,?)');
ings.forEach(i => insIng.run(...i));

// seed wallets
const insWallet = db.prepare('INSERT OR IGNORE INTO wallets(user_id,balance) VALUES(?,?)');
[2].forEach(uid => insWallet.run(uid, 150000));

// seed config
const insCfg = db.prepare('INSERT OR IGNORE INTO system_config(key,value) VALUES(?,?)');
[
  ['site_name','Căng Tin Phenikaa'],
  ['address','Hà Đông, Hà Nội'],
  ['open_hours','06:30 - 21:00'],
  ['min_topup','20000'],
  ['expiry_warning_days','7'],
  ['auto_print','true']
].forEach(([k,v]) => insCfg.run(k,v));

// seed orders
const insOrder = db.prepare('INSERT OR IGNORE INTO orders(id,code,customer_id,total,status,payment_method,pickup_slot) VALUES(?,?,?,?,?,?,?)');
const insItem = db.prepare('INSERT OR IGNORE INTO order_items(order_id,dish_id,quantity,unit_price) VALUES(?,?,?,?)');
const sampleOrders = [
  [1,'#DH001',2,65000,'cooking','Ví Canteen','11:00 - 11:30'],
  [2,'#DH002',2,75000,'done','QR Bank','11:00 - 11:30'],
  [3,'#DH003',2,95000,'pending','Ví Canteen','11:00 - 11:30']
];
sampleOrders.forEach(o => {
  insOrder.run(...o);
});
insItem.run(1,1,1,35000);
insItem.run(1,9,1,15000);
insItem.run(1,5,1,20000); // adjust not exact but ok
insItem.run(2,4,1,28000);
insItem.run(2,6,1,18000);
insItem.run(3,1,1,35000);
insItem.run(3,5,2,20000);

// additional tables
db.exec(`
CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, contact TEXT, status TEXT DEFAULT 'active');
CREATE TABLE IF NOT EXISTS purchase_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, supplier_id INTEGER, status TEXT DEFAULT 'pending', total_amount REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS purchase_order_lines (id INTEGER PRIMARY KEY AUTOINCREMENT, po_id INTEGER, ingredient_id INTEGER, quantity REAL, unit_price REAL);
CREATE TABLE IF NOT EXISTS inventory_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, ingredient_id INTEGER, type TEXT, quantity REAL, reason TEXT, performed_by INTEGER, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS inventory_adjustments (id INTEGER PRIMARY KEY AUTOINCREMENT, ingredient_id INTEGER, diff REAL, reason TEXT, approved_by INTEGER, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS stocktakes (id INTEGER PRIMARY KEY AUTOINCREMENT, ingredient_id INTEGER, system_qty REAL, actual_qty REAL, diff REAL, reason TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS ticket_packages (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price INTEGER, meal_count INTEGER, duration_days INTEGER);
CREATE TABLE IF NOT EXISTS monthly_tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, package_id INTEGER, start_date TEXT, end_date TEXT, status TEXT DEFAULT 'active');
CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_id INTEGER, dish_id INTEGER, order_id INTEGER, rating INTEGER, comment TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT, amount REAL, category TEXT, created_by INTEGER, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS reconciliations (id INTEGER PRIMARY KEY AUTOINCREMENT, period TEXT, system_total REAL, actual_total REAL, diff REAL, status TEXT DEFAULT 'open', created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, full_name TEXT, phone TEXT, position TEXT, department TEXT, hire_date TEXT, status TEXT DEFAULT 'active');
CREATE TABLE IF NOT EXISTS shift_definitions (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT, label TEXT, start_time TEXT, end_time TEXT);
CREATE TABLE IF NOT EXISTS shift_registrations (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER, shift_id INTEGER, work_date TEXT, status TEXT DEFAULT 'registered');
CREATE TABLE IF NOT EXISTS shift_schedules (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER, shift_id INTEGER, work_date TEXT, status TEXT DEFAULT 'assigned');
CREATE TABLE IF NOT EXISTS shift_swap_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, requester_id INTEGER, target_id INTEGER, schedule_id INTEGER, reason TEXT, status TEXT DEFAULT 'pending');
CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER, schedule_id INTEGER, check_in TEXT, check_out TEXT, status TEXT DEFAULT 'ontime');
CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id INTEGER, action TEXT, target_type TEXT, target_id INTEGER, result TEXT, created_at TEXT DEFAULT (datetime('now')));
`);
// seed suppliers, packages, shifts
db.prepare('INSERT OR IGNORE INTO suppliers(id,name,contact,status) VALUES(?,?,?,?)').run(1,'Công ty ABC','0901234567','active');
db.prepare('INSERT OR IGNORE INTO ticket_packages(id,name,price,meal_count,duration_days) VALUES(?,?,?,?,?)').run(1,'Gói cơ bản',500000,20,30);
db.prepare('INSERT OR IGNORE INTO ticket_packages(id,name,price,meal_count,duration_days) VALUES(?,?,?,?,?)').run(2,'Gói cao cấp',800000,30,30);
db.prepare('INSERT OR IGNORE INTO shift_definitions(id,key,label,start_time,end_time) VALUES(?,?,?,?,?)').run(1,'sang','Ca sáng','06:00','14:00');
db.prepare('INSERT OR IGNORE INTO shift_definitions(id,key,label,start_time,end_time) VALUES(?,?,?,?,?)').run(2,'chieu','Ca chiều','14:00','22:00');
db.prepare('INSERT OR IGNORE INTO shift_definitions(id,key,label,start_time,end_time) VALUES(?,?,?,?,?)').run(3,'toi','Ca tối','22:00','06:00');
// seed demo inventory transactions
const insTx = db.prepare('INSERT INTO inventory_transactions(ingredient_id,type,quantity,reason,performed_by) VALUES(?,?,?,?,?)');
insTx.run(1,'receipt',50,'Nhập kho lô tháng 11',1);
insTx.run(1,'issue',45,'Xuất kho chế biến',1);
insTx.run(2,'receipt',20,'Nhập kho',1);
insTx.run(2,'issue',18.5,'Xuất kho chế biến',1);
insTx.run(4,'receipt',10,'Nhập kho',1);
insTx.run(4,'issue',7,'Xuất kho chế biến',1);
// seed shift schedules for current week (employee 1,2,3)
const today = new Date();
const monday = new Date(today); monday.setDate(today.getDate() - (today.getDay()===0?6:today.getDay()-1));
for (let i=0;i<7;i++){
  const d = new Date(monday); d.setDate(monday.getDate()+i);
  const ds = d.toISOString().slice(0,10);
  db.prepare('INSERT OR IGNORE INTO shift_schedules(employee_id,shift_id,work_date,status) VALUES(?,?,?,?)').run(1,1,ds,'assigned');
  if (i%2===0) db.prepare('INSERT OR IGNORE INTO shift_schedules(employee_id,shift_id,work_date,status) VALUES(?,?,?,?)').run(2,2,ds,'assigned');
}
// seed employees
db.prepare('INSERT OR IGNORE INTO employees(id,user_id,full_name,phone,position,department,hire_date,status) VALUES(?,?,?,?,?,?,?,?)').run(1,1,'Admin Hệ thống','0900000001','Quản trị','Quản trị','2026-01-01','active');
db.prepare('INSERT OR IGNORE INTO employees(id,user_id,full_name,phone,position,department,hire_date,status) VALUES(?,?,?,?,?,?,?,?)').run(2,3,'Trần Thị Bếp','0900000002','NV Bếp','Bếp','2026-01-01','active');
db.prepare('INSERT OR IGNORE INTO employees(id,user_id,full_name,phone,position,department,hire_date,status) VALUES(?,?,?,?,?,?,?,?)').run(3,5,'Lê Thị Kế Toán','0900000003','NV Kế toán','Kế toán','2026-01-01','active');
// seed attendance demo
db.prepare('INSERT OR IGNORE INTO attendance(employee_id,schedule_id,check_in,check_out,status) VALUES(?,?,?,?,?)').run(1,1,'2026-11-01T06:02:00','2026-11-01T14:05:00','ontime');
db.prepare('INSERT OR IGNORE INTO attendance(employee_id,schedule_id,check_in,check_out,status) VALUES(?,?,?,?,?)').run(2,2,'2026-11-01T06:00:00','2026-11-01T14:00:00','ontime');
console.log('Setup complete');
