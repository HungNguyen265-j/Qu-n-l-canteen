// ============================================================
// data.js — Dữ liệu tĩnh của hệ thống căng tin
// Khi kết nối backend, thay các hằng số này bằng API calls
// ============================================================

const ROLES = {
  admin:    { label:'Quản trị viên', nav:['home','banhang','bep','lichsu','monan','kho','taichinh','baocao','calamviec','quantri'], avatar:'A' },
  customer: { label:'Khách hàng',    nav:['banhang','lichsu'], avatar:'K' },
  phucvu:   { label:'NV Phục vụ',    nav:['home','bep','lichsu'], avatar:'P' },
  bep:      { label:'NV Bếp',        nav:['home','bep','monan'], avatar:'B' },
  kho:      { label:'NV Kho',        nav:['home','kho'], avatar:'K' },
  ketoan:   { label:'NV Kế toán',    nav:['home','taichinh','baocao'], avatar:'T' },
};

const NAV_ITEMS = {
  home:       { label:'Tổng quan',       icon:'🏠' },
  banhang:    { label:'Bán hàng',        icon:'🛒' },
  bep:        { label:'Nhà bếp',         icon:'🍳' },
  lichsu:     { label:'Lịch sử đơn',     icon:'📋' },
  monan:      { label:'Quản lý món ăn',  icon:'🍜' },
  kho:        { label:'Kho nguyên liệu', icon:'📦' },
  taichinh:   { label:'Tài chính',       icon:'💰' },
  baocao:     { label:'Báo cáo',         icon:'📈' },
  calamviec:  { label:'Ca làm việc',     icon:'📅' },
  quantri:    { label:'Quản trị',        icon:'⚙️' },
  hoso:       { label:'Hồ sơ của tôi',  icon:'👤' },
};

// TODO: Thay bằng GET /api/menu
const MENU_DATA = [
  {id:1, name:'Bún bò Huế',      cat:'main',  price:35000, icon:'🍜', status:'active'},
  {id:2, name:'Cơm sườn nướng',  cat:'main',  price:30000, icon:'🍚', status:'active'},
  {id:3, name:'Phở bò',          cat:'main',  price:40000, icon:'🍲', status:'active'},
  {id:4, name:'Cơm gà',          cat:'main',  price:28000, icon:'🍗', status:'active'},
  {id:5, name:'Trà sữa Thái',    cat:'drink', price:20000, icon:'🧋', status:'active'},
  {id:6, name:'Sinh tố xoài',    cat:'drink', price:18000, icon:'🥭', status:'active'},
  {id:7, name:'Nước cam',        cat:'drink', price:15000, icon:'🍊', status:'active'},
  {id:8, name:'Bánh mì thịt',    cat:'snack', price:15000, icon:'🥖', status:'out'},
  {id:9, name:'Chè thái',        cat:'snack', price:15000, icon:'🍮', status:'active'},
  {id:10,name:'Xôi mặn',         cat:'snack', price:20000, icon:'🍙', status:'active'},
];

// TODO: Thay bằng GET /api/shifts
const SHIFTS = [
  { key:'sang',  label:'Ca sáng',  time:'06:00–14:00' },
  { key:'chieu', label:'Ca chiều', time:'14:00–22:00' },
  { key:'toi',   label:'Ca tối',   time:'22:00–06:00' },
];

// TODO: Thay bằng GET /api/schedule?week=...
// Key format: "dayOfWeek-shiftKey"  (dayOfWeek: 0=CN, 1=T2 ... 6=T7)
// st: 'done' | 'active' | 'pending' | 'absent'
const WEEK_DATA = {
  '1-sang':  [{name:'Trần Thị B',    pos:'Quầy phục vụ', st:'done'}, {name:'Lê Minh C',     pos:'Bếp chính',   st:'done'}],
  '1-chieu': [{name:'Phạm Thu D',    pos:'Quầy phục vụ', st:'done'}],
  '2-sang':  [{name:'Nguyễn Văn F',  pos:'Bếp chính',    st:'done'}],
  '2-chieu': [],
  '3-sang':  [],
  '3-chieu': [{name:'Vũ Anh E',      pos:'Kho',          st:'done'}],
  '4-sang':  [{name:'Trần Thị B',    pos:'Quầy phục vụ', st:'done'}],
  '4-chieu': [{name:'Lê Minh C',     pos:'Bếp chính',    st:'absent'}],
  '5-sang':  [{name:'Vũ Anh E',      pos:'Kho',          st:'active'}, {name:'Phạm Thu D', pos:'Quầy phục vụ', st:'active'}],
  '5-chieu': [],
  '6-sang':  [{name:'Nguyễn Văn A',  pos:'Quầy phục vụ', st:'pending'}],
  '6-chieu': [{name:'Nguyễn Văn F',  pos:'Bếp chính',    st:'pending'}],
  '0-sang':  [],
  '0-chieu': [{name:'Trần Thị B',    pos:'Quầy phục vụ', st:'pending'}],
};

const DOW_VI = ['CN','T2','T3','T4','T5','T6','T7'];
