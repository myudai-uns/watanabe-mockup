/* =====================================================
 * 渡辺謄写堂 業務管理システム v0.2 Functional Mockup
 * localStorage ベース / 単一ファイルアプリ
 * ===================================================== */

// ========= Constants =========
const INK_PATTERNS = [
  { value: '4Cx4C',      label: 'カラー両面（4C×4C）',     mult: 1.00 },
  { value: '4Cx0',       label: 'カラー片面（4C×0）',      mult: 0.65 },
  { value: '1Cx1C',      label: 'モノクロ両面（1C×1C）',   mult: 0.45 },
  { value: '1Cx0',       label: 'モノクロ片面（1C×0）',    mult: 0.30 },
  { value: 'tokushoku_2m', label: '特色1色両面',            mult: 0.55 },
  { value: 'tokushoku_1m', label: '特色1色片面',            mult: 0.38 },
];
const ORDER_STATUSES    = ['受注','製版中','印刷中','完成','納品済','キャンセル'];
const FACTORY_STATUSES  = ['待機','作業中','完成','出荷待ち'];
const AREAS             = ['亀谷','元町','東和','岩代','市街','その他'];
const RECEPTION_METHODS = ['電話','来客','FAX','メール','LINE','その他'];
const DELIVERY_TYPES    = [
  { value: 'single', label: '指定日' },
  { value: 'range',  label: '期間' },
  { value: 'asap',   label: '出次第' },
];
const FOLDING_TYPES    = ['なし','2つ折','3つ折'];
const HOLE_POSITIONS   = ['なし','天2ケ','左2ケ'];
const PRINT_DIRECTIONS = ['天乗','左乗'];
const SEND_METHODS     = ['郵送','メール','LINE','直接手渡し'];
const PROCESSING_PRICE = { mishin: 500, folding: 800, hole: 300, numbering: 1500, yacho: 1200, lamination: 2000 };

// ========= Seed Data =========
const TODAY = '2026-04-24';
const SEED_DATA = {
  users: [
    { id: 'u1', name: '渡辺 修一', role: 'A_統括',  email: 'watanabe@toshado.jp' },
    { id: 'u2', name: '佐藤 健',   role: 'B_製版',  email: 'sato@toshado.jp' },
    { id: 'u3', name: '田中 次郎', role: 'C_工場',  email: 'tanaka@toshado.jp' },
    { id: 'u4', name: '渡辺 美佐子', role: '経理',  email: 'mom@toshado.jp' },
  ],
  customers: [
    { id: 'c1',  company_name: '株式会社 高拡散',       customer_type: 'お得意様', area: '亀谷', phone: '0243-55-0001', address: '二本松市亀谷1-2-3',    notes: '月次発注あり。前回と同仕様リピート多し' },
    { id: 'c2',  company_name: '昭和タクシー株式会社', customer_type: 'お得意様', area: '市街', phone: '0243-55-0002', address: '二本松市本町5-1',      notes: '' },
    { id: 'c3',  company_name: '佐々木畳店',            customer_type: '地域',     area: '亀谷', phone: '0243-55-0003', address: '二本松市亀谷3-4-5',    notes: '' },
    { id: 'c4',  company_name: '福島県立 足立高等学校', customer_type: '地域',     area: '東和', phone: '0243-55-0004', address: '二本松市東和町8',      notes: '年度末の手引き大量発注あり' },
    { id: 'c5',  company_name: 'ワンワールド株式会社', customer_type: 'お得意様', area: '市街', phone: '0243-55-0005', address: '二本松市本町2-1',      notes: '' },
    { id: 'c6',  company_name: '郡山建設',              customer_type: '地域',     area: '市街', phone: '024-55-0006',  address: '郡山市駅前1-1',        notes: '' },
    { id: 'c7',  company_name: '福島中央病院',          customer_type: '地域',     area: '岩代', phone: '0243-55-0007', address: '二本松市岩代町10',     notes: '医療用フォーマット' },
    { id: 'c8',  company_name: '二本松市役所 元町支所', customer_type: 'お得意様', area: '元町', phone: '0243-55-0008', address: '二本松市元町15',       notes: '' },
    { id: 'c9',  individual_name: '山田 太郎',          customer_type: '地域',     area: '東和', phone: '090-1234-5678',address: '',                     notes: '個人名刺リピーター' },
    { id: 'c10', company_name: 'みやざき食堂',          customer_type: '地域',     area: '東和', phone: '0243-55-0010', address: '',                     notes: 'メニュー表も依頼あり' },
  ],
  papers: [
    { id: 'p1',  paper_name: 'コート135kg 白 A4',         quality: 'コート',   color: '白',     thickness_kg: 135, paper_size: 'A4',   unit_price: 30, is_major: true },
    { id: 'p2',  paper_name: 'コート135kg 白 B4',         quality: 'コート',   color: '白',     thickness_kg: 135, paper_size: 'B4',   unit_price: 45, is_major: true },
    { id: 'p3',  paper_name: '上質90kg 白 A4',            quality: '上質',     color: '白',     thickness_kg: 90,  paper_size: 'A4',   unit_price: 15, is_major: true },
    { id: 'p4',  paper_name: '上質90kg 白 B5',            quality: '上質',     color: '白',     thickness_kg: 90,  paper_size: 'B5',   unit_price: 10, is_major: true },
    { id: 'p5',  paper_name: 'フミス200kg 白 名刺',       quality: 'フミス',   color: '白',     thickness_kg: 200, paper_size: '名刺', unit_price: 10, is_major: true },
    { id: 'p6',  paper_name: 'フミス200kg クリーム 名刺', quality: 'フミス',   color: 'クリーム', thickness_kg: 200, paper_size: '名刺', unit_price: 12, is_major: true },
    { id: 'p7',  paper_name: 'NT書籍80kg 白 A4',          quality: 'NT書籍',   color: '白',     thickness_kg: 80,  paper_size: 'A4',   unit_price: 12, is_major: false },
    { id: 'p8',  paper_name: '色上質厚口 青 A4',          quality: '色上質',   color: '青',     thickness_kg: 90,  paper_size: 'A4',   unit_price: 20, is_major: false },
    { id: 'p9',  paper_name: 'クラフト紙 茶 A4',          quality: 'クラフト', color: '茶',     thickness_kg: 100, paper_size: 'A4',   unit_price: 18, is_major: false },
    { id: 'p10', paper_name: '再生紙 白 A4',              quality: '再生紙',   color: '白',     thickness_kg: 80,  paper_size: 'A4',   unit_price: 10, is_major: false },
  ],
  orders: [],       // 後述で生成
  quotes: [],
  factory_records: [],
  change_logs: [],
};

// ========= Seed Orders (20件) =========
function buildSeedOrders() {
  const mk = (o) => ({
    id: 'o_' + o.order_number,
    order_number: o.order_number,
    customer_id: o.customer_id,
    received_date: o.received_date,
    received_by_id: o.received_by_id || 'u1',
    reception_method: o.reception_method || '電話',
    delivery_type: o.delivery_type || 'single',
    delivery_date_start: o.delivery_date_start,
    delivery_date_end: o.delivery_date_end || null,
    status: o.status,
    memo: o.memo || '',
    total_amount: o.total_amount,
    created_by_id: 'u1',
    created_at: o.received_date + 'T09:00:00',
    updated_at: o.received_date + 'T09:00:00',
    items: o.items,
  });
  const it = (paper_id, qty, ink, opts = {}) => ({
    id: 'it_' + Math.random().toString(36).slice(2, 8),
    paper_id,
    paper_other_memo: opts.paper_other_memo || '',
    quantity: qty,
    ink_pattern: ink,
    folding: opts.folding || 'なし',
    mishin_count: opts.mishin_count || 0,
    hole_position: opts.hole_position || 'なし',
    print_direction: opts.print_direction || '天乗',
    numbering_enabled: !!opts.numbering_enabled,
    numbering_from: opts.numbering_from || null,
    numbering_to: opts.numbering_to || null,
    yacho_style: !!opts.yacho_style,
    lamination: !!opts.lamination,
    unit_price: opts.unit_price || null,
    subtotal: opts.subtotal || null,
    item_notes: opts.item_notes || '',
  });
  const orders = [
    // 今日 (4/24) - active
    { order_number: '260424-001', customer_id: 'c1', received_date: '2026-04-24', delivery_date_start: '2026-04-24', status: '印刷中', total_amount: 5500, memo: '前回と同仕様', items: [ it('p5', 500, '4Cx4C', { subtotal: 5000 }) ] },
    { order_number: '260424-002', customer_id: 'c6', received_date: '2026-04-24', delivery_date_start: '2026-05-10', status: '受注', total_amount: 18800, items: [ it('p9', 1000, '1Cx0', { subtotal: 18000 }) ] },
    { order_number: '260424-003', customer_id: 'c5', received_date: '2026-04-24', delivery_date_start: '2026-04-25', status: '受注', total_amount: 3300, items: [ it('p6', 300, '4Cx4C', { subtotal: 3000 }) ] },
    // 昨日 (4/23)
    { order_number: '260423-007', customer_id: 'c2', received_date: '2026-04-23', delivery_date_start: '2026-04-24', status: '印刷中', total_amount: 38200, items: [ it('p1', 2000, '4Cx4C', { subtotal: 35000 }) ] },
    { order_number: '260423-005', customer_id: 'c4', received_date: '2026-04-23', delivery_date_start: '2026-05-15', status: '製版中', total_amount: 128000, memo: '手引き製本', items: [ it('p4', 1000, '1Cx1C', { subtotal: 120000, folding: '2つ折' }) ] },
    { order_number: '260423-009', customer_id: 'c7', received_date: '2026-04-23', delivery_date_start: '2026-04-30', status: '受注', total_amount: 8800, items: [ it('p3', 500, '4Cx4C', { subtotal: 8000 }) ] },
    // 一昨日 (4/22)
    { order_number: '260422-012', customer_id: 'c3', received_date: '2026-04-22', delivery_date_start: '2026-04-24', status: '完成', total_amount: 14800, items: [ it('p10', 1000, '1Cx0', { subtotal: 14000 }) ] },
    { order_number: '260422-008', customer_id: 'c7', received_date: '2026-04-22', delivery_date_start: '2026-04-24', status: '完成', total_amount: 7700, items: [ it('p1', 500, '4Cx4C', { subtotal: 7000 }) ] },
    // 4/21
    { order_number: '260421-003', customer_id: 'c4', received_date: '2026-04-21', delivery_date_start: '2026-05-10', status: '製版中', total_amount: 132000, items: [ it('p4', 1000, '1Cx1C', { subtotal: 120000 }) ] },
    // 納品済み
    { order_number: '260420-005', customer_id: 'c5', received_date: '2026-04-20', delivery_date_start: '2026-04-22', delivery_type: 'asap', status: '納品済', total_amount: 4620, items: [ it('p5', 500, '4Cx4C', { subtotal: 4200 }) ] },
    { order_number: '260418-002', customer_id: 'c1', received_date: '2026-04-18', delivery_date_start: '2026-04-22', status: '納品済', total_amount: 22000, items: [ it('p1', 500, '4Cx4C', { subtotal: 20000 }) ] },
    { order_number: '260415-001', customer_id: 'c2', received_date: '2026-04-15', delivery_date_start: '2026-04-18', status: '納品済', total_amount: 11000, items: [ it('p5', 1000, '4Cx4C', { subtotal: 10000 }) ] },
    { order_number: '260412-004', customer_id: 'c6', received_date: '2026-04-12', delivery_date_start: '2026-04-15', status: '納品済', total_amount: 9900, items: [ it('p9', 500, '1Cx0', { subtotal: 9000 }) ] },
    { order_number: '260410-001', customer_id: 'c8', received_date: '2026-04-10', delivery_date_start: '2026-04-15', status: '納品済', total_amount: 88000, items: [ it('p1', 2000, '4Cx4C', { subtotal: 80000, folding: '3つ折' }) ] },
    { order_number: '260402-006', customer_id: 'c10', received_date: '2026-04-02', delivery_date_start: '2026-04-08', status: '納品済', total_amount: 16500, items: [ it('p1', 500, '4Cx4C', { subtotal: 15000 }) ] },
    // 前月以前
    { order_number: '260315-002', customer_id: 'c1', received_date: '2026-03-15', delivery_date_start: '2026-03-18', status: '納品済', total_amount: 5500, items: [ it('p5', 500, '4Cx4C', { subtotal: 5000 }) ] },
    { order_number: '260215-008', customer_id: 'c2', received_date: '2026-02-15', delivery_date_start: '2026-02-20', status: '納品済', total_amount: 42000, items: [ it('p1', 2000, '4Cx4C', { subtotal: 38000 }) ] },
    { order_number: '251215-008', customer_id: 'c1', received_date: '2025-12-15', delivery_date_start: '2025-12-20', status: '納品済', total_amount: 5500, items: [ it('p5', 500, '4Cx4C', { subtotal: 5000 }) ] },
    { order_number: '251115-003', customer_id: 'c1', received_date: '2025-11-15', delivery_date_start: '2025-11-20', status: '納品済', total_amount: 5500, items: [ it('p5', 500, '4Cx4C', { subtotal: 5000 }) ] },
    { order_number: '250603-008', customer_id: 'c1', received_date: '2025-06-03', delivery_date_start: '2025-06-10', status: '納品済', total_amount: 38200, items: [ it('p1', 2000, '4Cx4C', { subtotal: 35000 }) ] },
    { order_number: '250211-002', customer_id: 'c1', received_date: '2025-02-11', delivery_date_start: '2025-02-18', status: '納品済', total_amount: 14800, items: [ it('p9', 1000, '1Cx0', { subtotal: 14000 }) ] },
  ];
  return orders.map(mk);
}
SEED_DATA.orders = buildSeedOrders();

// factory_records for active orders
SEED_DATA.factory_records = SEED_DATA.orders
  .filter(o => ['受注','製版中','印刷中','完成'].includes(o.status))
  .map(o => ({
    id: 'fr_' + o.id,
    order_id: o.id,
    factory_status: o.status === '完成' ? '完成' : o.status === '印刷中' ? '作業中' : o.status === '製版中' ? '作業中' : '待機',
    started_at: o.status !== '受注' ? o.received_date + 'T10:00:00' : null,
    completed_at: o.status === '完成' ? o.received_date + 'T14:00:00' : null,
    actual_quantity: null,
    factory_memo: '',
    completed_by_id: 'u3',
  }));

// sample quotes for a few orders
SEED_DATA.quotes = [
  { id: 'q_001', quote_number: 'Q-260424-001', order_id: 'o_260424-001', issued_date: '2026-04-24', valid_until: '2026-05-31', total_amount: 5500, send_method: 'メール', status: '発行済', memo: 'お振込先：二本松信金 本店 普通 1234567 ワタナベトウシャドウ' },
];

// ========= DB Layer =========
const DB = {
  KEY: 'watanabe_db_v1',
  data: null,
  load() {
    const raw = localStorage.getItem(this.KEY);
    if (raw) {
      try { this.data = JSON.parse(raw); }
      catch(e) { console.error(e); this.data = clone(SEED_DATA); this.save(); }
    } else {
      this.data = clone(SEED_DATA);
      this.save();
    }
    return this.data;
  },
  save() { localStorage.setItem(this.KEY, JSON.stringify(this.data)); },
  reset() { this.data = clone(SEED_DATA); this.save(); },
  all(table) { return this.data[table] || []; },
  find(table, id) { return this.all(table).find(x => x.id === id); },
  nextId(prefix) { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); },
  nextOrderNumber() {
    const prefix = TODAY.slice(2).replace(/-/g, '');
    const same = this.data.orders.filter(o => o.order_number && o.order_number.startsWith(prefix));
    return `${prefix}-${String(same.length + 1).padStart(3, '0')}`;
  },
  nextQuoteNumber() {
    const prefix = 'Q-' + TODAY.slice(2).replace(/-/g, '');
    const same = this.data.quotes.filter(q => q.quote_number && q.quote_number.startsWith(prefix));
    return `${prefix}-${String(same.length + 1).padStart(3, '0')}`;
  },
  log(target_type, target_id, summary) {
    this.data.change_logs.push({
      id: this.nextId('cl'),
      target_type, target_id,
      changed_by_id: App.currentUserId,
      changed_at: new Date().toISOString(),
      change_summary: summary,
    });
  },
  // Orders
  createOrder(form) {
    const id = this.nextId('o');
    const order = {
      id,
      order_number: this.nextOrderNumber(),
      status: '受注',
      created_by_id: App.currentUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...form,
    };
    this.data.orders.push(order);
    // factory record
    this.data.factory_records.push({
      id: this.nextId('fr'),
      order_id: id,
      factory_status: '待機',
      started_at: null, completed_at: null, actual_quantity: null,
      factory_memo: '', completed_by_id: null,
    });
    this.log('Order', id, `新規起票 (${order.order_number})`);
    this.save();
    return order;
  },
  updateOrder(id, patch, logMsg) {
    const o = this.find('orders', id);
    if (!o) return null;
    Object.assign(o, patch, { updated_at: new Date().toISOString() });
    this.log('Order', id, logMsg || '更新');
    this.save();
    return o;
  },
  deleteOrder(id) {
    this.data.orders = this.data.orders.filter(o => o.id !== id);
    this.data.factory_records = this.data.factory_records.filter(f => f.order_id !== id);
    this.data.quotes = this.data.quotes.filter(q => q.order_id !== id);
    this.log('Order', id, '削除');
    this.save();
  },
  // Customer
  createCustomer(form) {
    const c = { id: this.nextId('c'), ...form };
    this.data.customers.push(c);
    this.log('Customer', c.id, `新規顧客登録 (${c.company_name || c.individual_name})`);
    this.save();
    return c;
  },
  updateCustomer(id, patch) {
    const c = this.find('customers', id);
    if (!c) return null;
    Object.assign(c, patch);
    this.log('Customer', id, '更新');
    this.save();
    return c;
  },
  // Quote
  createQuote(order_id) {
    const order = this.find('orders', order_id);
    if (!order) return null;
    const existing = this.data.quotes.find(q => q.order_id === order_id);
    if (existing) return existing;
    const q = {
      id: this.nextId('q'),
      quote_number: this.nextQuoteNumber(),
      order_id,
      issued_date: TODAY,
      valid_until: addMonths(TODAY, 1),
      total_amount: order.total_amount,
      send_method: 'メール',
      status: '作成中',
      memo: 'お振込先：二本松信金 本店 普通 1234567 ワタナベトウシャドウ',
    };
    this.data.quotes.push(q);
    this.log('Quote', q.id, `見積書作成 (${q.quote_number})`);
    this.save();
    return q;
  },
  updateQuote(id, patch) {
    const q = this.find('quotes', id);
    if (!q) return null;
    Object.assign(q, patch);
    this.log('Quote', id, '更新');
    this.save();
    return q;
  },
  // Factory record
  updateFactoryRecord(order_id, patch) {
    const fr = this.data.factory_records.find(f => f.order_id === order_id);
    if (!fr) return null;
    Object.assign(fr, patch);
    this.save();
    return fr;
  },
  findFactoryRecord(order_id) {
    return this.data.factory_records.find(f => f.order_id === order_id);
  },
};

// ========= Helpers =========
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function addMonths(iso, n) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}
function dayDiff(iso1, iso2) {
  return Math.floor((new Date(iso1) - new Date(iso2)) / 86400000);
}
function todayISO() { return TODAY; }
const fmt = {
  money(n) { return '¥' + (n || 0).toLocaleString(); },
  date(iso) { if (!iso) return '—'; const d = new Date(iso); return `${d.getMonth()+1}/${d.getDate()}`; },
  dateFull(iso) { if (!iso) return '—'; return iso.slice(0, 10); },
  dateJp(iso) { if (!iso) return '—'; const d = new Date(iso); const w = ['日','月','火','水','木','金','土'][d.getDay()]; return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${w}）`; },
  dateTime(iso) { if (!iso) return '—'; const d = new Date(iso); return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; },
  customer(id) { const c = DB.find('customers', id); if (!c) return '—'; return c.company_name || c.individual_name || '—'; },
  paper(id) { const p = DB.find('papers', id); return p ? p.paper_name : '—'; },
  ink(code) { return INK_PATTERNS.find(p => p.value === code)?.label || code; },
  user(id) { const u = DB.find('users', id); return u ? u.name : '—'; },
  delivery(o) {
    if (o.delivery_type === 'asap') return '出次第';
    if (o.delivery_type === 'range') return `${fmt.date(o.delivery_date_start)}〜${fmt.date(o.delivery_date_end)}`;
    return fmt.date(o.delivery_date_start);
  },
};

function calcItemPrice(item) {
  const paper = DB.find('papers', item.paper_id);
  if (!paper) return { unit_price: 0, subtotal: 0 };
  const ink = INK_PATTERNS.find(p => p.value === item.ink_pattern) || INK_PATTERNS[0];
  const base = paper.unit_price * ink.mult;
  let extra = 0;
  if (item.mishin_count > 0) extra += PROCESSING_PRICE.mishin * item.mishin_count;
  if (item.folding && item.folding !== 'なし') extra += PROCESSING_PRICE.folding;
  if (item.hole_position && item.hole_position !== 'なし') extra += PROCESSING_PRICE.hole;
  if (item.numbering_enabled) extra += PROCESSING_PRICE.numbering;
  if (item.yacho_style) extra += PROCESSING_PRICE.yacho;
  if (item.lamination) extra += PROCESSING_PRICE.lamination;
  const unit_price = Math.round(base);
  const subtotal = Math.round(base * item.quantity + extra);
  return { unit_price, subtotal };
}
function calcOrderTotal(items) {
  return items.reduce((sum, it) => sum + (calcItemPrice(it).subtotal), 0);
}

// ========= Toast =========
function toast(msg, type = '') {
  const root = $('#toast');
  const el = document.createElement('div');
  el.className = 'toast-item ' + type;
  el.textContent = msg;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2500);
}

// ========= Modal =========
function openModal(html, bindFn) {
  const root = $('#modal-root');
  root.innerHTML = `
    <div class="fixed inset-0 bg-black/50 z-[90] flex items-center justify-center p-4" id="modal-backdrop">
      <div class="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-auto" id="modal-box">
        ${html}
      </div>
    </div>`;
  $('#modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });
  bindFn?.();
}
function closeModal() { $('#modal-root').innerHTML = ''; }

// ========= Router =========
const Router = {
  init() {
    window.addEventListener('hashchange', () => this.route());
    if (!location.hash) location.hash = '#dashboard';
    else this.route();
  },
  route() {
    const hash = location.hash.slice(1) || 'dashboard';
    const [screen, ...params] = hash.split('/');
    this.currentScreen = screen;
    this.params = params;
    App.render();
  },
};

// ========= App =========
const App = {
  currentUserId: 'u1',
  render() {
    // Highlight nav
    $$('[data-screen]').forEach(b => {
      b.classList.toggle('active', b.dataset.screen === Router.currentScreen || (Router.currentScreen === 'order' && b.dataset.screen === 'orders') || (Router.currentScreen === 'customer' && b.dataset.screen === 'customers'));
    });
    $$('.side-link').forEach(l => {
      const match = l.dataset.screen === Router.currentScreen ||
                    (Router.currentScreen === 'order' && l.dataset.screen === 'orders') ||
                    (Router.currentScreen === 'customer' && l.dataset.screen === 'customers');
      l.classList.toggle('bg-brand/10', match);
      l.classList.toggle('text-brand', match);
      l.classList.toggle('font-bold', match || l.dataset.screen === 'order_new');
    });
    // Render screen
    const main = $('#main');
    const screen = Screens[Router.currentScreen];
    if (!screen) { main.innerHTML = `<div class="text-center py-16 text-ink-500">画面が見つかりません: ${Router.currentScreen}</div>`; return; }
    main.innerHTML = screen.render(...(Router.params || []));
    screen.bind?.(...(Router.params || []));
    // Update stat
    $('#stat-info').textContent = `受注 ${DB.all('orders').length}件 / 顧客 ${DB.all('customers').length}件`;
    // scroll to top
    window.scrollTo({ top: 0 });
  },
};

// ========= Screens =========
const Screens = {};

// ---------- Dashboard ----------
Screens.dashboard = {
  render() {
    const orders = DB.all('orders');
    const today = TODAY;
    const todayDue = orders.filter(o => o.delivery_date_start === today && o.status !== '納品済' && o.status !== 'キャンセル');
    const inProgress = orders.filter(o => ['受注','製版中','印刷中'].includes(o.status));
    const urgent = orders.filter(o => o.status !== '納品済' && o.status !== 'キャンセル' && o.delivery_date_start && dayDiff(o.delivery_date_start, today) <= 3 && dayDiff(o.delivery_date_start, today) >= 0);
    const thisMonth = orders.filter(o => o.received_date && o.received_date.slice(0,7) === today.slice(0,7));
    const monthSales = thisMonth.reduce((s,o) => s + (o.total_amount || 0), 0);
    const recentLogs = [...DB.all('change_logs')].sort((a,b) => (b.changed_at || '').localeCompare(a.changed_at || '')).slice(0, 8);

    return `
      <div class="mb-4">
        <h1 class="text-2xl font-black">ダッシュボード</h1>
        <p class="text-sm text-ink-500">${fmt.dateJp(today)} の状況</p>
      </div>
      <div class="grid grid-cols-4 gap-3 mb-6">
        <a href="#orders" class="bg-white border-l-4 border-brand p-4 rounded shadow-sm hover:shadow-md transition">
          <div class="text-xs text-ink-500 font-bold">本日納品予定</div>
          <div class="text-3xl font-black mt-1">${todayDue.length}<span class="text-sm font-normal text-ink-500">件</span></div>
        </a>
        <a href="#factory" class="bg-white border-l-4 border-ok p-4 rounded shadow-sm hover:shadow-md transition">
          <div class="text-xs text-ink-500 font-bold">進行中</div>
          <div class="text-3xl font-black mt-1">${inProgress.length}<span class="text-sm font-normal text-ink-500">件</span></div>
        </a>
        <div class="bg-white border-l-4 border-red-500 p-4 rounded shadow-sm">
          <div class="text-xs text-ink-500 font-bold">納期3日以内</div>
          <div class="text-3xl font-black mt-1">${urgent.length}<span class="text-sm font-normal text-ink-500">件</span></div>
        </div>
        <div class="bg-white border-l-4 border-blue-500 p-4 rounded shadow-sm">
          <div class="text-xs text-ink-500 font-bold">今月売上</div>
          <div class="text-3xl font-black mt-1">${fmt.money(monthSales)}</div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="bg-white rounded shadow-sm col-span-2">
          <div class="bg-ink-900 text-white px-4 py-2 rounded-t font-bold flex justify-between">
            <span>⚡ 本日納品予定</span>
            <span class="text-xs text-ink-300">至急対応</span>
          </div>
          <table class="w-full text-sm">
            <thead class="bg-ink-700/5"><tr class="text-left">
              <th class="px-3 py-2 font-bold">受注番号</th><th class="px-3 py-2 font-bold">顧客</th><th class="px-3 py-2 font-bold">品目</th><th class="px-3 py-2 font-bold">数量</th><th class="px-3 py-2 font-bold">状態</th>
            </tr></thead>
            <tbody>
              ${todayDue.length === 0 ? `<tr><td colspan="5" class="text-center py-6 text-ink-500">本日納品予定はありません</td></tr>`
                : todayDue.map(o => `
                <tr class="border-t hover:bg-brand/5 cursor-pointer" onclick="location.hash='#order/${o.id}'">
                  <td class="px-3 py-2 font-mono text-xs">${esc(o.order_number)}</td>
                  <td class="px-3 py-2">${esc(fmt.customer(o.customer_id))}</td>
                  <td class="px-3 py-2 text-xs">${esc(fmt.paper(o.items[0]?.paper_id))} ×${o.items[0]?.quantity}</td>
                  <td class="px-3 py-2">${o.items.reduce((s,i)=>s+i.quantity,0)}</td>
                  <td class="px-3 py-2"><span class="st st-${esc(o.status)}">${esc(o.status)}</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="bg-white rounded shadow-sm">
          <div class="bg-red-600 text-white px-4 py-2 rounded-t font-bold">🔔 最近の変更履歴</div>
          <ul class="text-xs divide-y max-h-80 overflow-auto">
            ${recentLogs.length === 0 ? `<li class="px-3 py-4 text-ink-500 text-center">履歴なし</li>` :
              recentLogs.map(l => `
              <li class="px-3 py-2">
                <div class="flex justify-between text-ink-500">
                  <span>${esc(fmt.user(l.changed_by_id))}</span>
                  <span>${fmt.dateTime(l.changed_at)}</span>
                </div>
                <div>${esc(l.change_summary)}</div>
              </li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  },
};

// ---------- Orders List ----------
Screens.orders = {
  filter: { q: '', status: '', from: '', to: '' },
  render() {
    const all = DB.all('orders').slice().sort((a,b) => (b.received_date || '').localeCompare(a.received_date || ''));
    const f = this.filter;
    const filtered = all.filter(o => {
      if (f.q) {
        const cust = fmt.customer(o.customer_id);
        const searchStr = `${o.order_number} ${cust} ${o.memo}`.toLowerCase();
        if (!searchStr.includes(f.q.toLowerCase())) return false;
      }
      if (f.status && o.status !== f.status) return false;
      if (f.from && o.received_date < f.from) return false;
      if (f.to && o.received_date > f.to) return false;
      return true;
    });
    return `
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-black">受注一覧</h1>
        <a href="#order/new" class="bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded font-bold shadow-sm">+ 新規受注起票</a>
      </div>
      <div class="bg-white p-4 rounded shadow-sm mb-4 grid grid-cols-6 gap-3 text-sm" id="filter-bar">
        <div class="col-span-2"><label class="block text-xs font-bold mb-1">検索（顧客名・受注番号・メモ）</label><input id="f-q" class="w-full border rounded px-2 py-1.5" value="${esc(f.q)}"></div>
        <div><label class="block text-xs font-bold mb-1">受付日 From</label><input type="date" id="f-from" class="w-full border rounded px-2 py-1.5" value="${esc(f.from)}"></div>
        <div><label class="block text-xs font-bold mb-1">〜 To</label><input type="date" id="f-to" class="w-full border rounded px-2 py-1.5" value="${esc(f.to)}"></div>
        <div><label class="block text-xs font-bold mb-1">ステータス</label>
          <select id="f-status" class="w-full border rounded px-2 py-1.5">
            <option value="">すべて</option>
            ${ORDER_STATUSES.map(s => `<option ${f.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="flex items-end gap-2">
          <button id="btn-filter-clear" class="border px-3 py-1.5 rounded text-xs">クリア</button>
        </div>
      </div>

      <div class="bg-white rounded shadow-sm">
        <div class="flex justify-between items-center px-4 py-2 border-b">
          <span class="text-sm">結果 <span class="font-bold">${filtered.length}</span> / ${all.length} 件</span>
        </div>
        <table class="w-full text-sm">
          <thead class="bg-ink-700/5"><tr class="text-left">
            <th class="px-3 py-2">受注番号</th><th class="px-3 py-2">受付</th><th class="px-3 py-2">顧客</th><th class="px-3 py-2">品目</th><th class="px-3 py-2">納期</th><th class="px-3 py-2 text-right">金額</th><th class="px-3 py-2">状態</th>
          </tr></thead>
          <tbody>
            ${filtered.length === 0 ? `<tr><td colspan="7" class="text-center py-10 text-ink-500">該当なし</td></tr>` :
              filtered.map(o => {
                const firstItem = o.items[0];
                return `
                <tr class="border-t hover:bg-brand/5 cursor-pointer" onclick="location.hash='#order/${o.id}'">
                  <td class="px-3 py-2 font-mono text-xs">${esc(o.order_number)}</td>
                  <td class="px-3 py-2">${esc(fmt.date(o.received_date))}</td>
                  <td class="px-3 py-2">${esc(fmt.customer(o.customer_id))}</td>
                  <td class="px-3 py-2 text-xs">${esc(fmt.paper(firstItem?.paper_id))} ${o.items.length > 1 ? `<span class="text-ink-500">他${o.items.length-1}件</span>` : ''}</td>
                  <td class="px-3 py-2">${esc(fmt.delivery(o))}</td>
                  <td class="px-3 py-2 text-right font-mono">${fmt.money(o.total_amount)}</td>
                  <td class="px-3 py-2"><span class="st st-${esc(o.status)}">${esc(o.status)}</span></td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
      </div>`;
  },
  bind() {
    const apply = () => {
      this.filter = {
        q: $('#f-q').value,
        status: $('#f-status').value,
        from: $('#f-from').value,
        to: $('#f-to').value,
      };
      App.render();
    };
    ['#f-q','#f-status','#f-from','#f-to'].forEach(sel => {
      const el = $(sel);
      el && el.addEventListener('input', debounce(apply, 300));
    });
    $('#btn-filter-clear')?.addEventListener('click', () => { this.filter = { q:'', status:'', from:'', to:'' }; App.render(); });
  },
};

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// ---------- Order New ----------
Screens.order_new = {
  draft: null,
  initDraft() {
    this.draft = {
      customer_id: '',
      received_date: TODAY,
      received_by_id: App.currentUserId,
      reception_method: '電話',
      delivery_type: 'single',
      delivery_date_start: '',
      delivery_date_end: '',
      memo: '',
      items: [ this.newItem() ],
    };
  },
  newItem() {
    return {
      id: 'itmp_' + Math.random().toString(36).slice(2, 8),
      paper_id: DB.all('papers')[0]?.id || '',
      paper_other_memo: '',
      quantity: 100,
      ink_pattern: '4Cx4C',
      folding: 'なし',
      mishin_count: 0,
      hole_position: 'なし',
      print_direction: '天乗',
      numbering_enabled: false,
      numbering_from: null,
      numbering_to: null,
      yacho_style: false,
      lamination: false,
      item_notes: '',
    };
  },
  render() {
    if (!this.draft) this.initDraft();
    const d = this.draft;
    const customers = DB.all('customers');
    const papers = DB.all('papers');
    const majorPapers = papers.filter(p => p.is_major);
    const otherPapers = papers.filter(p => !p.is_major);
    const total = calcOrderTotal(d.items);
    const customer = DB.find('customers', d.customer_id);
    const pastOrders = customer ? DB.all('orders')
      .filter(o => o.customer_id === customer.id)
      .sort((a,b) => (b.received_date || '').localeCompare(a.received_date || ''))
      .slice(0, 5) : [];

    return `
      <div class="flex justify-between items-center mb-4">
        <div>
          <h1 class="text-2xl font-black">受注新規起票 <span class="ml-2 text-xs bg-brand text-white px-2 py-0.5 rounded align-middle">最重要</span></h1>
          <p class="text-sm text-ink-500">お問い合わせ・来客を受けたらここに起票</p>
        </div>
        <div class="flex gap-2">
          <button id="btn-cancel" class="border px-4 py-2 rounded font-bold">キャンセル</button>
          <button id="btn-save" class="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded font-bold">✓ 保存して起票</button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="col-span-2 space-y-4">
          <!-- 受付情報 -->
          <div class="bg-white rounded shadow-sm">
            <div class="bg-ink-900 text-white px-4 py-2 rounded-t font-bold">受付情報</div>
            <div class="p-4 grid grid-cols-4 gap-3 text-sm">
              <div class="col-span-2">
                <label class="block text-xs font-bold mb-1 text-red-600">* 顧客</label>
                <div class="flex gap-1">
                  <select id="f-customer" class="w-full border rounded px-2 py-1.5">
                    <option value="">— 選択 —</option>
                    ${customers.map(c => `<option value="${c.id}" ${d.customer_id===c.id?'selected':''}>${esc(c.company_name || c.individual_name)} (${esc(c.area)})</option>`).join('')}
                  </select>
                  <button id="btn-new-customer" class="border px-2 py-1 rounded text-xs bg-brand/10 text-brand font-bold whitespace-nowrap">+ 新規</button>
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">受付日</label>
                <input type="date" id="f-received-date" class="w-full border rounded px-2 py-1.5" value="${d.received_date}">
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">受付者</label>
                <select id="f-received-by" class="w-full border rounded px-2 py-1.5">
                  ${DB.all('users').map(u => `<option value="${u.id}" ${d.received_by_id===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">受付方法</label>
                <select id="f-reception" class="w-full border rounded px-2 py-1.5">
                  ${RECEPTION_METHODS.map(m => `<option ${d.reception_method===m?'selected':''}>${m}</option>`).join('')}
                </select>
              </div>
              <div class="col-span-3">
                <label class="block text-xs font-bold mb-1">納期</label>
                <div class="flex gap-2 items-center text-sm">
                  ${DELIVERY_TYPES.map(dt => `
                    <label class="flex items-center gap-1"><input type="radio" name="dtype" value="${dt.value}" ${d.delivery_type===dt.value?'checked':''}>${dt.label}</label>`).join('')}
                  <input type="date" id="f-dstart" class="border rounded px-2 py-1.5 ml-2" value="${d.delivery_date_start||''}">
                  <span id="dend-wrap" style="display:${d.delivery_type==='range'?'inline':'none'}">
                    〜 <input type="date" id="f-dend" class="border rounded px-2 py-1.5" value="${d.delivery_date_end||''}">
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 明細 -->
          <div class="bg-white rounded shadow-sm">
            <div class="bg-ink-900 text-white px-4 py-2 rounded-t font-bold flex justify-between items-center">
              <span>製作明細（複数行対応）</span>
              <button id="btn-add-item" class="text-xs border border-white/50 px-2 py-0.5 rounded hover:bg-white/10">+ 明細を追加</button>
            </div>
            <div id="items-container">
              ${d.items.map((it, i) => this.renderItem(it, i, majorPapers, otherPapers)).join('')}
            </div>
          </div>

          <!-- メモ -->
          <div class="bg-white rounded shadow-sm">
            <div class="bg-ink-900 text-white px-4 py-2 rounded-t font-bold">フリーメモ</div>
            <div class="p-4">
              <textarea id="f-memo" class="w-full border rounded px-2 py-1.5 text-sm" rows="3" placeholder="顧客指示・参考情報など">${esc(d.memo)}</textarea>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="bg-white rounded shadow-sm">
            <div class="bg-brand text-white px-4 py-2 rounded-t font-bold">見積サマリー</div>
            <div class="p-4 text-sm space-y-2">
              ${d.items.map((it, i) => {
                const { subtotal } = calcItemPrice(it);
                return `<div class="flex justify-between text-xs"><span>明細 #${i+1}</span><span class="font-mono">${fmt.money(subtotal)}</span></div>`;
              }).join('')}
              <hr>
              <div class="flex justify-between"><span>小計</span><span class="font-mono font-bold">${fmt.money(total)}</span></div>
              <div class="flex justify-between text-ink-500"><span>消費税（10%）</span><span class="font-mono">${fmt.money(Math.round(total * 0.1))}</span></div>
              <hr>
              <div class="flex justify-between text-lg"><span class="font-bold">合計</span><span class="font-black text-brand">${fmt.money(Math.round(total * 1.1))}</span></div>
            </div>
          </div>

          ${customer ? `
          <div class="bg-white rounded shadow-sm">
            <div class="bg-ok text-white px-4 py-2 rounded-t font-bold">この顧客の過去発注</div>
            <ul class="text-sm divide-y max-h-96 overflow-auto">
              ${pastOrders.length === 0 ? `<li class="px-3 py-4 text-ink-500 text-center text-xs">過去発注なし</li>` :
                pastOrders.map(o => `
                <li class="px-3 py-2 hover:bg-ok/5">
                  <div class="flex justify-between"><span class="font-bold">${fmt.dateFull(o.received_date)}</span><span class="font-mono text-xs">${esc(o.order_number)}</span></div>
                  <div class="text-xs text-ink-500">${esc(fmt.paper(o.items[0]?.paper_id))} ${o.items[0]?.quantity}枚 / ${fmt.money(o.total_amount)}</div>
                  <button class="text-xs text-brand font-bold mt-1" data-copy-from="${o.id}">この内容でコピー</button>
                </li>`).join('')}
            </ul>
          </div>` : ''}
        </div>
      </div>
    `;
  },
  renderItem(it, i, majorPapers, otherPapers) {
    const { subtotal } = calcItemPrice(it);
    return `
      <div class="p-4 ${i > 0 ? 'border-t' : 'border-t'}" data-item-idx="${i}">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-black bg-ink-700 text-white px-2 py-0.5 rounded">明細 #${i+1}</span>
          ${i > 0 ? `<button class="text-xs text-red-500 ml-auto btn-remove-item" data-idx="${i}">削除</button>` : ''}
        </div>
        <div class="grid grid-cols-6 gap-2 text-sm">
          <div class="col-span-2">
            <label class="block text-xs font-bold mb-1">用紙</label>
            <select class="w-full border rounded px-2 py-1.5 item-paper" data-idx="${i}">
              <optgroup label="よく使う紙">
                ${majorPapers.map(p => `<option value="${p.id}" ${it.paper_id===p.id?'selected':''}>${esc(p.paper_name)} @¥${p.unit_price}/枚</option>`).join('')}
              </optgroup>
              <optgroup label="その他">
                ${otherPapers.map(p => `<option value="${p.id}" ${it.paper_id===p.id?'selected':''}>${esc(p.paper_name)} @¥${p.unit_price}/枚</option>`).join('')}
              </optgroup>
              <option value="">── その他（自由入力）──</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold mb-1">数量</label>
            <input type="number" min="1" class="w-full border rounded px-2 py-1.5 text-right font-mono item-qty" data-idx="${i}" value="${it.quantity}">
          </div>
          <div class="col-span-2">
            <label class="block text-xs font-bold mb-1">インク</label>
            <select class="w-full border rounded px-2 py-1.5 item-ink" data-idx="${i}">
              ${INK_PATTERNS.map(ip => `<option value="${ip.value}" ${it.ink_pattern===ip.value?'selected':''}>${esc(ip.label)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold mb-1">小計</label>
            <div class="border rounded px-2 py-1.5 bg-ink-700/5 text-right font-mono font-bold text-brand">${fmt.money(subtotal)}</div>
          </div>
        </div>
        ${!it.paper_id ? `<div class="mt-2"><input type="text" class="w-full border rounded px-2 py-1.5 text-sm item-paper-other" data-idx="${i}" placeholder="用紙の自由入力（例: 特殊紙XYZ）" value="${esc(it.paper_other_memo)}"></div>` : ''}
        <div class="mt-3 p-3 bg-ink-700/5 rounded">
          <div class="text-xs font-bold mb-2 text-ink-500">加工オプション</div>
          <div class="grid grid-cols-4 gap-2 text-sm">
            <label class="flex items-center gap-1"><input type="checkbox" class="item-mishin-on" data-idx="${i}" ${it.mishin_count>0?'checked':''}> ミシン</label>
            <select class="border rounded px-1 py-0.5 text-xs item-mishin-count" data-idx="${i}" ${it.mishin_count===0?'disabled':''}>
              <option value="1" ${it.mishin_count===1?'selected':''}>1本</option>
              <option value="2" ${it.mishin_count===2?'selected':''}>2本</option>
            </select>
            <label class="flex items-center gap-1"><input type="checkbox" class="item-folding-on" data-idx="${i}" ${it.folding!=='なし'?'checked':''}> 折</label>
            <select class="border rounded px-1 py-0.5 text-xs item-folding" data-idx="${i}" ${it.folding==='なし'?'disabled':''}>
              <option value="2つ折" ${it.folding==='2つ折'?'selected':''}>2つ折</option>
              <option value="3つ折" ${it.folding==='3つ折'?'selected':''}>3つ折</option>
            </select>
            <label class="flex items-center gap-1"><input type="checkbox" class="item-hole-on" data-idx="${i}" ${it.hole_position!=='なし'?'checked':''}> 穴</label>
            <select class="border rounded px-1 py-0.5 text-xs item-hole" data-idx="${i}" ${it.hole_position==='なし'?'disabled':''}>
              <option value="天2ケ" ${it.hole_position==='天2ケ'?'selected':''}>天2ケ</option>
              <option value="左2ケ" ${it.hole_position==='左2ケ'?'selected':''}>左2ケ</option>
            </select>
            <label class="flex items-center gap-1"><input type="checkbox" class="item-dir-on" data-idx="${i}" ${it.print_direction==='左乗'?'checked':''}> 左乗</label>
            <div></div>
            <label class="flex items-center gap-1"><input type="checkbox" class="item-num" data-idx="${i}" ${it.numbering_enabled?'checked':''}> ナンバリング</label>
            <div class="flex gap-1 items-center text-xs">
              <input class="w-14 border rounded px-1 item-num-from" data-idx="${i}" placeholder="from" value="${it.numbering_from||''}" ${!it.numbering_enabled?'disabled':''}>
              <span>〜</span>
              <input class="w-14 border rounded px-1 item-num-to" data-idx="${i}" placeholder="to" value="${it.numbering_to||''}" ${!it.numbering_enabled?'disabled':''}>
            </div>
            <label class="flex items-center gap-1"><input type="checkbox" class="item-yacho" data-idx="${i}" ${it.yacho_style?'checked':''}> 野鳥式</label>
            <label class="flex items-center gap-1"><input type="checkbox" class="item-lam" data-idx="${i}" ${it.lamination?'checked':''}> ラミネート</label>
          </div>
        </div>
        <div class="mt-2">
          <input class="w-full border rounded px-2 py-1.5 text-sm item-note" data-idx="${i}" placeholder="この明細のメモ（任意）" value="${esc(it.item_notes)}">
        </div>
      </div>`;
  },
  bind() {
    const d = this.draft;
    const rerenderItems = () => {
      const c = $('#items-container');
      if (!c) return;
      const papers = DB.all('papers');
      c.innerHTML = d.items.map((it, i) => this.renderItem(it, i, papers.filter(p=>p.is_major), papers.filter(p=>!p.is_major))).join('');
      this.bindItemHandlers();
    };
    this.bindItemHandlers = () => {
      $$('.item-paper').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].paper_id = e.target.value; rerenderItems(); updateSummary(); }));
      $$('.item-paper-other').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].paper_other_memo = e.target.value; }));
      $$('.item-qty').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].quantity = +e.target.value || 0; updateSummary(); }));
      $$('.item-ink').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].ink_pattern = e.target.value; updateSummary(); }));
      $$('.item-mishin-on').forEach(el => el.addEventListener('change', (e) => { const idx = +e.target.dataset.idx; d.items[idx].mishin_count = e.target.checked ? 1 : 0; rerenderItems(); updateSummary(); }));
      $$('.item-mishin-count').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].mishin_count = +e.target.value; updateSummary(); }));
      $$('.item-folding-on').forEach(el => el.addEventListener('change', (e) => { const idx = +e.target.dataset.idx; d.items[idx].folding = e.target.checked ? '2つ折' : 'なし'; rerenderItems(); updateSummary(); }));
      $$('.item-folding').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].folding = e.target.value; }));
      $$('.item-hole-on').forEach(el => el.addEventListener('change', (e) => { const idx = +e.target.dataset.idx; d.items[idx].hole_position = e.target.checked ? '天2ケ' : 'なし'; rerenderItems(); updateSummary(); }));
      $$('.item-hole').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].hole_position = e.target.value; }));
      $$('.item-dir-on').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].print_direction = e.target.checked ? '左乗' : '天乗'; }));
      $$('.item-num').forEach(el => el.addEventListener('change', (e) => { const idx = +e.target.dataset.idx; d.items[idx].numbering_enabled = e.target.checked; rerenderItems(); updateSummary(); }));
      $$('.item-num-from').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].numbering_from = e.target.value; }));
      $$('.item-num-to').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].numbering_to = e.target.value; }));
      $$('.item-yacho').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].yacho_style = e.target.checked; updateSummary(); }));
      $$('.item-lam').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].lamination = e.target.checked; updateSummary(); }));
      $$('.item-note').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].item_notes = e.target.value; }));
      $$('.btn-remove-item').forEach(el => el.addEventListener('click', (e) => { d.items.splice(+e.target.dataset.idx, 1); rerenderItems(); updateSummary(); }));
      $$('[data-copy-from]').forEach(el => el.addEventListener('click', (e) => {
        const src = DB.find('orders', e.target.dataset.copyFrom);
        if (!src) return;
        d.items = src.items.map(si => ({ ...Screens.order_new.newItem(), ...si, id: 'itmp_' + Math.random().toString(36).slice(2, 8) }));
        App.render();
        toast('過去明細をコピーしました', 'ok');
      }));
    };
    const updateSummary = () => {
      // 再描画（サイドサマリーのみ更新）
      const total = calcOrderTotal(d.items);
      // Re-render full would lose focus; keep it simple by re-rendering whole screen on structural changes
      // but for numeric changes, we just update specific DOM
      const items = d.items;
      const sumLines = items.map((it, i) => {
        const { subtotal } = calcItemPrice(it);
        return { i, subtotal };
      });
      // simple: rerender right-hand summary
      const sideBox = $('.bg-brand.text-white.px-4.py-2.rounded-t.font-bold')?.parentElement;
      // just rerender the whole screen
      App.render();
    };
    $('#f-customer')?.addEventListener('change', (e) => { d.customer_id = e.target.value; App.render(); });
    $('#f-received-date')?.addEventListener('change', (e) => { d.received_date = e.target.value; });
    $('#f-received-by')?.addEventListener('change', (e) => { d.received_by_id = e.target.value; });
    $('#f-reception')?.addEventListener('change', (e) => { d.reception_method = e.target.value; });
    $$('input[name="dtype"]').forEach(r => r.addEventListener('change', (e) => {
      d.delivery_type = e.target.value;
      $('#dend-wrap').style.display = e.target.value === 'range' ? 'inline' : 'none';
    }));
    $('#f-dstart')?.addEventListener('change', (e) => { d.delivery_date_start = e.target.value; });
    $('#f-dend')?.addEventListener('change', (e) => { d.delivery_date_end = e.target.value; });
    $('#f-memo')?.addEventListener('input', (e) => { d.memo = e.target.value; });
    $('#btn-add-item')?.addEventListener('click', () => { d.items.push(this.newItem()); rerenderItems(); updateSummary(); });
    $('#btn-cancel')?.addEventListener('click', () => { if (confirm('入力内容を破棄しますか？')) { this.draft = null; location.hash = '#orders'; } });
    $('#btn-save')?.addEventListener('click', () => this.save());
    $('#btn-new-customer')?.addEventListener('click', () => this.openNewCustomerModal());
    this.bindItemHandlers();
  },
  openNewCustomerModal() {
    openModal(`
      <div class="p-6">
        <h2 class="text-xl font-black mb-4">新規顧客登録</h2>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="col-span-2"><label class="block text-xs font-bold mb-1">会社名</label><input id="nc-company" class="w-full border rounded px-2 py-1.5"></div>
          <div class="col-span-2"><label class="block text-xs font-bold mb-1">個人名（個人の場合）</label><input id="nc-indiv" class="w-full border rounded px-2 py-1.5"></div>
          <div><label class="block text-xs font-bold mb-1">種別</label>
            <select id="nc-type" class="w-full border rounded px-2 py-1.5"><option>地域</option><option>お得意様</option></select>
          </div>
          <div><label class="block text-xs font-bold mb-1">地域</label>
            <select id="nc-area" class="w-full border rounded px-2 py-1.5">${AREAS.map(a=>`<option>${a}</option>`).join('')}</select>
          </div>
          <div><label class="block text-xs font-bold mb-1">電話</label><input id="nc-phone" class="w-full border rounded px-2 py-1.5"></div>
          <div class="col-span-2"><label class="block text-xs font-bold mb-1">住所</label><input id="nc-address" class="w-full border rounded px-2 py-1.5"></div>
          <div class="col-span-2"><label class="block text-xs font-bold mb-1">メモ</label><textarea id="nc-notes" class="w-full border rounded px-2 py-1.5" rows="2"></textarea></div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button id="nc-cancel" class="border px-4 py-2 rounded">キャンセル</button>
          <button id="nc-save" class="bg-brand text-white px-4 py-2 rounded font-bold">登録</button>
        </div>
      </div>
    `, () => {
      $('#nc-cancel').addEventListener('click', closeModal);
      $('#nc-save').addEventListener('click', () => {
        const company = $('#nc-company').value.trim();
        const indiv = $('#nc-indiv').value.trim();
        if (!company && !indiv) { toast('会社名または個人名を入力してください', 'err'); return; }
        const c = DB.createCustomer({
          company_name: company, individual_name: indiv,
          customer_type: $('#nc-type').value, area: $('#nc-area').value,
          phone: $('#nc-phone').value, address: $('#nc-address').value, notes: $('#nc-notes').value,
        });
        this.draft.customer_id = c.id;
        closeModal();
        App.render();
        toast('顧客を登録しました', 'ok');
      });
    });
  },
  save() {
    const d = this.draft;
    if (!d.customer_id) { toast('顧客を選択してください', 'err'); return; }
    if (d.items.length === 0) { toast('明細を1件以上追加してください', 'err'); return; }
    if (d.delivery_type !== 'asap' && !d.delivery_date_start) { toast('納期日を指定してください', 'err'); return; }
    // Set computed prices
    const items = d.items.map(it => {
      const c = calcItemPrice(it);
      return { ...it, id: 'it_' + Math.random().toString(36).slice(2, 8), unit_price: c.unit_price, subtotal: c.subtotal };
    });
    const total = items.reduce((s, it) => s + it.subtotal, 0);
    const order = DB.createOrder({ ...d, items, total_amount: Math.round(total * 1.1) });
    this.draft = null;
    toast(`受注 ${order.order_number} を起票しました`, 'ok');
    location.hash = `#order/${order.id}`;
  },
};

// ---------- Order Detail ----------
Screens.order = {
  render(id) {
    const o = DB.find('orders', id);
    if (!o) return `<div class="text-center py-16 text-ink-500">受注が見つかりません</div>`;
    const customer = DB.find('customers', o.customer_id);
    const fr = DB.findFactoryRecord(o.id);
    const quote = DB.all('quotes').find(q => q.order_id === o.id);
    const logs = DB.all('change_logs').filter(l => l.target_id === o.id).sort((a,b) => (b.changed_at||'').localeCompare(a.changed_at||''));

    return `
      <div class="flex justify-between items-start mb-4">
        <div>
          <div class="flex items-center gap-3">
            <a href="#orders" class="text-ink-500 text-sm">← 一覧</a>
            <h1 class="text-2xl font-black">受注 <span class="font-mono">#${esc(o.order_number)}</span></h1>
            <span class="st st-${esc(o.status)} text-sm">${esc(o.status)}</span>
          </div>
          <p class="text-sm text-ink-500 mt-1">${esc(fmt.customer(o.customer_id))} / 受付 ${fmt.dateFull(o.received_date)} / 納期 ${fmt.delivery(o)}</p>
        </div>
        <div class="flex gap-2">
          <a href="#print/${o.id}" class="border px-3 py-2 rounded text-sm">📄 印刷ビュー</a>
          <button id="btn-quote" class="border px-3 py-2 rounded text-sm">📑 ${quote ? '見積書を開く' : '見積書作成'}</button>
          <button id="btn-delete" class="border px-3 py-2 rounded text-sm text-red-500">削除</button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="col-span-2 space-y-4">
          <div class="bg-white rounded shadow-sm p-4 text-sm">
            <h3 class="font-bold text-base mb-3">基本情報</h3>
            <div class="grid grid-cols-3 gap-3">
              <div><div class="text-xs text-ink-500 font-bold">顧客</div><div class="font-bold"><a class="hover:underline" href="#customer/${o.customer_id}">${esc(fmt.customer(o.customer_id))}</a></div></div>
              <div><div class="text-xs text-ink-500 font-bold">地域・種別</div><div>${esc(customer?.customer_type || '')} / ${esc(customer?.area || '')}</div></div>
              <div><div class="text-xs text-ink-500 font-bold">受付者</div><div>${esc(fmt.user(o.received_by_id))}</div></div>
              <div><div class="text-xs text-ink-500 font-bold">受付日</div><div>${fmt.dateFull(o.received_date)}</div></div>
              <div><div class="text-xs text-ink-500 font-bold">納期</div><div class="${o.delivery_date_start === TODAY ? 'text-red-600 font-bold' : ''}">${esc(fmt.delivery(o))}</div></div>
              <div><div class="text-xs text-ink-500 font-bold">受付方法</div><div>${esc(o.reception_method)}</div></div>
            </div>
            ${o.memo ? `<div class="mt-3 text-xs text-ink-500 font-bold">メモ</div><div class="bg-ink-700/5 p-2 rounded text-sm">${esc(o.memo)}</div>` : ''}
          </div>

          <div class="bg-white rounded shadow-sm">
            <div class="px-4 py-2 border-b font-bold flex justify-between items-center">
              <span>製作明細</span>
            </div>
            <table class="w-full text-sm">
              <thead class="bg-ink-700/5 text-xs"><tr class="text-left">
                <th class="px-3 py-2">#</th><th class="px-3 py-2">用紙</th><th class="px-3 py-2">数量</th><th class="px-3 py-2">インク</th><th class="px-3 py-2">加工</th><th class="px-3 py-2 text-right">単価</th><th class="px-3 py-2 text-right">小計</th>
              </tr></thead>
              <tbody>
                ${o.items.map((it, i) => {
                  const procs = [];
                  if (it.mishin_count > 0) procs.push(`ミシン${it.mishin_count}本`);
                  if (it.folding !== 'なし') procs.push(it.folding);
                  if (it.hole_position !== 'なし') procs.push(it.hole_position);
                  if (it.print_direction === '左乗') procs.push('左乗');
                  if (it.numbering_enabled) procs.push(`No.${it.numbering_from}〜${it.numbering_to}`);
                  if (it.yacho_style) procs.push('野鳥式');
                  if (it.lamination) procs.push('ラミ');
                  return `
                  <tr class="border-t">
                    <td class="px-3 py-2">${i+1}</td>
                    <td class="px-3 py-2">${esc(fmt.paper(it.paper_id))}${it.paper_other_memo ? `<br><span class="text-xs text-ink-500">${esc(it.paper_other_memo)}</span>`:''}</td>
                    <td class="px-3 py-2 font-mono">${it.quantity}</td>
                    <td class="px-3 py-2 text-xs">${esc(fmt.ink(it.ink_pattern))}</td>
                    <td class="px-3 py-2 text-xs">${procs.length ? procs.join(' / ') : '—'}</td>
                    <td class="px-3 py-2 text-right font-mono">${fmt.money(it.unit_price)}</td>
                    <td class="px-3 py-2 text-right font-mono">${fmt.money(it.subtotal)}</td>
                  </tr>`;
                }).join('')}
                <tr class="bg-ink-900 text-white font-bold"><td class="px-3 py-2" colspan="6">合計（税込）</td><td class="px-3 py-2 text-right font-mono">${fmt.money(o.total_amount)}</td></tr>
              </tbody>
            </table>
          </div>

          <div class="bg-white rounded shadow-sm p-4 text-sm">
            <h3 class="font-bold text-base mb-2">工場進捗（C管理）</h3>
            ${fr ? `
              <div class="flex items-center gap-3 text-xs mb-2">
                <span class="st st-${esc(fr.factory_status)}">${esc(fr.factory_status)}</span>
              </div>
              <div class="mt-3 grid grid-cols-4 gap-2 text-xs">
                <div><div class="text-ink-500">開始</div><div class="font-bold">${fr.started_at ? fmt.dateTime(fr.started_at) : '—'}</div></div>
                <div><div class="text-ink-500">完了</div><div class="font-bold">${fr.completed_at ? fmt.dateTime(fr.completed_at) : '—'}</div></div>
                <div><div class="text-ink-500">実出来高</div><div class="font-bold">${fr.actual_quantity || '—'}</div></div>
                <div><div class="text-ink-500">担当</div><div class="font-bold">${esc(fmt.user(fr.completed_by_id) || '—')}</div></div>
              </div>
              <div class="mt-2">
                <label class="block text-xs font-bold mb-1">工場メモ</label>
                <textarea id="fr-memo" class="w-full border rounded px-2 py-1.5 text-sm" rows="2">${esc(fr.factory_memo || '')}</textarea>
              </div>
            ` : '<p class="text-ink-500">工場記録なし</p>'}
          </div>
        </div>

        <div class="space-y-4">
          <div class="bg-white rounded shadow-sm">
            <div class="px-4 py-2 border-b font-bold">ステータス操作</div>
            <div class="p-3 space-y-2 text-sm">
              ${ORDER_STATUSES.map(s => `
                <button class="w-full border px-3 py-2 rounded text-left ${o.status===s?'bg-brand text-white border-brand font-bold':'hover:bg-ink-700/5'}" data-set-status="${s}">
                  ${o.status===s?'● ':''}${s}
                </button>`).join('')}
            </div>
          </div>

          <div class="bg-white rounded shadow-sm">
            <div class="px-4 py-2 border-b font-bold">工場ステータス</div>
            <div class="p-3 space-y-2 text-sm">
              ${FACTORY_STATUSES.map(s => `
                <button class="w-full border px-3 py-2 rounded text-left ${fr?.factory_status===s?'bg-ink-900 text-white border-ink-900 font-bold':'hover:bg-ink-700/5'}" data-set-factory="${s}">
                  ${fr?.factory_status===s?'● ':''}${s}
                </button>`).join('')}
            </div>
          </div>

          <div class="bg-white rounded shadow-sm">
            <div class="px-4 py-2 border-b font-bold">変更履歴</div>
            <ul class="text-xs divide-y max-h-96 overflow-auto">
              ${logs.length === 0 ? `<li class="px-3 py-4 text-ink-500 text-center">履歴なし</li>` :
                logs.map(l => `
                <li class="px-3 py-2">
                  <div class="flex justify-between text-ink-500">
                    <span>${esc(fmt.user(l.changed_by_id))}</span>
                    <span>${fmt.dateTime(l.changed_at)}</span>
                  </div>
                  <div>${esc(l.change_summary)}</div>
                </li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;
  },
  bind(id) {
    const o = DB.find('orders', id);
    if (!o) return;
    $$('[data-set-status]').forEach(el => el.addEventListener('click', () => {
      const s = el.dataset.setStatus;
      if (s === o.status) return;
      DB.updateOrder(id, { status: s }, `ステータス変更: ${o.status}→${s}`);
      // sync factory
      const fr = DB.findFactoryRecord(id);
      if (fr) {
        let fs = fr.factory_status;
        if (s === '受注') fs = '待機';
        else if (s === '製版中' || s === '印刷中') fs = '作業中';
        else if (s === '完成') fs = '完成';
        else if (s === '納品済') fs = '出荷待ち';
        DB.updateFactoryRecord(id, { factory_status: fs });
      }
      toast(`ステータスを「${s}」に変更`, 'ok');
      App.render();
    }));
    $$('[data-set-factory]').forEach(el => el.addEventListener('click', () => {
      const s = el.dataset.setFactory;
      const now = new Date().toISOString();
      const patch = { factory_status: s };
      if (s === '作業中' && !DB.findFactoryRecord(id).started_at) patch.started_at = now;
      if (s === '完成') { patch.completed_at = now; patch.completed_by_id = App.currentUserId; }
      DB.updateFactoryRecord(id, patch);
      toast(`工場ステータス「${s}」`, 'ok');
      App.render();
    }));
    $('#fr-memo')?.addEventListener('change', (e) => {
      DB.updateFactoryRecord(id, { factory_memo: e.target.value });
      toast('工場メモを保存');
    });
    $('#btn-quote')?.addEventListener('click', () => {
      let q = DB.all('quotes').find(q => q.order_id === id);
      if (!q) q = DB.createQuote(id);
      location.hash = `#quote/${q.id}`;
    });
    $('#btn-delete')?.addEventListener('click', () => {
      if (!confirm(`受注 ${o.order_number} を削除しますか？`)) return;
      DB.deleteOrder(id);
      toast('受注を削除しました');
      location.hash = '#orders';
    });
  },
};

// ---------- Quote ----------
Screens.quote = {
  render(id) {
    const q = DB.find('quotes', id);
    if (!q) return `<div class="text-center py-16 text-ink-500">見積書が見つかりません</div>`;
    const o = DB.find('orders', q.order_id);
    const customer = DB.find('customers', o.customer_id);
    return `
      <div class="flex justify-between items-center mb-4">
        <div>
          <a href="#order/${o.id}" class="text-ink-500 text-sm">← 受注に戻る</a>
          <h1 class="text-2xl font-black">見積書 <span class="font-mono">#${esc(q.quote_number)}</span></h1>
          <p class="text-sm text-ink-500">受注 ${esc(o.order_number)} / ${esc(fmt.customer(o.customer_id))}</p>
        </div>
        <div class="flex gap-2">
          <button id="btn-print-quote" class="bg-ink-900 text-white px-4 py-2 rounded text-sm font-bold">📄 PDF出力 (印刷)</button>
          <button id="btn-send-quote" class="bg-brand text-white px-4 py-2 rounded text-sm font-bold">✉ 送信済にする</button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white rounded shadow-sm p-4 text-sm space-y-3">
          <h3 class="font-bold text-base">見積書入力</h3>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-xs font-bold mb-1">宛先</label><div class="border rounded px-2 py-1.5 bg-ink-700/5">${esc(fmt.customer(o.customer_id))}</div></div>
            <div><label class="block text-xs font-bold mb-1">見積日</label><input type="date" id="q-issued" class="w-full border rounded px-2 py-1.5" value="${q.issued_date}"></div>
            <div><label class="block text-xs font-bold mb-1">有効期限</label><input type="date" id="q-valid" class="w-full border rounded px-2 py-1.5" value="${q.valid_until}"></div>
            <div><label class="block text-xs font-bold mb-1">送付方法</label>
              <select id="q-send" class="w-full border rounded px-2 py-1.5">${SEND_METHODS.map(m => `<option ${q.send_method===m?'selected':''}>${m}</option>`).join('')}</select>
            </div>
            <div><label class="block text-xs font-bold mb-1">状態</label>
              <select id="q-status" class="w-full border rounded px-2 py-1.5">
                ${['作成中','発行済','受諾','失注'].map(s => `<option ${q.status===s?'selected':''}>${s}</option>`).join('')}
              </select>
            </div>
          </div>
          <div><label class="block text-xs font-bold mb-1">備考</label><textarea id="q-memo" class="w-full border rounded px-2 py-1.5" rows="4">${esc(q.memo)}</textarea></div>
        </div>
        <div class="bg-white rounded shadow-sm p-4" id="print-target">
          <div class="text-xs font-bold text-ink-500 mb-2 no-print">📄 PDFプレビュー（「PDF出力」ボタンで印刷できます）</div>
          <div class="border-2 border-ink-300/50 p-6 bg-white text-xs print-page" id="quote-pdf-page">
            <div class="flex justify-between border-b-2 border-ink-900 pb-2 mb-4">
              <div><div class="text-2xl font-black">御 見 積 書</div><div class="text-xs mt-1">No. ${esc(q.quote_number)}</div></div>
              <div class="text-right"><div class="font-bold">${fmt.dateJp(q.issued_date)}</div></div>
            </div>
            <div class="mb-4">
              <div class="text-lg font-bold">${esc(fmt.customer(o.customer_id))} 御中</div>
              <div class="mt-2">下記の通りお見積もり申し上げます。</div>
            </div>
            <div class="flex justify-between mb-4">
              <div>
                <div class="text-xs">有効期限: ${fmt.dateJp(q.valid_until)}</div>
                <div class="mt-2 font-bold">合計金額</div>
                <div class="text-2xl font-black text-brand border-b-2 border-brand inline-block">${fmt.money(q.total_amount)}<span class="text-xs">（税込）</span></div>
              </div>
              <div class="text-xs border p-2">
                <div class="font-bold">株式会社 渡辺謄写堂</div>
                <div>〒964-0000 福島県二本松市XXX</div>
                <div>TEL: 0243-XX-XXXX</div>
                <div class="mt-1 text-lg text-right">印</div>
              </div>
            </div>
            <table class="w-full border-collapse text-xs">
              <thead class="bg-ink-900 text-white"><tr>
                <th class="p-1 text-left">品名・仕様</th><th class="p-1 text-right">数量</th><th class="p-1 text-right">単価</th><th class="p-1 text-right">金額</th>
              </tr></thead>
              <tbody>
                ${o.items.map(it => `
                <tr class="border-b">
                  <td class="p-1">${esc(fmt.paper(it.paper_id))}（${esc(fmt.ink(it.ink_pattern))}）</td>
                  <td class="p-1 text-right">${it.quantity}</td>
                  <td class="p-1 text-right">${fmt.money(it.unit_price)}</td>
                  <td class="p-1 text-right">${fmt.money(it.subtotal)}</td>
                </tr>`).join('')}
                <tr class="border-b"><td class="p-1 text-ink-500" colspan="3">小計</td><td class="p-1 text-right">${fmt.money(Math.round(q.total_amount / 1.1))}</td></tr>
                <tr class="border-b"><td class="p-1 text-ink-500" colspan="3">消費税（10%）</td><td class="p-1 text-right">${fmt.money(q.total_amount - Math.round(q.total_amount / 1.1))}</td></tr>
                <tr class="font-bold bg-ink-700/5"><td class="p-1" colspan="3">合計</td><td class="p-1 text-right">${fmt.money(q.total_amount)}</td></tr>
              </tbody>
            </table>
            <div class="mt-4 text-xs">
              <div class="font-bold">備考</div>
              <div class="whitespace-pre-wrap">${esc(q.memo)}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  bind(id) {
    $('#q-issued')?.addEventListener('change', e => { DB.updateQuote(id, { issued_date: e.target.value }); App.render(); });
    $('#q-valid')?.addEventListener('change', e => { DB.updateQuote(id, { valid_until: e.target.value }); App.render(); });
    $('#q-send')?.addEventListener('change', e => { DB.updateQuote(id, { send_method: e.target.value }); });
    $('#q-status')?.addEventListener('change', e => { DB.updateQuote(id, { status: e.target.value }); toast('状態更新'); });
    $('#q-memo')?.addEventListener('change', e => { DB.updateQuote(id, { memo: e.target.value }); App.render(); });
    $('#btn-print-quote')?.addEventListener('click', () => window.print());
    $('#btn-send-quote')?.addEventListener('click', () => {
      DB.updateQuote(id, { status: '発行済' });
      toast('発行済にしました', 'ok');
      App.render();
    });
  },
};

// ---------- Factory Kanban ----------
Screens.factory = {
  render() {
    const orders = DB.all('orders').filter(o => o.status !== '納品済' && o.status !== 'キャンセル');
    const frs = DB.all('factory_records');
    const cols = FACTORY_STATUSES.map(s => ({ status: s, items: [] }));
    orders.forEach(o => {
      const fr = frs.find(f => f.order_id === o.id);
      const st = fr?.factory_status || '待機';
      const col = cols.find(c => c.status === st);
      if (col) col.items.push({ order: o, fr });
    });
    return `
      <div class="mb-4 flex justify-between">
        <div>
          <h1 class="text-2xl font-black">工場カンバン</h1>
          <p class="text-sm text-ink-500">カードをドラッグして工場ステータスを変更できます</p>
        </div>
      </div>
      <div class="grid grid-cols-4 gap-3">
        ${cols.map(col => `
        <div class="rounded p-3 ${col.status==='待機'?'bg-ink-300/20':col.status==='作業中'?'bg-yellow-400/20':col.status==='完成'?'bg-ok/10':'bg-blue-500/10'}" data-col="${col.status}">
          <div class="flex justify-between items-center mb-3">
            <div class="font-black ${col.status==='完成'?'text-ok-dark':col.status==='出荷待ち'?'text-blue-700':''}">${col.status}</div>
            <span class="${col.status==='待機'?'bg-ink-700':col.status==='作業中'?'bg-yellow-500':col.status==='完成'?'bg-ok':'bg-blue-500'} text-white text-xs px-2 py-0.5 rounded-full font-bold">${col.items.length}</span>
          </div>
          <div class="space-y-2 kanban-col min-h-[200px]" data-status="${col.status}">
            ${col.items.map(({order: o, fr}) => {
              const urgent = o.delivery_date_start && dayDiff(o.delivery_date_start, TODAY) <= 1 && dayDiff(o.delivery_date_start, TODAY) >= 0;
              const borderColor = col.status==='待機'?'border-ink-500':col.status==='作業中'?'border-yellow-500':col.status==='完成'?'border-ok':'border-blue-500';
              return `
              <div class="bg-white rounded p-3 shadow-sm border-l-4 ${borderColor} text-sm cursor-pointer kanban-card" draggable="true" data-order-id="${o.id}" onclick="location.hash='#order/${o.id}'">
                <div class="flex justify-between">
                  <span class="font-mono text-xs text-ink-500">${esc(o.order_number)}</span>
                  ${urgent ? `<span class="text-xs text-red-600 font-bold">${o.delivery_date_start === TODAY ? '本日納期' : '明日納期'}</span>` : `<span class="text-xs">${esc(fmt.delivery(o))}</span>`}
                </div>
                <div class="font-bold mt-1 truncate">${esc(fmt.customer(o.customer_id))}</div>
                <div class="text-xs text-ink-500 truncate">${esc(fmt.paper(o.items[0]?.paper_id))} ${o.items[0]?.quantity}枚</div>
                <div class="text-xs text-ink-500 mt-1">状態: <span class="st st-${esc(o.status)}">${esc(o.status)}</span></div>
              </div>`;
            }).join('') || `<div class="text-center text-ink-500 text-xs py-8">（空）</div>`}
          </div>
        </div>`).join('')}
      </div>
    `;
  },
  bind() {
    let draggingId = null;
    $$('.kanban-card').forEach(el => {
      el.addEventListener('dragstart', (e) => {
        draggingId = el.dataset.orderId;
        el.classList.add('drag-ghost');
        e.dataTransfer.effectAllowed = 'move';
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('drag-ghost');
        $$('.kanban-col').forEach(c => c.classList.remove('drag-over'));
      });
    });
    $$('.kanban-col').forEach(col => {
      col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        if (!draggingId) return;
        const newStatus = col.dataset.status;
        const now = new Date().toISOString();
        const patch = { factory_status: newStatus };
        const fr = DB.findFactoryRecord(draggingId);
        if (newStatus === '作業中' && !fr.started_at) patch.started_at = now;
        if (newStatus === '完成') { patch.completed_at = now; patch.completed_by_id = App.currentUserId; }
        DB.updateFactoryRecord(draggingId, patch);
        // sync order status
        const order = DB.find('orders', draggingId);
        let orderStatus = order.status;
        if (newStatus === '待機') orderStatus = '受注';
        else if (newStatus === '作業中') orderStatus = order.status === '受注' ? '製版中' : '印刷中';
        else if (newStatus === '完成') orderStatus = '完成';
        else if (newStatus === '出荷待ち') orderStatus = '完成';
        if (orderStatus !== order.status) DB.updateOrder(draggingId, { status: orderStatus }, `カンバン操作: 工場${newStatus}→受注${orderStatus}`);
        else DB.log('Order', draggingId, `工場ステータス: ${newStatus}`);
        toast(`工場ステータス: ${newStatus}`, 'ok');
        App.render();
      });
    });
  },
};

// ---------- Customers List ----------
Screens.customers = {
  render() {
    const list = DB.all('customers');
    const orders = DB.all('orders');
    return `
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-black">顧客一覧</h1>
        <span class="text-sm text-ink-500">${list.length} 件</span>
      </div>
      <div class="bg-white rounded shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-ink-700/5"><tr class="text-left">
            <th class="px-3 py-2">顧客名</th><th class="px-3 py-2">種別</th><th class="px-3 py-2">地域</th><th class="px-3 py-2">電話</th><th class="px-3 py-2 text-right">累計発注</th><th class="px-3 py-2 text-right">累計売上</th>
          </tr></thead>
          <tbody>
            ${list.map(c => {
              const own = orders.filter(o => o.customer_id === c.id);
              const total = own.reduce((s,o) => s + (o.total_amount || 0), 0);
              return `
              <tr class="border-t hover:bg-brand/5 cursor-pointer" onclick="location.hash='#customer/${c.id}'">
                <td class="px-3 py-2 font-bold">${esc(c.company_name || c.individual_name)}</td>
                <td class="px-3 py-2"><span class="text-xs px-2 py-0.5 rounded ${c.customer_type==='お得意様'?'bg-brand/20 text-brand font-bold':'bg-ink-300/30'}">${esc(c.customer_type)}</span></td>
                <td class="px-3 py-2">${esc(c.area)}</td>
                <td class="px-3 py-2 font-mono text-xs">${esc(c.phone)}</td>
                <td class="px-3 py-2 text-right">${own.length}</td>
                <td class="px-3 py-2 text-right font-mono">${fmt.money(total)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },
};

// ---------- Customer Detail ----------
Screens.customer = {
  render(id) {
    const c = DB.find('customers', id);
    if (!c) return `<div class="text-center py-16 text-ink-500">顧客が見つかりません</div>`;
    const own = DB.all('orders').filter(o => o.customer_id === id).sort((a,b) => (b.received_date||'').localeCompare(a.received_date||''));
    const total = own.reduce((s,o) => s + (o.total_amount || 0), 0);
    return `
      <a href="#customers" class="text-ink-500 text-sm">← 一覧</a>
      <div class="bg-white rounded shadow-sm mb-4 mt-2">
        <div class="p-4 flex justify-between items-start">
          <div>
            <h1 class="text-2xl font-black">${esc(c.company_name || c.individual_name)}</h1>
            <div class="text-sm text-ink-500 mt-1">${esc(c.customer_type)} / ${esc(c.area)}地域 / ${esc(c.phone||'')} ${c.address?' / ' + esc(c.address):''}</div>
            ${c.notes ? `<div class="mt-2 text-xs text-ink-500">メモ: ${esc(c.notes)}</div>` : ''}
          </div>
          <div class="flex gap-2">
            <a href="#order/new" class="bg-brand text-white px-4 py-2 rounded text-sm font-bold" id="btn-new-with">+ この顧客で新規受注</a>
          </div>
        </div>
        <div class="grid grid-cols-4 border-t text-sm">
          <div class="p-3 border-r"><div class="text-xs font-bold text-ink-500">累計受注</div><div class="text-xl font-black">${own.length}件</div></div>
          <div class="p-3 border-r"><div class="text-xs font-bold text-ink-500">累計売上</div><div class="text-xl font-black">${fmt.money(total)}</div></div>
          <div class="p-3 border-r"><div class="text-xs font-bold text-ink-500">初回受注</div><div class="text-xl font-black">${own[own.length-1] ? fmt.dateFull(own[own.length-1].received_date) : '—'}</div></div>
          <div class="p-3"><div class="text-xs font-bold text-ink-500">最終受注</div><div class="text-xl font-black">${own[0] ? fmt.dateFull(own[0].received_date) : '—'}</div></div>
        </div>
      </div>
      <div class="bg-white rounded shadow-sm">
        <div class="p-4 border-b"><h3 class="font-bold">過去発注履歴</h3></div>
        <table class="w-full text-sm">
          <thead class="bg-ink-700/5"><tr class="text-left">
            <th class="px-3 py-2">受付日</th><th class="px-3 py-2">受注番号</th><th class="px-3 py-2">品目・仕様</th><th class="px-3 py-2">数量</th><th class="px-3 py-2 text-right">金額</th><th class="px-3 py-2">状態</th><th class="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            ${own.length === 0 ? `<tr><td colspan="7" class="text-center py-8 text-ink-500">過去の発注はありません</td></tr>` :
              own.map(o => `
              <tr class="border-t hover:bg-brand/5">
                <td class="px-3 py-2">${fmt.dateFull(o.received_date)}</td>
                <td class="px-3 py-2 font-mono text-xs"><a class="hover:underline text-brand font-bold" href="#order/${o.id}">${esc(o.order_number)}</a></td>
                <td class="px-3 py-2 text-xs">${esc(fmt.paper(o.items[0]?.paper_id))} / ${esc(fmt.ink(o.items[0]?.ink_pattern))}</td>
                <td class="px-3 py-2">${o.items.reduce((s,i)=>s+i.quantity,0)}</td>
                <td class="px-3 py-2 text-right font-mono">${fmt.money(o.total_amount)}</td>
                <td class="px-3 py-2"><span class="st st-${esc(o.status)}">${esc(o.status)}</span></td>
                <td class="px-3 py-2"><button class="text-brand text-xs font-bold btn-copy-order" data-src="${o.id}">この仕様でコピー</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  },
  bind(id) {
    $('#btn-new-with')?.addEventListener('click', (e) => {
      e.preventDefault();
      Screens.order_new.initDraft();
      Screens.order_new.draft.customer_id = id;
      location.hash = '#order/new';
    });
    $$('.btn-copy-order').forEach(b => b.addEventListener('click', (e) => {
      const src = DB.find('orders', e.target.dataset.src);
      Screens.order_new.initDraft();
      Screens.order_new.draft.customer_id = src.customer_id;
      Screens.order_new.draft.items = src.items.map(it => ({ ...Screens.order_new.newItem(), ...it, id: 'itmp_' + Math.random().toString(36).slice(2, 8) }));
      location.hash = '#order/new';
      toast('仕様をコピーしました', 'ok');
    }));
  },
};

// ---------- Papers ----------
Screens.papers = {
  render() {
    const list = DB.all('papers');
    return `
      <div class="mb-4"><h1 class="text-2xl font-black">用紙マスタ</h1><p class="text-sm text-ink-500">本番ではCSV一括インポート機能あり</p></div>
      <div class="bg-white rounded shadow-sm">
        <table class="w-full text-sm">
          <thead class="bg-ink-700/5"><tr class="text-left">
            <th class="px-3 py-2">用紙名</th><th class="px-3 py-2">質</th><th class="px-3 py-2">色</th><th class="px-3 py-2 text-right">厚さ(kg)</th><th class="px-3 py-2">サイズ</th><th class="px-3 py-2 text-right">単価</th><th class="px-3 py-2">メジャー</th>
          </tr></thead>
          <tbody>
            ${list.map(p => `
            <tr class="border-t">
              <td class="px-3 py-2 font-bold">${esc(p.paper_name)}</td>
              <td class="px-3 py-2">${esc(p.quality)}</td>
              <td class="px-3 py-2">${esc(p.color)}</td>
              <td class="px-3 py-2 text-right font-mono">${p.thickness_kg}</td>
              <td class="px-3 py-2">${esc(p.paper_size)}</td>
              <td class="px-3 py-2 text-right font-mono">${fmt.money(p.unit_price)}/枚</td>
              <td class="px-3 py-2">${p.is_major ? '⭐' : ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  },
};

// ---------- Settings ----------
Screens.settings = {
  render() {
    return `
      <h1 class="text-2xl font-black mb-4">設定</h1>
      <div class="bg-white rounded shadow-sm p-6 space-y-4 max-w-xl">
        <div>
          <h3 class="font-bold mb-2">データ操作</h3>
          <div class="flex gap-2">
            <button id="set-export" class="border px-4 py-2 rounded">JSON書出</button>
            <label class="border px-4 py-2 rounded cursor-pointer">JSON取込<input id="set-import" type="file" accept=".json" class="hidden"></label>
            <button id="set-reset" class="border border-red-300 text-red-500 px-4 py-2 rounded">初期データに戻す</button>
          </div>
        </div>
        <div>
          <h3 class="font-bold mb-2">統計</h3>
          <ul class="text-sm space-y-1">
            <li>顧客: ${DB.all('customers').length}件</li>
            <li>受注: ${DB.all('orders').length}件</li>
            <li>見積: ${DB.all('quotes').length}件</li>
            <li>用紙: ${DB.all('papers').length}件</li>
            <li>変更履歴: ${DB.all('change_logs').length}件</li>
          </ul>
        </div>
      </div>
    `;
  },
  bind() {
    $('#set-export')?.addEventListener('click', () => exportJson());
    $('#set-reset')?.addEventListener('click', () => { if (confirm('全データを初期状態に戻しますか？')) { DB.reset(); App.render(); toast('初期化しました', 'ok'); } });
    $('#set-import')?.addEventListener('change', (e) => importJson(e.target.files[0]));
  },
};

// ---------- Print View ----------
Screens.print = {
  render(id) {
    const o = DB.find('orders', id);
    if (!o) return `<div>受注が見つかりません</div>`;
    const customer = DB.find('customers', o.customer_id);
    const first = o.items[0];
    return `
      <div class="mb-4 flex justify-between items-center no-print">
        <div>
          <a href="#order/${o.id}" class="text-ink-500 text-sm">← 受注に戻る</a>
          <h1 class="text-2xl font-black">受注票印刷ビュー</h1>
          <p class="text-sm text-ink-500">A4横 / クリアファイル回覧用 / Ctrl+P または「印刷」ボタンで</p>
        </div>
        <button id="btn-print" class="bg-ink-900 text-white px-4 py-2 rounded font-bold">🖨 印刷</button>
      </div>
      <div class="bg-white border-2 border-ink-300/50 p-6 mx-auto print-page" style="width:297mm; max-width:100%; min-height:210mm;">
        <div class="flex justify-between border-b-4 border-ink-900 pb-2 mb-3">
          <div>
            <div class="text-3xl font-black">受 注 票</div>
            <div class="text-sm font-mono">No. ${esc(o.order_number)}</div>
          </div>
          <div class="text-right">
            <div class="text-sm">受付: ${fmt.dateJp(o.received_date)}</div>
            <div class="text-sm">受付者: ${esc(fmt.user(o.received_by_id))}</div>
            <div class="text-sm">受付方法: ${esc(o.reception_method)}</div>
          </div>
        </div>
        <table class="w-full text-sm border-collapse">
          <tr>
            <td class="border p-2 bg-ink-700/5 font-bold w-24">顧 客</td>
            <td class="border p-2 font-bold text-lg" colspan="3">${esc(fmt.customer(o.customer_id))}${customer?.company_name ? ' 御中' : ' 様'}</td>
            <td class="border p-2 bg-ink-700/5 font-bold w-24">納 期</td>
            <td class="border p-2 font-bold ${o.delivery_date_start === TODAY ? 'text-red-600' : ''} text-lg">${esc(fmt.delivery(o))}${o.delivery_date_start === TODAY ? ' ★本日必着' : ''}</td>
          </tr>
          <tr><td class="border p-2 bg-ink-900 text-white font-bold text-center" colspan="6">製 作 明 細</td></tr>
          ${o.items.map((it, i) => `
          <tr>
            <td class="border p-2 bg-ink-700/5 font-bold w-20">#${i+1} 用紙</td>
            <td class="border p-2 font-bold" colspan="2">${esc(fmt.paper(it.paper_id))}${it.paper_other_memo?' / '+esc(it.paper_other_memo):''}</td>
            <td class="border p-2 bg-ink-700/5 font-bold w-20">数量</td>
            <td class="border p-2 text-lg font-bold" colspan="2">${it.quantity}</td>
          </tr>
          <tr>
            <td class="border p-2 bg-ink-700/5 font-bold">インク</td>
            <td class="border p-2" colspan="2"><b>${esc(fmt.ink(it.ink_pattern))}</b></td>
            <td class="border p-2 bg-ink-700/5 font-bold">乗方向</td>
            <td class="border p-2" colspan="2">${esc(it.print_direction)}</td>
          </tr>
          <tr>
            <td class="border p-2 bg-ink-700/5 font-bold">加工</td>
            <td class="border p-2" colspan="5">
              <span class="mr-3">${it.mishin_count>0?'☑':'☐'} ミシン${it.mishin_count>0?it.mishin_count+'本':''}</span>
              <span class="mr-3">${it.folding!=='なし'?'☑':'☐'} 折${it.folding!=='なし'?'('+it.folding+')':''}</span>
              <span class="mr-3">${it.hole_position!=='なし'?'☑':'☐'} 穴${it.hole_position!=='なし'?'('+it.hole_position+')':''}</span>
              <span class="mr-3">${it.numbering_enabled?'☑':'☐'} ナンバリング${it.numbering_enabled?`(${it.numbering_from}〜${it.numbering_to})`:''}</span>
              <span class="mr-3">${it.yacho_style?'☑':'☐'} 野鳥式</span>
              <span class="mr-3">${it.lamination?'☑':'☐'} ラミネート</span>
              ${it.item_notes ? `<div class="text-xs mt-1">メモ: ${esc(it.item_notes)}</div>` : ''}
            </td>
          </tr>`).join('')}
          <tr>
            <td class="border p-2 bg-ink-700/5 font-bold">見 積</td>
            <td class="border p-2 text-lg font-bold" colspan="5">${fmt.money(o.total_amount)}（税込）</td>
          </tr>
          <tr>
            <td class="border p-2 bg-ink-700/5 font-bold">メ モ</td>
            <td class="border p-2" colspan="5" style="height:60px">${esc(o.memo || '')}</td>
          </tr>
        </table>
        <div class="mt-4 grid grid-cols-3 gap-2 text-xs">
          <div class="border-2 p-2 text-center"><div class="font-bold text-ink-500">製版（B）</div><div class="h-10"></div></div>
          <div class="border-2 p-2 text-center"><div class="font-bold text-ink-500">印刷（C）</div><div class="h-10"></div></div>
          <div class="border-2 p-2 text-center"><div class="font-bold text-ink-500">納品・会計（A）</div><div class="h-10"></div></div>
        </div>
      </div>
    `;
  },
  bind() { $('#btn-print')?.addEventListener('click', () => window.print()); },
};

// Route alias: #order/new と #order/:id
// Router は currentScreen=order で Screens.order_new/order を使い分け
// Router.route() は params[0]=='new' なら order_new に切替
const _orig = Router.route;
Router.route = function() {
  const hash = location.hash.slice(1) || 'dashboard';
  const parts = hash.split('/');
  if (parts[0] === 'order' && parts[1] === 'new') {
    this.currentScreen = 'order_new';
    this.params = [];
  } else if (parts[0] === 'order') {
    this.currentScreen = 'order';
    this.params = parts.slice(1);
  } else if (parts[0] === 'customer') {
    this.currentScreen = 'customer';
    this.params = parts.slice(1);
  } else if (parts[0] === 'quote') {
    this.currentScreen = 'quote';
    this.params = parts.slice(1);
  } else if (parts[0] === 'print') {
    this.currentScreen = 'print';
    this.params = parts.slice(1);
  } else {
    this.currentScreen = parts[0];
    this.params = parts.slice(1);
  }
  App.render();
};

// ========= Export / Import =========
function exportJson() {
  const blob = new Blob([JSON.stringify(DB.data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `watanabe_db_${TODAY}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
function importJson(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      DB.data = data;
      DB.save();
      toast('取込完了', 'ok');
      App.render();
    } catch (e) { toast('JSON読込エラー', 'err'); }
  };
  reader.readAsText(file);
}

// ========= Init =========
DB.load();
// populate user selector
const userSel = $('#current-user');
DB.all('users').forEach(u => {
  const opt = document.createElement('option');
  opt.value = u.id; opt.textContent = `${u.name} (${u.role})`;
  userSel.appendChild(opt);
});
userSel.value = App.currentUserId;
userSel.addEventListener('change', (e) => { App.currentUserId = e.target.value; toast(`ログイン: ${fmt.user(App.currentUserId)}`); });
$('#btn-export').addEventListener('click', exportJson);
$('#btn-reset').addEventListener('click', () => {
  if (confirm('全データを初期状態に戻しますか？\n入力・変更したデータは全て失われます。')) {
    DB.reset();
    App.render();
    toast('初期化しました', 'ok');
  }
});
Router.init();
