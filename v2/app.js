/* =====================================================
 * 渡辺謄写堂 業務管理システム v2.0 Functional Mockup
 * localStorage ベース / 単一ファイルアプリ
 * v2.0 修正履歴 (2026-05-15):
 *  - 新規受注: 「出来次第」表記修正、納期区分「仮」追加、「受付者」→「担当者」、品名欄追加
 *  - 制作明細: 用紙単価非表示、2ケ→2穴、左/天のり選択式、野丁式、ラミ3択
 *  - ステータス: 見積もり段階・校正中を追加、削除機能を強化
 *  - 見積書: 複数パターン対応、金額自由入力、値引き非表示既定・選択名目
 *  - 工場看板: 納期に曜日、出荷待ち→納品済み、納期超過は経過日数表示
 *  - 顧客一覧: 検索、税抜小計/消費税/累計売上、地域団体・企業個人の2軸、FAX、納品日
 *  - ダッシュボード: 売上見込み・納期超過・クリック絞込
 *  - TODO: 冊子・ページもの用制作明細フォームは別途追加予定
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
const ORDER_STATUSES    = ['見積もり段階','受注','製版中','校正中','印刷中','完成','納品済','キャンセル'];
const FACTORY_STATUSES  = ['待機','作業中','完成','納品済み'];  // 「出荷待ち」→「納品済み」
const AREAS             = ['亀谷','元町','東和','岩代','市街','その他'];
const RECEPTION_METHODS = ['電話','来客','FAX','メール','LINE','その他'];
// v2.2: ラベル変更（予定/必ず/範囲指定/仮）。値はそのまま維持
const DELIVERY_TYPES    = [
  { value: 'single',    label: '予定' },        // 旧: 指定日
  { value: 'asap',      label: '必ず' },        // 旧: 出来次第（必着の意）
  { value: 'range',     label: '範囲指定' },    // 旧: 期間
  { value: 'tentative', label: '仮' },
];
const FOLDING_TYPES    = ['なし','2つ折','3つ折'];
const HOLE_POSITIONS   = ['なし','天2穴','左2穴'];  // 「ケ」→「穴」
const NORI_POSITIONS   = ['なし','天のり','左のり']; // のり: なし／天のり／左のり（穴と同じパターン）
const LAMINATION_OPTIONS = ['なし','PP貼り 艶あり','PP貼り 艶なし','パウチ'];  // 選択式に変更
const SEND_METHODS     = ['郵送','メール','LINE','直接手渡し'];
const PROCESSING_PRICE = { mishin: 500, folding: 800, hole: 300, numbering: 1500, yacho: 1200, lamination: 2000 };
const DATA_STATUS      = ['持込', 'ゼロから作成', '未受領'];
const TAX_RATES        = [10, 8];
// 顧客分類: 種別（単一選択） v2.1
const CUSTOMER_KINDS = ['地域・団体', '企業・個人'];
// 値引き名目 (v2.2: 「広告料」を正式名称に置換)
const DISCOUNT_LABEL_TYPES = ['値引き','JA全農くみあい飼料㈱広告代負担金','自由記載'];
// v2.2: ページ物用サイズ選択肢
const PAGE_SIZES = ['A4','B5','A5','自由'];
const TAG_PRESETS      = [
  { name: '急ぎ',     color: '#EF4444' },
  { name: 'リピート', color: '#3F9D5E' },
  { name: 'ご祝儀',   color: '#FBBF24' },
  { name: '特殊紙',   color: '#8B5CF6' },
  { name: '重要顧客', color: '#E87825' },
];
const CONTACT_TYPES    = ['電話', '来客', 'メール', 'LINE', 'FAX'];

// ========= Seed Data =========
const TODAY = '2026-05-15';
const SEED_DATA = {
  users: [
    { id: 'u1', name: '渡辺 修一', role: 'A_統括',  email: 'watanabe@toshado.jp' },
    { id: 'u2', name: '佐藤 健',   role: 'B_製版',  email: 'sato@toshado.jp' },
    { id: 'u3', name: '田中 次郎', role: 'C_工場',  email: 'tanaka@toshado.jp' },
    { id: 'u4', name: '渡辺 美佐子', role: '経理',  email: 'mom@toshado.jp' },
  ],
  customers: [
    { id: 'c1',  company_name: '株式会社 高拡散',       kind: '企業・個人', area: '亀谷', phone: '0243-55-0001', fax: '0243-55-0091', address: '二本松市亀谷1-2-3',    notes: '月次発注あり。前回と同仕様リピート多し' },
    { id: 'c2',  company_name: '昭和タクシー株式会社', kind: '企業・個人', area: '市街', phone: '0243-55-0002', fax: '0243-55-0092', address: '二本松市本町5-1',      notes: '' },
    { id: 'c3',  company_name: '佐々木畳店',            kind: '企業・個人', area: '亀谷', phone: '0243-55-0003', fax: '',             address: '二本松市亀谷3-4-5',    notes: '' },
    { id: 'c4',  company_name: '福島県立 足立高等学校', kind: '地域・団体', area: '東和', phone: '0243-55-0004', fax: '0243-55-0094', address: '二本松市東和町8',      notes: '年度末の手引き大量発注あり' },
    { id: 'c5',  company_name: 'ワンワールド株式会社', kind: '企業・個人', area: '市街', phone: '0243-55-0005', fax: '',             address: '二本松市本町2-1',      notes: '' },
    { id: 'c6',  company_name: '郡山建設',              kind: '企業・個人', area: '市街', phone: '024-55-0006',  fax: '024-55-0096',  address: '郡山市駅前1-1',        notes: '' },
    { id: 'c7',  company_name: '福島中央病院',          kind: '地域・団体', area: '岩代', phone: '0243-55-0007', fax: '0243-55-0097', address: '二本松市岩代町10',     notes: '医療用フォーマット' },
    { id: 'c8',  company_name: '二本松市役所 元町支所', kind: '地域・団体', area: '元町', phone: '0243-55-0008', fax: '0243-55-0098', address: '二本松市元町15',       notes: '' },
    { id: 'c9',  individual_name: '山田 太郎',          kind: '企業・個人', area: '東和', phone: '090-1234-5678',fax: '',             address: '',                     notes: '個人名刺リピーター' },
    { id: 'c10', company_name: 'みやざき食堂',          kind: '企業・個人', area: '東和', phone: '0243-55-0010', fax: '',             address: '',                     notes: 'メニュー表も依頼あり' },
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
  contact_logs: [
    { id: 'cl_seed1', customer_id: 'c1', logged_at: '2026-04-20T11:00:00', contact_type: '電話', summary: '名刺の追加発注について。次回4月末に500枚再注文予定とのこと', user_id: 'u1' },
    { id: 'cl_seed2', customer_id: 'c4', logged_at: '2026-04-15T14:30:00', contact_type: '来客', summary: '5月の体育祭プログラム1000部 仕様確認 持込データあり', user_id: 'u1' },
  ],
  settings: {
    invoice_number:  'T3380002016689',
    company_name:    '有限会社 渡辺謄写堂',
    company_postal:  '〒964-0911',
    company_address: '福島県二本松市亀谷1-43-3',
    company_phone:   '0243-22-0613',
    company_fax:     '0243-22-0644',
    bank_info_1:     '東邦銀行二本松支店 普通預金 72767',
    bank_info_2:     '当座預金 0022375',
    bank_holder:     '有限会社渡辺謄写堂 代表取締役 渡辺聡',
    holidays: ['2026-05-03','2026-05-04','2026-05-05','2026-05-06','2026-08-13','2026-08-14','2026-08-15','2026-12-29','2026-12-30','2026-12-31'],
    tags_master: TAG_PRESETS.map(t => ({ ...t })),
  },
};

// ========= Seed Orders (20件) =========
function buildSeedOrders() {
  const mk = (o) => ({
    id: 'o_' + o.order_number,
    order_number: o.order_number,
    title: o.title || '',                       // 品名（v2追加）
    customer_id: o.customer_id,
    received_date: o.received_date,
    delivered_date: o.delivered_date || null,   // 納品日（v2追加）
    received_by_id: o.received_by_id || 'u1',
    reception_method: o.reception_method || '電話',
    delivery_type: o.delivery_type || 'single',
    delivery_date_start: o.delivery_date_start,
    delivery_date_end: o.delivery_date_end || null,
    status: o.status,
    memo: o.memo || '',
    total_amount: o.total_amount,
    data_status: o.data_status || '持込',
    discount_amount: o.discount_amount || 0,
    discount_reason: o.discount_reason || '',
    discount_label_type: o.discount_label_type || '値引き',  // v2: 値引き名目種別
    show_discount: (o.discount_amount || 0) > 0,             // v2: 値引き表示フラグ
    tags: o.tags || [],
    attachments: o.attachments || [],
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
    nori_position: opts.nori_position || 'なし',     // v2: のり（なし/天のり/左のり）, 穴と同じchk+select式
    numbering_enabled: !!opts.numbering_enabled,
    numbering_from: opts.numbering_from || null,
    numbering_to: opts.numbering_to || null,
    yacho_style: !!opts.yacho_style,                // 内部キーは互換維持、UI表記は「野丁式」
    lamination: opts.lamination || 'なし',          // v2: bool→文字列(なし/PP艶あり/PP艶なし/パウチ)
    tax_rate: opts.tax_rate || 10,
    unit_price: opts.unit_price || null,
    subtotal: opts.subtotal || null,
    item_notes: opts.item_notes || '',
  });
  const orders = [
    // 本日 (5/15) - 当日納期 active
    { order_number: '260515-001', customer_id: 'c1', title: '名刺リピート 500枚', received_date: '2026-05-15', delivery_date_start: '2026-05-15', status: '印刷中', total_amount: 5500, memo: '前回と同仕様', tags: ['リピート','重要顧客'], data_status: '持込', items: [ it('p5', 500, '4Cx4C', { subtotal: 5000 }) ] },
    { order_number: '260515-002', customer_id: 'c6', title: 'パンフレット 1000部', received_date: '2026-05-15', delivery_date_start: '2026-06-02', status: '受注', total_amount: 18800, data_status: 'ゼロから作成', items: [ it('p9', 1000, '1Cx0', { subtotal: 18000 }) ] },
    { order_number: '260515-003', customer_id: 'c5', title: '名刺 300枚（急ぎ）', received_date: '2026-05-15', delivery_date_start: '2026-05-16', status: '受注', total_amount: 3300, tags: ['急ぎ'], data_status: '未受領', items: [ it('p6', 300, '4Cx4C', { subtotal: 3000 }) ] },
    // v2新規: 見積もり段階 (見積もりのみで止まっている案件)
    { order_number: '260514-004', customer_id: 'c10', title: 'メニュー表 50部 見積依頼', received_date: '2026-05-14', delivery_date_start: '2026-06-10', delivery_type: 'tentative', status: '見積もり段階', total_amount: 9900, memo: '価格次第で発注検討との連絡', data_status: '未受領', items: [ it('p1', 50, '4Cx4C', { subtotal: 9000 }) ] },
    // v2新規: 校正中
    { order_number: '260513-002', customer_id: 'c4', title: '体育祭プログラム校正版', received_date: '2026-05-13', delivery_date_start: '2026-06-05', status: '校正中', total_amount: 88000, memo: '初校チェック中', items: [ it('p4', 1000, '1Cx1C', { subtotal: 80000, folding: '2つ折' }) ] },
    // 昨日 (5/14)
    { order_number: '260514-007', customer_id: 'c2', title: '車内掲示用ポスター', received_date: '2026-05-14', delivery_date_start: '2026-05-15', status: '印刷中', total_amount: 38200, tags: ['急ぎ','重要顧客'], discount_amount: 2000, discount_reason: 'お得意様割引', discount_label_type: '値引き', data_status: '持込', items: [ it('p1', 2000, '4Cx4C', { subtotal: 35000 }) ] },
    { order_number: '260512-005', customer_id: 'c4', title: '手引き製本', received_date: '2026-05-12', delivery_date_start: '2026-06-05', status: '製版中', total_amount: 128000, memo: '手引き製本', items: [ it('p4', 1000, '1Cx1C', { subtotal: 120000, folding: '2つ折' }) ] },
    { order_number: '260512-009', customer_id: 'c7', title: '診療案内チラシ', received_date: '2026-05-12', delivery_date_start: '2026-05-20', status: '受注', total_amount: 8800, items: [ it('p3', 500, '4Cx4C', { subtotal: 8000 }) ] },
    // 5/10
    { order_number: '260510-012', customer_id: 'c3', title: '畳店チラシ A4', received_date: '2026-05-10', delivery_date_start: '2026-05-14', status: '完成', total_amount: 14800, items: [ it('p10', 1000, '1Cx0', { subtotal: 14000 }) ] },
    { order_number: '260510-008', customer_id: 'c7', title: '院内掲示物', received_date: '2026-05-10', delivery_date_start: '2026-05-14', status: '完成', total_amount: 7700, items: [ it('p1', 500, '4Cx4C', { subtotal: 7000 }) ] },
    // 5/9
    { order_number: '260509-003', customer_id: 'c4', title: '保護者向け配布物', received_date: '2026-05-09', delivery_date_start: '2026-05-22', status: '製版中', total_amount: 132000, items: [ it('p4', 1000, '1Cx1C', { subtotal: 120000 }) ] },
    // 納期超過（テスト用）
    { order_number: '260507-011', customer_id: 'c8', title: '元町支所 掲示物', received_date: '2026-05-07', delivery_date_start: '2026-05-13', status: '印刷中', total_amount: 22000, memo: '※納期2日超過', items: [ it('p1', 500, '4Cx4C', { subtotal: 20000 }) ] },
    // 納品済み (delivered_date を付与)
    { order_number: '260508-005', customer_id: 'c5', title: '名刺 500枚', received_date: '2026-05-08', delivery_date_start: '2026-05-10', delivered_date: '2026-05-10', delivery_type: 'asap', status: '納品済', total_amount: 4620, items: [ it('p5', 500, '4Cx4C', { subtotal: 4200 }) ] },
    { order_number: '260506-002', customer_id: 'c1', title: '営業案内 500枚', received_date: '2026-05-06', delivery_date_start: '2026-05-10', delivered_date: '2026-05-09', status: '納品済', total_amount: 22000, items: [ it('p1', 500, '4Cx4C', { subtotal: 20000 }) ] },
    { order_number: '260503-001', customer_id: 'c2', title: '車両配布チラシ', received_date: '2026-05-03', delivery_date_start: '2026-05-06', delivered_date: '2026-05-06', status: '納品済', total_amount: 11000, items: [ it('p5', 1000, '4Cx4C', { subtotal: 10000 }) ] },
    { order_number: '260502-004', customer_id: 'c6', title: '建築案内', received_date: '2026-05-02', delivery_date_start: '2026-05-05', delivered_date: '2026-05-05', status: '納品済', total_amount: 9900, items: [ it('p9', 500, '1Cx0', { subtotal: 9000 }) ] },
    { order_number: '260501-001', customer_id: 'c8', title: '市報お知らせ折り込み', received_date: '2026-05-01', delivery_date_start: '2026-05-06', delivered_date: '2026-05-06', status: '納品済', total_amount: 88000, items: [ it('p1', 2000, '4Cx4C', { subtotal: 80000, folding: '3つ折' }) ] },
    { order_number: '260423-006', customer_id: 'c10', title: 'メニュー差替', received_date: '2026-04-23', delivery_date_start: '2026-04-28', delivered_date: '2026-04-28', status: '納品済', total_amount: 16500, items: [ it('p1', 500, '4Cx4C', { subtotal: 15000 }) ] },
    // 前月以前
    { order_number: '260315-002', customer_id: 'c1', title: '名刺リピート', received_date: '2026-03-15', delivery_date_start: '2026-03-18', delivered_date: '2026-03-18', status: '納品済', total_amount: 5500, items: [ it('p5', 500, '4Cx4C', { subtotal: 5000 }) ] },
    { order_number: '260215-008', customer_id: 'c2', title: '営業案内増刷', received_date: '2026-02-15', delivery_date_start: '2026-02-20', delivered_date: '2026-02-20', status: '納品済', total_amount: 42000, items: [ it('p1', 2000, '4Cx4C', { subtotal: 38000 }) ] },
    { order_number: '251215-008', customer_id: 'c1', title: '年始名刺', received_date: '2025-12-15', delivery_date_start: '2025-12-20', delivered_date: '2025-12-20', status: '納品済', total_amount: 5500, items: [ it('p5', 500, '4Cx4C', { subtotal: 5000 }) ] },
    { order_number: '251115-003', customer_id: 'c1', title: '名刺秋追加', received_date: '2025-11-15', delivery_date_start: '2025-11-20', delivered_date: '2025-11-20', status: '納品済', total_amount: 5500, items: [ it('p5', 500, '4Cx4C', { subtotal: 5000 }) ] },
    { order_number: '250603-008', customer_id: 'c1', title: '展示会用パンフ', received_date: '2025-06-03', delivery_date_start: '2025-06-10', delivered_date: '2025-06-10', status: '納品済', total_amount: 38200, items: [ it('p1', 2000, '4Cx4C', { subtotal: 35000 }) ] },
    { order_number: '250211-002', customer_id: 'c1', title: '春の案内チラシ', received_date: '2025-02-11', delivery_date_start: '2025-02-18', delivered_date: '2025-02-18', status: '納品済', total_amount: 14800, items: [ it('p9', 1000, '1Cx0', { subtotal: 14000 }) ] },
  ];
  return orders.map(mk);
}
SEED_DATA.orders = buildSeedOrders();

// factory_records for orders (v2: 納品済も含める)
SEED_DATA.factory_records = SEED_DATA.orders
  .filter(o => ['受注','製版中','校正中','印刷中','完成','納品済'].includes(o.status))
  .map(o => ({
    id: 'fr_' + o.id,
    order_id: o.id,
    factory_status:
      o.status === '納品済' ? '納品済み'
      : o.status === '完成' ? '完成'
      : ['製版中','校正中','印刷中'].includes(o.status) ? '作業中'
      : '待機',
    started_at: o.status !== '受注' ? o.received_date + 'T10:00:00' : null,
    completed_at: ['完成','納品済'].includes(o.status) ? o.received_date + 'T14:00:00' : null,
    actual_quantity: null,
    factory_memo: '',
    completed_by_id: o.status === '納品済' ? 'u3' : (o.status === '完成' ? 'u3' : null),
  }));

// sample quotes for a few orders. v2: 複数パターン対応
SEED_DATA.quotes = [
  {
    id: 'q_001', quote_number: 'Q-260515-001', order_id: 'o_260515-001',
    issued_date: '2026-05-15', valid_until: '2026-06-30',
    send_method: 'メール', status: '発行済',
    memo: 'お振込先：二本松信金 本店 普通 1234567 ワタナベトウシャドウ',
    patterns: [
      { id: 'qp_a', label: 'A案: 500枚 / 片面カラー',   amount: 5500,  accepted: true,  show_discount: false, discount_amount: 0, discount_label_type: '値引き', discount_label_text: '' },
      { id: 'qp_b', label: 'B案: 1000枚 / 片面カラー',  amount: 9800,  accepted: false, show_discount: false, discount_amount: 0, discount_label_type: '値引き', discount_label_text: '' },
      { id: 'qp_c', label: 'C案: 1000枚 / 両面カラー', amount: 14800, accepted: false, show_discount: false, discount_amount: 0, discount_label_type: '値引き', discount_label_text: '' },
    ],
    total_amount: 5500,  // 採用パターンの金額（互換用）
  },
];

// ========= DB Layer =========
const DB = {
  KEY: 'watanabe_db_v1',
  data: null,
  load() {
    const raw = localStorage.getItem(this.KEY);
    if (raw) {
      try {
        this.data = JSON.parse(raw);
        this._migrate();  // v2.4: 旧データに新キーを補完
        this.save();
      }
      catch(e) { console.error(e); this.data = clone(SEED_DATA); this.save(); }
    } else {
      this.data = clone(SEED_DATA);
      this.save();
    }
    return this.data;
  },
  // v2.4: 旧データに新フィールドを補う（会社情報など）
  _migrate() {
    if (!this.data.settings) this.data.settings = {};
    const defaults = SEED_DATA.settings;
    Object.keys(defaults).forEach(k => {
      const v = this.data.settings[k];
      if (v === undefined || v === null || v === '') {
        this.data.settings[k] = defaults[k];
      }
    });
    // 旧住所がプレースホルダーのままなら正式値で上書き
    if (this.data.settings.company_address && this.data.settings.company_address.includes('XXX')) {
      this.data.settings.company_address = defaults.company_address;
      this.data.settings.company_postal = defaults.company_postal;
      this.data.settings.company_phone = defaults.company_phone;
      this.data.settings.company_fax = defaults.company_fax;
      this.data.settings.invoice_number = defaults.invoice_number;
      this.data.settings.bank_info_1 = defaults.bank_info_1;
      this.data.settings.bank_info_2 = defaults.bank_info_2;
      this.data.settings.bank_holder = defaults.bank_holder;
    }
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
    const { factory_status, ...orderForm } = form;
    const order = {
      id,
      order_number: this.nextOrderNumber(),
      status: '受注',
      created_by_id: App.currentUserId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...orderForm,
    };
    this.data.orders.push(order);
    // factory record (v2: 新規時に factory_status を draft から指定可能)
    const fs = factory_status || '待機';
    const now = new Date().toISOString();
    this.data.factory_records.push({
      id: this.nextId('fr'),
      order_id: id,
      factory_status: fs,
      started_at: fs === '作業中' ? now : null,
      completed_at: fs === '完成' ? now : null,
      actual_quantity: null,
      factory_memo: '',
      completed_by_id: fs === '完成' ? App.currentUserId : null,
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
  // Quote (v2: 複数パターン対応)
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
      memo: '',
      patterns: [
        {
          id: this.nextId('qp'),
          label: '基本案',
          amount: order.total_amount || 0,
          accepted: true,
          show_discount: (order.discount_amount || 0) > 0,
          discount_amount: order.discount_amount || 0,
          discount_label_type: order.discount_label_type || '値引き',
          discount_label_text: order.discount_reason || '',
        },
      ],
    };
    this.data.quotes.push(q);
    this.log('Quote', q.id, `見積書作成 (${q.quote_number})`);
    this.save();
    return q;
  },
  addQuotePattern(quote_id, label) {
    const q = this.find('quotes', quote_id);
    if (!q) return null;
    if (!q.patterns) q.patterns = [];
    const p = {
      id: this.nextId('qp'),
      label: label || `案${String.fromCharCode(65 + q.patterns.length)}`,
      amount: 0, accepted: false,
      show_discount: false, discount_amount: 0,
      discount_label_type: '値引き', discount_label_text: '',
    };
    q.patterns.push(p);
    this.log('Quote', quote_id, `パターン追加 (${p.label})`);
    this.save();
    return p;
  },
  updateQuotePattern(quote_id, pattern_id, patch) {
    const q = this.find('quotes', quote_id);
    if (!q || !q.patterns) return null;
    const p = q.patterns.find(x => x.id === pattern_id);
    if (!p) return null;
    Object.assign(p, patch);
    // 採用パターンの金額を quote.total_amount に同期 + Order.total_amount にも反映
    const accepted = q.patterns.find(x => x.accepted);
    if (accepted) {
      q.total_amount = accepted.amount;
      const order = this.find('orders', q.order_id);
      if (order) order.total_amount = accepted.amount;
    }
    this.save();
    return p;
  },
  acceptQuotePattern(quote_id, pattern_id) {
    const q = this.find('quotes', quote_id);
    if (!q || !q.patterns) return null;
    q.patterns.forEach(p => p.accepted = p.id === pattern_id);
    const accepted = q.patterns.find(p => p.id === pattern_id);
    if (accepted) {
      q.total_amount = accepted.amount;
      const order = this.find('orders', q.order_id);
      if (order) order.total_amount = accepted.amount;
    }
    this.log('Quote', quote_id, `パターン採用変更`);
    this.save();
  },
  removeQuotePattern(quote_id, pattern_id) {
    const q = this.find('quotes', quote_id);
    if (!q || !q.patterns) return;
    q.patterns = q.patterns.filter(p => p.id !== pattern_id);
    if (q.patterns.length && !q.patterns.some(p => p.accepted)) {
      q.patterns[0].accepted = true;
      q.total_amount = q.patterns[0].amount;
    }
    this.log('Quote', quote_id, `パターン削除`);
    this.save();
  },
  keepOnlyAcceptedPatterns(quote_id) {
    const q = this.find('quotes', quote_id);
    if (!q || !q.patterns) return;
    q.patterns = q.patterns.filter(p => p.accepted);
    this.log('Quote', quote_id, `採用パターンのみに整理`);
    this.save();
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
  // Contact logs
  addContactLog(customer_id, contact_type, summary) {
    const log = {
      id: this.nextId('clg'),
      customer_id, contact_type, summary,
      logged_at: new Date().toISOString(),
      user_id: App.currentUserId,
    };
    if (!this.data.contact_logs) this.data.contact_logs = [];
    this.data.contact_logs.push(log);
    this.log('Customer', customer_id, `連絡履歴追加: ${contact_type}`);
    this.save();
    return log;
  },
  contactLogsFor(customer_id) {
    return (this.data.contact_logs || [])
      .filter(l => l.customer_id === customer_id)
      .sort((a,b) => (b.logged_at||'').localeCompare(a.logged_at||''));
  },
  // Settings
  settings() {
    if (!this.data.settings) this.data.settings = clone(SEED_DATA.settings);
    return this.data.settings;
  },
  updateSettings(patch) {
    Object.assign(this.settings(), patch);
    this.save();
  },
  // Tags
  tagsMaster() { return this.settings().tags_master || []; },
  // Holiday helpers
  isHoliday(iso) {
    const s = this.settings();
    if ((s.holidays || []).includes(iso)) return true;
    const d = new Date(iso);
    const dow = d.getDay();
    return dow === 0 || dow === 6; // 土日
  },
  businessDaysBetween(fromIso, toIso) {
    let n = 0;
    const cur = new Date(fromIso);
    const end = new Date(toIso);
    while (cur < end) {
      const iso = cur.toISOString().slice(0, 10);
      if (!this.isHoliday(iso)) n++;
      cur.setDate(cur.getDate() + 1);
    }
    return n;
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
  // v2: 曜日付きの日付（短縮）
  dateW(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const w = ['日','月','火','水','木','金','土'][d.getDay()];
    return `${d.getMonth()+1}/${d.getDate()}（${w}）`;
  },
  delivery(o) {
    // v2.2: 予定/必ず/範囲指定/仮
    if (o.delivery_type === 'asap')      return o.delivery_date_start ? `必ず ${fmt.dateW(o.delivery_date_start)}` : '必ず（未指定）';
    if (o.delivery_type === 'tentative') return o.delivery_date_start ? `仮 ${fmt.dateW(o.delivery_date_start)}` : '仮（未定）';
    if (o.delivery_type === 'range')     return `${fmt.dateW(o.delivery_date_start)}〜${fmt.dateW(o.delivery_date_end)}`;
    // single = 予定
    return o.delivery_date_start ? `予定 ${fmt.dateW(o.delivery_date_start)}` : '予定（未指定）';
  },
  // v2: 納期超過なら "N日経過" を返す。未到来は null
  overdueText(o) {
    if (!o || !o.delivery_date_start) return null;
    if (['納品済','キャンセル','見積もり段階'].includes(o.status)) return null;
    const diff = dayDiff(TODAY, o.delivery_date_start); // TODAY - 納期 (>0 で超過)
    if (diff > 0) return `${diff}日経過`;
    return null;
  },
  // v2: ラミネートのバッジ文言（なし以外）
  laminationLabel(v) { return (!v || v === 'なし') ? '' : v; },
  tagBadge(name) {
    const t = DB.tagsMaster().find(x => x.name === name) || { color: '#707070' };
    return `<span style="display:inline-block;background:${t.color};color:white;font-size:10px;font-weight:700;padding:1px 6px;border-radius:10px;margin-right:3px;white-space:nowrap;">${esc(name)}</span>`;
  },
  tags(arr) { return (arr || []).map(t => fmt.tagBadge(t)).join(''); },
};

function calcItemPrice(item) {
  // v2.2: ページ物は subtotal を直接利用（自由入力）
  if (item.type === 'page') {
    const subtotal = +item.subtotal || 0;
    const unit_price = item.quantity > 0 ? Math.round(subtotal / item.quantity) : 0;
    return { unit_price, subtotal };
  }
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
  // v2: lamination は文字列。"なし"以外は加工料を加算
  if (item.lamination && item.lamination !== 'なし') extra += PROCESSING_PRICE.lamination;
  const unit_price = Math.round(base);
  const subtotal = Math.round(base * item.quantity + extra);
  return { unit_price, subtotal };
}
function calcOrderTotal(items) {
  return items.reduce((sum, it) => sum + (calcItemPrice(it).subtotal), 0);
}
function calcOrder(items, discount = 0) {
  const subtotal = calcOrderTotal(items);
  const breakdown = {};
  items.forEach(it => {
    const rate = it.tax_rate || 10;
    const sub = calcItemPrice(it).subtotal || 0;
    if (!breakdown[rate]) breakdown[rate] = { rate, subtotal: 0, tax: 0 };
    breakdown[rate].subtotal += sub;
  });
  const afterDiscount = Math.max(0, subtotal - (discount || 0));
  const ratio = subtotal > 0 ? afterDiscount / subtotal : 1;
  Object.values(breakdown).forEach(b => {
    b.subtotal = Math.round(b.subtotal * ratio);
    b.tax = Math.round(b.subtotal * b.rate / 100);
  });
  const totalTax = Object.values(breakdown).reduce((s, b) => s + b.tax, 0);
  return {
    subtotal,
    discount: discount || 0,
    after_discount: afterDiscount,
    tax_breakdown: Object.values(breakdown).sort((a, b) => b.rate - a.rate),
    total_tax: totalTax,
    total: afterDiscount + totalTax,
  };
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
    // Highlight nav (v2: 編集モード時は受注一覧をハイライト)
    const editing = Router.currentScreen === 'order_new' && Screens.order_new.isEditMode;
    const effective = editing ? 'orders' : Router.currentScreen;
    $$('[data-screen]').forEach(b => {
      b.classList.toggle('active', b.dataset.screen === effective || (Router.currentScreen === 'customer' && b.dataset.screen === 'customers'));
    });
    $$('.side-link').forEach(l => {
      const match = l.dataset.screen === effective ||
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

// ---------- Dashboard (v2: 売上見込み・納期超過・クリック絞込) ----------
Screens.dashboard = {
  render() {
    const orders = DB.all('orders');
    const today = TODAY;
    const active = (o) => !['納品済','キャンセル'].includes(o.status);
    const todayDue   = orders.filter(o => o.delivery_date_start === today && active(o));
    const inProgress = orders.filter(o => ['受注','製版中','校正中','印刷中'].includes(o.status));
    const urgent     = orders.filter(o => active(o) && o.delivery_date_start && dayDiff(o.delivery_date_start, today) <= 3 && dayDiff(o.delivery_date_start, today) >= 0);
    const overdue    = orders.filter(o => active(o) && o.status !== '見積もり段階' && o.delivery_date_start && dayDiff(today, o.delivery_date_start) > 0);
    // 今月売上「見込み」: 受注済（キャンセル/見積もり段階を除く）の今月分合計
    const thisMonth  = orders.filter(o => o.received_date && o.received_date.slice(0,7) === today.slice(0,7) && o.status !== 'キャンセル' && o.status !== '見積もり段階');
    const monthSalesForecast = thisMonth.reduce((s,o) => s + (o.total_amount || 0), 0);
    const recentLogs = [...DB.all('change_logs')].sort((a,b) => (b.changed_at || '').localeCompare(a.changed_at || '')).slice(0, 8);

    return `
      <div class="mb-4">
        <h1 class="text-2xl font-black">ダッシュボード</h1>
        <p class="text-sm text-ink-500">${fmt.dateJp(today)} の状況 / カードをクリックで該当案件を絞り込み表示</p>
      </div>
      <div class="grid grid-cols-5 gap-3 mb-6">
        <a href="#orders?filter=today" class="dash-card bg-white border-l-4 border-brand p-4 rounded shadow-sm hover:shadow-md transition" data-filter="today">
          <div class="text-xs text-ink-500 font-bold">本日納品予定</div>
          <div class="text-3xl font-black mt-1">${todayDue.length}<span class="text-sm font-normal text-ink-500">件</span></div>
        </a>
        <a href="#orders?filter=inprogress" class="dash-card bg-white border-l-4 border-ok p-4 rounded shadow-sm hover:shadow-md transition" data-filter="inprogress">
          <div class="text-xs text-ink-500 font-bold">進行中</div>
          <div class="text-3xl font-black mt-1">${inProgress.length}<span class="text-sm font-normal text-ink-500">件</span></div>
        </a>
        <a href="#orders?filter=urgent" class="dash-card bg-white border-l-4 border-red-500 p-4 rounded shadow-sm hover:shadow-md transition" data-filter="urgent">
          <div class="text-xs text-ink-500 font-bold">納期3日以内</div>
          <div class="text-3xl font-black mt-1 ${urgent.length>0?'text-red-600':''}">${urgent.length}<span class="text-sm font-normal text-ink-500">件</span></div>
        </a>
        <a href="#orders?filter=overdue" class="dash-card bg-white border-l-4 border-red-700 p-4 rounded shadow-sm hover:shadow-md transition" data-filter="overdue">
          <div class="text-xs text-ink-500 font-bold">納期超過</div>
          <div class="text-3xl font-black mt-1 ${overdue.length>0?'text-red-700':''}">${overdue.length}<span class="text-sm font-normal text-ink-500">件</span></div>
        </a>
        <div class="bg-white border-l-4 border-blue-500 p-4 rounded shadow-sm">
          <div class="text-xs text-ink-500 font-bold">今月売上見込み</div>
          <div class="text-2xl font-black mt-1">${fmt.money(monthSalesForecast)}</div>
          <div class="text-[10px] text-ink-500">受注済(${thisMonth.length}件) 合計</div>
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
  filter: { q: '', status: '', from: '', to: '', tag: '', quick: '' },
  // v2: ダッシュボードからのクイック絞り込み
  applyQuick(quick) {
    this.filter = { q:'', status:'', from:'', to:'', tag:'', quick };
  },
  render() {
    const all = DB.all('orders').slice().sort((a,b) => (b.received_date || '').localeCompare(a.received_date || ''));
    const f = this.filter;
    const active = (o) => !['納品済','キャンセル'].includes(o.status);
    const filtered = all.filter(o => {
      // クイック絞込
      if (f.quick === 'today'      && !(o.delivery_date_start === TODAY && active(o))) return false;
      if (f.quick === 'inprogress' && !['受注','製版中','校正中','印刷中'].includes(o.status)) return false;
      if (f.quick === 'urgent'     && !(active(o) && o.delivery_date_start && dayDiff(o.delivery_date_start, TODAY) <= 3 && dayDiff(o.delivery_date_start, TODAY) >= 0)) return false;
      if (f.quick === 'overdue'    && !(active(o) && o.status !== '見積もり段階' && o.delivery_date_start && dayDiff(TODAY, o.delivery_date_start) > 0)) return false;
      if (f.quick === 'estimate'   && o.status !== '見積もり段階') return false;
      if (f.q) {
        const cust = fmt.customer(o.customer_id);
        // 全文検索: メモ・明細メモ・顧客備考も対象
        const customerObj = DB.find('customers', o.customer_id);
        const itemNotes = (o.items || []).map(it => `${it.item_notes || ''} ${it.paper_other_memo || ''} ${fmt.paper(it.paper_id)}`).join(' ');
        const searchStr = `${o.order_number} ${o.title||''} ${cust} ${o.memo || ''} ${itemNotes} ${customerObj?.notes || ''} ${(o.tags || []).join(' ')} ${o.discount_reason || ''}`.toLowerCase();
        if (!searchStr.includes(f.q.toLowerCase())) return false;
      }
      if (f.status && o.status !== f.status) return false;
      if (f.from && o.received_date < f.from) return false;
      if (f.to && o.received_date > f.to) return false;
      if (f.tag && !(o.tags || []).includes(f.tag)) return false;
      return true;
    });
    const quickLabel = {today:'本日納品予定', inprogress:'進行中', urgent:'納期3日以内', overdue:'納期超過', estimate:'見積もり段階'}[f.quick] || '';
    return `
      <div class="flex justify-between items-center mb-4">
        <div>
          <h1 class="text-2xl font-black">受注一覧</h1>
          ${quickLabel ? `<p class="text-xs text-ink-500">クイック絞込: <b class="text-brand">${quickLabel}</b> <button id="btn-clear-quick" class="ml-2 text-xs text-red-500 underline">クリア</button></p>` : ''}
        </div>
        <a href="#order/new" class="bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded font-bold shadow-sm">+ 新規受注起票</a>
      </div>
      <div class="bg-white p-4 rounded shadow-sm mb-4 grid grid-cols-6 gap-3 text-sm" id="filter-bar">
        <div class="col-span-2"><label class="block text-xs font-bold mb-1">全文検索（顧客名・番号・メモ・明細・タグ）</label><input id="f-q" class="w-full border rounded px-2 py-1.5" value="${esc(f.q)}" placeholder="🔍 すべての項目を横断検索"></div>
        <div><label class="block text-xs font-bold mb-1">受付日 From</label><input type="date" id="f-from" class="w-full border rounded px-2 py-1.5" value="${esc(f.from)}"></div>
        <div><label class="block text-xs font-bold mb-1">〜 To</label><input type="date" id="f-to" class="w-full border rounded px-2 py-1.5" value="${esc(f.to)}"></div>
        <div><label class="block text-xs font-bold mb-1">ステータス</label>
          <select id="f-status" class="w-full border rounded px-2 py-1.5">
            <option value="">すべて</option>
            ${ORDER_STATUSES.map(s => `<option ${f.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div><label class="block text-xs font-bold mb-1">タグ</label>
          <select id="f-tag" class="w-full border rounded px-2 py-1.5">
            <option value="">すべて</option>
            ${DB.tagsMaster().map(t => `<option ${f.tag===t.name?'selected':''}>${esc(t.name)}</option>`).join('')}
          </select>
        </div>
        <div class="flex items-end gap-2 col-span-6">
          <button id="btn-filter-clear" class="border px-3 py-1.5 rounded text-xs">クリア</button>
        </div>
      </div>

      <div class="bg-white rounded shadow-sm">
        <div class="flex justify-between items-center px-4 py-2 border-b">
          <span class="text-sm">結果 <span class="font-bold">${filtered.length}</span> / ${all.length} 件</span>
        </div>
        <table class="w-full text-sm">
          <thead class="bg-ink-700/5"><tr class="text-left">
            <th class="px-3 py-2">受注番号</th><th class="px-3 py-2">受付</th><th class="px-3 py-2">顧客</th><th class="px-3 py-2">品名 / タグ</th><th class="px-3 py-2">納期</th><th class="px-3 py-2 text-right">金額</th><th class="px-3 py-2">状態</th>
          </tr></thead>
          <tbody>
            ${filtered.length === 0 ? `<tr><td colspan="7" class="text-center py-10 text-ink-500">該当なし</td></tr>` :
              filtered.map(o => {
                const firstItem = o.items[0];
                const overdue = fmt.overdueText(o);
                return `
                <tr class="border-t hover:bg-brand/5 cursor-pointer" onclick="location.hash='#order/${o.id}'">
                  <td class="px-3 py-2 font-mono text-xs">${esc(o.order_number)}</td>
                  <td class="px-3 py-2">${esc(fmt.date(o.received_date))}</td>
                  <td class="px-3 py-2">${esc(fmt.customer(o.customer_id))}</td>
                  <td class="px-3 py-2 text-xs">
                    <div class="font-bold">${esc(o.title || '—')}</div>
                    <div class="text-ink-500">${esc(fmt.paper(firstItem?.paper_id))} ${o.items.length > 1 ? `<span>他${o.items.length-1}件</span>` : ''}</div>
                    ${o.tags && o.tags.length ? `<div class="mt-1">${fmt.tags(o.tags)}</div>` : ''}
                  </td>
                  <td class="px-3 py-2">${esc(fmt.delivery(o))}${overdue ? `<div class="text-xs text-purple-600 font-bold mt-1">${overdue}</div>` : ''}</td>
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
        tag: $('#f-tag')?.value || '',
      };
      App.render();
    };
    ['#f-q','#f-status','#f-from','#f-to','#f-tag'].forEach(sel => {
      const el = $(sel);
      el && el.addEventListener('input', debounce(apply, 300));
      el && el.addEventListener('change', apply);
    });
    $('#btn-filter-clear')?.addEventListener('click', () => { this.filter = { q:'', status:'', from:'', to:'', tag:'', quick:'' }; App.render(); });
    $('#btn-clear-quick')?.addEventListener('click', () => { this.filter.quick = ''; App.render(); });
  },
};

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// ---------- Order New ----------
Screens.order_new = {
  draft: null,
  isEditMode: false,
  editId: null,
  initDraft() {
    this.isEditMode = false;
    this.editId = null;
    this.draft = {
      customer_id: '',
      received_date: TODAY,
      received_by_id: App.currentUserId,
      reception_method: '電話',
      delivery_type: 'single',
      delivery_date_start: '',
      delivery_date_end: '',
      delivered_date: null,
      first_proof_date: null,     // v2.2: 初校日
      used_date: null,             // v2.2: 使用日
      memo: '',
      data_status: '持込',
      discount_amount: 0,
      discount_reason: '',
      discount_label_type: '値引き',
      show_discount: false,       // v2: 値引きは通常非表示
      tags: [],
      attachments: [],
      items: [],                   // v2.3: 通常デフォルトを廃止、明細未追加から開始
      status: '受注',              // v2: 新規時のステータス（見積もり段階 or 受注）
      factory_status: '待機',      // v2: 工場ステータス初期値
    };
  },
  // v2: 既存受注を draft に読み込み、編集モードで開く
  initFromOrder(orderId) {
    const o = DB.find('orders', orderId);
    if (!o) { this.initDraft(); return; }
    const fr = DB.findFactoryRecord(orderId);
    this.draft = clone(o);
    this.draft.show_discount = (o.discount_amount || 0) > 0;
    this.draft.factory_status = fr?.factory_status || '待機';
    // v2.3: 旧データ互換 - items[].title 未設定なら order.title を fallback
    this.draft.items = (this.draft.items || []).map((it, i) => ({
      ...it,
      type: it.type || 'normal',
      title: it.title || (i === 0 ? (o.title || '') : ''),
    }));
    this.isEditMode = true;
    this.editId = orderId;
  },
  newItem() {
    return {
      id: 'itmp_' + Math.random().toString(36).slice(2, 8),
      type: 'normal',            // v2.2: 'normal' | 'page'
      title: '',                 // v2.3: 明細ごとの品名
      paper_id: DB.all('papers')[0]?.id || '',
      paper_other_memo: '',
      quantity: 100,
      ink_pattern: '4Cx4C',
      folding: 'なし',
      mishin_count: 0,
      hole_position: 'なし',
      nori_position: 'なし',     // v2: のり（なし/天のり/左のり）, chk+select
      numbering_enabled: false,
      numbering_from: null,
      numbering_to: null,
      yacho_style: false,        // 内部キーは互換、UI表記は「野丁式」
      lamination: 'なし',         // v2: 選択式
      tax_rate: 10,
      item_notes: '',
    };
  },
  // v2.2: ページ物明細
  newPageItem() {
    return {
      id: 'itmp_' + Math.random().toString(36).slice(2, 8),
      type: 'page',
      title: '',                 // v2.3: 明細ごとの品名
      quantity: 100,
      page_size: 'A4',
      page_size_custom: '',
      page_count: '',
      page_cover: '',
      page_body: '',
      tax_rate: 10,
      subtotal: 0,
      unit_price: 0,
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

    const isEdit = this.isEditMode;
    const editingOrder = isEdit ? DB.find('orders', this.editId) : null;
    const overdueTxt = editingOrder ? fmt.overdueText(editingOrder) : null;
    return `
      <div class="flex justify-between items-start mb-4">
        <div>
          ${isEdit ? `
            <div class="flex items-center gap-3 flex-wrap">
              <a href="#orders" class="text-ink-500 text-sm">← 一覧</a>
              <h1 class="text-2xl font-black">受注 <span class="font-mono">#${esc(editingOrder.order_number)}</span></h1>
              <span class="st st-${esc(editingOrder.status)} text-sm">${esc(editingOrder.status)}</span>
              ${overdueTxt ? `<span class="st st-経過 text-sm">${overdueTxt}</span>` : ''}
            </div>
            <p class="text-sm text-ink-500 mt-1">${esc(fmt.customer(editingOrder.customer_id))} / 受付 ${fmt.dateFull(editingOrder.received_date)} / 納期 ${fmt.delivery(editingOrder)}${editingOrder.delivered_date?` / 納品 ${fmt.dateFull(editingOrder.delivered_date)}`:''}</p>
          ` : `
            <h1 class="text-2xl font-black">受注新規起票 <span class="ml-2 text-xs bg-brand text-white px-2 py-0.5 rounded align-middle">最重要</span></h1>
            <p class="text-sm text-ink-500">お問い合わせ・来客を受けたらここに起票</p>
          `}
        </div>
        <div class="flex gap-2 flex-wrap">
          ${isEdit ? `
            <a href="#print/${editingOrder.id}" class="border px-3 py-2 rounded text-sm">📄 印刷ビュー</a>
            <button id="btn-quote" class="border px-3 py-2 rounded text-sm">📑 見積書</button>
            <button id="btn-delete" class="border border-red-500 text-red-500 px-3 py-2 rounded text-sm">削除</button>
            <button id="btn-cancel" class="border px-4 py-2 rounded font-bold">変更を破棄</button>
            <button id="btn-save" class="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded font-bold">✓ 変更を保存</button>
          ` : `
            <button id="btn-cancel" class="border px-4 py-2 rounded font-bold">キャンセル</button>
            <button id="btn-save" class="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded font-bold">✓ 保存して起票</button>
          `}
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
                  ${isEdit ? '' : `<button id="btn-new-customer" class="border px-2 py-1 rounded text-xs bg-brand/10 text-brand font-bold whitespace-nowrap">+ 新規</button>`}
                </div>
                ${isEdit ? `
                <div class="flex gap-1 mt-2">
                  <input id="f-new-customer-name" class="flex-1 border rounded px-2 py-1.5 text-xs" placeholder="新規顧客名（この内容をコピーして起票）">
                  <button id="btn-copy-new" class="border px-2 py-1 rounded text-xs bg-ok/10 text-ok-dark font-bold whitespace-nowrap">📋 新規でコピー</button>
                </div>
                ` : ''}
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">受付日</label>
                <input type="date" id="f-received-date" class="w-full border rounded px-2 py-1.5" value="${d.received_date}">
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">担当者</label>
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
              <div class="col-span-4">
                <label class="block text-xs font-bold mb-1">納期区分・納期</label>
                <div class="flex gap-2 items-center text-sm flex-wrap">
                  ${DELIVERY_TYPES.map(dt => `
                    <label class="flex items-center gap-1"><input type="radio" name="dtype" value="${dt.value}" ${d.delivery_type===dt.value?'checked':''}>${dt.label}</label>`).join('')}
                  <input type="date" id="f-dstart" class="border rounded px-2 py-1.5 ml-2" value="${d.delivery_date_start||''}">
                  <span id="dend-wrap" style="display:${d.delivery_type==='range'?'inline':'none'}">
                    〜 <input type="date" id="f-dend" class="border rounded px-2 py-1.5" value="${d.delivery_date_end||''}">
                  </span>
                  ${d.delivery_date_start && d.delivery_type !== 'tentative' ? `<span class="text-xs text-ink-500 ml-2">営業日換算: <b>${DB.businessDaysBetween(TODAY, d.delivery_date_start)}日</b></span>` : ''}
                  ${d.delivery_type==='tentative' ? `<span class="text-xs text-amber-600 font-bold">※「仮」は確定前の見込み納期</span>` : ''}
                  ${d.delivery_type==='asap' ? `<span class="text-xs text-red-600 font-bold">※「必ず」は必着</span>` : ''}
                </div>
              </div>
              <!-- v2.2: 初校日 / 使用日 / 納品日 -->
              <div>
                <label class="block text-xs font-bold mb-1">初校日</label>
                <input type="date" id="f-first-proof-date" class="w-full border rounded px-2 py-1.5" value="${d.first_proof_date || ''}">
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">使用日</label>
                <input type="date" id="f-used-date" class="w-full border rounded px-2 py-1.5" value="${d.used_date || ''}">
              </div>
              <div>
                <label class="block text-xs font-bold mb-1">納品日</label>
                <input type="date" id="f-delivered-date" class="w-full border rounded px-2 py-1.5" value="${d.delivered_date || ''}">
              </div>
              <div></div>
            </div>
          </div>

          <!-- 案件属性 -->
          <div class="bg-white rounded shadow-sm">
            <div class="bg-ink-900 text-white px-4 py-2 rounded-t font-bold">案件属性</div>
            <div class="p-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <label class="block text-xs font-bold mb-1">入稿データ</label>
                <select id="f-data-status" class="w-full border rounded px-2 py-1.5">
                  ${DATA_STATUS.map(s => `<option ${d.data_status===s?'selected':''}>${s}</option>`).join('')}
                </select>
              </div>
              <!-- v2: 値引きは通常非表示、トグルで開く -->
              <div class="col-span-2">
                <label class="flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input type="checkbox" id="f-show-discount" ${d.show_discount?'checked':''}> 値引きを使用する
                </label>
                <div id="discount-block" class="grid grid-cols-3 gap-2 mt-2" style="display:${d.show_discount?'grid':'none'}">
                  <div>
                    <label class="block text-xs font-bold mb-1">名目</label>
                    <select id="f-discount-label-type" class="w-full border rounded px-2 py-1.5 text-xs">
                      ${DISCOUNT_LABEL_TYPES.map(t => `<option ${d.discount_label_type===t?'selected':''}>${t}</option>`).join('')}
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-bold mb-1">金額</label>
                    <input type="number" id="f-discount" class="w-full border rounded px-2 py-1.5 text-right font-mono text-xs" min="0" step="100" value="${d.discount_amount||0}">
                  </div>
                  <div>
                    <label class="block text-xs font-bold mb-1">補足（広告料名等）</label>
                    <input type="text" id="f-discount-reason" class="w-full border rounded px-2 py-1.5 text-xs" placeholder="○○広告料 等" value="${esc(d.discount_reason||'')}">
                  </div>
                </div>
              </div>
              <div class="col-span-3">
                <label class="block text-xs font-bold mb-1">案件タグ</label>
                <div class="flex flex-wrap gap-1.5">
                  ${DB.tagsMaster().map(t => `
                    <label class="cursor-pointer">
                      <input type="checkbox" class="hidden tag-check" value="${esc(t.name)}" ${d.tags.includes(t.name)?'checked':''}>
                      <span class="inline-block px-2 py-0.5 text-xs font-bold rounded-full border-2" style="border-color:${t.color}; ${d.tags.includes(t.name)?`background:${t.color};color:white;`:`color:${t.color};background:white;`}">${esc(t.name)}</span>
                    </label>`).join('')}
                </div>
              </div>
              <div class="col-span-3">
                <label class="block text-xs font-bold mb-1">入稿データ・参考資料の添付</label>
                <input type="file" id="f-attach" class="w-full border rounded px-2 py-1.5 text-sm" multiple>
                ${(d.attachments||[]).length ? `<div class="mt-2 flex flex-wrap gap-1 text-xs">
                  ${d.attachments.map((a, ai) => `<span class="bg-brand/10 text-brand px-2 py-1 rounded flex items-center gap-1">📎 ${esc(a.name)} <button class="text-red-500 font-bold btn-remove-attach" data-idx="${ai}">×</button></span>`).join('')}
                </div>` : ''}
              </div>
            </div>
          </div>

          <!-- 明細 -->
          <div class="bg-white rounded shadow-sm">
            <div class="bg-ink-900 text-white px-4 py-2 rounded-t font-bold flex justify-between items-center">
              <span>製作明細（複数行対応）</span>
              <div class="flex gap-1">
                <button id="btn-add-item" class="text-xs border border-white/50 px-2 py-0.5 rounded hover:bg-white/10">+ 通常を追加</button>
                <button id="btn-add-page-item" class="text-xs border border-purple-300 bg-purple-700 px-2 py-0.5 rounded hover:bg-purple-600">+ 📖 ページ物を追加</button>
              </div>
            </div>
            <div id="items-container">
              ${d.items.length === 0 ? `
                <div class="p-8 text-center text-ink-500 border-2 border-dashed border-ink-300 m-4 rounded">
                  <div class="text-2xl mb-2">📝</div>
                  <div class="font-bold mb-1">明細が未追加です</div>
                  <div class="text-xs">右上の「+ 通常を追加」または「+ 📖 ページ物を追加」から明細を追加してください。<br>※ 各明細ごとに品名を入力します。ページ物のみの受注も可能です。</div>
                </div>
              ` : d.items.map((it, i) => this.renderItem(it, i, majorPapers, otherPapers)).join('')}
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
              ${(() => {
                // v2: 値引きトグルがOFFなら割引適用しない
                const useDiscount = !!d.show_discount;
                const calc = calcOrder(d.items, useDiscount ? (d.discount_amount || 0) : 0);
                let html = '';
                d.items.forEach((it, i) => {
                  const { subtotal } = calcItemPrice(it);
                  html += `<div class="flex justify-between text-xs"><span>明細 #${i+1}（${it.tax_rate||10}%）</span><span class="font-mono">${fmt.money(subtotal)}</span></div>`;
                });
                html += '<hr>';
                html += `<div class="flex justify-between"><span>小計</span><span class="font-mono font-bold">${fmt.money(calc.subtotal)}</span></div>`;
                if (calc.discount > 0) {
                  html += `<div class="flex justify-between text-red-600"><span>${esc(d.discount_label_type || '値引き')}${d.discount_reason ? `<span class="text-[10px] text-ink-500 ml-1">(${esc(d.discount_reason)})</span>`:''}</span><span class="font-mono">-${fmt.money(calc.discount)}</span></div>`;
                }
                calc.tax_breakdown.forEach(b => {
                  html += `<div class="flex justify-between text-ink-500"><span>消費税（${b.rate}%）</span><span class="font-mono">${fmt.money(b.tax)}</span></div>`;
                });
                html += '<hr>';
                html += `<div class="flex justify-between text-lg"><span class="font-bold">合計</span><span class="font-black text-brand">${fmt.money(calc.total)}</span></div>`;
                return html;
              })()}
            </div>
          </div>

          <!-- v2: ステータス操作（新規時は見積もり段階/受注のみ） -->
          <div class="bg-white rounded shadow-sm">
            <div class="px-4 py-2 border-b font-bold">ステータス操作</div>
            <div class="p-3 space-y-2 text-sm">
              ${(isEdit ? ORDER_STATUSES : ['見積もり段階','受注']).map(s => `
                <button class="w-full border px-3 py-2 rounded text-left text-sm ${d.status===s?'bg-brand text-white border-brand font-bold':'hover:bg-ink-700/5'} draft-set-status" data-status="${s}">
                  ${d.status===s?'● ':''}<span class="st st-${esc(s)} text-[10px] mr-1">${esc(s)}</span>
                </button>`).join('')}
            </div>
          </div>

          <!-- v2: 工場ステータス -->
          <div class="bg-white rounded shadow-sm">
            <div class="px-4 py-2 border-b font-bold">工場ステータス</div>
            <div class="p-3 space-y-2 text-sm">
              ${FACTORY_STATUSES.map(s => `
                <button class="w-full border px-3 py-2 rounded text-left text-sm ${d.factory_status===s?'bg-ink-900 text-white border-ink-900 font-bold':'hover:bg-ink-700/5'} draft-set-factory" data-fstatus="${s}">
                  ${d.factory_status===s?'● ':''}${esc(s)}
                </button>`).join('')}
            </div>
          </div>

          ${customer && !isEdit ? `
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

          ${isEdit ? `
          <div class="bg-white rounded shadow-sm">
            <div class="px-4 py-2 border-b font-bold">変更履歴</div>
            <ul class="text-xs divide-y max-h-80 overflow-auto">
              ${(() => {
                const logs = DB.all('change_logs').filter(l => l.target_id === editingOrder.id).sort((a,b) => (b.changed_at||'').localeCompare(a.changed_at||''));
                return logs.length === 0 ? `<li class="px-3 py-4 text-ink-500 text-center">履歴なし</li>` :
                  logs.map(l => `
                  <li class="px-3 py-2">
                    <div class="flex justify-between text-ink-500">
                      <span>${esc(fmt.user(l.changed_by_id))}</span>
                      <span>${fmt.dateTime(l.changed_at)}</span>
                    </div>
                    <div>${esc(l.change_summary)}</div>
                  </li>`).join('');
              })()}
            </ul>
          </div>` : ''}
        </div>
      </div>
    `;
  },
  renderItem(it, i, majorPapers, otherPapers) {
    // v2.2: ページ物明細は別レンダー
    if (it.type === 'page') return this.renderPageItem(it, i);
    const { subtotal } = calcItemPrice(it);
    return `
      <div class="p-4 ${i > 0 ? 'border-t' : 'border-t'}" data-item-idx="${i}">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-black bg-ink-700 text-white px-2 py-0.5 rounded">明細 #${i+1}</span>
          <span class="text-[10px] text-ink-500">通常</span>
          <button class="text-xs text-red-500 ml-auto btn-remove-item" data-idx="${i}">削除</button>
        </div>
        <div class="mb-2">
          <label class="block text-xs font-bold mb-1 text-red-600">* 品名</label>
          <input class="w-full border rounded px-2 py-1.5 text-base font-bold item-title" data-idx="${i}" placeholder="例: 名刺リピート 500枚" value="${esc(it.title||'')}">
        </div>
        <div class="grid grid-cols-6 gap-2 text-sm">
          <div class="col-span-2">
            <label class="block text-xs font-bold mb-1">用紙</label>
            <select class="w-full border rounded px-2 py-1.5 item-paper" data-idx="${i}">
              <!-- v2: 用紙単価は表示しない -->
              <optgroup label="よく使う紙">
                ${majorPapers.map(p => `<option value="${p.id}" ${it.paper_id===p.id?'selected':''}>${esc(p.paper_name)}</option>`).join('')}
              </optgroup>
              <optgroup label="その他">
                ${otherPapers.map(p => `<option value="${p.id}" ${it.paper_id===p.id?'selected':''}>${esc(p.paper_name)}</option>`).join('')}
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
            <!-- v2: 穴位置（2ケ→2穴） -->
            <label class="flex items-center gap-1"><input type="checkbox" class="item-hole-on" data-idx="${i}" ${it.hole_position!=='なし'?'checked':''}> 穴</label>
            <select class="border rounded px-1 py-0.5 text-xs item-hole" data-idx="${i}" ${it.hole_position==='なし'?'disabled':''}>
              <option value="天2穴" ${it.hole_position==='天2穴'?'selected':''}>天2穴</option>
              <option value="左2穴" ${it.hole_position==='左2穴'?'selected':''}>左2穴</option>
            </select>
            <!-- v2: のり（chk + select: 天のり/左のり） -->
            <label class="flex items-center gap-1"><input type="checkbox" class="item-nori-on" data-idx="${i}" ${it.nori_position && it.nori_position!=='なし'?'checked':''}> のり</label>
            <select class="border rounded px-1 py-0.5 text-xs item-nori" data-idx="${i}" ${(!it.nori_position || it.nori_position==='なし')?'disabled':''}>
              <option value="天のり" ${it.nori_position==='天のり'?'selected':''}>天のり</option>
              <option value="左のり" ${it.nori_position==='左のり'?'selected':''}>左のり</option>
            </select>
            <label class="flex items-center gap-1"><input type="checkbox" class="item-num" data-idx="${i}" ${it.numbering_enabled?'checked':''}> ナンバリング</label>
            <div class="flex gap-1 items-center text-xs">
              <input class="w-14 border rounded px-1 item-num-from" data-idx="${i}" placeholder="from" value="${it.numbering_from||''}" ${!it.numbering_enabled?'disabled':''}>
              <span>〜</span>
              <input class="w-14 border rounded px-1 item-num-to" data-idx="${i}" placeholder="to" value="${it.numbering_to||''}" ${!it.numbering_enabled?'disabled':''}>
            </div>
            <!-- v2: 野鳥式 → 野丁式 -->
            <label class="flex items-center gap-1"><input type="checkbox" class="item-yacho" data-idx="${i}" ${it.yacho_style?'checked':''}> 野丁式</label>
            <div></div>
            <!-- v2: ラミネートは野丁式の下段、select幅は他と同じ -->
            <label class="flex items-center gap-1"><input type="checkbox" class="item-lam-on" data-idx="${i}" ${it.lamination && it.lamination!=='なし'?'checked':''}> ラミネート</label>
            <select class="border rounded px-1 py-0.5 text-xs item-lam" data-idx="${i}" ${(!it.lamination || it.lamination==='なし')?'disabled':''}>
              ${LAMINATION_OPTIONS.filter(l => l !== 'なし').map(l => `<option value="${l}" ${it.lamination===l?'selected':''}>${l}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="mt-2 flex gap-2 items-center">
          <label class="text-xs font-bold">税率</label>
          <select class="border rounded px-1 py-0.5 text-xs item-tax" data-idx="${i}">
            ${TAX_RATES.map(r => `<option value="${r}" ${it.tax_rate===r?'selected':''}>${r}%${r===8?' 軽減':' 標準'}</option>`).join('')}
          </select>
          <input class="flex-1 border rounded px-2 py-1.5 text-sm item-note" data-idx="${i}" placeholder="この明細のメモ（任意）" value="${esc(it.item_notes)}">
        </div>
      </div>`;
  },
  // v2.2: ページ物明細レンダー
  renderPageItem(it, i) {
    return `
      <div class="p-4 border-t bg-purple-50/40" data-item-idx="${i}">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-black bg-purple-700 text-white px-2 py-0.5 rounded">明細 #${i+1}</span>
          <span class="text-[10px] text-purple-700 font-bold">📖 ページ物</span>
          <button class="text-xs text-red-500 ml-auto btn-remove-item" data-idx="${i}">削除</button>
        </div>
        <div class="mb-2">
          <label class="block text-xs font-bold mb-1 text-red-600">* 品名</label>
          <input class="w-full border rounded px-2 py-1.5 text-base font-bold item-title" data-idx="${i}" placeholder="例: 40周年記念誌 / 第○回総会資料" value="${esc(it.title||'')}">
        </div>
        <div class="grid grid-cols-6 gap-2 text-sm">
          <div class="col-span-2">
            <label class="block text-xs font-bold mb-1">サイズ</label>
            <div class="flex gap-1">
              <select class="border rounded px-2 py-1.5 item-page-size flex-1" data-idx="${i}">
                ${PAGE_SIZES.map(s => `<option value="${s}" ${it.page_size===s?'selected':''}>${s}</option>`).join('')}
              </select>
              ${it.page_size === '自由' ? `<input class="flex-1 border rounded px-2 py-1.5 item-page-size-custom" data-idx="${i}" placeholder="サイズ入力" value="${esc(it.page_size_custom||'')}">` : ''}
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold mb-1">数量(部)</label>
            <input type="number" min="1" class="w-full border rounded px-2 py-1.5 text-right font-mono item-page-qty" data-idx="${i}" value="${it.quantity}">
          </div>
          <div class="col-span-2">
            <label class="block text-xs font-bold mb-1">ページ数</label>
            <input class="w-full border rounded px-2 py-1.5 item-page-count" data-idx="${i}" value="${esc(it.page_count||'')}" placeholder="例: 本文64P + 表紙">
          </div>
          <div>
            <label class="block text-xs font-bold mb-1">小計</label>
            <input type="number" min="0" step="100" class="w-full border rounded px-2 py-1.5 text-right font-mono item-page-subtotal" data-idx="${i}" value="${it.subtotal||0}">
          </div>
          <div class="col-span-3">
            <label class="block text-xs font-bold mb-1">表紙</label>
            <input class="w-full border rounded px-2 py-1.5 item-page-cover" data-idx="${i}" value="${esc(it.page_cover||'')}" placeholder="例: コート135kg 4色 + PP艶あり">
          </div>
          <div class="col-span-3">
            <label class="block text-xs font-bold mb-1">本文</label>
            <input class="w-full border rounded px-2 py-1.5 item-page-body" data-idx="${i}" value="${esc(it.page_body||'')}" placeholder="例: 上質90kg 1C × 64P">
          </div>
        </div>
        <div class="mt-2 flex gap-2 items-center">
          <label class="text-xs font-bold">税率</label>
          <select class="border rounded px-1 py-0.5 text-xs item-tax" data-idx="${i}">
            ${TAX_RATES.map(r => `<option value="${r}" ${it.tax_rate===r?'selected':''}>${r}%${r===8?' 軽減':' 標準'}</option>`).join('')}
          </select>
          <input class="flex-1 border rounded px-2 py-1.5 text-sm item-note" data-idx="${i}" placeholder="この明細のメモ（任意）" value="${esc(it.item_notes||'')}">
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
      $$('.item-title').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].title = e.target.value; }));
      $$('.item-paper').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].paper_id = e.target.value; rerenderItems(); updateSummary(); }));
      $$('.item-paper-other').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].paper_other_memo = e.target.value; }));
      $$('.item-qty').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].quantity = +e.target.value || 0; updateSummary(); }));
      $$('.item-ink').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].ink_pattern = e.target.value; updateSummary(); }));
      $$('.item-mishin-on').forEach(el => el.addEventListener('change', (e) => { const idx = +e.target.dataset.idx; d.items[idx].mishin_count = e.target.checked ? 1 : 0; rerenderItems(); updateSummary(); }));
      $$('.item-mishin-count').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].mishin_count = +e.target.value; updateSummary(); }));
      $$('.item-folding-on').forEach(el => el.addEventListener('change', (e) => { const idx = +e.target.dataset.idx; d.items[idx].folding = e.target.checked ? '2つ折' : 'なし'; rerenderItems(); updateSummary(); }));
      $$('.item-folding').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].folding = e.target.value; }));
      $$('.item-hole-on').forEach(el => el.addEventListener('change', (e) => { const idx = +e.target.dataset.idx; d.items[idx].hole_position = e.target.checked ? '天2穴' : 'なし'; rerenderItems(); updateSummary(); }));
      $$('.item-hole').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].hole_position = e.target.value; }));
      $$('.item-nori-on').forEach(el => el.addEventListener('change', (e) => { const idx = +e.target.dataset.idx; d.items[idx].nori_position = e.target.checked ? '天のり' : 'なし'; rerenderItems(); updateSummary(); }));
      $$('.item-nori').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].nori_position = e.target.value; }));
      $$('.item-num').forEach(el => el.addEventListener('change', (e) => { const idx = +e.target.dataset.idx; d.items[idx].numbering_enabled = e.target.checked; rerenderItems(); updateSummary(); }));
      $$('.item-num-from').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].numbering_from = e.target.value; }));
      $$('.item-num-to').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].numbering_to = e.target.value; }));
      $$('.item-yacho').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].yacho_style = e.target.checked; updateSummary(); }));
      $$('.item-lam-on').forEach(el => el.addEventListener('change', (e) => { const idx = +e.target.dataset.idx; d.items[idx].lamination = e.target.checked ? 'PP貼り 艶あり' : 'なし'; rerenderItems(); updateSummary(); }));
      $$('.item-lam').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].lamination = e.target.value; updateSummary(); }));
      $$('.item-tax').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].tax_rate = +e.target.value; updateSummary(); }));
      $$('.item-note').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].item_notes = e.target.value; }));
      $$('.btn-remove-item').forEach(el => el.addEventListener('click', (e) => { d.items.splice(+e.target.dataset.idx, 1); rerenderItems(); updateSummary(); }));
      // v2.2: ページ物明細のハンドラ
      $$('.item-page-size').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].page_size = e.target.value; rerenderItems(); }));
      $$('.item-page-size-custom').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].page_size_custom = e.target.value; }));
      $$('.item-page-qty').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].quantity = +e.target.value || 0; updateSummary(); }));
      $$('.item-page-count').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].page_count = e.target.value; }));
      $$('.item-page-cover').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].page_cover = e.target.value; }));
      $$('.item-page-body').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].page_body = e.target.value; }));
      $$('.item-page-subtotal').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].subtotal = +e.target.value || 0; updateSummary(); }));
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
      App.render();
    }));
    $('#f-dstart')?.addEventListener('change', (e) => { d.delivery_date_start = e.target.value; });
    $('#f-dend')?.addEventListener('change', (e) => { d.delivery_date_end = e.target.value; });
    // v2.2: 初校日 / 使用日 / 納品日
    $('#f-first-proof-date')?.addEventListener('change', (e) => { d.first_proof_date = e.target.value || null; });
    $('#f-used-date')?.addEventListener('change', (e) => { d.used_date = e.target.value || null; });
    $('#f-delivered-date')?.addEventListener('change', (e) => { d.delivered_date = e.target.value || null; });
    $('#f-memo')?.addEventListener('input', (e) => { d.memo = e.target.value; });
    $('#f-data-status')?.addEventListener('change', (e) => { d.data_status = e.target.value; });
    // v2: 値引きトグル
    $('#f-show-discount')?.addEventListener('change', (e) => {
      d.show_discount = e.target.checked;
      if (!e.target.checked) { d.discount_amount = 0; d.discount_reason = ''; }
      App.render();
    });
    $('#f-discount-label-type')?.addEventListener('change', (e) => { d.discount_label_type = e.target.value; });
    $('#f-discount')?.addEventListener('change', (e) => { d.discount_amount = +e.target.value || 0; updateSummary(); });
    $('#f-discount-reason')?.addEventListener('input', (e) => { d.discount_reason = e.target.value; });
    $$('.tag-check').forEach(el => el.addEventListener('change', (e) => {
      const v = e.target.value;
      if (e.target.checked) { if (!d.tags.includes(v)) d.tags.push(v); }
      else { d.tags = d.tags.filter(t => t !== v); }
      App.render();
    }));
    $('#f-attach')?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files || []);
      Promise.all(files.map(f => new Promise(res => {
        const r = new FileReader();
        r.onload = () => res({ name: f.name, type: f.type, size: f.size, data_url: r.result });
        r.readAsDataURL(f);
      }))).then(arr => {
        d.attachments = (d.attachments || []).concat(arr);
        toast(`${arr.length}件添付しました`, 'ok');
        App.render();
      });
    });
    $$('.btn-remove-attach').forEach(el => el.addEventListener('click', (e) => {
      const idx = +e.target.dataset.idx;
      d.attachments.splice(idx, 1);
      App.render();
    }));
    $('#btn-add-item')?.addEventListener('click', () => { d.items.push(this.newItem()); rerenderItems(); updateSummary(); });
    // v2.2: ページ物を追加
    $('#btn-add-page-item')?.addEventListener('click', () => { d.items.push(this.newPageItem()); rerenderItems(); updateSummary(); });
    $('#btn-cancel')?.addEventListener('click', () => {
      if (this.isEditMode) {
        if (confirm('変更を破棄しますか？')) { this.initFromOrder(this.editId); App.render(); }
      } else {
        if (confirm('入力内容を破棄しますか？')) { this.initDraft(); location.hash = '#orders'; }
      }
    });
    $('#btn-save')?.addEventListener('click', () => this.save());
    $('#btn-new-customer')?.addEventListener('click', () => this.openNewCustomerModal());
    // v2: ステータス操作・工場ステータスボタン
    $$('.draft-set-status').forEach(el => el.addEventListener('click', () => {
      d.status = el.dataset.status;
      App.render();
    }));
    $$('.draft-set-factory').forEach(el => el.addEventListener('click', () => {
      d.factory_status = el.dataset.fstatus;
      App.render();
    }));
    // v2: 編集モード時の「新規でコピー」
    if (this.isEditMode) {
      $('#btn-copy-new')?.addEventListener('click', () => {
        const name = $('#f-new-customer-name').value.trim();
        if (!name) { toast('新規顧客名を入力してください', 'err'); return; }
        const srcOrder = DB.find('orders', this.editId);
        if (!srcOrder) return;
        // 新規顧客を作成（最低限の情報、後で詳細を編集してもらう）
        const c = DB.createCustomer({
          company_name: name,
          individual_name: '',
          kind: '企業・個人',
          area: 'その他',
          phone: '', fax: '', address: '',
          notes: `受注 ${srcOrder.order_number} よりコピーで作成`,
        });
        // 新規モードに切り替え（draftを新規構造で構築）
        this.isEditMode = false;
        this.editId = null;
        this.draft = {
          title: srcOrder.title || '',
          customer_id: c.id,
          received_date: TODAY,
          received_by_id: App.currentUserId,
          reception_method: '電話',
          delivery_type: 'single',
          delivery_date_start: '',
          delivery_date_end: '',
          delivered_date: null,
          memo: srcOrder.memo || '',
          data_status: srcOrder.data_status || '持込',
          discount_amount: srcOrder.discount_amount || 0,
          discount_reason: srcOrder.discount_reason || '',
          discount_label_type: srcOrder.discount_label_type || '値引き',
          show_discount: (srcOrder.discount_amount || 0) > 0,
          tags: [...(srcOrder.tags || [])],
          attachments: [],
          items: srcOrder.items.map(it => ({ ...it, id: 'itmp_' + Math.random().toString(36).slice(2, 8) })),
          status: '受注',
          factory_status: '待機',
        };
        location.hash = '#order/new';
        toast(`新規顧客「${name}」で内容をコピーしました`, 'ok');
      });
      $('#btn-quote')?.addEventListener('click', () => {
        let q = DB.all('quotes').find(q => q.order_id === this.editId);
        if (!q) q = DB.createQuote(this.editId);
        location.hash = `#quote/${q.id}`;
      });
      $('#btn-delete')?.addEventListener('click', () => {
        const o = DB.find('orders', this.editId);
        if (!o) return;
        if (!confirm(`受注 ${o.order_number} を削除しますか？\nこの操作は取り消せません。`)) return;
        DB.deleteOrder(this.editId);
        toast('受注を削除しました');
        this.initDraft();
        location.hash = '#orders';
      });
    }
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
            <select id="nc-kind" class="w-full border rounded px-2 py-1.5">${CUSTOMER_KINDS.map(k=>`<option>${k}</option>`).join('')}</select>
          </div>
          <div><label class="block text-xs font-bold mb-1">地域</label>
            <select id="nc-area" class="w-full border rounded px-2 py-1.5">${AREAS.map(a=>`<option>${a}</option>`).join('')}</select>
          </div>
          <div><label class="block text-xs font-bold mb-1">電話</label><input id="nc-phone" class="w-full border rounded px-2 py-1.5"></div>
          <div><label class="block text-xs font-bold mb-1">FAX</label><input id="nc-fax" class="w-full border rounded px-2 py-1.5"></div>
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
          kind: $('#nc-kind').value, area: $('#nc-area').value,
          phone: $('#nc-phone').value, fax: $('#nc-fax').value,
          address: $('#nc-address').value, notes: $('#nc-notes').value,
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
    // v2.3: 各明細の品名を必須化
    const missingTitle = d.items.findIndex(it => !it.title || !it.title.trim());
    if (missingTitle >= 0) { toast(`明細 #${missingTitle+1} の品名を入力してください`, 'err'); return; }
    if (!d.delivery_date_start && d.delivery_type !== 'tentative') { toast('納期日を指定してください', 'err'); return; }
    const items = d.items.map(it => {
      const c = calcItemPrice(it);
      return { ...it, id: it.id && !it.id.startsWith('itmp_') ? it.id : ('it_' + Math.random().toString(36).slice(2, 8)), unit_price: c.unit_price, subtotal: c.subtotal };
    });
    // v2: 値引きトグルがOFFなら金額・理由をクリア
    const effectiveDiscount = d.show_discount ? (d.discount_amount || 0) : 0;
    const calc = calcOrder(items, effectiveDiscount);

    if (this.isEditMode) {
      // 編集モード: 既存受注を更新
      const id = this.editId;
      const before = DB.find('orders', id);
      const statusChanged = before && before.status !== d.status;
      // 納品済を選んだ場合は delivered_date を自動セット
      const delivered_date = (d.status === '納品済')
        ? (d.delivered_date || before?.delivered_date || TODAY)
        : (d.delivered_date || null);
      // v2.3: order.title は items[0].title から導出（互換維持）
      const aggregateTitle = items.map(it => it.title).filter(Boolean).join(' / ') || (items[0]?.title || '');
      DB.updateOrder(id, {
        title: aggregateTitle,
        customer_id: d.customer_id,
        received_date: d.received_date,
        received_by_id: d.received_by_id,
        reception_method: d.reception_method,
        delivery_type: d.delivery_type,
        delivery_date_start: d.delivery_date_start || null,
        delivery_date_end: d.delivery_date_end || null,
        delivered_date,
        first_proof_date: d.first_proof_date || null,
        used_date: d.used_date || null,
        memo: d.memo || '',
        data_status: d.data_status,
        discount_amount: effectiveDiscount,
        discount_reason: d.show_discount ? (d.discount_reason || '') : '',
        discount_label_type: d.discount_label_type || '値引き',
        show_discount: d.show_discount,
        tags: d.tags || [],
        attachments: d.attachments || [],
        items,
        total_amount: calc.total,
        status: d.status,
      }, statusChanged ? `編集（ステータス: ${before.status}→${d.status}）` : '編集');
      // 工場ステータス更新
      const fr = DB.findFactoryRecord(id);
      if (fr && fr.factory_status !== d.factory_status) {
        const now = new Date().toISOString();
        const patch = { factory_status: d.factory_status };
        if (d.factory_status === '作業中' && !fr.started_at) patch.started_at = now;
        if (d.factory_status === '完成')   { patch.completed_at = now; patch.completed_by_id = App.currentUserId; }
        DB.updateFactoryRecord(id, patch);
      }
      toast(`受注 ${before?.order_number || ''} を更新しました`, 'ok');
      // editMode を維持して再ロード
      this.initFromOrder(id);
      App.render();
    } else {
      // 新規起票
      // v2.3: order.title は items[0].title から導出
      const aggregateTitle = items.map(it => it.title).filter(Boolean).join(' / ') || (items[0]?.title || '');
      const order = DB.createOrder({
        ...d,
        title: aggregateTitle,
        items,
        discount_amount: effectiveDiscount,
        discount_reason: d.show_discount ? (d.discount_reason || '') : '',
        total_amount: calc.total,
      });
      this.initDraft();
      toast(`受注 ${order.order_number} を起票しました`, 'ok');
      // 起票後はそのまま編集モードで開く
      this.initFromOrder(order.id);
      location.hash = `#order/${order.id}`;
    }
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
            ${fmt.overdueText(o) ? `<span class="st st-経過 text-sm">${fmt.overdueText(o)}</span>` : ''}
          </div>
          ${o.title ? `<div class="text-base font-bold mt-1">${esc(o.title)}</div>` : ''}
          <p class="text-sm text-ink-500 mt-1">${esc(fmt.customer(o.customer_id))} / 受付 ${fmt.dateFull(o.received_date)} / 納期 ${fmt.delivery(o)}${o.delivered_date?` / 納品 ${fmt.dateFull(o.delivered_date)}`:''}</p>
          ${o.tags && o.tags.length ? `<div class="mt-2">${fmt.tags(o.tags)}</div>` : ''}
        </div>
        <div class="flex gap-2">
          <a href="#print/${o.id}" class="border px-3 py-2 rounded text-sm">📄 印刷ビュー</a>
          <button id="btn-quote" class="border px-3 py-2 rounded text-sm">📑 ${quote ? '見積書を開く' : '見積書作成'}</button>
          <button id="btn-edit-fields" class="border px-3 py-2 rounded text-sm bg-brand/10 text-brand font-bold">✎ 編集</button>
          <button id="btn-delete" class="border border-red-500 text-red-500 px-3 py-2 rounded text-sm">削除</button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="col-span-2 space-y-4">
          <div class="bg-white rounded shadow-sm p-4 text-sm">
            <h3 class="font-bold text-base mb-3">基本情報 <button id="btn-edit-fields-inline" class="ml-2 text-xs text-brand hover:underline">編集</button></h3>
            <div class="grid grid-cols-3 gap-3">
              <div><div class="text-xs text-ink-500 font-bold">品名</div><div class="font-bold">${esc(o.title || '—')}</div></div>
              <div><div class="text-xs text-ink-500 font-bold">顧客</div><div class="font-bold"><a class="hover:underline" href="#customer/${o.customer_id}">${esc(fmt.customer(o.customer_id))}</a></div></div>
              <div><div class="text-xs text-ink-500 font-bold">種別</div><div>
                <span class="text-xs px-2 py-0.5 rounded font-bold ${customer?.kind==='地域・団体'?'bg-blue-100 text-blue-700':customer?.kind==='企業・個人'?'bg-amber-100 text-amber-800':'bg-ink-300/40'}">${esc(customer?.kind || '—')}</span>
                <span class="ml-1 text-xs text-ink-500">${esc(customer?.area || '')}</span>
              </div></div>
              <div><div class="text-xs text-ink-500 font-bold">担当者</div><div>${esc(fmt.user(o.received_by_id))}</div></div>
              <div><div class="text-xs text-ink-500 font-bold">受付日</div><div>${fmt.dateFull(o.received_date)}</div></div>
              <div><div class="text-xs text-ink-500 font-bold">納期</div><div class="${o.delivery_date_start === TODAY ? 'text-red-600 font-bold' : ''}">${esc(fmt.delivery(o))}</div></div>
              <div><div class="text-xs text-ink-500 font-bold">納品日</div><div>${o.delivered_date ? fmt.dateW(o.delivered_date) : '—'}</div></div>
              <div><div class="text-xs text-ink-500 font-bold">受付方法</div><div>${esc(o.reception_method)}</div></div>
              <div><div class="text-xs text-ink-500 font-bold">入稿データ</div><div class="font-bold ${o.data_status === '未受領' ? 'text-red-600' : ''}">${esc(o.data_status || '—')}</div></div>
              ${o.discount_amount > 0 ? `<div><div class="text-xs text-ink-500 font-bold">値引き（${esc(o.discount_label_type||'値引き')}）</div><div class="font-bold text-red-600">-${fmt.money(o.discount_amount)}${o.discount_reason ? `<span class="text-xs text-ink-500 ml-1">(${esc(o.discount_reason)})</span>` : ''}</div></div>` : ''}
            </div>
            ${o.memo ? `<div class="mt-3 text-xs text-ink-500 font-bold">メモ</div><div class="bg-ink-700/5 p-2 rounded text-sm">${esc(o.memo)}</div>` : ''}
            ${o.attachments && o.attachments.length ? `<div class="mt-3"><div class="text-xs text-ink-500 font-bold mb-1">添付ファイル（${o.attachments.length}件）</div><div class="flex flex-wrap gap-1">${o.attachments.map(a => `<a href="${a.data_url}" download="${esc(a.name)}" class="bg-brand/10 text-brand text-xs px-2 py-1 rounded font-bold hover:bg-brand/20">📎 ${esc(a.name)}</a>`).join('')}</div></div>` : ''}
          </div>

          <div class="bg-white rounded shadow-sm">
            <div class="px-4 py-2 border-b font-bold flex justify-between items-center">
              <span>製作明細</span>
            </div>
            <table class="w-full text-sm">
              <thead class="bg-ink-700/5 text-xs"><tr class="text-left">
                <th class="px-3 py-2">#</th><th class="px-3 py-2">用紙 / 仕様</th><th class="px-3 py-2">数量</th><th class="px-3 py-2">インク / サイズ</th><th class="px-3 py-2">加工 / ページ</th><th class="px-3 py-2 text-right">単価</th><th class="px-3 py-2 text-right">小計</th>
              </tr></thead>
              <tbody>
                ${o.items.map((it, i) => {
                  if (it.type === 'page') {
                    const size = it.page_size === '自由' ? (it.page_size_custom || '自由') : it.page_size;
                    return `
                    <tr class="border-t bg-purple-50/40">
                      <td class="px-3 py-2"><span class="text-[10px] text-purple-700 font-bold">📖 ${i+1}</span></td>
                      <td class="px-3 py-2"><div class="font-bold">ページ物</div><div class="text-xs text-ink-500">${esc(it.page_cover || '')}${it.page_cover && it.page_body ? ' / ' : ''}${esc(it.page_body || '')}</div></td>
                      <td class="px-3 py-2 font-mono">${it.quantity}部</td>
                      <td class="px-3 py-2 text-xs">${esc(size)}</td>
                      <td class="px-3 py-2 text-xs">${esc(it.page_count || '—')}</td>
                      <td class="px-3 py-2 text-right font-mono">${fmt.money(it.unit_price)}</td>
                      <td class="px-3 py-2 text-right font-mono">${fmt.money(it.subtotal)}</td>
                    </tr>`;
                  }
                  const procs = [];
                  if (it.mishin_count > 0) procs.push(`ミシン${it.mishin_count}本`);
                  if (it.folding !== 'なし') procs.push(it.folding);
                  if (it.hole_position !== 'なし') procs.push(it.hole_position);
                  // v2: のり（なし以外なら表示）
                  if (it.nori_position && it.nori_position !== 'なし') procs.push(it.nori_position);
                  if (it.numbering_enabled) procs.push(`No.${it.numbering_from}〜${it.numbering_to}`);
                  if (it.yacho_style) procs.push('野丁式');
                  if (it.lamination && it.lamination !== 'なし') procs.push(it.lamination);
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
      // v2: 納品済選択時は delivered_date を自動セット
      const patch = { status: s };
      if (s === '納品済' && !o.delivered_date) patch.delivered_date = TODAY;
      DB.updateOrder(id, patch, `ステータス変更: ${o.status}→${s}`);
      // sync factory
      const fr = DB.findFactoryRecord(id);
      if (fr) {
        let fs = fr.factory_status;
        if (s === '見積もり段階' || s === '受注') fs = '待機';
        else if (['製版中','校正中','印刷中'].includes(s)) fs = '作業中';
        else if (s === '完成') fs = '完成';
        else if (s === '納品済') fs = '納品済み';
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
      if (!confirm(`受注 ${o.order_number} を削除しますか？\nこの操作は取り消せません。`)) return;
      DB.deleteOrder(id);
      toast('受注を削除しました');
      location.hash = '#orders';
    });
    // v2: 編集モーダル（納期・数量・用紙・インク 等を後から変更）
    const openEdit = () => this.openEditModal(id);
    $('#btn-edit-fields')?.addEventListener('click', openEdit);
    $('#btn-edit-fields-inline')?.addEventListener('click', openEdit);
  },
  // v2: 受注編集モーダル
  openEditModal(id) {
    const o = DB.find('orders', id);
    if (!o) return;
    const papers = DB.all('papers');
    const customers = DB.all('customers');
    openModal(`
      <div class="p-6">
        <h2 class="text-xl font-black mb-4">受注 ${esc(o.order_number)} 編集</h2>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="col-span-2">
            <label class="block text-xs font-bold mb-1">品名</label>
            <input id="e-title" class="w-full border rounded px-2 py-1.5" value="${esc(o.title || '')}">
          </div>
          <div>
            <label class="block text-xs font-bold mb-1">顧客</label>
            <select id="e-customer" class="w-full border rounded px-2 py-1.5">
              ${customers.map(c => `<option value="${c.id}" ${o.customer_id===c.id?'selected':''}>${esc(c.company_name || c.individual_name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold mb-1">担当者</label>
            <select id="e-received-by" class="w-full border rounded px-2 py-1.5">
              ${DB.all('users').map(u => `<option value="${u.id}" ${o.received_by_id===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold mb-1">納期区分</label>
            <select id="e-dtype" class="w-full border rounded px-2 py-1.5">
              ${DELIVERY_TYPES.map(dt => `<option value="${dt.value}" ${o.delivery_type===dt.value?'selected':''}>${dt.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold mb-1">納期日</label>
            <input type="date" id="e-dstart" class="w-full border rounded px-2 py-1.5" value="${o.delivery_date_start || ''}">
          </div>
          <div>
            <label class="block text-xs font-bold mb-1">納品日</label>
            <input type="date" id="e-delivered" class="w-full border rounded px-2 py-1.5" value="${o.delivered_date || ''}">
          </div>
          <div>
            <label class="block text-xs font-bold mb-1">入稿データ</label>
            <select id="e-data" class="w-full border rounded px-2 py-1.5">
              ${DATA_STATUS.map(s => `<option ${o.data_status===s?'selected':''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <h3 class="font-bold mt-4 mb-2">明細（用紙・数量・インク）</h3>
        <div class="space-y-2 text-sm">
          ${o.items.map((it, i) => `
          <div class="border rounded p-2 grid grid-cols-12 gap-2" data-eitem="${i}">
            <div class="col-span-5">
              <select class="w-full border rounded px-2 py-1 e-paper" data-i="${i}">
                ${papers.map(p => `<option value="${p.id}" ${it.paper_id===p.id?'selected':''}>${esc(p.paper_name)}</option>`).join('')}
              </select>
            </div>
            <div class="col-span-2">
              <input type="number" min="1" class="w-full border rounded px-2 py-1 text-right font-mono e-qty" data-i="${i}" value="${it.quantity}">
            </div>
            <div class="col-span-5">
              <select class="w-full border rounded px-2 py-1 e-ink" data-i="${i}">
                ${INK_PATTERNS.map(ip => `<option value="${ip.value}" ${it.ink_pattern===ip.value?'selected':''}>${esc(ip.label)}</option>`).join('')}
              </select>
            </div>
          </div>`).join('')}
        </div>
        <div class="mt-4">
          <label class="block text-xs font-bold mb-1">メモ</label>
          <textarea id="e-memo" class="w-full border rounded px-2 py-1.5 text-sm" rows="2">${esc(o.memo || '')}</textarea>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button id="e-cancel" class="border px-4 py-2 rounded">キャンセル</button>
          <button id="e-save" class="bg-brand text-white px-4 py-2 rounded font-bold">保存</button>
        </div>
      </div>
    `, () => {
      $('#e-cancel').addEventListener('click', closeModal);
      $('#e-save').addEventListener('click', () => {
        const items = o.items.map((it, i) => ({
          ...it,
          paper_id: $(`.e-paper[data-i="${i}"]`).value,
          quantity: +$(`.e-qty[data-i="${i}"]`).value || it.quantity,
          ink_pattern: $(`.e-ink[data-i="${i}"]`).value,
        })).map(it => {
          const c = calcItemPrice(it);
          return { ...it, unit_price: c.unit_price, subtotal: c.subtotal };
        });
        const calc = calcOrder(items, o.discount_amount || 0);
        DB.updateOrder(id, {
          title: $('#e-title').value,
          customer_id: $('#e-customer').value,
          received_by_id: $('#e-received-by').value,
          delivery_type: $('#e-dtype').value,
          delivery_date_start: $('#e-dstart').value || null,
          delivered_date: $('#e-delivered').value || null,
          data_status: $('#e-data').value,
          memo: $('#e-memo').value,
          items,
          total_amount: calc.total,
        }, '受注編集');
        closeModal();
        toast('受注を更新しました', 'ok');
        App.render();
      });
    });
  },
};

// ---------- Quote (v2: 複数パターン対応) ----------
Screens.quote = {
  render(id) {
    const q = DB.find('quotes', id);
    if (!q) return `<div class="text-center py-16 text-ink-500">見積書が見つかりません</div>`;
    if (!q.patterns || q.patterns.length === 0) {
      // 旧データ互換: パターン構造へ移行
      q.patterns = [{ id: 'qp_legacy', label: '基本案', amount: q.total_amount || 0, accepted: true, show_discount: false, discount_amount: 0, discount_label_type: '値引き', discount_label_text: '' }];
      DB.save();
    }
    const o = DB.find('orders', q.order_id);
    const accepted = q.patterns.find(p => p.accepted) || q.patterns[0];
    return `
      <div class="flex justify-between items-center mb-4">
        <div>
          <a href="#order/${o.id}" class="text-ink-500 text-sm">← 受注に戻る</a>
          <h1 class="text-2xl font-black">見積書 <span class="font-mono">#${esc(q.quote_number)}</span></h1>
          <p class="text-sm text-ink-500">受注 ${esc(o.order_number)} / ${esc(fmt.customer(o.customer_id))} / 採用: <b>${esc(accepted.label)}</b></p>
        </div>
        <div class="flex gap-2">
          <button id="btn-keep-accepted" class="border px-4 py-2 rounded text-sm" title="採用以外のパターンを削除">✓ 採用案のみ残す</button>
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
          <div><label class="block text-xs font-bold mb-1">備考</label><textarea id="q-memo" class="w-full border rounded px-2 py-1.5" rows="3">${esc(q.memo)}</textarea></div>

          <!-- v2: 複数パターン -->
          <div class="border-t pt-3">
            <div class="flex justify-between items-center mb-2">
              <h4 class="font-bold">見積パターン（複数対応）</h4>
              <button id="btn-add-pattern" class="bg-brand text-white text-xs px-3 py-1 rounded font-bold">+ パターン追加</button>
            </div>
            <p class="text-xs text-ink-500 mb-2">金額は自由入力。各パターンに値引きを個別設定可（既定は非表示）。</p>
            <div id="patterns-list" class="space-y-2">
              ${q.patterns.map(p => this.renderPattern(p, q)).join('')}
            </div>
          </div>
        </div>
        <div class="bg-white rounded shadow-sm p-4" id="print-target">
          <div class="text-xs font-bold text-ink-500 mb-2 no-print">📄 PDFプレビュー（採用案）</div>
          <div class="border-2 border-ink-300/50 p-6 bg-white text-xs print-page" id="quote-pdf-page">
            <div class="flex justify-between border-b-2 border-ink-900 pb-2 mb-4">
              <div><div class="text-2xl font-black">御 見 積 書</div><div class="text-xs mt-1">No. ${esc(q.quote_number)} / 案: ${esc(accepted.label)}</div></div>
              <div class="text-right"><div class="font-bold">${fmt.dateJp(q.issued_date)}</div></div>
            </div>
            <div class="mb-4">
              <div class="text-lg font-bold">${esc(fmt.customer(o.customer_id))} 御中</div>
              <div class="mt-2">下記の通りお見積もり申し上げます。${o.title ? `<span class="text-ink-500">（件名: ${esc(o.title)}）</span>` : ''}</div>
            </div>
            <div class="flex justify-between mb-4">
              <div>
                <div class="text-xs">有効期限: ${fmt.dateJp(q.valid_until)}</div>
                <div class="mt-2 font-bold">合計金額</div>
                <div class="text-2xl font-black text-brand border-b-2 border-brand inline-block">${fmt.money(accepted.amount)}<span class="text-xs">（税込）</span></div>
              </div>
              <div class="text-xs border-2 border-ink-700 p-3 min-w-[220px]">
                <div class="font-black text-sm">${esc(DB.settings().company_name || '有限会社 渡辺謄写堂')}</div>
                <div class="mt-1 leading-tight">
                  <div>${esc(DB.settings().company_postal || '')}</div>
                  <div>${esc(DB.settings().company_address || '')}</div>
                </div>
                <div class="mt-1 leading-tight">
                  <div>TEL: ${esc(DB.settings().company_phone || '')}</div>
                  <div>FAX: ${esc(DB.settings().company_fax || '')}</div>
                </div>
                <div class="mt-1 text-ink-700 border-t pt-1">登録番号<br><b class="font-mono">${esc(DB.settings().invoice_number || '')}</b></div>
                <div class="mt-1 text-right">
                  <span class="inline-block border-2 border-red-500 rounded-full w-10 h-10 leading-9 text-center text-red-500 font-black text-xs">印</span>
                </div>
              </div>
            </div>
            <table class="w-full border-collapse text-xs">
              <thead class="bg-ink-900 text-white"><tr>
                <th class="p-1 text-left">品名・仕様</th><th class="p-1 text-right">数量</th><th class="p-1 text-right">税率</th><th class="p-1 text-right">金額</th>
              </tr></thead>
              <tbody>
                ${o.items.map(it => `
                <tr class="border-b">
                  <td class="p-1">${esc(fmt.paper(it.paper_id))}（${esc(fmt.ink(it.ink_pattern))}）</td>
                  <td class="p-1 text-right">${it.quantity}</td>
                  <td class="p-1 text-right">${it.tax_rate||10}%</td>
                  <td class="p-1 text-right">${fmt.money(it.subtotal)}</td>
                </tr>`).join('')}
                <tr class="border-b">
                  <td class="p-1 text-ink-500" colspan="3">採用案 金額（自由入力値）</td>
                  <td class="p-1 text-right font-bold">${fmt.money(accepted.amount)}</td>
                </tr>
                ${accepted.show_discount && accepted.discount_amount > 0 ? `
                <tr class="border-b text-red-600"><td class="p-1" colspan="3">${esc(accepted.discount_label_type || '値引き')}${accepted.discount_label_text ? `（${esc(accepted.discount_label_text)}）` : ''}</td><td class="p-1 text-right">-${fmt.money(accepted.discount_amount)}</td></tr>
                ` : ''}
                <tr class="font-bold bg-ink-700/5"><td class="p-1" colspan="3">合計（税込）</td><td class="p-1 text-right">${fmt.money(Math.max(0, accepted.amount - (accepted.show_discount ? accepted.discount_amount : 0)))}</td></tr>
              </tbody>
            </table>
            <div class="mt-4 text-xs">
              <div class="font-bold">備考</div>
              <div class="whitespace-pre-wrap">${esc(q.memo)}</div>
            </div>
            <div class="mt-4 text-[11px] border-t pt-2">
              <div class="font-bold">お振込先</div>
              <div>① ${esc(DB.settings().bank_info_1 || '')}</div>
              <div>② ${esc(DB.settings().bank_info_2 || '')}</div>
              <div>振込名義: <b>${esc(DB.settings().bank_holder || '')}</b></div>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  renderPattern(p, q) {
    return `
      <div class="border rounded p-3 ${p.accepted?'bg-brand/5 border-brand':'bg-white'}" data-pid="${p.id}">
        <div class="flex items-center gap-2">
          <input type="radio" name="qaccept" value="${p.id}" ${p.accepted?'checked':''} class="qp-accept">
          <input class="flex-1 border rounded px-2 py-1 text-sm font-bold qp-label" value="${esc(p.label)}" placeholder="例: 1000枚 / 両面カラー">
          <input type="number" class="w-32 border rounded px-2 py-1 text-right font-mono qp-amount" value="${p.amount || 0}" min="0" step="100">
          <span class="text-xs">円</span>
          ${q.patterns.length > 1 ? `<button class="text-xs text-red-500 qp-remove">削除</button>` : ''}
        </div>
        <div class="mt-2 flex items-center gap-3 text-xs">
          <label class="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" class="qp-show-discount" ${p.show_discount?'checked':''}> 値引きを表示
          </label>
          <div class="flex items-center gap-1" style="display:${p.show_discount?'flex':'none'}">
            <select class="border rounded px-1 py-0.5 text-xs qp-discount-type">
              ${DISCOUNT_LABEL_TYPES.map(t => `<option ${p.discount_label_type===t?'selected':''}>${t}</option>`).join('')}
            </select>
            <input type="number" class="w-20 border rounded px-1 py-0.5 text-right font-mono text-xs qp-discount-amount" value="${p.discount_amount||0}" min="0" step="100" placeholder="金額">
            <input class="w-40 border rounded px-1 py-0.5 text-xs qp-discount-text" placeholder="名目（自由）" value="${esc(p.discount_label_text||'')}">
          </div>
        </div>
      </div>`;
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
    // v2: パターン操作
    $('#btn-add-pattern')?.addEventListener('click', () => {
      DB.addQuotePattern(id);
      App.render();
    });
    $('#btn-keep-accepted')?.addEventListener('click', () => {
      if (!confirm('採用案以外のパターンを削除します。よろしいですか？')) return;
      DB.keepOnlyAcceptedPatterns(id);
      toast('採用案のみに整理しました', 'ok');
      App.render();
    });
    $$('.qp-accept').forEach(el => el.addEventListener('change', (e) => {
      const pid = el.closest('[data-pid]').dataset.pid;
      DB.acceptQuotePattern(id, pid);
      toast('採用案を変更しました', 'ok');
      App.render();
    }));
    $$('.qp-label').forEach(el => el.addEventListener('change', (e) => {
      const pid = el.closest('[data-pid]').dataset.pid;
      DB.updateQuotePattern(id, pid, { label: e.target.value });
    }));
    $$('.qp-amount').forEach(el => el.addEventListener('change', (e) => {
      const pid = el.closest('[data-pid]').dataset.pid;
      DB.updateQuotePattern(id, pid, { amount: +e.target.value || 0 });
      App.render();
    }));
    $$('.qp-show-discount').forEach(el => el.addEventListener('change', (e) => {
      const pid = el.closest('[data-pid]').dataset.pid;
      DB.updateQuotePattern(id, pid, { show_discount: e.target.checked, discount_amount: e.target.checked ? 0 : 0 });
      App.render();
    }));
    $$('.qp-discount-type').forEach(el => el.addEventListener('change', (e) => {
      const pid = el.closest('[data-pid]').dataset.pid;
      DB.updateQuotePattern(id, pid, { discount_label_type: e.target.value });
    }));
    $$('.qp-discount-amount').forEach(el => el.addEventListener('change', (e) => {
      const pid = el.closest('[data-pid]').dataset.pid;
      DB.updateQuotePattern(id, pid, { discount_amount: +e.target.value || 0 });
      App.render();
    }));
    $$('.qp-discount-text').forEach(el => el.addEventListener('change', (e) => {
      const pid = el.closest('[data-pid]').dataset.pid;
      DB.updateQuotePattern(id, pid, { discount_label_text: e.target.value });
    }));
    $$('.qp-remove').forEach(el => el.addEventListener('click', (e) => {
      const pid = el.closest('[data-pid]').dataset.pid;
      if (!confirm('このパターンを削除しますか？')) return;
      DB.removeQuotePattern(id, pid);
      App.render();
    }));
  },
};

// ---------- Factory Kanban (v2: 納品済み/曜日/経過日数) ----------
Screens.factory = {
  render() {
    // v2: 納品済もカンバンに表示する。除外は「キャンセル」「見積もり段階」のみ
    const orders = DB.all('orders').filter(o => !['キャンセル','見積もり段階'].includes(o.status));
    const frs = DB.all('factory_records');
    const cols = FACTORY_STATUSES.map(s => ({ status: s, items: [] }));
    orders.forEach(o => {
      let fr = frs.find(f => f.order_id === o.id);
      // 納品済オーダーで factory_record が未生成のものは「納品済み」カラムにフォールバック表示
      let st = fr?.factory_status;
      if (!st) st = (o.status === '納品済') ? '納品済み' : '待機';
      const col = cols.find(c => c.status === st);
      if (col) col.items.push({ order: o, fr });
    });
    return `
      <div class="mb-4 flex justify-between">
        <div>
          <h1 class="text-2xl font-black">工場カンバン</h1>
          <p class="text-sm text-ink-500">カードをドラッグして工場ステータスを変更できます。納期は曜日付き、超過時は「N日経過」と表示。</p>
        </div>
      </div>
      <div class="grid grid-cols-4 gap-3">
        ${cols.map(col => `
        <div class="rounded p-3 ${col.status==='待機'?'bg-ink-300/20':col.status==='作業中'?'bg-yellow-400/20':col.status==='完成'?'bg-ok/10':'bg-ink-900/10'}" data-col="${col.status}">
          <div class="flex justify-between items-center mb-3">
            <div class="font-black ${col.status==='完成'?'text-ok-dark':col.status==='納品済み'?'text-ink-900':''}">${col.status}</div>
            <span class="${col.status==='待機'?'bg-ink-700':col.status==='作業中'?'bg-yellow-500':col.status==='完成'?'bg-ok':'bg-ink-900'} text-white text-xs px-2 py-0.5 rounded-full font-bold">${col.items.length}</span>
          </div>
          <div class="space-y-2 kanban-col min-h-[200px]" data-status="${col.status}">
            ${col.items.map(({order: o, fr}) => {
              const overdue = fmt.overdueText(o);
              const urgent = o.delivery_date_start && dayDiff(o.delivery_date_start, TODAY) <= 1 && dayDiff(o.delivery_date_start, TODAY) >= 0;
              const borderColor = col.status==='待機'?'border-ink-500':col.status==='作業中'?'border-yellow-500':col.status==='完成'?'border-ok':'border-ink-900';
              return `
              <div class="bg-white rounded p-3 shadow-sm border-l-4 ${borderColor} text-sm cursor-pointer kanban-card" draggable="true" data-order-id="${o.id}" onclick="location.hash='#order/${o.id}'">
                <div class="flex justify-between">
                  <span class="font-mono text-xs text-ink-500">${esc(o.order_number)}</span>
                  ${overdue ? `<span class="text-xs text-purple-600 font-bold">${overdue}</span>`
                    : urgent ? `<span class="text-xs text-red-600 font-bold">${o.delivery_date_start === TODAY ? '本日納期' : '明日納期'}</span>`
                    : `<span class="text-xs">${esc(fmt.delivery(o))}</span>`}
                </div>
                <div class="font-bold mt-1 truncate">${esc(o.title || fmt.customer(o.customer_id))}</div>
                <div class="text-xs text-ink-500 truncate">${esc(fmt.customer(o.customer_id))} / ${esc(fmt.paper(o.items[0]?.paper_id))} ${o.items[0]?.quantity}枚</div>
                ${o.tags && o.tags.length ? `<div class="mt-1">${fmt.tags(o.tags)}</div>` : ''}
                <div class="text-xs text-ink-500 mt-1">状態: <span class="st st-${esc(o.status)}">${esc(o.status)}</span>${o.data_status === '未受領' ? `<span class="ml-2 text-red-600 font-bold">⚠ データ未受領</span>` : ''}</div>
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
        // sync order status (v2: 校正中/納品済みの遷移を含む)
        const order = DB.find('orders', draggingId);
        let orderStatus = order.status;
        const orderPatch = {};
        if (newStatus === '待機') orderStatus = '受注';
        else if (newStatus === '作業中') {
          // 既に校正中/印刷中だった場合は維持、そうでなければ製版中へ
          if (!['製版中','校正中','印刷中'].includes(order.status)) orderStatus = '製版中';
        }
        else if (newStatus === '完成') orderStatus = '完成';
        else if (newStatus === '納品済み') { orderStatus = '納品済'; orderPatch.delivered_date = order.delivered_date || TODAY; }
        if (orderStatus !== order.status) DB.updateOrder(draggingId, { status: orderStatus, ...orderPatch }, `カンバン操作: 工場${newStatus}→受注${orderStatus}`);
        else if (Object.keys(orderPatch).length) DB.updateOrder(draggingId, orderPatch, `カンバン操作`);
        else DB.log('Order', draggingId, `工場ステータス: ${newStatus}`);
        toast(`工場ステータス: ${newStatus}`, 'ok');
        App.render();
      });
    });
  },
};

// ---------- Customers List (v2: 検索・新規追加ポップアップ・累計売上内訳) ----------
Screens.customers = {
  filter: { q: '', kind: '' },
  // 顧客ごとの売上集計（税抜・税・税込）
  computeSales(customer_id) {
    const own = DB.all('orders').filter(o => o.customer_id === customer_id && o.status !== 'キャンセル' && o.status !== '見積もり段階');
    let subtotalEx = 0, tax = 0, total = 0;
    own.forEach(o => {
      // 受注合計は税込で持っているので、items から税抜と税を再計算
      const calc = calcOrder(o.items || [], o.discount_amount || 0);
      subtotalEx += calc.after_discount;
      tax       += calc.total_tax;
      total     += calc.total;
    });
    return { count: own.length, subtotalEx, tax, total, lastDelivered: own
      .filter(o => o.delivered_date).sort((a,b) => (b.delivered_date||'').localeCompare(a.delivered_date||''))[0]?.delivered_date || null };
  },
  render() {
    const all = DB.all('customers');
    const f = this.filter;
    const list = all.filter(c => {
      const name = (c.company_name || c.individual_name || '').toLowerCase();
      if (f.q) {
        const q = f.q.toLowerCase();
        const blob = `${name} ${c.phone||''} ${c.fax||''} ${c.area||''} ${c.address||''} ${c.notes||''}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (f.kind && c.kind !== f.kind) return false;
      return true;
    });
    return `
      <div class="flex justify-between items-center mb-4">
        <div>
          <h1 class="text-2xl font-black">顧客一覧</h1>
          <p class="text-sm text-ink-500">${list.length} / ${all.length} 件</p>
        </div>
        <button id="btn-new-customer-top" class="bg-brand text-white px-5 py-2 rounded font-bold shadow-sm">+ 新規顧客追加</button>
      </div>
      <div class="bg-white p-4 rounded shadow-sm mb-4 grid grid-cols-4 gap-3 text-sm">
        <div class="col-span-2">
          <label class="block text-xs font-bold mb-1">🔍 検索（顧客名・電話・FAX・住所・地域・メモ）</label>
          <input id="cf-q" class="w-full border rounded px-2 py-1.5" value="${esc(f.q)}" placeholder="二本松, タクシー, 0243…">
        </div>
        <div class="col-span-2">
          <label class="block text-xs font-bold mb-1">種別</label>
          <select id="cf-kind" class="w-full border rounded px-2 py-1.5">
            <option value="">すべて</option>
            ${CUSTOMER_KINDS.map(k => `<option ${f.kind===k?'selected':''}>${k}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="bg-white rounded shadow-sm overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-ink-700/5"><tr class="text-left">
            <th class="px-3 py-2">顧客名</th>
            <th class="px-3 py-2">種別</th>
            <th class="px-3 py-2">地域</th>
            <th class="px-3 py-2">電話</th>
            <th class="px-3 py-2">FAX</th>
            <th class="px-3 py-2 text-right">税抜小計</th>
            <th class="px-3 py-2 text-right">消費税</th>
            <th class="px-3 py-2 text-right">累計売上（税込）</th>
            <th class="px-3 py-2">最終納品</th>
          </tr></thead>
          <tbody>
            ${list.length === 0 ? `<tr><td colspan="9" class="text-center py-10 text-ink-500">該当なし</td></tr>` :
              list.map(c => {
              const s = this.computeSales(c.id);
              return `
              <tr class="border-t hover:bg-brand/5 cursor-pointer" onclick="location.hash='#customer/${c.id}'">
                <td class="px-3 py-2 font-bold">${esc(c.company_name || c.individual_name)}</td>
                <td class="px-3 py-2">
                  <span class="text-xs px-2 py-0.5 rounded font-bold ${c.kind==='地域・団体'?'bg-blue-100 text-blue-700':c.kind==='企業・個人'?'bg-amber-100 text-amber-800':'bg-ink-300/40'}">${esc(c.kind || '—')}</span>
                </td>
                <td class="px-3 py-2">${esc(c.area || '')}</td>
                <td class="px-3 py-2 font-mono text-xs">${esc(c.phone || '')}</td>
                <td class="px-3 py-2 font-mono text-xs text-ink-500">${esc(c.fax || '')}</td>
                <td class="px-3 py-2 text-right font-mono">${fmt.money(s.subtotalEx)}</td>
                <td class="px-3 py-2 text-right font-mono text-ink-500">${fmt.money(s.tax)}</td>
                <td class="px-3 py-2 text-right font-mono font-bold">${fmt.money(s.total)}</td>
                <td class="px-3 py-2 text-xs">${s.lastDelivered ? fmt.dateW(s.lastDelivered) : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  },
  bind() {
    const apply = () => {
      this.filter = {
        q: $('#cf-q')?.value || '',
        kind: $('#cf-kind')?.value || '',
      };
      App.render();
    };
    $('#cf-q')?.addEventListener('input', debounce(apply, 300));
    $('#cf-kind')?.addEventListener('change', apply);
    $('#btn-new-customer-top')?.addEventListener('click', () => Screens.customers.openCreateModal());
  },
  openCreateModal() {
    openModal(`
      <div class="p-6">
        <h2 class="text-xl font-black mb-4">+ 新規顧客追加</h2>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="col-span-2"><label class="block text-xs font-bold mb-1">会社名</label><input id="cc-company" class="w-full border rounded px-2 py-1.5"></div>
          <div class="col-span-2"><label class="block text-xs font-bold mb-1">個人名（個人の場合）</label><input id="cc-indiv" class="w-full border rounded px-2 py-1.5"></div>
          <div class="col-span-2">
            <label class="block text-xs font-bold mb-1">種別</label>
            <select id="cc-kind" class="w-full border rounded px-2 py-1.5">${CUSTOMER_KINDS.map(k=>`<option>${k}</option>`).join('')}</select>
          </div>
          <div><label class="block text-xs font-bold mb-1">地域</label>
            <select id="cc-area" class="w-full border rounded px-2 py-1.5">${AREAS.map(a=>`<option>${a}</option>`).join('')}</select>
          </div>
          <div><label class="block text-xs font-bold mb-1">電話</label><input id="cc-phone" class="w-full border rounded px-2 py-1.5"></div>
          <div><label class="block text-xs font-bold mb-1">FAX</label><input id="cc-fax" class="w-full border rounded px-2 py-1.5"></div>
          <div class="col-span-2"><label class="block text-xs font-bold mb-1">住所</label><input id="cc-address" class="w-full border rounded px-2 py-1.5"></div>
          <div class="col-span-2"><label class="block text-xs font-bold mb-1">メモ</label><textarea id="cc-notes" class="w-full border rounded px-2 py-1.5" rows="2"></textarea></div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button id="cc-cancel" class="border px-4 py-2 rounded">キャンセル</button>
          <button id="cc-save" class="bg-brand text-white px-4 py-2 rounded font-bold">登録</button>
        </div>
      </div>
    `, () => {
      $('#cc-cancel').addEventListener('click', closeModal);
      $('#cc-save').addEventListener('click', () => {
        const company = $('#cc-company').value.trim();
        const indiv = $('#cc-indiv').value.trim();
        if (!company && !indiv) { toast('会社名または個人名を入力してください', 'err'); return; }
        DB.createCustomer({
          company_name: company, individual_name: indiv,
          kind: $('#cc-kind').value,
          area: $('#cc-area').value,
          phone: $('#cc-phone').value,
          fax: $('#cc-fax').value,
          address: $('#cc-address').value,
          notes: $('#cc-notes').value,
        });
        closeModal();
        App.render();
        toast('顧客を登録しました', 'ok');
      });
    });
  },
};

// ---------- Customer Detail (v2: FAX・地域団体/企業個人・売上内訳・納品日) ----------
Screens.customer = {
  render(id) {
    const c = DB.find('customers', id);
    if (!c) return `<div class="text-center py-16 text-ink-500">顧客が見つかりません</div>`;
    const own = DB.all('orders').filter(o => o.customer_id === id).sort((a,b) => (b.received_date||'').localeCompare(a.received_date||''));
    const sales = Screens.customers.computeSales(id);
    const contacts = DB.contactLogsFor(id);
    return `
      <a href="#customers" class="text-ink-500 text-sm">← 一覧</a>
      <div class="bg-white rounded shadow-sm mb-4 mt-2">
        <div class="p-4 flex justify-between items-start">
          <div>
            <h1 class="text-2xl font-black">${esc(c.company_name || c.individual_name)}</h1>
            <div class="text-sm text-ink-500 mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center">
              <span class="font-bold text-ink-700">種別:</span>
              <span class="text-xs px-2 py-0.5 rounded font-bold ${c.kind==='地域・団体'?'bg-blue-100 text-blue-700':c.kind==='企業・個人'?'bg-amber-100 text-amber-800':'bg-ink-300/40'}">${esc(c.kind || '—')}</span>
              <span class="ml-2">地域: ${esc(c.area || '')}</span>
              <span>TEL: ${esc(c.phone || '')}</span>
              ${c.fax ? `<span>FAX: ${esc(c.fax)}</span>` : ''}
              ${c.address ? `<span>${esc(c.address)}</span>` : ''}
            </div>
            ${c.notes ? `<div class="mt-2 text-xs text-ink-500">メモ: ${esc(c.notes)}</div>` : ''}
          </div>
          <div class="flex gap-2">
            <button id="btn-edit-customer" class="border px-3 py-2 rounded text-sm">✎ 顧客編集</button>
            <a href="#order/new" class="bg-brand text-white px-4 py-2 rounded text-sm font-bold" id="btn-new-with">+ この顧客で新規受注</a>
          </div>
        </div>
        <div class="grid grid-cols-5 border-t text-sm">
          <div class="p-3 border-r"><div class="text-xs font-bold text-ink-500">累計受注</div><div class="text-xl font-black">${sales.count}件</div></div>
          <div class="p-3 border-r"><div class="text-xs font-bold text-ink-500">税抜小計</div><div class="text-lg font-black font-mono">${fmt.money(sales.subtotalEx)}</div></div>
          <div class="p-3 border-r"><div class="text-xs font-bold text-ink-500">消費税</div><div class="text-lg font-black font-mono text-ink-500">${fmt.money(sales.tax)}</div></div>
          <div class="p-3 border-r"><div class="text-xs font-bold text-ink-500">累計売上（税込）</div><div class="text-xl font-black text-brand">${fmt.money(sales.total)}</div></div>
          <div class="p-3"><div class="text-xs font-bold text-ink-500">最終納品</div><div class="text-lg font-black">${sales.lastDelivered ? fmt.dateW(sales.lastDelivered) : '—'}</div></div>
        </div>
      </div>
      <div class="bg-white rounded shadow-sm mb-4">
        <div class="p-4 border-b flex justify-between items-center">
          <h3 class="font-bold">📞 連絡履歴 (${contacts.length}件)</h3>
          <button id="btn-add-contact" class="bg-brand text-white px-3 py-1 rounded text-xs font-bold">+ 追加</button>
        </div>
        <ul class="text-sm divide-y max-h-60 overflow-auto">
          ${contacts.length === 0 ? `<li class="px-4 py-4 text-ink-500 text-center text-xs">連絡履歴なし</li>` :
            contacts.map(l => `
            <li class="px-4 py-2">
              <div class="flex justify-between text-xs text-ink-500">
                <span><b>${esc(l.contact_type)}</b> · ${esc(fmt.user(l.user_id))}</span>
                <span>${fmt.dateTime(l.logged_at)}</span>
              </div>
              <div>${esc(l.summary)}</div>
            </li>`).join('')}
        </ul>
      </div>

      <div class="bg-white rounded shadow-sm">
        <div class="p-4 border-b"><h3 class="font-bold">過去発注履歴</h3></div>
        <table class="w-full text-sm">
          <thead class="bg-ink-700/5"><tr class="text-left">
            <th class="px-3 py-2">受付日</th><th class="px-3 py-2">納品日</th><th class="px-3 py-2">受注番号</th><th class="px-3 py-2">品名 / 仕様</th><th class="px-3 py-2">数量</th><th class="px-3 py-2 text-right">金額</th><th class="px-3 py-2">状態</th><th class="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            ${own.length === 0 ? `<tr><td colspan="8" class="text-center py-8 text-ink-500">過去の発注はありません</td></tr>` :
              own.map(o => `
              <tr class="border-t hover:bg-brand/5">
                <td class="px-3 py-2">${fmt.dateFull(o.received_date)}</td>
                <td class="px-3 py-2 ${o.delivered_date?'':'text-ink-500'}">${o.delivered_date ? fmt.dateFull(o.delivered_date) : '—'}</td>
                <td class="px-3 py-2 font-mono text-xs"><a class="hover:underline text-brand font-bold" href="#order/${o.id}">${esc(o.order_number)}</a></td>
                <td class="px-3 py-2 text-xs"><span class="font-bold">${esc(o.title || '—')}</span><br>${esc(fmt.paper(o.items[0]?.paper_id))} / ${esc(fmt.ink(o.items[0]?.ink_pattern))}</td>
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
    $('#btn-edit-customer')?.addEventListener('click', () => Screens.customer.openEditModal(id));
    $$('.btn-copy-order').forEach(b => b.addEventListener('click', (e) => {
      const src = DB.find('orders', e.target.dataset.src);
      Screens.order_new.initDraft();
      Screens.order_new.draft.customer_id = src.customer_id;
      Screens.order_new.draft.items = src.items.map(it => ({ ...Screens.order_new.newItem(), ...it, id: 'itmp_' + Math.random().toString(36).slice(2, 8) }));
      location.hash = '#order/new';
      toast('仕様をコピーしました', 'ok');
    }));
    $('#btn-add-contact')?.addEventListener('click', () => {
      openModal(`
        <div class="p-6">
          <h2 class="text-xl font-black mb-4">📞 連絡履歴を追加</h2>
          <div class="space-y-3 text-sm">
            <div>
              <label class="block text-xs font-bold mb-1">連絡種別</label>
              <select id="ct-type" class="w-full border rounded px-2 py-1.5">
                ${CONTACT_TYPES.map(t => `<option>${t}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">内容・要約</label>
              <textarea id="ct-summary" class="w-full border rounded px-2 py-1.5" rows="4" placeholder="例: 名刺の追加発注について。次回4月末に500枚予定とのこと"></textarea>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <button id="ct-cancel" class="border px-4 py-2 rounded">キャンセル</button>
            <button id="ct-save" class="bg-brand text-white px-4 py-2 rounded font-bold">保存</button>
          </div>
        </div>
      `, () => {
        $('#ct-cancel').addEventListener('click', closeModal);
        $('#ct-save').addEventListener('click', () => {
          const type = $('#ct-type').value;
          const summary = $('#ct-summary').value.trim();
          if (!summary) { toast('内容を入力してください', 'err'); return; }
          DB.addContactLog(id, type, summary);
          closeModal();
          App.render();
          toast('連絡履歴を追加しました', 'ok');
        });
      });
    });
  },
  // v2: 顧客編集モーダル
  openEditModal(id) {
    const c = DB.find('customers', id);
    if (!c) return;
    openModal(`
      <div class="p-6">
        <h2 class="text-xl font-black mb-4">顧客編集</h2>
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div class="col-span-2"><label class="block text-xs font-bold mb-1">会社名</label><input id="ec-company" class="w-full border rounded px-2 py-1.5" value="${esc(c.company_name || '')}"></div>
          <div class="col-span-2"><label class="block text-xs font-bold mb-1">個人名</label><input id="ec-indiv" class="w-full border rounded px-2 py-1.5" value="${esc(c.individual_name || '')}"></div>
          <div class="col-span-2">
            <label class="block text-xs font-bold mb-1">種別</label>
            <select id="ec-kind" class="w-full border rounded px-2 py-1.5">${CUSTOMER_KINDS.map(k=>`<option ${c.kind===k?'selected':''}>${k}</option>`).join('')}</select>
          </div>
          <div><label class="block text-xs font-bold mb-1">地域</label>
            <select id="ec-area" class="w-full border rounded px-2 py-1.5">${AREAS.map(a=>`<option ${c.area===a?'selected':''}>${a}</option>`).join('')}</select>
          </div>
          <div><label class="block text-xs font-bold mb-1">電話</label><input id="ec-phone" class="w-full border rounded px-2 py-1.5" value="${esc(c.phone||'')}"></div>
          <div><label class="block text-xs font-bold mb-1">FAX</label><input id="ec-fax" class="w-full border rounded px-2 py-1.5" value="${esc(c.fax||'')}"></div>
          <div class="col-span-2"><label class="block text-xs font-bold mb-1">住所</label><input id="ec-address" class="w-full border rounded px-2 py-1.5" value="${esc(c.address||'')}"></div>
          <div class="col-span-2"><label class="block text-xs font-bold mb-1">メモ</label><textarea id="ec-notes" class="w-full border rounded px-2 py-1.5" rows="2">${esc(c.notes||'')}</textarea></div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <button id="ec-cancel" class="border px-4 py-2 rounded">キャンセル</button>
          <button id="ec-save" class="bg-brand text-white px-4 py-2 rounded font-bold">保存</button>
        </div>
      </div>
    `, () => {
      $('#ec-cancel').addEventListener('click', closeModal);
      $('#ec-save').addEventListener('click', () => {
        DB.updateCustomer(id, {
          company_name: $('#ec-company').value,
          individual_name: $('#ec-indiv').value,
          kind: $('#ec-kind').value,
          area: $('#ec-area').value,
          phone: $('#ec-phone').value,
          fax: $('#ec-fax').value,
          address: $('#ec-address').value,
          notes: $('#ec-notes').value,
        });
        closeModal();
        App.render();
        toast('顧客情報を更新しました', 'ok');
      });
    });
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
            <div class="text-sm">担当者: ${esc(fmt.user(o.received_by_id))}</div>
            <div class="text-sm">受付方法: ${esc(o.reception_method)}</div>
          </div>
        </div>
        <table class="w-full text-sm border-collapse">
          ${o.title ? `<tr>
            <td class="border p-2 bg-ink-700/5 font-bold w-24">件 名</td>
            <td class="border p-2 font-bold text-lg" colspan="5">${esc(o.title)}</td>
          </tr>` : ''}
          <tr>
            <td class="border p-2 bg-ink-700/5 font-bold w-24">顧 客</td>
            <td class="border p-2 font-bold text-lg" colspan="3">${esc(fmt.customer(o.customer_id))}${customer?.company_name ? ' 御中' : ' 様'}</td>
            <td class="border p-2 bg-ink-700/5 font-bold w-24">納 期</td>
            <td class="border p-2 font-bold ${o.delivery_date_start === TODAY ? 'text-red-600' : ''} text-lg">${esc(fmt.delivery(o))}${o.delivery_date_start === TODAY ? ' ★本日必着' : ''}${fmt.overdueText(o) ? ` <span class="st st-経過">${fmt.overdueText(o)}</span>` : ''}</td>
          </tr>
          <tr><td class="border p-2 bg-ink-900 text-white font-bold text-center" colspan="6">製 作 明 細</td></tr>
          ${o.items.map((it, i) => {
            if (it.type === 'page') {
              const size = it.page_size === '自由' ? (it.page_size_custom || '自由') : it.page_size;
              return `
              <tr>
                <td class="border p-2 bg-purple-100 font-bold w-20">#${i+1} 📖ページ物</td>
                <td class="border p-2 font-bold" colspan="5">${esc(it.title || '—')}</td>
              </tr>
              <tr>
                <td class="border p-2 bg-ink-700/5 font-bold">サイズ</td>
                <td class="border p-2" colspan="2">${esc(size)}</td>
                <td class="border p-2 bg-ink-700/5 font-bold w-20">数量</td>
                <td class="border p-2 text-lg font-bold" colspan="2">${it.quantity}部</td>
              </tr>
              <tr>
                <td class="border p-2 bg-ink-700/5 font-bold">ページ数</td>
                <td class="border p-2" colspan="5">${esc(it.page_count || '')}</td>
              </tr>
              <tr>
                <td class="border p-2 bg-ink-700/5 font-bold">表紙</td>
                <td class="border p-2" colspan="5">${esc(it.page_cover || '')}</td>
              </tr>
              <tr>
                <td class="border p-2 bg-ink-700/5 font-bold">本文</td>
                <td class="border p-2" colspan="5">${esc(it.page_body || '')}${it.item_notes ? `<div class="text-xs mt-1">メモ: ${esc(it.item_notes)}</div>` : ''}</td>
              </tr>`;
            }
            return `
          <tr>
            <td class="border p-2 bg-ink-700/5 font-bold w-20">#${i+1} 品 名</td>
            <td class="border p-2 font-bold" colspan="5">${esc(it.title || '—')}</td>
          </tr>
          <tr>
            <td class="border p-2 bg-ink-700/5 font-bold w-20">用 紙</td>
            <td class="border p-2 font-bold" colspan="2">${esc(fmt.paper(it.paper_id))}${it.paper_other_memo?' / '+esc(it.paper_other_memo):''}</td>
            <td class="border p-2 bg-ink-700/5 font-bold w-20">数量</td>
            <td class="border p-2 text-lg font-bold" colspan="2">${it.quantity}</td>
          </tr>
          <tr>
            <td class="border p-2 bg-ink-700/5 font-bold">インク</td>
            <td class="border p-2" colspan="5"><b>${esc(fmt.ink(it.ink_pattern))}</b></td>
          </tr>
          <tr>
            <td class="border p-2 bg-ink-700/5 font-bold">加工</td>
            <td class="border p-2" colspan="5">
              <span class="mr-3">${it.mishin_count>0?'☑':'☐'} ミシン${it.mishin_count>0?it.mishin_count+'本':''}</span>
              <span class="mr-3">${it.folding!=='なし'?'☑':'☐'} 折${it.folding!=='なし'?'('+it.folding+')':''}</span>
              <span class="mr-3">${it.hole_position!=='なし'?'☑':'☐'} 穴${it.hole_position!=='なし'?'('+it.hole_position+')':''}</span>
              <span class="mr-3">${(it.nori_position && it.nori_position!=='なし')?'☑':'☐'} のり${(it.nori_position && it.nori_position!=='なし')?'('+it.nori_position+')':''}</span>
              <span class="mr-3">${it.numbering_enabled?'☑':'☐'} ナンバリング${it.numbering_enabled?`(${it.numbering_from}〜${it.numbering_to})`:''}</span>
              <span class="mr-3">${it.yacho_style?'☑':'☐'} 野丁式</span>
              <span class="mr-3">${(it.lamination && it.lamination!=='なし')?'☑':'☐'} ラミネート${(it.lamination && it.lamination!=='なし')?`(${esc(it.lamination)})`:''}</span>
              ${it.item_notes ? `<div class="text-xs mt-1">メモ: ${esc(it.item_notes)}</div>` : ''}
            </td>
          </tr>`;
          }).join('')}
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
// v2: クエリ文字列 ?filter=xxx を扱う
const _orig = Router.route;
Router.route = function() {
  let hash = location.hash.slice(1) || 'dashboard';
  // クエリ抽出
  let query = {};
  const qIdx = hash.indexOf('?');
  if (qIdx >= 0) {
    const qs = hash.slice(qIdx + 1);
    hash = hash.slice(0, qIdx);
    qs.split('&').forEach(kv => {
      const [k, v] = kv.split('=');
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
  }
  const parts = hash.split('/');
  if (parts[0] === 'order' && parts[1] === 'new') {
    // 新規起票: draft を初期化（既に customer_id 等が事前セットされている場合は保持）
    if (!Screens.order_new.draft || Screens.order_new.isEditMode) Screens.order_new.initDraft();
    this.currentScreen = 'order_new';
    this.params = [];
  } else if (parts[0] === 'order') {
    // v2: 受注詳細も新規起票と同一画面（編集モード）で開く
    Screens.order_new.initFromOrder(parts[1]);
    this.currentScreen = 'order_new';
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
  // v2: クイック絞込クエリの反映
  if (this.currentScreen === 'orders' && query.filter) {
    Screens.orders.applyQuick(query.filter);
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
