/* =====================================================
 * 渡辺謄写堂 業務管理システム v3.0 Functional Mockup
 * localStorage ベース / 単一ファイルアプリ
 * v3.0 修正履歴 (2026-05-28):
 *  - 案件タグ: 「新規」を追加
 *  - 金額入力: 明細小計を「税抜/税込」で選択入力可能に（保持は税抜）
 *  - 顧客メモ: 未保存のまま別ページへ移動しようとした場合に警告
 *  - ステータス: 工場看板側に統一し5項目に整理（見積もり段階/受注/印刷中/完成/納品済み）
 *  - 不要ステータス: 「待機」「キャンセル」を廃止（キャンセルは削除で対応）
 *  - 担当者: 正式表記で登録（渡辺 聡/渡辺 豊/吉村 栄子/菅野 香里/金井 奈々子/安斎 崇子）
 * ---- 以下 v2.0 修正履歴 (2026-05-15) ----
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
  { value: '4Cx4C',      label: 'カラー両面（4C×4C）',                 mult: 1.00 },
  { value: '4Cx0',       label: 'カラー片面（4C×0）',                  mult: 0.65 },
  { value: '1Cx1C',      label: 'モノクロ両面（1C×1C）',               mult: 0.45 },
  { value: '1Cx0',       label: 'モノクロ片面（1C×0）',                mult: 0.30 },
  { value: 'tokushoku_2m', label: '特色1色両面',                       mult: 0.55 },
  { value: 'tokushoku_1m', label: '特色1色片面',                       mult: 0.38 },
  // v2.15: 表裏異種インク
  { value: '4Cx1C',      label: '片面カラー / 片面モノクロ（4C×1C）',   mult: 0.75 },
  { value: '4Cx_toku',   label: '片面カラー / 片面特色1色（4C×特1C）',  mult: 0.80 },
  { value: '1Cx_toku',   label: '片面モノクロ / 片面特色1色（1C×特1C）', mult: 0.50 },
];
// v3: ステータスを工場看板側に統一。見積もり段階/受注/印刷中/完成/納品済み の5項目に整理
//     「待機」「キャンセル」「製版中」「校正中」「作業中」「出荷待ち」は廃止（キャンセルは削除で対応）
const ORDER_STATUSES    = ['見積もり段階','受注','印刷中','完成','納品済み'];
// 工場カンバンの列（見積もり段階は工程前のため板には出さない）
const FACTORY_STATUSES  = ['見積もり段階','受注','印刷中','完成','納品済み'];  // v3: カンバンは5列（見積もり段階含む）
// v3: 旧ステータス値を新5項目へ正規化（シードデータ・旧保存データ両対応）
function normalizeStatus(s) {
  if (s === '製版中' || s === '校正中' || s === '作業中') return '印刷中';
  if (s === '納品済')   return '納品済み';
  if (s === '出荷待ち') return '印刷中';
  if (s === '待機')     return '受注';
  if (s === 'キャンセル') return '受注';  // 旧キャンセルは削除運用へ統一。残存データは受注扱い
  return s;
}
const AREAS             = ['亀谷','元町','東和','岩代','市街','その他'];
const RECEPTION_METHODS = ['電話','来客','FAX','メール','LINE','その他'];
// v2.13: ラベルを「予定/必ず/範囲指定/仮」に
const DELIVERY_TYPES    = [
  { value: 'single',    label: '予定' },
  { value: 'asap',      label: '必ず' },
  { value: 'range',     label: '範囲指定' },
  { value: 'tentative', label: '仮' },
];
const FOLDING_TYPES    = ['なし','2つ折','3つ折'];
const HOLE_POSITIONS   = ['なし','天2穴','左2穴'];  // 「ケ」→「穴」
const NORI_POSITIONS   = ['なし','天のり','左のり']; // のり: なし／天のり／左のり（穴と同じパターン）
const LAMINATION_OPTIONS = ['なし','PP貼り 艶あり','PP貼り 艶なし','パウチ'];  // 選択式に変更
const SEND_METHODS     = ['郵送','メール','LINE','直接手渡し'];
const PROCESSING_PRICE = { mishin: 500, folding: 800, hole: 300, numbering: 1500, yacho: 1200, lamination: 2000 };
const DATA_STATUS      = ['持込', 'ゼロから作成', '未受領'];
// v2.5: 税率は一律10%（旧 TAX_RATES = [10, 8] は廃止）
const TAX_RATE_FIXED   = 10;
// 顧客分類: 種別（単一選択） v2.1
const CUSTOMER_KINDS = ['地域・団体', '企業・個人'];
// 値引き名目 (v2.2: 「広告料」を正式名称に置換)
const DISCOUNT_LABEL_TYPES = ['値引き','JA全農くみあい飼料㈱広告代負担金','自由記載'];
// v2.2: ページ物用サイズ選択肢
const PAGE_SIZES = ['A4','B5','A5','自由'];
const TAG_PRESETS      = [
  { name: '新規',     color: '#3B82F6' },  // v3: 新規案件タグを追加
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
  // v3: 担当者を正式表記で登録（6名）
  users: [
    { id: 'u1', name: '渡辺 聡',     role: '代表',  email: 'watanabe.satoshi@toshado.jp' },
    { id: 'u2', name: '渡辺 豊',     role: '製版',  email: 'watanabe.yutaka@toshado.jp' },
    { id: 'u3', name: '吉村 栄子',   role: '工場',  email: 'yoshimura@toshado.jp' },
    { id: 'u4', name: '菅野 香里',   role: '事務',  email: 'kanno@toshado.jp' },
    { id: 'u5', name: '金井 奈々子', role: '事務',  email: 'kanai@toshado.jp' },
    { id: 'u6', name: '安斎 崇子',   role: '経理',  email: 'anzai@toshado.jp' },
  ],
  customers: [
    { id: 'c1',  company_name: '株式会社 高拡散',       kind: '企業・個人', area: '亀谷', phone: '0243-55-0001', fax: '0243-55-0091', address: '二本松市亀谷1-2-3',    notes: '月次発注あり。前回と同仕様リピート多し' },
    { id: 'c2',  company_name: '昭和タクシー株式会社', kind: '企業・個人', area: '市街', phone: '0243-55-0002', fax: '0243-55-0092', address: '二本松市本町5-1',      notes: '' },
    { id: 'c3',  company_name: '佐々木畳店',            kind: '企業・個人', area: '亀谷', phone: '0243-55-0003', fax: '0243-55-0093', address: '二本松市亀谷3-4-5',    notes: '' },
    { id: 'c4',  company_name: '福島県立 足立高等学校', kind: '地域・団体', area: '東和', phone: '0243-55-0004', fax: '0243-55-0094', address: '二本松市東和町8',      notes: '年度末の手引き大量発注あり' },
    { id: 'c5',  company_name: 'ワンワールド株式会社', kind: '企業・個人', area: '市街', phone: '0243-55-0005', fax: '0243-55-0095', address: '二本松市本町2-1',      notes: '' },
    { id: 'c6',  company_name: '郡山建設',              kind: '企業・個人', area: '市街', phone: '024-55-0006',  fax: '024-55-0096',  address: '郡山市駅前1-1',        notes: '' },
    { id: 'c7',  company_name: '福島中央病院',          kind: '地域・団体', area: '岩代', phone: '0243-55-0007', fax: '0243-55-0097', address: '二本松市岩代町10',     notes: '医療用フォーマット' },
    { id: 'c8',  company_name: '二本松市役所 元町支所', kind: '地域・団体', area: '元町', phone: '0243-55-0008', fax: '0243-55-0098', address: '二本松市元町15',       notes: '' },
    { id: 'c9',  individual_name: '山田 太郎',          kind: '企業・個人', area: '東和', phone: '090-1234-5678',fax: '',             address: '',                     notes: '個人名刺リピーター' },
    { id: 'c10', company_name: 'みやざき食堂',          kind: '企業・個人', area: '東和', phone: '0243-55-0010', fax: '0243-55-0100', address: '',                     notes: 'メニュー表も依頼あり' },
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
    status: normalizeStatus(o.status),   // v3: 旧ステータス値を新5項目へ正規化
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

// v2.11: ページネーション動作確認用ダミーデータ
(function pushDummyData() {
  // 顧客を 50件追加 (c11〜c60)
  const kinds = ['地域・団体','企業・個人'];
  const areas = ['亀谷','元町','東和','岩代','市街','その他'];
  const surnames = ['田中','鈴木','佐藤','高橋','伊藤','渡辺','山本','中村','小林','加藤','吉田','山田','森','池田','橋本','石川','後藤','岡田','長谷川','村上'];
  const bizSuffix = ['印刷所','商店','工房','製作所','スタジオ','事務所','整骨院','カフェ','美容室','クリニック','建設','設計','物産','商会','工業','サービス','保険','運送','酒店','薬局'];
  for (let i = 11; i <= 60; i++) {
    const isIndiv = i % 7 === 0;
    const phone = `0243-55-${String(1000 + i).slice(1)}`;
    const fax = i % 3 === 0 ? `0243-55-${String(1100 + i).slice(1)}` : '';
    SEED_DATA.customers.push(
      isIndiv ? {
        id: 'c' + i,
        individual_name: `${surnames[i % surnames.length]} ${['太郎','花子','次郎','美咲','健','由美','大輔','幸子'][i%8]}`,
        kind: kinds[i % 2],
        area: areas[i % areas.length],
        phone, fax, address: '', notes: 'ダミー顧客',
      } : {
        id: 'c' + i,
        company_name: `株式会社 ${surnames[i % surnames.length]}${bizSuffix[i % bizSuffix.length]}`,
        kind: kinds[i % 2],
        area: areas[i % areas.length],
        phone, fax, address: `二本松市${areas[i % areas.length]}${i}-${i*2}`, notes: 'ダミー顧客',
      }
    );
  }
  // 受注を 45件追加 (合計63件)
  const statuses = ['見積もり段階','受注','印刷中','完成','納品済み'];  // v3: 5項目に整理
  const inks = ['4Cx4C','4Cx0','1Cx1C','1Cx0'];
  const titles = ['名刺リピート','チラシ','パンフレット','ポスター','封筒','請求書','カタログ','ラベル','メニュー表','年賀状','挨拶状','配布物','広報誌'];
  for (let i = 1; i <= 45; i++) {
    const dd = String(((i * 7) % 28) + 1).padStart(2, '0');
    const mm = String(((i - 1) % 5) + 1).padStart(2, '0');
    const qty = (i % 10 + 1) * 100;
    const ext = qty * 10;
    SEED_DATA.orders.push({
      id: 'o_dummy' + i,
      order_number: `26${mm}${dd}-${String(500 + i).slice(1)}`,
      title: `${titles[i % titles.length]} ${qty}枚`,
      customer_id: 'c' + (((i - 1) % 60) + 1),
      received_date: `2026-${mm}-${dd}`,
      received_by_id: 'u1',
      reception_method: '電話',
      delivery_type: 'single',
      delivery_date_start: `2026-${mm}-${String(((i * 7) % 28) + 5 > 28 ? 28 : ((i * 7) % 28) + 5).padStart(2, '0')}`,
      delivery_date_end: null,
      status: statuses[i % statuses.length],
      memo: '',
      total_amount: Math.round(ext * 1.1),
      data_status: '持込',
      discount_amount: 0,
      discount_reason: '',
      discount_label_type: '値引き',
      show_discount: false,
      tags: [],
      attachments: [],
      created_by_id: 'u1',
      created_at: `2026-${mm}-${dd}T09:00:00`,
      updated_at: `2026-${mm}-${dd}T09:00:00`,
      items: [{
        id: 'it_dummy' + i,
        type: 'normal',
        title: `${titles[i % titles.length]} ${qty}枚`,
        paper_id: SEED_DATA.papers[i % SEED_DATA.papers.length].id,
        paper_other_memo: '',
        quantity: qty,
        ink_pattern: inks[i % inks.length],
        folding: 'なし',
        mishin_count: 0,
        hole_position: 'なし',
        nori_position: 'なし',
        numbering_enabled: false,
        numbering_from: null, numbering_to: null,
        yacho_style: false,
        lamination: 'なし',
        tax_rate: 10,
        subtotal: ext,
        unit_price: Math.round(ext / qty),
        item_notes: '',
      }],
    });
  }
})();

// factory_records for orders (v3: factory_status は廃止。工場進捗メタ情報のみ保持。カンバン列は o.status で決定)
SEED_DATA.factory_records = SEED_DATA.orders
  .filter(o => ['受注','印刷中','完成','納品済み'].includes(o.status))
  .map(o => ({
    id: 'fr_' + o.id,
    order_id: o.id,
    started_at: o.status !== '受注' ? o.received_date + 'T10:00:00' : null,
    completed_at: ['完成','納品済み'].includes(o.status) ? o.received_date + 'T14:00:00' : null,
    actual_quantity: null,
    factory_memo: '',
    completed_by_id: ['完成','納品済み'].includes(o.status) ? 'u3' : null,
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
  KEY: 'watanabe_db_v3_1',  // v3.1: 見積書を1見積=複数明細(複数行)表示に変更
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
    // v3: 旧ステータス値を新5項目へ正規化
    (this.data.orders || []).forEach(o => { o.status = normalizeStatus(o.status); });
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
    const { factory_status, ...orderForm } = form;  // v3: factory_status は廃止（受領しても無視）
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
    // v3: 工場進捗メタ情報レコード（ステータスは o.status で管理。ここは時刻等のメタのみ）
    const now = new Date().toISOString();
    this.data.factory_records.push({
      id: this.nextId('fr'),
      order_id: id,
      started_at: order.status === '印刷中' ? now : null,
      completed_at: ['完成','納品済み'].includes(order.status) ? now : null,
      actual_quantity: null,
      factory_memo: '',
      completed_by_id: ['完成','納品済み'].includes(order.status) ? App.currentUserId : null,
    });
    this.log('Order', id, `新規起票 (${order.order_number})`);
    this.save();
    return order;
  },
  updateOrder(id, patch, logMsg) {
    const o = this.find('orders', id);
    if (!o) return null;
    Object.assign(o, patch, { updated_at: new Date().toISOString() });
    // v3: ステータス変更に応じて工場進捗メタ（開始/完了時刻）を自動更新
    if (patch.status) {
      const fr = this.data.factory_records.find(f => f.order_id === id);
      if (fr) {
        const now = new Date().toISOString();
        if (patch.status === '印刷中' && !fr.started_at) fr.started_at = now;
        if (['完成','納品済み'].includes(patch.status)) {
          if (!fr.completed_at) fr.completed_at = now;
          if (!fr.completed_by_id) fr.completed_by_id = App.currentUserId;
        }
      }
    }
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
  // Quote (v2: 複数パターン対応 / v2.5: 明細ごと作成)
  createQuoteForItem(order_id, item_id) {
    const order = this.find('orders', order_id);
    if (!order) return null;
    const item = order.items.find(it => it.id === item_id);
    if (!item) return null;
    const existing = this.data.quotes.find(q => q.order_id === order_id && q.item_id === item_id);
    if (existing) return existing;
    const initialAmount = +item.subtotal || 0;
    const q = {
      id: this.nextId('q'),
      quote_number: this.nextQuoteNumber(),
      order_id, item_id,
      issued_date: TODAY,
      valid_until: addMonths(TODAY, 1),
      total_amount: Math.round(initialAmount * 1.1),
      send_method: 'メール',
      status: '作成中',
      memo: '',
      patterns: [
        { id: this.nextId('qp'), label: '基本案', amount: initialAmount, accepted: true,
          show_discount: false, discount_amount: 0,
          discount_label_type: '値引き', discount_label_text: '' },
      ],
    };
    this.data.quotes.push(q);
    this.log('Quote', q.id, `見積書作成 (${q.quote_number} / 明細#${order.items.findIndex(it=>it.id===item_id)+1})`);
    this.save();
    return q;
  },
  // v2.8: 1受注=1見積書、明細1件=パターン1件で自動同期
  syncQuotePatterns(quote_id) {
    const q = this.find('quotes', quote_id);
    if (!q) return;
    const order = this.find('orders', q.order_id);
    if (!order) return;
    if (!q.patterns) q.patterns = [];
    const itemIds = new Set(order.items.map(it => it.id));
    q.patterns = q.patterns.filter(p => itemIds.has(p.item_id));
    const newPatterns = [];
    order.items.forEach(it => {
      const found = q.patterns.find(p => p.item_id === it.id);
      if (found) {
        newPatterns.push(found);
      } else {
        newPatterns.push({
          id: this.nextId('qp'),
          item_id: it.id,
          label: it.title || '',
          amount: +it.subtotal || 0,
          accepted: false,
          show_discount: false,
          discount_amount: 0,
          discount_label_type: '値引き',
          discount_label_text: '',
        });
      }
    });
    // v2.9: いずれかが accepted=true でなければ先頭を採用
    if (newPatterns.length > 0 && !newPatterns.some(p => p.accepted)) {
      newPatterns[0].accepted = true;
    }
    q.patterns = newPatterns;
    this.save();
  },
  createQuote(order_id) {
    const order = this.find('orders', order_id);
    if (!order) return null;
    const existing = this.data.quotes.find(q => q.order_id === order_id && !q.item_id);
    if (existing) {
      this.syncQuotePatterns(existing.id);
      return existing;
    }
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
      patterns: order.items.map((it, i) => ({
        id: this.nextId('qp'),
        item_id: it.id,
        label: it.title || '',
        amount: +it.subtotal || 0,
        accepted: i === 0,    // v2.9: 先頭を初期採用
        show_discount: false,
        discount_amount: 0,
        discount_label_type: '値引き',
        discount_label_text: '',
      })),
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
    // v3: 1見積書=複数明細(複数行)。全パターン(=全明細)の金額を合算して総額を同期。各明細subtotalもパターン金額に同期
    const order = this.find('orders', q.order_id);
    const subtotalEx = q.patterns.reduce((s,x) => s + Math.max(0, (+x.amount||0) - (x.show_discount ? (+x.discount_amount||0) : 0)), 0);
    q.total_amount = Math.round(subtotalEx * (100 + TAX_RATE_FIXED) / 100);
    if (order) {
      q.patterns.forEach(x => { if (x.item_id) { const it = order.items.find(it => it.id === x.item_id); if (it) it.subtotal = +x.amount || 0; } });
      order.total_amount = order.items.reduce((s,it)=> s + Math.round(((+it.subtotal||0) * (100+TAX_RATE_FIXED)/100)), 0);
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
  // v2.16: 年月日+曜日
  dateWY(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    const w = ['日','月','火','水','木','金','土'][d.getDay()];
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}（${w}）`;
  },
  delivery(o) {
    // v2.13: 予定/必ず/範囲指定/仮
    if (o.delivery_type === 'asap')      return o.delivery_date_start ? `必ず ${fmt.dateW(o.delivery_date_start)}` : '必ず（未指定）';
    if (o.delivery_type === 'tentative') return o.delivery_date_start ? `仮 ${fmt.dateW(o.delivery_date_start)}` : '仮（未定）';
    if (o.delivery_type === 'range')     return `${fmt.dateW(o.delivery_date_start)}〜${fmt.dateW(o.delivery_date_end)}`;
    return o.delivery_date_start ? `予定 ${fmt.dateW(o.delivery_date_start)}` : '予定（未指定）';
  },
  // v2: 納期超過なら "N日経過" を返す。未到来は null
  overdueText(o) {
    if (!o || !o.delivery_date_start) return null;
    if (['納品済み','見積もり段階'].includes(o.status)) return null;
    const diff = dayDiff(TODAY, o.delivery_date_start); // TODAY - 納期 (>0 で超過)
    if (diff > 0) return `${diff}日経過`;
    return null;
  },
  // v2: ラミネートのバッジ文言（なし以外）
  laminationLabel(v) { return (!v || v === 'なし') ? '' : v; },
  tagBadge(name) {
    // v2.9: 色分け廃止、統一色
    return `<span style="display:inline-block;background:#707070;color:white;font-size: inherit;font-weight:700;padding:1px 6px;border-radius:10px;margin-right:3px;white-space:nowrap;">${esc(name)}</span>`;
  },
  tags(arr) { return (arr || []).map(t => fmt.tagBadge(t)).join(''); },
  // v3: 値引きの表示名目を解決（自由記載=入力テキスト / JA等=その名称 / 既定=値引き）
  discountLabel(type, text) {
    if (type === '自由記載') return (text && text.trim()) ? text.trim() : '値引き';
    return type || '値引き';
  },
};

function calcItemPrice(item) {
  // v2.7: 全明細の小計は自由入力（外税）。subtotalをそのまま使い、自動計算は廃止
  const subtotal = +item.subtotal || 0;
  const unit_price = item.quantity > 0 ? Math.round(subtotal / item.quantity) : 0;
  return { unit_price, subtotal };
}
function calcOrderTotal(items) {
  return items.reduce((sum, it) => sum + (calcItemPrice(it).subtotal), 0);
}
function calcOrder(items, discount = 0) {
  const subtotal = calcOrderTotal(items);
  const breakdown = {};
  items.forEach(it => {
    const rate = TAX_RATE_FIXED;
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
  render(opts = {}) {
    // v2.14: スクロール位置を保存（デフォルトは保持、画面遷移時のみトップへ）
    const savedScrollY = window.scrollY;
    // v2.6: 受注確認モード時は body に view-mode クラスを付与
    document.body.classList.toggle('view-mode',
      Router.currentScreen === 'order_new' && Screens.order_new.displayMode === 'view');
    // Highlight nav (v2: 編集モード時は受注一覧をハイライト)
    const editing = Router.currentScreen === 'order_new' && Screens.order_new.isEditMode;
    const effective = editing ? 'orders' : Router.currentScreen;
    $$('[data-screen]').forEach(b => {
      b.classList.toggle('active', b.dataset.screen === effective || (Router.currentScreen === 'customer' && b.dataset.screen === 'customers'));
    });
    $$('.side-link').forEach(l => {
      const match = l.dataset.screen === effective ||
                    (Router.currentScreen === 'customer' && l.dataset.screen === 'customers');
      l.classList.toggle('active', match);
    });
    // Render screen
    const main = $('#main');
    const screen = Screens[Router.currentScreen];
    if (!screen) { main.innerHTML = `<div class="text-center py-16 text-ink-500">画面が見つかりません: ${Router.currentScreen}</div>`; return; }
    main.innerHTML = screen.render(...(Router.params || []));
    screen.bind?.(...(Router.params || []));
    // v2.10: ユーザーリンク更新
    if (typeof refreshUserLink === 'function') refreshUserLink();
    // v2.14: スクロール位置: opts.scroll === 'top' のときのみ最上部へ。それ以外は保持
    if (opts.scroll === 'top') {
      window.scrollTo({ top: 0 });
    } else {
      window.scrollTo({ top: savedScrollY });
    }
  },
};

// ========= Screens =========
const Screens = {};

// ---------- Dashboard (v2: 売上見込み・納期超過・クリック絞込) ----------
Screens.dashboard = {
  render() {
    const orders = DB.all('orders');
    const today = TODAY;
    const active = (o) => o.status !== '納品済み';
    const todayDue   = orders.filter(o => o.delivery_date_start === today && active(o));
    const inProgress = orders.filter(o => ['受注','印刷中'].includes(o.status));
    const urgent     = orders.filter(o => active(o) && o.delivery_date_start && dayDiff(o.delivery_date_start, today) <= 3 && dayDiff(o.delivery_date_start, today) >= 0);
    const overdue    = orders.filter(o => active(o) && o.status !== '見積もり段階' && o.delivery_date_start && dayDiff(today, o.delivery_date_start) > 0);
    // 今月売上「見込み」: 受注済（見積もり段階を除く）の今月分合計
    const thisMonth  = orders.filter(o => o.received_date && o.received_date.slice(0,7) === today.slice(0,7) && o.status !== '見積もり段階');
    const monthSalesForecast = thisMonth.reduce((s,o) => s + (o.total_amount || 0), 0);
    const recentLogs = [...DB.all('change_logs')].sort((a,b) => (b.changed_at || '').localeCompare(a.changed_at || '')).slice(0, 8);

    return `
      <div class="mb-4">
        <h1 class="text-2xl font-black">ダッシュボード</h1>
        <p class="text-sm text-ink-500">${fmt.dateJp(today)} の状況 / カードをクリックで該当案件を絞り込み表示</p>
      </div>
      <div class="grid grid-cols-5 gap-3 mb-6">
        <a href="#orders?filter=today" class="dash-card bg-white border-2 border-brand p-4 rounded shadow-sm hover:shadow-md transition" data-filter="today">
          <div class="text-xs text-ink-500 font-bold">本日納品予定</div>
          <div class="text-2xl font-black mt-1">${todayDue.length}<span class="text-sm font-normal text-ink-500">件</span></div>
        </a>
        <a href="#orders?filter=inprogress" class="dash-card bg-white border-2 border-ok p-4 rounded shadow-sm hover:shadow-md transition" data-filter="inprogress">
          <div class="text-xs text-ink-500 font-bold">進行中</div>
          <div class="text-2xl font-black mt-1">${inProgress.length}<span class="text-sm font-normal text-ink-500">件</span></div>
        </a>
        <a href="#orders?filter=urgent" class="dash-card bg-white border-2 border-red-500 p-4 rounded shadow-sm hover:shadow-md transition" data-filter="urgent">
          <div class="text-xs text-ink-500 font-bold">納期3日以内</div>
          <div class="text-2xl font-black mt-1 ${urgent.length>0?'text-red-600':''}">${urgent.length}<span class="text-sm font-normal text-ink-500">件</span></div>
        </a>
        <a href="#orders?filter=overdue" class="dash-card bg-white border-2 border-red-700 p-4 rounded shadow-sm hover:shadow-md transition" data-filter="overdue">
          <div class="text-xs text-ink-500 font-bold">納期超過</div>
          <div class="text-2xl font-black mt-1 ${overdue.length>0?'text-red-700':''}">${overdue.length}<span class="text-sm font-normal text-ink-500">件</span></div>
        </a>
        <div class="bg-white border-2 border-blue-500 p-4 rounded shadow-sm">
          <div class="text-xs text-ink-500 font-bold">今月売上見込み</div>
          <div class="text-2xl font-black mt-1">${fmt.money(monthSalesForecast)}</div>
          <div class="text-xs text-ink-500">受注済(${thisMonth.length}件) 合計</div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="bg-white rounded shadow-sm col-span-2">
          <div class="bg-ink-900 text-white px-4 py-2 rounded-t font-bold flex justify-between">
            <span>本日納品予定</span>
            <span class="text-xs text-ink-300"></span>
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
          <div class="bg-red-600 text-white px-4 py-2 rounded-t font-bold">最近の変更履歴</div>
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
  page: 1,
  PAGE_SIZE: 50,
  // v2: ダッシュボードからのクイック絞り込み
  applyQuick(quick) {
    this.filter = { q:'', status:'', from:'', to:'', tag:'', quick };
    this.page = 1;
  },
  render() {
    const all = DB.all('orders').slice().sort((a,b) => (b.received_date || '').localeCompare(a.received_date || ''));
    const f = this.filter;
    const active = (o) => o.status !== '納品済み';
    const filtered = all.filter(o => {
      // クイック絞込
      if (f.quick === 'today'      && !(o.delivery_date_start === TODAY && active(o))) return false;
      if (f.quick === 'inprogress' && !['受注','印刷中'].includes(o.status)) return false;
      if (f.quick === 'urgent'     && !(active(o) && o.delivery_date_start && dayDiff(o.delivery_date_start, TODAY) <= 3 && dayDiff(o.delivery_date_start, TODAY) >= 0)) return false;
      if (f.quick === 'overdue'    && !(active(o) && o.status !== '見積もり段階' && o.delivery_date_start && dayDiff(TODAY, o.delivery_date_start) > 0)) return false;
      if (f.quick === 'estimate'   && o.status !== '見積もり段階') return false;
      if (f.q) {
        // v2.13: 受注一覧の検索は顧客名のみ
        const cust = fmt.customer(o.customer_id).toLowerCase();
        if (!cust.includes(f.q.toLowerCase())) return false;
      }
      if (f.status && o.status !== f.status) return false;
      if (f.from && o.received_date < f.from) return false;
      if (f.to && o.received_date > f.to) return false;
      if (f.tag && !(o.tags || []).includes(f.tag)) return false;
      return true;
    });
    const quickLabel = {today:'本日納品予定', inprogress:'進行中', urgent:'納期3日以内', overdue:'納期超過', estimate:'見積もり段階'}[f.quick] || '';
    // v2.11: ページネーション
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.PAGE_SIZE));
    const page = Math.min(Math.max(1, this.page), totalPages);
    this.page = page;
    const pageList = filtered.slice((page-1)*this.PAGE_SIZE, page*this.PAGE_SIZE);
    return `
      <div class="flex justify-between items-center mb-4">
        <div>
          <h1 class="text-2xl font-black">受注一覧</h1>
          ${quickLabel ? `<p class="text-xs text-ink-500">クイック絞込: <b class="text-brand">${quickLabel}</b> <button id="btn-clear-quick" class="ml-2 text-xs text-red-500 underline">クリア</button></p>` : ''}
        </div>
        <a href="#order/new" class="bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded font-bold shadow-sm">+ 新規受注起票</a>
      </div>
      <div class="bg-white p-4 rounded shadow-sm mb-4 grid grid-cols-6 gap-3 text-sm" id="filter-bar">
        <div class="col-span-2"><label class="block text-xs font-bold mb-1">顧客名検索</label><input id="f-q" class="w-full border rounded px-2 py-1.5" value="${esc(f.q)}" placeholder="例: タクシー, 高拡散"></div>
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
          <span class="text-sm">結果 <span class="font-bold">${filtered.length}</span> / ${all.length} 件 <span class="text-ink-500 ml-2">(${(page-1)*this.PAGE_SIZE+1}〜${Math.min(page*this.PAGE_SIZE, filtered.length)}件を表示)</span></span>
        </div>
        <table class="w-full text-sm">
          <thead class="bg-ink-700/5"><tr class="text-left">
            <th class="px-3 py-2">受注番号</th><th class="px-3 py-2">受付日</th><th class="px-3 py-2">顧客</th><th class="px-3 py-2">品名 / タグ</th><th class="px-3 py-2 text-right">数量</th><th class="px-3 py-2">納品日</th><th class="px-3 py-2 text-right">金額</th><th class="px-3 py-2">状態</th>
          </tr></thead>
          <tbody>
            ${filtered.length === 0 ? `<tr><td colspan="8" class="text-center py-10 text-ink-500">該当なし</td></tr>` :
              pageList.map(o => {
                const overdue = fmt.overdueText(o);
                const totalQty = o.items.reduce((s, it) => s + (+it.quantity || 0), 0);
                return `
                <tr class="border-t hover:bg-brand/5 cursor-pointer" onclick="location.hash='#order/${o.id}'">
                  <td class="px-3 py-2 font-mono text-xs">${esc(o.order_number)}</td>
                  <td class="px-3 py-2">${esc(fmt.dateW(o.received_date))}</td>
                  <td class="px-3 py-2">${esc(fmt.customer(o.customer_id))}</td>
                  <td class="px-3 py-2 text-xs">
                    <div class="font-bold">${esc(o.title || '—')}</div>
                    ${o.tags && o.tags.length ? `<div class="mt-1">${fmt.tags(o.tags)}</div>` : ''}
                  </td>
                  <td class="px-3 py-2 text-right font-mono">${totalQty}</td>
                  <td class="px-3 py-2">${o.delivered_date ? esc(fmt.dateW(o.delivered_date)) : esc(fmt.delivery(o))}${overdue ? `<div class="text-xs text-purple-600 font-bold mt-1">${overdue}</div>` : ''}</td>
                  <td class="px-3 py-2 text-right font-mono">${fmt.money(o.total_amount)}</td>
                  <td class="px-3 py-2"><span class="st st-${esc(o.status)}">${esc(o.status)}</span></td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
        ${totalPages > 1 ? `
        <div class="flex justify-center items-center gap-3 p-3 text-sm border-t">
          <button id="pg-prev" class="px-3 py-1 border rounded ${page<=1?'opacity-40 cursor-not-allowed':'hover:bg-ink-700/5'}" ${page<=1?'disabled':''}>← 前</button>
          <span class="font-bold">ページ ${page} / ${totalPages}</span>
          <button id="pg-next" class="px-3 py-1 border rounded ${page>=totalPages?'opacity-40 cursor-not-allowed':'hover:bg-ink-700/5'}" ${page>=totalPages?'disabled':''}>次 →</button>
        </div>` : ''}
      </div>`;
  },
  bind() {
    const apply = () => {
      this.filter = {
        ...this.filter,
        q: $('#f-q').value,
        status: $('#f-status').value,
        from: $('#f-from').value,
        to: $('#f-to').value,
        tag: $('#f-tag')?.value || '',
      };
      this.page = 1;  // v2.11: フィルタ変更時はページリセット
      App.render();
    };
    ['#f-q','#f-status','#f-from','#f-to','#f-tag'].forEach(sel => {
      const el = $(sel);
      el && el.addEventListener('input', debounce(apply, 300));
      el && el.addEventListener('change', apply);
    });
    $('#btn-filter-clear')?.addEventListener('click', () => { this.filter = { q:'', status:'', from:'', to:'', tag:'', quick:'' }; this.page = 1; App.render(); });
    $('#btn-clear-quick')?.addEventListener('click', () => { this.filter.quick = ''; this.page = 1; App.render(); });
    $('#pg-prev')?.addEventListener('click', () => { this.page = Math.max(1, this.page - 1); App.render(); });
    $('#pg-next')?.addEventListener('click', () => { this.page = this.page + 1; App.render(); });
  },
};

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// ---------- Order New ----------
Screens.order_new = {
  draft: null,
  isEditMode: false,
  editId: null,
  displayMode: 'new',   // v2.6: 'new' | 'edit' | 'view'
  initDraft() {
    this.isEditMode = false;
    this.editId = null;
    this.displayMode = 'new';
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
    };
  },
  // v2: 既存受注を draft に読み込み、編集 or 確認モードで開く
  initFromOrder(orderId, mode = 'view') {
    const o = DB.find('orders', orderId);
    if (!o) { this.initDraft(); return; }
    this.draft = clone(o);
    this.draft.show_discount = (o.discount_amount || 0) > 0;
    this.draft.items = (this.draft.items || []).map((it, i) => ({
      ...it,
      type: it.type || 'normal',
      title: it.title || (i === 0 ? (o.title || '') : ''),
      // v2.13: 旧データ互換: 明細に納期がなければ受注全体の納期を継承
      delivery_type: it.delivery_type || o.delivery_type || 'single',
      delivery_date_start: it.delivery_date_start || o.delivery_date_start || '',
      delivery_date_end: it.delivery_date_end || o.delivery_date_end || '',
      first_proof_date: it.first_proof_date || (i === 0 ? (o.first_proof_date || null) : null),
      used_date: it.used_date || (i === 0 ? (o.used_date || null) : null),
    }));
    this.isEditMode = true;
    this.editId = orderId;
    this.displayMode = mode === 'edit' ? 'edit' : 'view';
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
      subtotal: 0,                 // v2.7: 自由入力（外税）
      unit_price: 0,
      // v2.13: 納期/初校日/使用日 を明細単位で保持
      delivery_type: 'single',
      delivery_date_start: '',
      delivery_date_end: '',
      first_proof_date: null,
      used_date: null,
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
      // v2.13: 納期/初校日/使用日 を明細単位で保持
      delivery_type: 'single',
      delivery_date_start: '',
      delivery_date_end: '',
      first_proof_date: null,
      used_date: null,
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

    const mode = this.displayMode || (this.isEditMode ? 'edit' : 'new');
    const isView = mode === 'view';
    const isNew  = mode === 'new';
    const isEdit = mode === 'edit';   // v2.6: editing existing order
    const editingOrder = this.isEditMode ? DB.find('orders', this.editId) : null;
    const overdueTxt = editingOrder ? fmt.overdueText(editingOrder) : null;
    return `
      <div class="flex justify-between items-start mb-4">
        <div>
          ${editingOrder ? `
            <div class="flex items-center gap-3 flex-wrap">
              <a href="#orders" class="text-ink-500 text-sm">← 一覧</a>
              <h1 class="text-2xl font-black">受注 <span class="font-mono">#${esc(editingOrder.order_number)}</span></h1>
              ${overdueTxt ? `<span class="st st-経過 text-sm">${overdueTxt}</span>` : ''}
            </div>
          ` : `
            <h1 class="text-2xl font-black">受注新規起票</h1>
            <p class="text-sm text-ink-500">お問い合わせ・来客を受けたらここに起票</p>
          `}
        </div>
        <div class="flex gap-2 flex-wrap">
          ${isView ? `
            <button id="btn-spec-copy" class="view-allow border px-3 py-2 rounded text-sm">この仕様でコピー</button>
            <a href="#print/${editingOrder.id}" class="view-allow border px-3 py-2 rounded text-sm">印刷ビュー</a>
            <button id="btn-quote" class="view-allow border px-3 py-2 rounded text-sm">見積書</button>
            <button id="btn-delete" class="view-allow border border-red-500 text-red-500 px-3 py-2 rounded text-sm">削除</button>
            <a href="#order/${editingOrder.id}/edit" class="view-allow bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded font-bold">編集に進む</a>
          ` : isNew ? `
            <button id="btn-cancel" class="border px-4 py-2 rounded font-bold">キャンセル</button>
            <button id="btn-save" class="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded font-bold">✓ 保存して起票</button>
          ` : `
            <a href="#order/${editingOrder.id}" class="border px-3 py-2 rounded text-sm">← 確認に戻る</a>
            <button id="btn-delete" class="border border-red-500 text-red-500 px-3 py-2 rounded text-sm">削除</button>
            <button id="btn-cancel" class="border px-4 py-2 rounded font-bold">変更を破棄</button>
            <button id="btn-save" class="bg-brand hover:bg-brand-dark text-white px-6 py-2 rounded font-bold">✓ 変更を保存</button>
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
                  ${isNew ? `<button id="btn-new-customer" class="border px-2 py-1 rounded text-xs bg-brand/10 text-brand font-bold whitespace-nowrap">+ 新規</button>` : ''}
                </div>
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
              <!-- v2.13: 納期/初校日/使用日 は各製作明細セクションへ移動 -->
            </div>
          </div>

          <!-- v2.6: 案件属性は製作明細の下に移動（このブロックは旧位置から削除） -->

          <!-- 明細 -->
          <div class="bg-white rounded shadow-sm">
            <div class="bg-ink-900 text-white px-4 py-2 rounded-t font-bold flex justify-between items-center">
              <span>製作明細</span>
              <div class="flex gap-1">
                <button id="btn-add-item" class="text-xs border border-white/50 px-2 py-0.5 rounded hover:bg-white/10">+ 通常を追加</button>
                <button id="btn-add-page-item" class="text-xs border border-purple-300 bg-purple-700 px-2 py-0.5 rounded hover:bg-purple-600">+ ページ物を追加</button>
              </div>
            </div>
            <div id="items-container">
              ${d.items.length === 0 ? `
                <div class="p-8 text-center text-ink-500 border-2 border-dashed border-ink-300 m-4 rounded">
                  <div class="text-2xl mb-2"></div>
                  <div class="font-bold mb-1">明細が未追加です</div>
                  <div class="text-xs">右上の「+ 通常を追加」または「+ ページ物を追加」から明細を追加してください。<br>※ 各明細ごとに品名を入力します。ページ物のみの受注も可能です。</div>
                </div>
              ` : d.items.map((it, i) => this.renderItem(it, i, majorPapers, otherPapers)).join('')}
            </div>
          </div>

          <!-- 案件属性（v2.6: 製作明細の下に配置） -->
          <div class="bg-white rounded shadow-sm">
            <div class="bg-ink-900 text-white px-4 py-2 rounded-t font-bold">案件属性</div>
            <div class="p-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <label class="block text-xs font-bold mb-1">入稿データ</label>
                <select id="f-data-status" class="w-full border rounded px-2 py-1.5">
                  ${DATA_STATUS.map(s => `<option ${d.data_status===s?'selected':''}>${s}</option>`).join('')}
                </select>
              </div>
              <!-- v2.8: 値引きは見積書側で管理。案件属性からは廃止 -->
              <div class="col-span-3">
                <label class="block text-xs font-bold mb-1">案件タグ</label>
                <div class="flex flex-wrap gap-1.5">
                  ${DB.tagsMaster().map(t => `
                    <label class="cursor-pointer">
                      <input type="checkbox" class="hidden tag-check" value="${esc(t.name)}" ${d.tags.includes(t.name)?'checked':''}>
                      <span class="inline-block px-2 py-0.5 text-xs font-bold rounded-full border ${d.tags.includes(t.name)?'bg-ink-700 text-white border-ink-700':'bg-white text-ink-700 border-ink-300'}">${esc(t.name)}</span>
                    </label>`).join('')}
                </div>
              </div>
              <div class="col-span-3 edit-only">
                <label class="block text-xs font-bold mb-1">入稿データ・参考資料の添付</label>
                <input type="file" id="f-attach" class="w-full border rounded px-2 py-1.5 text-sm" multiple>
                ${(d.attachments||[]).length ? `<div class="mt-2 flex flex-wrap gap-1 text-xs">
                  ${d.attachments.map((a, ai) => `<span class="bg-brand/10 text-brand px-2 py-1 rounded flex items-center gap-1">📎 ${esc(a.name)} <button class="text-red-500 font-bold btn-remove-attach" data-idx="${ai}">×</button></span>`).join('')}
                </div>` : ''}
              </div>
            </div>
          </div>

          <!-- メモ -->
          <div class="bg-white rounded shadow-sm">
            <div class="bg-ink-900 text-white px-4 py-2 rounded-t font-bold">備考（フリーメモ）</div>
            <div class="p-4">
              <textarea id="f-memo" class="w-full border rounded px-2 py-1.5 text-sm bg-ink-300/30" rows="4" placeholder="顧客指示・参考情報など">${esc(d.memo)}</textarea>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="bg-white rounded shadow-sm">
            <div class="bg-brand text-white px-4 py-2 rounded-t font-bold">見積サマリー</div>
            <div class="p-4 text-sm space-y-2">
              ${(() => {
                // v2.6: 値引き金額>0 のとき自動で適用
                const useDiscount = (d.discount_amount || 0) > 0;
                const calc = calcOrder(d.items, useDiscount ? (d.discount_amount || 0) : 0);
                let html = '';
                d.items.forEach((it, i) => {
                  const { subtotal } = calcItemPrice(it);
                  html += `<div class="flex justify-between text-xs"><span>明細 #${i+1}</span><span class="font-mono">${fmt.money(subtotal)}</span></div>`;
                });
                html += '<hr>';
                html += `<div class="flex justify-between"><span>小計</span><span class="font-mono font-bold">${fmt.money(calc.subtotal)}</span></div>`;
                if (calc.discount > 0) {
                  html += `<div class="flex justify-between text-red-600"><span>${esc(d.discount_label_type || '値引き')}${d.discount_reason ? `<span class="text-xs text-ink-500 ml-1">(${esc(d.discount_reason)})</span>`:''}</span><span class="font-mono">-${fmt.money(calc.discount)}</span></div>`;
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

          <!-- v3: ステータス操作（工場看板と統一・5項目。新規時は見積もり段階/受注のみ） -->
          <div class="bg-white rounded shadow-sm">
            <div class="px-4 py-2 border-b font-bold">ステータス操作</div>
            <div class="p-3 space-y-2 text-sm">
              ${(isNew ? ['見積もり段階','受注'] : ORDER_STATUSES).map(s => `
                <button class="w-full border px-3 py-2 rounded text-left text-sm ${d.status===s?'bg-brand text-white border-brand font-bold':'hover:bg-ink-700/5'} draft-set-status" data-status="${s}">
                  ${esc(s)}
                </button>`).join('')}
            </div>
          </div>

          ${customer && isNew ? `
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

          ${!isNew ? `
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
    // v3: 金額入力は税抜・税込それぞれの入力欄を用意（subtotal は常に税抜で保持）
    const subEx = +it.subtotal || 0;
    const subIn = Math.round(subEx * (100 + TAX_RATE_FIXED) / 100);
    return `
      <div class="p-4 ${i > 0 ? 'border-t' : 'border-t'}" data-item-idx="${i}">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-black bg-ink-700 text-white px-2 py-0.5 rounded">明細 #${i+1}</span>
          <span class="text-xs text-ink-500">通常</span>
          <button class="text-xs text-red-500 ml-auto btn-remove-item" data-idx="${i}">削除</button>
        </div>
        <div class="mb-2">
          <label class="block text-xs font-bold mb-1 text-red-600">* 品名</label>
          <input class="w-full border rounded px-2 py-1.5 text-sm font-bold item-title" data-idx="${i}" placeholder="例: 名刺リピート 500枚" value="${esc(it.title||'')}">
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
          <div class="col-span-3">
            <label class="block text-xs font-bold mb-1">インク</label>
            <select class="w-full border rounded px-2 py-1.5 item-ink" data-idx="${i}">
              ${INK_PATTERNS.map(ip => `<option value="${ip.value}" ${it.ink_pattern===ip.value?'selected':''}>${esc(ip.label)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2 text-sm mt-2">
          <div>
            <label class="block text-xs font-bold mb-1">小計（税抜）</label>
            <input type="number" min="0" step="100" class="w-full border rounded px-2 py-1.5 text-right font-mono font-bold text-ink-900 item-subtotal-ex" data-idx="${i}" value="${subEx}">
          </div>
          <div>
            <label class="block text-xs font-bold mb-1">小計（税込）</label>
            <input type="number" min="0" step="100" class="w-full border rounded px-2 py-1.5 text-right font-mono text-ink-700 item-subtotal-in" data-idx="${i}" value="${subIn}">
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
        <div class="mt-3 p-3 bg-ink-700/5 rounded">
          <div class="text-xs font-bold mb-2 text-ink-500">納期 / 初校日 / 使用日</div>
          <div class="grid grid-cols-6 gap-2 text-xs items-end">
            <div class="col-span-3">
              <label class="block text-xs font-bold mb-1">納期区分</label>
              <div class="flex gap-2 flex-wrap">
                ${DELIVERY_TYPES.map(dt => `<label class="flex items-center gap-1"><input type="radio" name="dt-${i}" value="${dt.value}" ${(it.delivery_type||'single')===dt.value?'checked':''} class="item-dt" data-idx="${i}">${dt.label}</label>`).join('')}
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">納期日</label>
              <input type="date" class="w-full border rounded px-1 py-1 item-dstart" data-idx="${i}" value="${it.delivery_date_start||''}">
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">〜終了</label>
              <input type="date" class="w-full border rounded px-1 py-1 item-dend" data-idx="${i}" value="${it.delivery_date_end||''}" ${(it.delivery_type==='range')?'':'disabled'}>
            </div>
            <div></div>
            <div>
              <label class="block text-xs font-bold mb-1">初校日</label>
              <input type="date" class="w-full border rounded px-1 py-1 item-proof" data-idx="${i}" value="${it.first_proof_date||''}">
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">使用日</label>
              <input type="date" class="w-full border rounded px-1 py-1 item-used" data-idx="${i}" value="${it.used_date||''}">
            </div>
          </div>
        </div>
        <div class="mt-2 flex gap-2 items-center">
          <input class="flex-1 border rounded px-2 py-1.5 text-sm item-note" data-idx="${i}" placeholder="この明細のメモ（任意）" value="${esc(it.item_notes)}">
        </div>
      </div>`;
  },
  // v2.2: ページ物明細レンダー
  renderPageItem(it, i) {
    // v3: 金額入力は税抜・税込それぞれの入力欄（subtotal は常に税抜で保持）
    const subEx = +it.subtotal || 0;
    const subIn = Math.round(subEx * (100 + TAX_RATE_FIXED) / 100);
    return `
      <div class="p-4 border-t bg-purple-50/40" data-item-idx="${i}">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-black bg-purple-700 text-white px-2 py-0.5 rounded">明細 #${i+1}</span>
          <span class="text-xs text-purple-700 font-bold">ページ物</span>
          <button class="text-xs text-red-500 ml-auto btn-remove-item" data-idx="${i}">削除</button>
        </div>
        <div class="mb-2">
          <label class="block text-xs font-bold mb-1 text-red-600">* 品名</label>
          <input class="w-full border rounded px-2 py-1.5 text-sm font-bold item-title" data-idx="${i}" placeholder="例: 40周年記念誌 / 第○回総会資料" value="${esc(it.title||'')}">
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
          <div class="col-span-3">
            <label class="block text-xs font-bold mb-1">ページ数</label>
            <input class="w-full border rounded px-2 py-1.5 item-page-count" data-idx="${i}" value="${esc(it.page_count||'')}" placeholder="例: 本文64P + 表紙">
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
        <div class="grid grid-cols-2 gap-2 text-sm mt-2">
          <div>
            <label class="block text-xs font-bold mb-1">小計（税抜）</label>
            <input type="number" min="0" step="100" class="w-full border rounded px-2 py-1.5 text-right font-mono font-bold text-ink-900 item-page-subtotal-ex" data-idx="${i}" value="${subEx}">
          </div>
          <div>
            <label class="block text-xs font-bold mb-1">小計（税込）</label>
            <input type="number" min="0" step="100" class="w-full border rounded px-2 py-1.5 text-right font-mono text-ink-700 item-page-subtotal-in" data-idx="${i}" value="${subIn}">
          </div>
        </div>
        <div class="mt-3 p-3 bg-ink-700/5 rounded">
          <div class="text-xs font-bold mb-2 text-ink-500">納期 / 初校日 / 使用日</div>
          <div class="grid grid-cols-6 gap-2 text-xs items-end">
            <div class="col-span-3">
              <label class="block text-xs font-bold mb-1">納期区分</label>
              <div class="flex gap-2 flex-wrap">
                ${DELIVERY_TYPES.map(dt => `<label class="flex items-center gap-1"><input type="radio" name="dt-${i}" value="${dt.value}" ${(it.delivery_type||'single')===dt.value?'checked':''} class="item-dt" data-idx="${i}">${dt.label}</label>`).join('')}
              </div>
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">納期日</label>
              <input type="date" class="w-full border rounded px-1 py-1 item-dstart" data-idx="${i}" value="${it.delivery_date_start||''}">
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">〜終了</label>
              <input type="date" class="w-full border rounded px-1 py-1 item-dend" data-idx="${i}" value="${it.delivery_date_end||''}" ${(it.delivery_type==='range')?'':'disabled'}>
            </div>
            <div></div>
            <div>
              <label class="block text-xs font-bold mb-1">初校日</label>
              <input type="date" class="w-full border rounded px-1 py-1 item-proof" data-idx="${i}" value="${it.first_proof_date||''}">
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">使用日</label>
              <input type="date" class="w-full border rounded px-1 py-1 item-used" data-idx="${i}" value="${it.used_date||''}">
            </div>
          </div>
        </div>
        <div class="mt-2 flex gap-2 items-center">
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
      // v3: 小計は税抜・税込それぞれの入力欄。どちらを入力しても税抜に正規化して保持し、両欄を再描画
      $$('.item-subtotal-ex').forEach(el => el.addEventListener('change', (e) => {
        d.items[+e.target.dataset.idx].subtotal = +e.target.value || 0;
        rerenderItems(); updateSummary();
      }));
      $$('.item-subtotal-in').forEach(el => el.addEventListener('change', (e) => {
        const v = +e.target.value || 0;
        d.items[+e.target.dataset.idx].subtotal = Math.round(v * 100 / (100 + TAX_RATE_FIXED));
        rerenderItems(); updateSummary();
      }));
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
      $$('.item-note').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].item_notes = e.target.value; }));
      // v2.13: 明細ごとの納期/初校日/使用日
      $$('.item-dt').forEach(el => el.addEventListener('change', e => { d.items[+e.target.dataset.idx].delivery_type = e.target.value; rerenderItems(); }));
      $$('.item-dstart').forEach(el => el.addEventListener('change', e => { d.items[+e.target.dataset.idx].delivery_date_start = e.target.value; }));
      $$('.item-dend').forEach(el => el.addEventListener('change', e => { d.items[+e.target.dataset.idx].delivery_date_end = e.target.value; }));
      $$('.item-proof').forEach(el => el.addEventListener('change', e => { d.items[+e.target.dataset.idx].first_proof_date = e.target.value || null; }));
      $$('.item-used').forEach(el => el.addEventListener('change', e => { d.items[+e.target.dataset.idx].used_date = e.target.value || null; }));
      $$('.btn-remove-item').forEach(el => el.addEventListener('click', (e) => { d.items.splice(+e.target.dataset.idx, 1); rerenderItems(); updateSummary(); }));
      // v2.2: ページ物明細のハンドラ
      $$('.item-page-size').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].page_size = e.target.value; rerenderItems(); }));
      $$('.item-page-size-custom').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].page_size_custom = e.target.value; }));
      $$('.item-page-qty').forEach(el => el.addEventListener('change', (e) => { d.items[+e.target.dataset.idx].quantity = +e.target.value || 0; updateSummary(); }));
      $$('.item-page-count').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].page_count = e.target.value; }));
      $$('.item-page-cover').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].page_cover = e.target.value; }));
      $$('.item-page-body').forEach(el => el.addEventListener('input', (e) => { d.items[+e.target.dataset.idx].page_body = e.target.value; }));
      $$('.item-page-subtotal-ex').forEach(el => el.addEventListener('change', (e) => {
        d.items[+e.target.dataset.idx].subtotal = +e.target.value || 0;
        rerenderItems(); updateSummary();
      }));
      $$('.item-page-subtotal-in').forEach(el => el.addEventListener('change', (e) => {
        const v = +e.target.value || 0;
        d.items[+e.target.dataset.idx].subtotal = Math.round(v * 100 / (100 + TAX_RATE_FIXED));
        rerenderItems(); updateSummary();
      }));
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
    $('#f-memo')?.addEventListener('input', (e) => { d.memo = e.target.value; });
    $('#f-data-status')?.addEventListener('change', (e) => { d.data_status = e.target.value; });
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
    // v3: ステータス操作（単一・工場看板と統一）
    $$('.draft-set-status').forEach(el => el.addEventListener('click', () => {
      d.status = el.dataset.status;
      App.render();
    }));
    // v2.6: viewモードでは保存/コピー系をbindしない
    const mode = this.displayMode || (this.isEditMode ? 'edit' : 'new');
    if (mode === 'view') {
      // v2.7: 見積書ボタンは直接見積書ページへ遷移
      $('#btn-quote')?.addEventListener('click', () => {
        const q = DB.createQuote(this.editId);
        if (q) location.hash = `#quote/${q.id}`;
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
      // v2.17: 「この仕様でコピー」- 顧客はそのまま、内容をクローンして新規受注画面へ
      $('#btn-spec-copy')?.addEventListener('click', () => {
        const srcOrder = DB.find('orders', this.editId);
        if (!srcOrder) return;
        this.isEditMode = false;
        this.editId = null;
        this.displayMode = 'new';
        this.draft = {
          customer_id: srcOrder.customer_id,
          received_date: TODAY,
          received_by_id: App.currentUserId,
          reception_method: '電話',
          delivery_type: 'single',
          delivery_date_start: '',
          delivery_date_end: '',
          delivered_date: null,
          first_proof_date: null,
          used_date: null,
          memo: srcOrder.memo || '',
          data_status: srcOrder.data_status || '持込',
          discount_amount: srcOrder.discount_amount || 0,
          discount_reason: srcOrder.discount_reason || '',
          discount_label_type: srcOrder.discount_label_type || '値引き',
          show_discount: (srcOrder.discount_amount || 0) > 0,
          tags: [...(srcOrder.tags || [])],
          attachments: [],
          items: srcOrder.items.map(it => ({
            ...it,
            id: 'itmp_' + Math.random().toString(36).slice(2, 8),
            // 納期系はリセット
            delivery_date_start: '', delivery_date_end: '',
            first_proof_date: null, used_date: null,
          })),
          status: '受注',
        };
        location.hash = '#order/new';
        toast('この仕様で新規受注画面を開きました', 'ok');
      });
      return;
    }
    // v2: 編集モード時の「新規でコピー」
    // v2.7: editモードでも見積書を直接開けるようにする(削除済み btn-quote はrenderでview時のみ出力)
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
        };
        location.hash = '#order/new';
        toast(`新規顧客「${name}」で内容をコピーしました`, 'ok');
      });
      $('#btn-quote')?.addEventListener('click', () => this.openQuotePickerModal());
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
        <h2 class="text-2xl font-black mb-4">新規顧客登録</h2>
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
    // v2.13: 各明細の納期を必須化（仮以外）
    const missingDate = d.items.findIndex(it => it.delivery_type !== 'tentative' && !it.delivery_date_start);
    if (missingDate >= 0) { toast(`明細 #${missingDate+1} の納期日を指定してください`, 'err'); return; }
    // 受注代表の納期は items[0] と同期（一覧・カンバン表示用）
    const first = d.items[0];
    d.delivery_type = first.delivery_type || 'single';
    d.delivery_date_start = first.delivery_date_start || null;
    d.delivery_date_end = first.delivery_date_end || null;
    d.first_proof_date = first.first_proof_date || null;
    d.used_date = first.used_date || null;
    const items = d.items.map(it => {
      const c = calcItemPrice(it);
      return { ...it, id: it.id && !it.id.startsWith('itmp_') ? it.id : ('it_' + Math.random().toString(36).slice(2, 8)), unit_price: c.unit_price, subtotal: c.subtotal };
    });
    // v2.6: 値引き金額>0 で適用
    const effectiveDiscount = d.discount_amount || 0;
    const calc = calcOrder(items, effectiveDiscount);

    if (this.isEditMode) {
      // 編集モード: 既存受注を更新
      const id = this.editId;
      const before = DB.find('orders', id);
      const statusChanged = before && before.status !== d.status;
      // 納品済みを選んだ場合は delivered_date を自動セット
      const delivered_date = (d.status === '納品済み')
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
        discount_reason: effectiveDiscount > 0 ? (d.discount_reason || '') : '',
        discount_label_type: d.discount_label_type || '値引き',
        tags: d.tags || [],
        attachments: d.attachments || [],
        items,
        total_amount: calc.total,
        status: d.status,
      }, statusChanged ? `編集（ステータス: ${before.status}→${d.status}）` : '編集');
      // v3: 工場進捗の時刻メタは updateOrder 内で status から自動更新
      toast(`受注 ${before?.order_number || ''} を更新しました`, 'ok');
      // v2.6: 保存後は確認画面(view)に戻す
      this.initFromOrder(id, 'view');
      location.hash = `#order/${id}`;
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
        discount_reason: effectiveDiscount > 0 ? (d.discount_reason || '') : '',
        total_amount: calc.total,
      });
      this.initDraft();
      toast(`受注 ${order.order_number} を起票しました`, 'ok');
      // 起票後は確認画面(view)で開く
      this.initFromOrder(order.id, 'view');
      location.hash = `#order/${order.id}`;
    }
  },
  // v2.6: 明細ごとに見積書を作成/開くピッカー (Screens.order_new に統合)
  openQuotePickerModal() {
    const id = this.editId;
    const order = DB.find('orders', id);
    if (!order) return;
    const quotes = DB.all('quotes').filter(q => q.order_id === id && q.item_id);
    openModal(`
      <div class="p-6">
        <h2 class="text-2xl font-black mb-2">明細ごとの見積書</h2>
        <p class="text-xs text-ink-500 mb-3">この受注の明細から見積書を作成/開けます。明細ごとに1見積書を作成します。</p>
        <ul class="divide-y text-sm">
          ${order.items.map((it, idx) => {
            const q = quotes.find(qq => qq.item_id === it.id);
            const typeLabel = it.type === 'page' ? 'ページ物' : '通常';
            return `
            <li class="py-3 flex items-center gap-3">
              <div class="flex-1">
                <div class="font-bold">#${idx+1} ${esc(it.title || '—')}</div>
                <div class="text-xs text-ink-500">${typeLabel} / 数量 ${it.quantity} / 小計（外税）${fmt.money(it.subtotal||0)}</div>
                ${q ? `<div class="text-xs text-ok-dark mt-1">見積 ${esc(q.quote_number)} 作成済</div>` : ''}
              </div>
              <button class="view-allow ${q?'bg-ink-900 text-white':'bg-brand text-white'} px-3 py-1.5 rounded text-xs font-bold qp-open" data-item-id="${it.id}">${q?'開く':'+ 作成'}</button>
            </li>`;
          }).join('')}
        </ul>
        <div class="flex justify-end mt-4">
          <button id="qp-close" class="view-allow border px-4 py-2 rounded">閉じる</button>
        </div>
      </div>
    `, () => {
      $('#qp-close').addEventListener('click', closeModal);
      $$('.qp-open').forEach(b => b.addEventListener('click', (e) => {
        const itemId = b.dataset.itemId;
        const q = DB.createQuoteForItem(id, itemId);
        closeModal();
        location.hash = `#quote/${q.id}`;
      }));
    });
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
          ${o.title ? `<div class="text-sm font-bold mt-1">${esc(o.title)}</div>` : ''}
          <p class="text-sm text-ink-500 mt-1">${esc(fmt.customer(o.customer_id))} / 受付 ${fmt.dateFull(o.received_date)} / 納期 ${fmt.delivery(o)}${o.delivered_date?` / 納品 ${fmt.dateFull(o.delivered_date)}`:''}</p>
          ${o.tags && o.tags.length ? `<div class="mt-2">${fmt.tags(o.tags)}</div>` : ''}
        </div>
        <div class="flex gap-2">
          <a href="#print/${o.id}" class="border px-3 py-2 rounded text-sm">印刷ビュー</a>
          <button id="btn-quote" class="border px-3 py-2 rounded text-sm">${quote ? '見積書を開く' : '見積書作成'}</button>
          <button id="btn-edit-fields" class="border px-3 py-2 rounded text-sm bg-brand/10 text-brand font-bold">編集</button>
          <button id="btn-delete" class="border border-red-500 text-red-500 px-3 py-2 rounded text-sm">削除</button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="col-span-2 space-y-4">
          <div class="bg-white rounded shadow-sm p-4 text-sm">
            <h3 class="font-bold text-sm mb-3">基本情報 <button id="btn-edit-fields-inline" class="ml-2 text-xs text-brand hover:underline">編集</button></h3>
            <div class="grid grid-cols-3 gap-3">
              <div><div class="text-xs text-ink-500 font-bold">品名</div><div class="font-bold">${esc(o.title || '—')}</div></div>
              <div><div class="text-xs text-ink-500 font-bold">顧客</div><div class="font-bold"><a class="hover:underline" href="#customer/${o.customer_id}">${esc(fmt.customer(o.customer_id))}</a></div></div>
              <div><div class="text-xs text-ink-500 font-bold">種別</div><div>
                <span class="font-bold ${customer?.kind==='地域・団体'?'text-blue-700':customer?.kind==='企業・個人'?'text-amber-800':'text-ink-500'}">${esc(customer?.kind || '—')}</span>
                <span class="ml-1 text-xs text-ink-500">${esc(customer?.area || '')}</span>
              </div></div>
              <div><div class="text-xs text-ink-500 font-bold">担当者</div><div>${esc(fmt.user(o.received_by_id))}</div></div>
              <div><div class="text-xs text-ink-500 font-bold">受付日</div><div>${fmt.dateFull(o.received_date)}</div></div>
              <div><div class="text-xs text-ink-500 font-bold">納期</div><div class="${o.delivery_date_start === TODAY ? 'text-red-600 font-bold' : ''}">${esc(fmt.delivery(o))}</div></div>
              <div><div class="text-xs text-ink-500 font-bold">初校日</div><div>${o.first_proof_date ? fmt.dateW(o.first_proof_date) : '—'}</div></div>
              <div><div class="text-xs text-ink-500 font-bold">使用日</div><div>${o.used_date ? fmt.dateW(o.used_date) : '—'}</div></div>
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
                      <td class="px-3 py-2"><span class="text-xs text-purple-700 font-bold">${i+1}</span></td>
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
            <h3 class="font-bold text-sm mb-2">工場進捗（C管理）</h3>
            ${fr ? `
              <div class="flex items-center gap-3 text-xs mb-2">
                <span class="st st-${esc(o.status)}">${esc(o.status)}</span>
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
      // v3: 納品済み選択時は delivered_date を自動セット。工場進捗の時刻メタは updateOrder 内で自動更新
      const patch = { status: s };
      if (s === '納品済み' && !o.delivered_date) patch.delivered_date = TODAY;
      DB.updateOrder(id, patch, `ステータス変更: ${o.status}→${s}`);
      toast(`ステータスを「${s}」に変更`, 'ok');
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
  // v2.5: 明細ごとに見積書を作成/開くピッカー
  openQuotePickerModal() {
    const id = this.editId;
    const order = DB.find('orders', id);
    if (!order) return;
    const quotes = DB.all('quotes').filter(q => q.order_id === id && q.item_id);
    openModal(`
      <div class="p-6">
        <h2 class="text-2xl font-black mb-2">明細ごとの見積書</h2>
        <p class="text-xs text-ink-500 mb-3">この受注の明細から見積書を作成/開けます。明細ごとに1見積書を作成します。</p>
        <ul class="divide-y text-sm">
          ${order.items.map((it, idx) => {
            const q = quotes.find(qq => qq.item_id === it.id);
            const typeLabel = it.type === 'page' ? 'ページ物' : '通常';
            return `
            <li class="py-3 flex items-center gap-3">
              <div class="flex-1">
                <div class="font-bold">#${idx+1} ${esc(it.title || '—')}</div>
                <div class="text-xs text-ink-500">${typeLabel} / 数量 ${it.quantity} / 小計（外税）${fmt.money(it.subtotal||0)}</div>
                ${q ? `<div class="text-xs text-ok-dark mt-1">見積 ${esc(q.quote_number)} 作成済</div>` : ''}
              </div>
              <button class="${q?'bg-ink-900 text-white':'bg-brand text-white'} px-3 py-1.5 rounded text-xs font-bold qp-open" data-item-id="${it.id}">${q?'開く':'+ 作成'}</button>
            </li>`;
          }).join('')}
        </ul>
        <div class="flex justify-end mt-4">
          <button id="qp-close" class="border px-4 py-2 rounded">閉じる</button>
        </div>
      </div>
    `, () => {
      $('#qp-close').addEventListener('click', closeModal);
      $$('.qp-open').forEach(b => b.addEventListener('click', (e) => {
        const itemId = b.dataset.itemId;
        const q = DB.createQuoteForItem(id, itemId);
        closeModal();
        location.hash = `#quote/${q.id}`;
      }));
    });
  },
  // v2: 受注編集モーダル
  openEditModal(id) {
    const o = DB.find('orders', id);
    if (!o) return;
    const papers = DB.all('papers');
    const customers = DB.all('customers');
    openModal(`
      <div class="p-6">
        <h2 class="text-2xl font-black mb-4">受注 ${esc(o.order_number)} 編集</h2>
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

// ---------- Quote (v2.8: 明細=パターン1:1 / 縦並びPDFプレビュー) ----------
Screens.quote = {
  render(id) {
    const q = DB.find('quotes', id);
    if (!q) return `<div class="text-center py-16 text-ink-500">見積書が見つかりません</div>`;
    const o = DB.find('orders', q.order_id);
    if (!o) return `<div class="text-center py-16 text-ink-500">受注が見つかりません</div>`;
    // v2.8: 受注明細とパターンを1:1同期
    DB.syncQuotePatterns(q.id);

    // v3: 1見積書に複数明細を複数行で表示。各行は明細1件＝1パターン
    const rowCalc = (p) => {
      const ext = +p.amount || 0;
      const disc = p.show_discount ? (+p.discount_amount || 0) : 0;
      const extAD = Math.max(0, ext - disc);
      return { ext, disc, extAD };
    };
    const subtotalEx = q.patterns.reduce((s,p) => s + rowCalc(p).extAD, 0);
    const tax = Math.round(subtotalEx * TAX_RATE_FIXED / 100);
    const grandTotal = subtotalEx + tax;
    const subjectTitle = o.title || (o.items[0]?.title || '');

    return `
      <div class="flex justify-between items-center mb-4">
        <div>
          <a href="#order/${o.id}" class="text-ink-500 text-sm">← 受注に戻る</a>
          <h1 class="text-2xl font-black">見積書 <span class="font-mono">#${esc(q.quote_number)}</span></h1>
          <p class="text-sm text-ink-500">受注 ${esc(o.order_number)} / ${esc(fmt.customer(o.customer_id))} / 明細 <b>${q.patterns.length}件</b> / 合計 <b class="text-brand">${fmt.money(grandTotal)}</b>（税込）</p>
        </div>
        <div class="flex gap-2">
          <button id="btn-print-quote" class="bg-ink-900 text-white px-4 py-2 rounded text-sm font-bold">PDF出力 (印刷)</button>
          <button id="btn-send-quote" class="bg-brand text-white px-4 py-2 rounded text-sm font-bold">送信済にする</button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white rounded shadow-sm p-4 text-sm space-y-3">
          <h3 class="font-bold text-sm">見積書入力</h3>
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

          <div class="border-t pt-3">
            <h4 class="font-bold mb-2">明細（${q.patterns.length}件 / 複数行を見積書に表示）</h4>
            <div id="patterns-list" class="space-y-2">
              ${q.patterns.map((p, i) => this.renderPattern(p, q, o, i)).join('')}
            </div>
          </div>
        </div>
        <div class="bg-white rounded shadow-sm p-4" id="print-target">
          <div class="text-xs font-bold text-ink-500 mb-2 no-print">PDFプレビュー（明細ごと縦並び）</div>
          <div class="border-2 border-ink-300/50 p-6 bg-white text-xs print-page" id="quote-pdf-page">
            <div class="flex justify-between border-b-2 border-ink-900 pb-2 mb-4">
              <div><div class="text-2xl font-black">御 見 積 書</div><div class="text-xs mt-1">No. ${esc(q.quote_number)}</div></div>
              <div class="text-right"><div class="font-bold">${fmt.dateJp(q.issued_date)}</div></div>
            </div>
            <div class="mb-4">
              <div class="text-lg font-bold">${esc(fmt.customer(o.customer_id))} 御中</div>
              <div class="mt-2">下記の通りお見積もり申し上げます。</div>
              ${subjectTitle ? `<div class="mt-2"><span class="font-bold">件名：</span>${esc(subjectTitle)}</div>` : ''}
            </div>
            <div class="flex justify-between mb-4">
              <div>
                <div class="text-xs">有効期限: ${fmt.dateJp(q.valid_until)}</div>
                <div class="mt-2 font-bold">合計金額（税込）</div>
                <div class="text-2xl font-black border-b-2 border-ink-900 inline-block">${fmt.money(grandTotal)}</div>
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

            ${q.patterns.length > 0 ? (() => {
              const specOf = (item) => {
                if (!item) return '';
                if (item.type === 'page') {
                  const size = item.page_size === '自由' ? (item.page_size_custom || '自由') : item.page_size;
                  return `ページ物 / ${esc(size)} / ${esc(item.page_count||'')}`;
                }
                return `${esc(fmt.paper(item.paper_id))}（${esc(fmt.ink(item.ink_pattern))}）`;
              };
              const rows = q.patterns.map((p, i) => {
                const item = o.items.find(it => it.id === p.item_id);
                const r = rowCalc(p);
                let html = `<tr class="border-b">
                  <td class="p-1 text-ink-500 text-center w-8">${i+1}</td>
                  <td class="p-1"><b>${esc(item?.title || p.label || '—')}</b><br><span class="text-ink-500">${specOf(item)}</span></td>
                  <td class="p-1 text-right">${item?.quantity || ''}</td>
                  <td class="p-1 text-right">${fmt.money(r.ext)}</td>
                </tr>`;
                if (p.show_discount && p.discount_amount > 0) {
                  html += `<tr class="border-b text-red-600">
                    <td class="p-1"></td>
                    <td class="p-1 pl-3" colspan="2">└ ${esc(fmt.discountLabel(p.discount_label_type, p.discount_label_text))}</td>
                    <td class="p-1 text-right">-${fmt.money(p.discount_amount)}</td>
                  </tr>`;
                }
                return html;
              }).join('');
              return `
              <table class="w-full border-collapse text-xs">
                <thead class="bg-ink-900 text-white"><tr>
                  <th class="p-1 text-center w-8">No.</th><th class="p-1 text-left">品名・仕様</th><th class="p-1 text-right">数量</th><th class="p-1 text-right">金額（外税）</th>
                </tr></thead>
                <tbody>
                  ${rows}
                  <tr class="border-b"><td class="p-1 text-ink-500" colspan="3">小計（外税）</td><td class="p-1 text-right">${fmt.money(subtotalEx)}</td></tr>
                  <tr class="border-b"><td class="p-1 text-ink-500" colspan="3">消費税（${TAX_RATE_FIXED}%）</td><td class="p-1 text-right">${fmt.money(tax)}</td></tr>
                  <tr class="font-black bg-ink-700/10"><td class="p-2" colspan="3">合計（税込）</td><td class="p-2 text-right text-sm">${fmt.money(grandTotal)}</td></tr>
                </tbody>
              </table>`;
            })() : '<p class="text-ink-500 text-xs">受注に明細がありません</p>'}

            <div class="mt-4 text-xs">
              <div class="font-bold">備考</div>
              <div class="bg-white border rounded p-2 min-h-[60px] whitespace-pre-wrap">${esc(q.memo)}</div>
            </div>
            <div class="mt-4 text-xs border-t pt-2">
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
  renderPattern(p, q, order, rowIdx) {
    // v3: 1見積書=複数明細(複数行)。採用ラジオを廃止し、全明細を見積書に並べて表示
    const items = order?.items || [];
    const idx = items.findIndex(it => it.id === p.item_id);
    const item = items[idx];
    const typeBadge = item?.type === 'page' ? '<span class="text-xs text-purple-700 font-bold">ページ物</span>' : '<span class="text-xs text-ink-500">通常</span>';
    const rowNo = (rowIdx ?? idx) + 1;
    return `
      <div class="border rounded p-3 bg-white" data-pid="${p.id}">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-black bg-ink-700 text-white px-2 py-0.5 rounded">行 ${rowNo}</span>
          ${typeBadge}
          <span class="flex-1 font-bold text-sm">${esc(item?.title || '(品名未設定)')}</span>
          <input type="number" class="w-28 border rounded px-2 py-1 text-right font-mono qp-amount" value="${p.amount || 0}" min="0" step="100">
          <span class="text-xs">円</span>
        </div>
        <div class="mt-2 flex items-center gap-3 text-xs">
          <label class="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" class="qp-show-discount" ${p.show_discount?'checked':''}> 値引きを表示
          </label>
          <div class="flex items-center gap-1 flex-wrap" style="display:${p.show_discount?'flex':'none'}">
            <select class="border rounded px-1 py-0.5 text-xs qp-discount-type">
              ${DISCOUNT_LABEL_TYPES.map(t => `<option ${p.discount_label_type===t?'selected':''}>${t}</option>`).join('')}
            </select>
            <input type="number" class="w-24 border rounded px-1 py-0.5 text-right font-mono text-xs qp-discount-amount" value="${p.discount_amount||0}" min="0" step="100" placeholder="金額">
            ${p.discount_label_type === '自由記載' ? `<input class="w-40 border rounded px-1 py-0.5 text-xs qp-discount-text" placeholder="名目を入力" value="${esc(p.discount_label_text||'')}">` : ''}
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
    // v3: 採用ラジオは廃止（全明細を見積書に並べて表示）
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
      App.render();  // v3: 名目変更を見積書プレビューと自由記載欄の表示に反映
    }));
    $$('.qp-discount-amount').forEach(el => el.addEventListener('change', (e) => {
      const pid = el.closest('[data-pid]').dataset.pid;
      DB.updateQuotePattern(id, pid, { discount_amount: +e.target.value || 0 });
      App.render();
    }));
    $$('.qp-discount-text').forEach(el => el.addEventListener('change', (e) => {
      const pid = el.closest('[data-pid]').dataset.pid;
      DB.updateQuotePattern(id, pid, { discount_label_text: e.target.value });
      App.render();  // v3: 自由記載名目を見積書プレビューに反映
    }));
  },
};

// ---------- Factory Kanban (v2: 納品済み/曜日/経過日数) ----------
Screens.factory = {
  // v3: 列ごとの配色（見積もり段階/受注/印刷中/完成/納品済み）
  colStyle(s) {
    return ({
      '見積もり段階': { bg: 'bg-blue-400/10',  text: 'text-blue-800',   border: 'border-blue-400' },
      '受注':     { bg: 'bg-red-500/10',    text: 'text-red-700',    border: 'border-red-500' },
      '印刷中':   { bg: 'bg-yellow-400/20', text: 'text-yellow-600', border: 'border-yellow-500' },
      '完成':     { bg: 'bg-ok/10',         text: 'text-ok-dark',    border: 'border-ok' },
      '納品済み': { bg: 'bg-ink-900/10',    text: 'text-ink-900',    border: 'border-ink-900' },
    })[s] || { bg: 'bg-ink-300/20', text: 'text-ink-700', border: 'border-ink-500' };
  },
  render() {
    // v3: カンバン列は o.status で決定（5列・見積もり段階含む）
    const orders = DB.all('orders');
    const cols = FACTORY_STATUSES.map(s => ({ status: s, items: [] }));
    orders.forEach(o => {
      const col = cols.find(c => c.status === o.status);
      if (col) col.items.push(o);
    });
    return `
      <div class="mb-4 flex justify-between">
        <div>
          <h1 class="text-2xl font-black">工場カンバン</h1>
          <p class="text-sm text-ink-500">カードをドラッグしてステータスを変更できます。納期は曜日付き、超過時は「N日経過」と表示。</p>
        </div>
      </div>
      <div class="grid grid-cols-5 gap-3">
        ${cols.map(col => { const cs = this.colStyle(col.status); return `
        <div class="rounded p-3 ${cs.bg}" data-col="${col.status}">
          <div class="flex justify-between items-center mb-3">
            <div class="font-black ${cs.text}">${col.status}</div>
            <span class="font-black ${cs.text}">${col.items.length}</span>
          </div>
          <div class="space-y-2 kanban-col min-h-[200px]" data-status="${col.status}">
            ${col.items.map((o) => {
              const overdue = fmt.overdueText(o);
              const urgent = o.delivery_date_start && dayDiff(o.delivery_date_start, TODAY) <= 1 && dayDiff(o.delivery_date_start, TODAY) >= 0;
              const borderColor = cs.border;
              return `
              <div class="bg-white rounded p-3 shadow-sm border-2 ${borderColor} text-sm cursor-pointer kanban-card" draggable="true" data-order-id="${o.id}" onclick="location.hash='#order/${o.id}'">
                <div class="flex justify-between">
                  <span class="font-mono text-xs text-ink-500">${esc(o.order_number)}</span>
                  ${overdue ? `<span class="text-xs text-purple-600 font-bold">${overdue}</span>`
                    : urgent ? `<span class="text-xs text-red-600 font-bold">${o.delivery_date_start === TODAY ? '本日納期' : '明日納期'}</span>`
                    : `<span class="text-xs">${esc(fmt.delivery(o))}</span>`}
                </div>
                <div class="font-bold mt-1 truncate">${esc(o.title || fmt.customer(o.customer_id))}</div>
                <div class="text-xs text-ink-500 truncate">${esc(fmt.customer(o.customer_id))} / ${esc(fmt.paper(o.items[0]?.paper_id))} ${o.items[0]?.quantity}枚</div>
                ${o.tags && o.tags.length ? `<div class="mt-1">${fmt.tags(o.tags)}</div>` : ''}
              </div>`;
            }).join('') || `<div class="text-center text-ink-500 text-xs py-8">（空）</div>`}
          </div>
        </div>`; }).join('')}
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
        const newStatus = col.dataset.status;  // 受注/印刷中/完成/納品済み
        // v3: カンバンは o.status を直接更新（時刻メタは updateOrder 内で自動反映）
        const order = DB.find('orders', draggingId);
        if (!order || order.status === newStatus) return;
        const patch = { status: newStatus };
        if (newStatus === '納品済み') patch.delivered_date = order.delivered_date || TODAY;
        DB.updateOrder(draggingId, patch, `カンバン操作: ${order.status}→${newStatus}`);
        toast(`ステータス: ${newStatus}`, 'ok');
        App.render();
      });
    });
  },
};

// ---------- Customers List (v2: 検索・新規追加ポップアップ・累計売上内訳) ----------
Screens.customers = {
  filter: { q: '', kind: '' },
  page: 1,
  PAGE_SIZE: 50,
  // 顧客ごとの売上集計（税抜・税・税込）
  computeSales(customer_id) {
    const own = DB.all('orders').filter(o => o.customer_id === customer_id && o.status !== '見積もり段階');
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
      // v2.5: 検索対象は顧客名のみ
      if (f.q && !name.includes(f.q.toLowerCase())) return false;
      if (f.kind && c.kind !== f.kind) return false;
      return true;
    });
    // v2.11: ページネーション
    const totalPages = Math.max(1, Math.ceil(list.length / this.PAGE_SIZE));
    const page = Math.min(Math.max(1, this.page), totalPages);
    this.page = page;
    const pageList = list.slice((page-1)*this.PAGE_SIZE, page*this.PAGE_SIZE);
    return `
      <div class="flex justify-between items-center mb-4">
        <div>
          <h1 class="text-2xl font-black">顧客一覧</h1>
          <p class="text-sm text-ink-500">${list.length} / ${all.length} 件 <span class="ml-2">(${list.length>0?(page-1)*this.PAGE_SIZE+1:0}〜${Math.min(page*this.PAGE_SIZE, list.length)}件を表示)</span></p>
        </div>
        <button id="btn-new-customer-top" class="bg-brand text-white px-5 py-2 rounded font-bold shadow-sm">+ 新規顧客追加</button>
      </div>
      <div class="bg-white p-4 rounded shadow-sm mb-4 grid grid-cols-4 gap-3 text-sm">
        <div class="col-span-2">
          <label class="block text-xs font-bold mb-1">🔍 顧客名検索</label>
          <input id="cf-q" class="w-full border rounded px-2 py-1.5" value="${esc(f.q)}" placeholder="例: タクシー, 高拡散, 山田">
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
              pageList.map(c => {
              const s = this.computeSales(c.id);
              return `
              <tr class="border-t hover:bg-brand/5 cursor-pointer" onclick="location.hash='#customer/${c.id}'">
                <td class="px-3 py-2 font-bold">${esc(c.company_name || c.individual_name)}</td>
                <td class="px-3 py-2">
                  <span class="font-bold ${c.kind==='地域・団体'?'text-blue-700':c.kind==='企業・個人'?'text-amber-800':'text-ink-500'}">${esc(c.kind || '—')}</span>
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
        ${totalPages > 1 ? `
        <div class="flex justify-center items-center gap-3 p-3 text-sm border-t">
          <button id="cpg-prev" class="px-3 py-1 border rounded ${page<=1?'opacity-40 cursor-not-allowed':'hover:bg-ink-700/5'}" ${page<=1?'disabled':''}>← 前</button>
          <span class="font-bold">ページ ${page} / ${totalPages}</span>
          <button id="cpg-next" class="px-3 py-1 border rounded ${page>=totalPages?'opacity-40 cursor-not-allowed':'hover:bg-ink-700/5'}" ${page>=totalPages?'disabled':''}>次 →</button>
        </div>` : ''}
      </div>
    `;
  },
  bind() {
    const apply = () => {
      this.filter = {
        q: $('#cf-q')?.value || '',
        kind: $('#cf-kind')?.value || '',
      };
      this.page = 1;  // v2.11: フィルタ変更時はページリセット
      App.render();
    };
    $('#cf-q')?.addEventListener('input', debounce(apply, 300));
    $('#cf-kind')?.addEventListener('change', apply);
    $('#btn-new-customer-top')?.addEventListener('click', () => Screens.customers.openCreateModal());
    $('#cpg-prev')?.addEventListener('click', () => { this.page = Math.max(1, this.page - 1); App.render(); });
    $('#cpg-next')?.addEventListener('click', () => { this.page = this.page + 1; App.render(); });
  },
  openCreateModal() {
    openModal(`
      <div class="p-6">
        <h2 class="text-2xl font-black mb-4">+ 新規顧客追加</h2>
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
  _dirty: false,      // v3: 顧客メモ未保存フラグ
  _dirtyId: null,     // 未保存対象の顧客ID
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
              <span class="font-bold ${c.kind==='地域・団体'?'text-blue-700':c.kind==='企業・個人'?'text-amber-800':'text-ink-500'}">${esc(c.kind || '—')}</span>
              <span class="ml-2">地域: ${esc(c.area || '')}</span>
              <span>TEL: ${esc(c.phone || '—')}</span>
              <span>FAX: ${esc(c.fax || '—')}</span>
              ${c.address ? `<span>${esc(c.address)}</span>` : ''}
            </div>
            ${c.notes ? `<div class="mt-2 text-xs text-ink-500">メモ: ${esc(c.notes)}</div>` : ''}
          </div>
          <div class="flex gap-2">
            <button id="btn-edit-customer" class="border px-3 py-2 rounded text-sm">顧客編集</button>
            <a href="#order/new" class="bg-brand text-white px-4 py-2 rounded text-sm font-bold" id="btn-new-with">+ この顧客で新規受注</a>
          </div>
        </div>
        <div class="grid grid-cols-5 border-t text-sm">
          <div class="p-3 border-r"><div class="text-xs font-bold text-ink-500">累計受注</div><div class="text-2xl font-black">${sales.count}件</div></div>
          <div class="p-3 border-r"><div class="text-xs font-bold text-ink-500">税抜小計</div><div class="text-lg font-black font-mono">${fmt.money(sales.subtotalEx)}</div></div>
          <div class="p-3 border-r"><div class="text-xs font-bold text-ink-500">消費税</div><div class="text-lg font-black font-mono text-ink-500">${fmt.money(sales.tax)}</div></div>
          <div class="p-3 border-r"><div class="text-xs font-bold text-ink-500">累計売上（税込）</div><div class="text-2xl font-black text-brand">${fmt.money(sales.total)}</div></div>
          <div class="p-3"><div class="text-xs font-bold text-ink-500">最終納品</div><div class="text-lg font-black">${sales.lastDelivered ? fmt.dateW(sales.lastDelivered) : '—'}</div></div>
        </div>
      </div>
      <div class="bg-white rounded shadow-sm mb-4">
        <div class="p-4 border-b flex justify-between items-center">
          <h3 class="font-bold">メモ</h3>
          <button id="btn-save-memo" class="bg-brand text-white px-3 py-1 rounded text-xs font-bold">保存</button>
        </div>
        <div class="p-4">
          <textarea id="customer-memo" class="w-full border rounded px-2 py-1.5 text-sm bg-ink-300/30" rows="5" placeholder="顧客に関するメモ・備考・連絡履歴など">${esc(c.notes || '')}</textarea>
        </div>
      </div>

      <div class="bg-white rounded shadow-sm">
        <div class="p-4 border-b"><h3 class="font-bold">過去発注履歴</h3></div>
        <table class="w-full text-sm">
          <thead class="bg-ink-700/5"><tr class="text-left">
            <th class="px-3 py-2">受注番号</th><th class="px-3 py-2">受付日</th><th class="px-3 py-2">品名 / タグ</th><th class="px-3 py-2 text-right">数量</th><th class="px-3 py-2">納品日</th><th class="px-3 py-2 text-right">金額</th><th class="px-3 py-2">状態</th><th class="px-3 py-2"></th>
          </tr></thead>
          <tbody>
            ${own.length === 0 ? `<tr><td colspan="8" class="text-center py-8 text-ink-500">過去の発注はありません</td></tr>` :
              own.map(o => {
                const totalQty = o.items.reduce((s,it)=> s + (+it.quantity||0), 0);
                return `
              <tr class="border-t hover:bg-brand/5">
                <td class="px-3 py-2 font-mono text-xs"><a class="hover:underline text-brand font-bold" href="#order/${o.id}">${esc(o.order_number)}</a></td>
                <td class="px-3 py-2">${fmt.dateWY(o.received_date)}</td>
                <td class="px-3 py-2 text-xs">
                  <div class="font-bold">${esc(o.title || '—')}</div>
                  ${o.tags && o.tags.length ? `<div class="mt-1">${fmt.tags(o.tags)}</div>` : ''}
                </td>
                <td class="px-3 py-2 text-right font-mono">${totalQty}</td>
                <td class="px-3 py-2 ${o.delivered_date?'':'text-ink-500'}">${o.delivered_date ? fmt.dateWY(o.delivered_date) : '—'}</td>
                <td class="px-3 py-2 text-right font-mono">${fmt.money(o.total_amount)}</td>
                <td class="px-3 py-2"><span class="st st-${esc(o.status)}">${esc(o.status)}</span></td>
                <td class="px-3 py-2"><button class="text-brand text-xs font-bold btn-copy-order" data-src="${o.id}">この仕様でコピー</button></td>
              </tr>`;}).join('')}
          </tbody>
        </table>
      </div>
    `;
  },
  bind(id) {
    // v3: この顧客ページを開いた時点では未保存変更なし
    this._dirty = false;
    this._dirtyId = id;
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
    // v2.17: 顧客メモ保存（連絡履歴UIから置換）
    // v3: 未保存変更の検知（入力で dirty、保存で解除）
    $('#customer-memo')?.addEventListener('input', () => { this._dirty = true; this._dirtyId = id; });
    $('#btn-save-memo')?.addEventListener('click', () => {
      const v = $('#customer-memo').value;
      DB.updateCustomer(id, { notes: v });
      this._dirty = false;
      toast('メモを保存しました', 'ok');
    });
  },
  // v2: 顧客編集モーダル
  openEditModal(id) {
    const c = DB.find('customers', id);
    if (!c) return;
    openModal(`
      <div class="p-6">
        <h2 class="text-2xl font-black mb-4">顧客編集</h2>
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

// v2.9: 用紙マスタ画面は廃止（DB側のデータは残置）

// v2.6: 設定画面は削除（書出/リセットはサイドバーに残す）

// ---------- Login ----------
Screens.login = {
  render() {
    const users = DB.all('users');
    return `
      <div class="min-h-[80vh] flex items-center justify-center">
        <div class="bg-white rounded-lg shadow-lg p-8 w-full max-w-sm">
          <div class="flex items-center gap-3 mb-6">
            <div class="w-12 h-12 bg-brand rounded flex items-center justify-center font-black text-2xl text-white">謄</div>
            <div>
              <div class="font-black">渡辺謄写堂</div>
              <div class="text-xs text-ink-500">業務管理システム ログイン</div>
            </div>
          </div>
          <div class="space-y-3 text-sm">
            <div>
              <label class="block text-xs font-bold mb-1">ユーザー</label>
              <select id="login-user" class="w-full border rounded px-2 py-2">
                ${users.map(u => `<option value="${u.id}">${esc(u.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold mb-1">パスワード</label>
              <input id="login-pass" type="password" class="w-full border rounded px-2 py-2" placeholder="••••••">
            </div>
            <div class="text-right">
              <a href="#password_reset" class="text-xs text-brand hover:underline">パスワードをお忘れの方</a>
            </div>
            <button id="btn-login" class="w-full bg-brand text-white px-4 py-2 rounded font-bold mt-2">ログイン</button>
          </div>
        </div>
      </div>
    `;
  },
  bind() {
    $('#btn-login')?.addEventListener('click', () => {
      const uid = $('#login-user').value;
      const pass = $('#login-pass').value;
      if (!pass) { toast('パスワードを入力してください', 'err'); return; }
      App.currentUserId = uid;
      if (typeof refreshUserLink === 'function') refreshUserLink();
      toast(`${fmt.user(uid)} としてログインしました`, 'ok');
      location.hash = '#dashboard';
    });
  },
};

// ---------- Password Reset ----------
Screens.password_reset = {
  render() {
    return `
      <div class="min-h-[80vh] flex items-center justify-center">
        <div class="bg-white rounded-lg shadow-lg p-8 w-full max-w-sm">
          <a href="#login" class="text-xs text-ink-500">← ログインに戻る</a>
          <h1 class="text-2xl font-black mt-2 mb-4">パスワードリセット</h1>
          <p class="text-xs text-ink-500 mb-4">登録メールアドレス宛にリセット用リンクをお送りします。</p>
          <div class="space-y-3 text-sm">
            <div>
              <label class="block text-xs font-bold mb-1">メールアドレス</label>
              <input id="pr-email" type="email" class="w-full border rounded px-2 py-2" placeholder="example@toshado.jp">
            </div>
            <button id="btn-pr-send" class="w-full bg-brand text-white px-4 py-2 rounded font-bold mt-2">リセットメールを送信</button>
          </div>
        </div>
      </div>
    `;
  },
  bind() {
    $('#btn-pr-send')?.addEventListener('click', () => {
      const email = $('#pr-email').value.trim();
      if (!email) { toast('メールアドレスを入力してください', 'err'); return; }
      toast('リセット用リンクを送信しました（モック動作）', 'ok');
      setTimeout(() => { location.hash = '#login'; }, 800);
    });
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
        <button id="btn-print" class="bg-ink-900 text-white px-4 py-2 rounded font-bold">印刷</button>
      </div>
      <div class="bg-white border-2 border-ink-300/50 p-6 mx-auto print-page" style="width:297mm; max-width:100%; min-height:210mm;">
        <div class="flex justify-between border-b-4 border-ink-900 pb-2 mb-3">
          <div>
            <div class="text-2xl font-black">受 注 票</div>
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
            <td class="border p-2 font-bold ${o.delivery_date_start === TODAY ? 'text-red-600' : ''} text-lg">${esc(fmt.delivery(o))}${o.delivery_date_start === TODAY ? ' 本日必着' : ''}${fmt.overdueText(o) ? ` <span class="st st-経過">${fmt.overdueText(o)}</span>` : ''}</td>
          </tr>
          <tr><td class="border p-2 bg-ink-900 text-white font-bold text-center" colspan="6">製 作 明 細</td></tr>
          ${o.items.map((it, i) => {
            if (it.type === 'page') {
              const size = it.page_size === '自由' ? (it.page_size_custom || '自由') : it.page_size;
              return `
              <tr>
                <td class="border p-2 bg-purple-100 font-bold w-20">#${i+1} ページ物</td>
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
  // v3: 顧客メモ未保存ガード — 顧客詳細から保存せず別ページへ移動しようとした場合に警告
  if (this._revertingNav) {
    this._revertingNav = false;
  } else if (Screens.customer && Screens.customer._dirty &&
             this._prevHash && this._prevHash.split('?')[0].startsWith('customer/') &&
             hash !== this._prevHash) {
    if (!confirm('保存していない顧客メモの変更があります。\nこのページを離れると変更は破棄されます。移動してよろしいですか？')) {
      this._revertingNav = true;
      location.hash = '#' + this._prevHash;   // 元のページに戻す
      return;
    }
    Screens.customer._dirty = false;          // 破棄して移動
  }
  this._prevHash = hash;
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
    if (!Screens.order_new.draft || Screens.order_new.isEditMode) Screens.order_new.initDraft();
    this.currentScreen = 'order_new';
    this.params = [];
  } else if (parts[0] === 'order') {
    // v2.6: #order/:id → view, #order/:id/edit → edit
    const mode = parts[2] === 'edit' ? 'edit' : 'view';
    Screens.order_new.initFromOrder(parts[1], mode);
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
  // v2.14: 画面遷移時のみ最上部へ
  App.render({ scroll: 'top' });
};

// ========= Export / Import (v2.6: CSV) =========
function csvEscape(v) {
  if (v == null) return '';
  const s = String(v).replace(/"/g, '""').replace(/\r?\n/g, ' ');
  return /[,"]/.test(s) ? `"${s}"` : s;
}
function toCsv(rows) {
  return rows.map(r => r.map(csvEscape).join(',')).join('\r\n');
}
function tableToCsv(name, rows, cols) {
  return [name, cols.join(',')].concat(rows.map(r => cols.map(c => csvEscape(r[c])).join(','))).join('\r\n');
}
function exportCsv() {
  const sections = [];
  const dump = (table, cols) => {
    sections.push(`# ${table}`);
    sections.push(cols.join(','));
    DB.all(table).forEach(r => {
      sections.push(cols.map(c => csvEscape(typeof r[c] === 'object' ? JSON.stringify(r[c]) : r[c])).join(','));
    });
    sections.push('');
  };
  dump('customers', ['id','company_name','individual_name','kind','area','phone','fax','address','notes']);
  dump('orders', ['id','order_number','title','customer_id','received_date','delivered_date','first_proof_date','used_date','received_by_id','reception_method','delivery_type','delivery_date_start','delivery_date_end','status','memo','total_amount','data_status','discount_amount','discount_reason','discount_label_type','tags','items']);
  dump('quotes', ['id','quote_number','order_id','item_id','issued_date','valid_until','total_amount','send_method','status','memo','patterns']);
  dump('papers', ['id','paper_name','quality','color','thickness_kg','paper_size','unit_price','is_major']);
  dump('users', ['id','name','role','email']);
  const blob = new Blob(['﻿' + sections.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `watanabe_db_${TODAY}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
// 後方互換: 旧Screens.settings呼出があった場合用に残す
function exportJson() { return exportCsv(); }
function importJson() { toast('現在はCSV取込のみ対応', 'err'); }

// ========= Init =========
DB.load();
// v2.10: ログイン中ユーザー名を表示するヘルパー（クリックでログイン画面へ）
function refreshUserLink() {
  const el = $('#current-user-link');
  if (el) el.textContent = fmt.user(App.currentUserId) || '—';
}
refreshUserLink();
// v3: ブラウザのリロード/タブ閉じ時も未保存の顧客メモがあれば警告
window.addEventListener('beforeunload', (e) => {
  if (Screens.customer && Screens.customer._dirty) { e.preventDefault(); e.returnValue = ''; }
});
$('#btn-export')?.addEventListener('click', exportCsv);
$('#btn-reset').addEventListener('click', () => {
  if (confirm('全データを初期状態に戻しますか？\n入力・変更したデータは全て失われます。')) {
    DB.reset();
    App.render();
    toast('初期化しました', 'ok');
  }
});
Router.init();
