/* =====================================================================
 * 渡辺謄写堂 業務管理システム v4.0 追加モジュール
 * 帳簿 / 納品書 / 請求書 / 領収書 / 時系列記録表
 * ---------------------------------------------------------------------
 * app.js (v3) の後に読み込む追加ファイル。v3本体は無改変（DBキーのみ分離）。
 * ※イメージ確認用モック。仕様（項目・締め運用・発行タイミング等）は変更前提。
 * ===================================================================== */

// ========= v4 データ移行・シード =========
function ensureV4() {
  const d = DB.data;
  let changed = false;

  // 顧客に支払区分を補完（掛 / 現金）
  const CASH_CUSTOMERS = ['c3', 'c9', 'c10'];
  const TERMS = { c1: '月末締め・翌月末払い', c2: '月末締め・翌月末払い', c7: '月末締め・翌月末払い' };
  (d.customers || []).forEach(c => {
    if (!c.payment_type) {
      const n = parseInt(String(c.id).replace(/\D/g, ''), 10) || 0;
      c.payment_type = CASH_CUSTOMERS.includes(c.id) ? '現金' : (n > 10 && n % 6 === 0 ? '現金' : '掛');
      c.payment_terms = c.payment_terms || TERMS[c.id] || (c.payment_type === '現金' ? '都度現金' : '納品ごと請求');
      changed = true;
    }
  });

  if (!d.delivery_notes) { d.delivery_notes = []; changed = true; }
  if (!d.invoices)       { d.invoices = [];       changed = true; }
  if (!d.receipts)       { d.receipts = [];       changed = true; }

  const firstSeed = !d._v4_seeded;

  // 請求書・領収書のシード（初回のみ）
  if (firstSeed) {
    d.invoices.push(
      { id: 'inv_seed1', invoice_number: 'INV-2605-001', type: '月締め', customer_id: 'c1', target_month: '2026-04',
        order_ids: [], fixed_amount: 47300, issued_date: '2026-05-01', due_date: '2026-05-31',
        status: '入金済', paid_date: '2026-05-10', memo: '4月分（営業案内・名刺ほか）' },
      { id: 'inv_seed2', invoice_number: 'INV-2605-002', type: '月締め', customer_id: 'c2', target_month: '2026-04',
        order_ids: [], fixed_amount: 33000, issued_date: '2026-05-01', due_date: '2026-05-31',
        status: '発行済', paid_date: null, memo: '4月分（車両配布チラシほか）' },
      { id: 'inv_seed3', invoice_number: 'INV-2605-003', type: '個別', customer_id: 'c8', target_month: null,
        order_ids: ['o_260501-001'], fixed_amount: null, issued_date: '2026-05-07', due_date: '2026-06-30',
        status: '発行済', paid_date: null, memo: '市役所会計課経由' },
      { id: 'inv_seed4', invoice_number: 'INV-2605-004', type: '個別', customer_id: 'c6', target_month: null,
        order_ids: ['o_260502-004'], fixed_amount: null, issued_date: null, due_date: '2026-06-30',
        status: '未発行', paid_date: null, memo: '' },
      { id: 'inv_seed5', invoice_number: 'INV-2605-005', type: '個別', customer_id: 'c5', target_month: null,
        order_ids: ['o_260508-005'], fixed_amount: null, issued_date: null, due_date: '2026-06-30',
        status: '未発行', paid_date: null, memo: '' },
    );
    d.receipts.push(
      { id: 'rc_seed1', receipt_number: 'R-260428-01', customer_id: 'c10', amount: 16500, issued_date: '2026-04-28',
        method: '現金', tadashi: 'メニュー表印刷代として', order_id: 'o_260423-006', invoice_id: null },
      { id: 'rc_seed2', receipt_number: 'R-260510-01', customer_id: 'c1', amount: 47300, issued_date: '2026-05-10',
        method: '振込', tadashi: '4月分ご請求分として', order_id: null, invoice_id: 'inv_seed1' },
    );
  }

  // 納品済み受注に納品書レコードを補完（納品と同時に自動作成される想定の再現）
  (d.orders || []).forEach(o => {
    const dd = v4DeliveredDate(o);
    if (!dd) return;
    if (d.delivery_notes.some(n => n.order_id === o.id)) return;
    d.delivery_notes.push({
      id: DB.nextId('dn'),
      note_number: 'D-' + (o.order_number || o.id),
      order_id: o.id,
      issued_date: dd,
      // 初回シード時: 過去分は発行済扱い（最新の1件だけ未発行にして運用を見せる）
      status: firstSeed ? '発行済' : '未発行',
    });
    changed = true;
  });
  if (firstSeed) {
    const demo = d.delivery_notes.find(n => n.order_id === 'o_260508-005');
    if (demo) demo.status = '未発行';
    d._v4_seeded = true;
    changed = true;
  }

  if (changed) DB.save();
}

// 納品日（正式な納品日がなければ、納品済みステータスの納期を代用）
function v4DeliveredDate(o) {
  if (o.delivered_date) return o.delivered_date;
  if (o.status === '納品済み') return o.delivery_date_start || o.received_date;
  return null;
}
function v4ExTax(total) { return Math.round((total || 0) / 1.1); }
function v4Tax(total) { return (total || 0) - v4ExTax(total); }

// 受注1件の請求・回収状態を解決
function v4Billing(o) {
  const cust = DB.find('customers', o.customer_id);
  const cash = cust?.payment_type === '現金';
  const inv = DB.all('invoices').find(v => (v.order_ids || []).includes(o.id));
  const rec = DB.all('receipts').find(r => r.order_id === o.id || (inv && r.invoice_id === inv.id));
  let status;
  if (cash) status = rec ? '現金回収済' : '未回収';
  else if (!inv) status = '未請求';
  else if (inv.status === '入金済') status = '入金済';
  else if (inv.status === '発行済') status = '入金待ち';
  else status = '未発行';
  return { cash, inv, rec, status };
}
function v4InvoiceAmount(inv) {
  if (inv.fixed_amount != null) return inv.fixed_amount;
  return (inv.order_ids || []).map(id => DB.find('orders', id)).filter(Boolean)
    .reduce((s, o) => s + (o.total_amount || 0), 0);
}
function v4NextInvoiceNumber() {
  const prefix = 'INV-' + TODAY.slice(2, 7).replace('-', '');
  const same = DB.all('invoices').filter(v => (v.invoice_number || '').startsWith(prefix));
  return `${prefix}-${String(same.length + 1).padStart(3, '0')}`;
}
function v4NextReceiptNumber() {
  const prefix = 'R-' + TODAY.slice(2).replace(/-/g, '');
  const same = DB.all('receipts').filter(r => (r.receipt_number || '').startsWith(prefix));
  return `${prefix}-${String(same.length + 1).padStart(2, '0')}`;
}

// 帳票右下の自社ブロック
function v4CompanyBlock() {
  const s = DB.data.settings;
  return `<div class="text-right text-xs leading-5">
    <div class="font-black text-base">${esc(s.company_name)}</div>
    <div>${esc(s.company_postal)} ${esc(s.company_address)}</div>
    <div>TEL ${esc(s.company_phone)}　FAX ${esc(s.company_fax)}</div>
    <div>登録番号: ${esc(s.invoice_number)}</div>
  </div>`;
}
function v4StatusBadge(s) { return `<span class="st st-${s}">${s}</span>`; }

// 納品済み受注のうち月内のもの
function v4LedgerOrders(month) {
  return DB.all('orders')
    .map(o => ({ o, dd: v4DeliveredDate(o) }))
    .filter(x => x.dd && x.dd.slice(0, 7) === month)
    .sort((a, b) => a.dd.localeCompare(b.dd));
}
function v4Months() {
  const set = new Set();
  DB.all('orders').forEach(o => { const dd = v4DeliveredDate(o); if (dd) set.add(dd.slice(0, 7)); });
  return [...set].sort().reverse();
}

/* ========= 画面: 帳簿（売上帳） ========= */
Screens.ledger = {
  month: '2026-05',
  render() {
    const month = this.month;
    const rows = v4LedgerOrders(month).map(({ o, dd }) => ({ o, dd, b: v4Billing(o) }));
    const sumAll  = rows.reduce((s, r) => s + (r.o.total_amount || 0), 0);
    const unpaid  = rows.filter(r => ['未請求', '未発行', '入金待ち', '未回収'].includes(r.b.status))
                        .reduce((s, r) => s + (r.o.total_amount || 0), 0);

    const card = (label, val, sub, color) => `
      <div class="bg-white rounded shadow-sm p-4 border">
        <div class="text-xs text-ink-500 font-bold">${label}</div>
        <div class="text-2xl font-black ${color}">${val}</div>
        <div class="text-[11px] text-ink-300">${sub}</div>
      </div>`;

    return `
    <div class="flex items-center justify-between mb-1 flex-wrap gap-2">
      <h1 class="text-2xl font-black">帳簿（売上帳）</h1>
      <div class="flex items-center gap-2 text-sm">
        <span class="text-ink-500 font-bold">対象月:</span>
        <select id="ledger-month" class="border rounded px-3 py-1.5 bg-white font-bold">
          ${v4Months().map(m => `<option value="${m}" ${m === month ? 'selected' : ''}>${m.replace('-', '年')}月</option>`).join('')}
        </select>
      </div>
    </div>
    <p class="text-sm text-ink-500 mb-4">納品と同時に自動で記帳されます（手入力なし）。</p>

    <div class="grid grid-cols-2 gap-3 mb-5 max-w-xl">
      ${card('当月売上合計（税込）', fmt.money(sumAll), '納品ベースで自動計上', 'text-ink-900')}
      ${card('当月分 未回収', fmt.money(unpaid), '未請求＋入金待ち', unpaid > 0 ? 'text-red-600' : 'text-ink-300')}
    </div>

    <div class="bg-white rounded shadow-sm overflow-x-auto mb-6 border">
      <table class="w-full text-sm">
        <thead class="bg-ink-900 text-white text-xs">
          <tr>
            <th class="px-3 py-2 text-left">納品日</th>
            <th class="px-3 py-2 text-left">受注No</th>
            <th class="px-3 py-2 text-left">顧客</th>
            <th class="px-3 py-2 text-left">品名</th>
            <th class="px-3 py-2 text-right">税抜</th>
            <th class="px-3 py-2 text-right">消費税</th>
            <th class="px-3 py-2 text-right">税込</th>
            <th class="px-3 py-2 text-center">区分</th>
            <th class="px-3 py-2 text-center">回収状況</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length === 0 ? `<tr><td colspan="9" class="px-3 py-10 text-center text-ink-300">この月の売上はありません</td></tr>` : rows.map(r => `
          <tr class="border-b hover:bg-brand-light/40">
            <td class="px-3 py-2 whitespace-nowrap">${fmt.dateW(r.dd)}</td>
            <td class="px-3 py-2"><a href="#order/${r.o.id}" class="font-mono text-xs text-blue-700 hover:underline">${esc(r.o.order_number)}</a></td>
            <td class="px-3 py-2 font-bold whitespace-nowrap"><a href="#customer/${r.o.customer_id}" class="hover:underline">${esc(fmt.customer(r.o.customer_id))}</a></td>
            <td class="px-3 py-2">${esc(r.o.title || '—')}</td>
            <td class="px-3 py-2 text-right">${fmt.money(v4ExTax(r.o.total_amount))}</td>
            <td class="px-3 py-2 text-right text-ink-500">${fmt.money(v4Tax(r.o.total_amount))}</td>
            <td class="px-3 py-2 text-right font-bold">${fmt.money(r.o.total_amount)}</td>
            <td class="px-3 py-2 text-center"><span class="text-xs font-bold ${r.b.cash ? 'text-ok-dark' : 'text-blue-700'}">${r.b.cash ? '現金' : '掛'}</span></td>
            <td class="px-3 py-2 text-center text-xs">${v4StatusBadge(r.b.status)}</td>
          </tr>`).join('')}
        </tbody>
        ${rows.length ? `<tfoot class="bg-gray-50 font-black">
          <tr>
            <td colspan="4" class="px-3 py-2 text-right">月計（${rows.length}件）</td>
            <td class="px-3 py-2 text-right">${fmt.money(rows.reduce((s, r) => s + v4ExTax(r.o.total_amount), 0))}</td>
            <td class="px-3 py-2 text-right">${fmt.money(rows.reduce((s, r) => s + v4Tax(r.o.total_amount), 0))}</td>
            <td class="px-3 py-2 text-right">${fmt.money(sumAll)}</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>` : ''}
      </table>
    </div>`;
  },
  bind() {
    $('#ledger-month')?.addEventListener('change', (e) => { this.month = e.target.value; App.render(); });
  },
};

/* ========= 画面: 納品書 ========= */
Screens.delivery_notes = {
  selectedId: null,
  render() {
    const notes = DB.all('delivery_notes').slice().sort((a, b) => (b.issued_date || '').localeCompare(a.issued_date || ''));
    if (notes.length === 0) return `<h1 class="text-2xl font-black mb-4">納品書</h1><div class="text-ink-300 py-10 text-center">納品済みの受注がありません</div>`;
    const sel = DB.find('delivery_notes', this.selectedId) || notes[0];
    this.selectedId = sel.id;
    const o = DB.find('orders', sel.order_id);
    const calc = calcOrder(o.items || [], o.discount_amount || 0);

    return `
    <h1 class="text-2xl font-black mb-1">納品書</h1>
    <p class="text-sm text-ink-500 mb-4">受注が「納品済み」になると自動で作成されます（転記なし）。印刷して納品物に同梱する運用イメージです。</p>
    <div class="grid lg:grid-cols-[380px_1fr] gap-5">
      <div>
        <div class="bg-white rounded shadow-sm border divide-y max-h-[70vh] overflow-y-auto">
          ${notes.map(n => { const od = DB.find('orders', n.order_id); if (!od) return ''; return `
          <button data-dn="${n.id}" class="w-full text-left px-4 py-3 hover:bg-brand-light/50 ${n.id === sel.id ? 'bg-brand-light border-l-4 border-brand' : ''}">
            <div class="flex justify-between items-center">
              <span class="font-mono text-xs text-ink-500">${esc(n.note_number)}</span>
              <span class="text-xs">${v4StatusBadge(n.status)}</span>
            </div>
            <div class="font-bold text-sm mt-0.5">${esc(fmt.customer(od.customer_id))}</div>
            <div class="text-xs text-ink-500">${esc(od.title || '—')}｜納品 ${fmt.dateW(n.issued_date)}｜${fmt.money(od.total_amount)}</div>
          </button>`; }).join('')}
        </div>
      </div>

      <div>
        <div class="flex gap-2 mb-3 flex-wrap">
          <button id="dn-print" class="bg-brand text-white font-bold px-4 py-2 rounded shadow hover:bg-brand-dark">🖨 印刷 / PDF</button>
          ${sel.status === '未発行'
            ? `<button id="dn-issue" class="bg-ok text-white font-bold px-4 py-2 rounded shadow hover:bg-ok-dark">発行済にする</button>`
            : `<span class="text-sm text-ok-dark font-bold self-center">✓ 発行済</span>`}
          <a href="#order/${o.id}" class="self-center text-sm text-blue-700 hover:underline ml-2">受注詳細を開く →</a>
        </div>
        <div id="dn-doc" class="a4doc print-doc mx-auto">
          <div class="doc-title mb-6">納　品　書</div>
          <div class="flex justify-between items-start mb-6">
            <div>
              <div class="text-lg font-bold border-b-2 border-ink-900 pb-1 pr-10">${esc(fmt.customer(o.customer_id))}　御中</div>
              <div class="text-xs mt-3 text-ink-500">下記の通り納品いたしました。</div>
            </div>
            <div class="text-xs text-right leading-5">
              <div>納品書No: ${esc(sel.note_number)}</div>
              <div>納品日: ${fmt.dateWY(sel.issued_date)}</div>
              <div>受注No: ${esc(o.order_number)}</div>
            </div>
          </div>
          <table class="doc-table mb-4">
            <thead><tr><th class="w-1/2">品名</th><th>用紙</th><th>数量</th><th>単価</th><th>金額</th></tr></thead>
            <tbody>
              ${(o.items || []).map(it => { const p = calcItemPrice(it); return `<tr>
                <td>${esc(it.title || o.title || '—')}</td>
                <td class="text-xs">${esc(fmt.paperText(it))}</td>
                <td class="text-right">${(it.quantity || 0).toLocaleString()}</td>
                <td class="text-right">${fmt.money(p.unit_price)}</td>
                <td class="text-right">${fmt.money(p.subtotal)}</td>
              </tr>`; }).join('')}
              ${Array.from({ length: Math.max(0, 5 - (o.items || []).length) }).map(() => `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>`).join('')}
            </tbody>
          </table>
          <div class="flex justify-end mb-8">
            <table class="w-72 doc-table">
              <tr><td class="bg-gray-100 font-bold">小計</td><td class="text-right">${fmt.money(calc.subtotal)}</td></tr>
              ${calc.discount ? `<tr><td class="bg-gray-100 font-bold">${esc(fmt.discountLabel(o.discount_label_type, o.discount_reason))}</td><td class="text-right">−${fmt.money(calc.discount)}</td></tr>` : ''}
              <tr><td class="bg-gray-100 font-bold">消費税（10%）</td><td class="text-right">${fmt.money(calc.total_tax)}</td></tr>
              <tr><td class="bg-gray-100 font-black">合計</td><td class="text-right font-black">${fmt.money(calc.total)}</td></tr>
            </table>
          </div>
          <div class="flex justify-between items-end">
            <div class="text-xs text-ink-500 border rounded p-3 w-64 h-20">備考</div>
            ${v4CompanyBlock()}
          </div>
        </div>
      </div>
    </div>`;
  },
  bind() {
    $$('[data-dn]').forEach(b => b.addEventListener('click', () => { this.selectedId = b.dataset.dn; App.render(); }));
    $('#dn-print')?.addEventListener('click', () => window.print());
    $('#dn-issue')?.addEventListener('click', () => {
      const n = DB.find('delivery_notes', this.selectedId);
      n.status = '発行済';
      DB.log('DeliveryNote', n.id, `納品書発行 (${n.note_number})`);
      DB.save();
      toast('納品書を発行済にしました（時系列記録にも反映）', 'ok');
      App.render();
    });
  },
};

/* ========= 画面: 請求書 ========= */
Screens.invoices = {
  selectedId: null,
  render() {
    const invoices = DB.all('invoices').slice().sort((a, b) => (b.issued_date || '9999').localeCompare(a.issued_date || '9999') || b.id.localeCompare(a.id));
    const sel = DB.find('invoices', this.selectedId) || invoices[0];
    if (sel) this.selectedId = sel.id;

    const listHtml = invoices.map(v => `
      <button data-inv="${v.id}" class="w-full text-left px-4 py-3 hover:bg-brand-light/50 ${sel && v.id === sel.id ? 'bg-brand-light border-l-4 border-brand' : ''}">
        <div class="flex justify-between items-center">
          <span class="font-mono text-xs text-ink-500">${esc(v.invoice_number)}</span>
          <span class="text-xs">${v4StatusBadge(v.status)}</span>
        </div>
        <div class="font-bold text-sm mt-0.5">${esc(fmt.customer(v.customer_id))}</div>
        <div class="text-xs text-ink-500">${v.target_month ? v.target_month.replace('-', '年') + '月分' : esc(DB.find('orders', (v.order_ids || [])[0])?.title || v.memo || '')}｜${fmt.money(v4InvoiceAmount(v))}｜期限 ${fmt.dateW(v.due_date)}</div>
      </button>`).join('');

    let doc = `<div class="text-ink-300 text-center py-20">請求書がありません</div>`;
    if (sel) {
      const orders = (sel.order_ids || []).map(id => DB.find('orders', id)).filter(Boolean);
      const total = v4InvoiceAmount(sel);
      const ex = sel.fixed_amount != null ? v4ExTax(sel.fixed_amount) : orders.reduce((s, o) => s + v4ExTax(o.total_amount), 0);
      const tax = total - ex;
      const bodyRows = sel.fixed_amount != null
        ? `<tr><td class="text-center">—</td><td>${esc(sel.memo || '前月分ご請求')}</td><td class="text-right">1式</td><td class="text-right">${fmt.money(ex)}</td></tr>`
        : orders.map(o => `<tr>
            <td class="text-center whitespace-nowrap">${fmt.date(v4DeliveredDate(o))}</td>
            <td>${esc(o.title || '—')}<span class="text-[10px] text-ink-500 ml-1">(${esc(o.order_number)})</span></td>
            <td class="text-right">1式</td>
            <td class="text-right">${fmt.money(v4ExTax(o.total_amount))}</td>
          </tr>`).join('');
      const emptyRows = Array.from({ length: Math.max(0, 6 - (sel.fixed_amount != null ? 1 : orders.length)) }).map(() => `<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>`).join('');
      const s = DB.data.settings;

      doc = `
      <div class="flex gap-2 mb-3 flex-wrap">
        <button id="inv-print" class="bg-brand text-white font-bold px-4 py-2 rounded shadow hover:bg-brand-dark">🖨 印刷 / PDF</button>
        ${sel.status === '未発行' ? `<button id="inv-issue" class="bg-ok text-white font-bold px-4 py-2 rounded shadow hover:bg-ok-dark">発行する</button>` : ''}
        ${sel.status === '発行済' ? `<button id="inv-paid" class="bg-ok text-white font-bold px-4 py-2 rounded shadow hover:bg-ok-dark">入金を記録</button>` : ''}
        ${sel.status === '入金済' ? `<span class="text-sm text-ok-dark font-bold self-center">✓ ${fmt.dateW(sel.paid_date)} 入金済</span>` : ''}
      </div>
      <div id="inv-doc" class="a4doc print-doc mx-auto">
        <div class="doc-title mb-6">御　請　求　書</div>
        <div class="flex justify-between items-start mb-4">
          <div>
            <div class="text-lg font-bold border-b-2 border-ink-900 pb-1 pr-10">${esc(fmt.customer(sel.customer_id))}　御中</div>
            <div class="text-xs mt-3 text-ink-500">毎度ありがとうございます。下記の通りご請求申し上げます。</div>
            <div class="mt-4 bg-gray-100 border-2 border-ink-900 px-5 py-3 inline-block">
              <span class="text-xs font-bold mr-3">御請求金額</span>
              <span class="text-2xl font-black">${fmt.money(total)}</span><span class="text-xs ml-1">（税込）</span>
            </div>
          </div>
          <div class="text-xs text-right leading-5">
            <div>請求書No: ${esc(sel.invoice_number)}</div>
            <div>発行日: ${fmt.dateWY(sel.issued_date || TODAY)}${sel.issued_date ? '' : '（未発行・プレビュー）'}</div>
            ${sel.target_month ? `<div>対象: ${sel.target_month.replace('-', '年')}月分（月末締め）</div>` : ''}
            <div class="font-bold">お支払期限: ${fmt.dateWY(sel.due_date)}</div>
          </div>
        </div>
        <table class="doc-table mb-4">
          <thead><tr><th>納品日</th><th class="w-1/2">品名</th><th>数量</th><th>金額（税抜）</th></tr></thead>
          <tbody>${bodyRows}${emptyRows}</tbody>
        </table>
        <div class="flex justify-end mb-6">
          <table class="w-72 doc-table">
            <tr><td class="bg-gray-100 font-bold">小計（10%対象）</td><td class="text-right">${fmt.money(ex)}</td></tr>
            <tr><td class="bg-gray-100 font-bold">消費税（10%）</td><td class="text-right">${fmt.money(tax)}</td></tr>
            <tr><td class="bg-gray-100 font-black">合計</td><td class="text-right font-black">${fmt.money(total)}</td></tr>
          </table>
        </div>
        <div class="flex justify-between items-end">
          <div class="text-xs border rounded p-3 w-80 leading-5">
            <div class="font-bold mb-1">お振込先</div>
            <div>${esc(s.bank_info_1)}</div>
            <div>${esc(s.bank_info_2)}</div>
            <div>${esc(s.bank_holder)}</div>
            <div class="text-ink-500 mt-1">※恐れ入りますが振込手数料はご負担願います</div>
          </div>
          ${v4CompanyBlock()}
        </div>
      </div>`;
    }

    return `
    <div class="flex items-center justify-between mb-1 flex-wrap gap-2">
      <h1 class="text-2xl font-black">請求書</h1>
      <button id="inv-new-monthly" class="bg-brand text-white font-bold px-4 py-2 rounded shadow hover:bg-brand-dark">＋ 請求書を作成</button>
    </div>
    <p class="text-sm text-ink-500 mb-4">顧客と月を選ぶと未請求の納品分がまとまって1枚に。月末にまとめれば月締め、1件だけなら都度請求になります。</p>
    <div class="grid lg:grid-cols-[400px_1fr] gap-5">
      <div><div class="bg-white rounded shadow-sm border divide-y max-h-[75vh] overflow-y-auto">${listHtml || '<div class="p-6 text-ink-300 text-center">なし</div>'}</div></div>
      <div>${doc}</div>
    </div>`;
  },
  bind() {
    $$('[data-inv]').forEach(b => b.addEventListener('click', () => { this.selectedId = b.dataset.inv; App.render(); }));
    $('#inv-print')?.addEventListener('click', () => window.print());
    $('#inv-issue')?.addEventListener('click', () => {
      const v = DB.find('invoices', this.selectedId);
      v.status = '発行済'; v.issued_date = TODAY;
      DB.log('Invoice', v.id, `請求書発行 (${v.invoice_number})`);
      DB.save(); toast('請求書を発行しました', 'ok'); App.render();
    });
    $('#inv-paid')?.addEventListener('click', () => {
      const v = DB.find('invoices', this.selectedId);
      v.status = '入金済'; v.paid_date = TODAY;
      DB.log('Invoice', v.id, `入金消込 (${v.invoice_number})`);
      let msg = '入金を記録しました（帳簿・時系列に自動反映）';
      if (confirm('入金を記録しました。\n続けて領収書を発行しますか？（振込のお客様は希望時のみ）')) {
        const rc = {
          id: DB.nextId('rc'),
          receipt_number: v4NextReceiptNumber(),
          customer_id: v.customer_id,
          amount: v4InvoiceAmount(v),
          issued_date: TODAY,
          method: '振込',
          tadashi: (v.target_month ? v.target_month.replace('-', '年') + '月分ご請求分として' : '印刷代として'),
          order_id: null,
          invoice_id: v.id,
        };
        DB.data.receipts.push(rc);
        DB.log('Receipt', rc.id, `領収書発行 (${rc.receipt_number})`);
        msg = '入金を記録し、領収書を発行しました（領収書タブへ）';
      }
      DB.save(); toast(msg, 'ok'); App.render();
    });
    $('#inv-new-monthly')?.addEventListener('click', () => this.openMonthlyModal());
  },
  openMonthlyModal() {
    const kakeCustomers = DB.all('customers').filter(c => c.payment_type === '掛');
    const months = v4Months();
    openModal(`
      <div class="p-6">
        <h2 class="text-lg font-black mb-4">請求書を作成</h2>
        <div class="grid gap-4">
          <label class="block">
            <div class="text-xs font-bold text-ink-500 mb-1">顧客（掛のお客様）</div>
            <select id="mi-cust" class="border rounded px-3 py-2 w-full bg-white">
              ${kakeCustomers.map(c => `<option value="${c.id}">${esc(c.company_name || c.individual_name)}</option>`).join('')}
            </select>
          </label>
          <label class="block">
            <div class="text-xs font-bold text-ink-500 mb-1">対象月（納品月）</div>
            <select id="mi-month" class="border rounded px-3 py-2 w-full bg-white">
              ${months.map(m => `<option value="${m}">${m.replace('-', '年')}月分</option>`).join('')}
            </select>
          </label>
          <div id="mi-preview" class="text-sm bg-gray-50 border rounded p-3 text-ink-500">—</div>
          <div class="flex justify-end gap-2">
            <button id="mi-cancel" class="px-4 py-2 border rounded font-bold text-ink-500">キャンセル</button>
            <button id="mi-create" class="px-4 py-2 bg-brand text-white rounded font-bold hover:bg-brand-dark">作成する</button>
          </div>
        </div>
      </div>
    `, () => {
      const targets = () => {
        const cid = $('#mi-cust').value, m = $('#mi-month').value;
        return v4LedgerOrders(m)
          .filter(x => x.o.customer_id === cid)
          .filter(x => !DB.all('invoices').some(v => (v.order_ids || []).includes(x.o.id)))
          .map(x => x.o);
      };
      const refresh = () => {
        const t = targets();
        const sum = t.reduce((s, o) => s + (o.total_amount || 0), 0);
        $('#mi-preview').innerHTML = t.length
          ? `対象: <b>${t.length}件</b> ／ 合計 <b>${fmt.money(sum)}</b>（税込）<div class="text-xs mt-1">${t.map(o => esc(o.title || o.order_number)).join(' ／ ')}</div>`
          : '対象月に未請求の納品がありません';
        $('#mi-create').disabled = t.length === 0;
        $('#mi-create').classList.toggle('opacity-40', t.length === 0);
      };
      $('#mi-cust').addEventListener('change', refresh);
      $('#mi-month').addEventListener('change', refresh);
      $('#mi-cancel').addEventListener('click', closeModal);
      $('#mi-create').addEventListener('click', () => {
        const t = targets();
        if (t.length === 0) return;
        const cid = $('#mi-cust').value, m = $('#mi-month').value;
        const inv = {
          id: DB.nextId('inv'),
          invoice_number: v4NextInvoiceNumber(),
          type: '月締め',
          customer_id: cid,
          target_month: m,
          order_ids: t.map(o => o.id),
          fixed_amount: null,
          issued_date: null,
          due_date: null,   // 直後に「対象月の翌月末」を設定
          status: '未発行',
          paid_date: null,
          memo: '',
        };
        const [yy, mm] = m.split('-').map(Number);
        const lastDay = new Date(yy, mm + 1, 0);
        inv.due_date = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
        DB.data.invoices.push(inv);
        DB.log('Invoice', inv.id, `月締め請求書作成 (${inv.invoice_number} / ${t.length}件)`);
        DB.save();
        this.selectedId = inv.id;
        closeModal();
        toast(`${fmt.customer(cid)} の${m.replace('-', '年')}月分請求書を作成（${t.length}件）`, 'ok');
        App.render();
      });
      refresh();
    });
  },
};

/* ========= 画面: 領収書 ========= */
Screens.receipts = {
  selectedId: null,
  render() {
    const receipts = DB.all('receipts').slice().sort((a, b) => (b.issued_date || '').localeCompare(a.issued_date || ''));
    if (receipts.length === 0) return `<h1 class="text-2xl font-black mb-4">領収書</h1><div class="text-ink-300 py-10 text-center">領収書はまだありません（請求書の入金記録から発行できます）</div>`;
    const sel = DB.find('receipts', this.selectedId) || receipts[0];
    this.selectedId = sel.id;
    const needStamp = sel.amount >= 50000 && sel.method === '現金';
    const ex = v4ExTax(sel.amount);

    return `
    <h1 class="text-2xl font-black mb-1">領収書</h1>
    <p class="text-sm text-ink-500 mb-4">現金のお客様は納品時に自動作成。振込のお客様は入金記録時に希望があれば発行（案）。</p>
    <div class="grid lg:grid-cols-[380px_1fr] gap-5">
      <div>
        <div class="bg-white rounded shadow-sm border divide-y max-h-[70vh] overflow-y-auto">
          ${receipts.map(r => `
          <button data-rc="${r.id}" class="w-full text-left px-4 py-3 hover:bg-brand-light/50 ${r.id === sel.id ? 'bg-brand-light border-l-4 border-brand' : ''}">
            <div class="flex justify-between items-center">
              <span class="font-mono text-xs text-ink-500">${esc(r.receipt_number)}</span>
              <span class="text-xs font-bold ${r.method === '現金' ? 'text-ok-dark' : 'text-blue-700'}">${r.method}</span>
            </div>
            <div class="font-bold text-sm mt-0.5">${esc(fmt.customer(r.customer_id))}</div>
            <div class="text-xs text-ink-500">${fmt.dateW(r.issued_date)}｜${fmt.money(r.amount)}</div>
          </button>`).join('')}
        </div>
      </div>

      <div>
        <div class="flex gap-2 mb-3 flex-wrap">
          <button id="rc-print" class="bg-brand text-white font-bold px-4 py-2 rounded shadow hover:bg-brand-dark">🖨 印刷 / PDF</button>
          <button id="rc-tadashi" class="bg-white border font-bold px-4 py-2 rounded text-ink-500 hover:bg-gray-50">但し書きを編集</button>
        </div>
        <div id="rc-doc" class="receipt-doc print-doc mx-auto">
          <div class="flex justify-between items-start">
            <div class="text-xs text-ink-500">No. ${esc(sel.receipt_number)}</div>
            <div class="text-xs">発行日: ${fmt.dateWY(sel.issued_date)}</div>
          </div>
          <div class="doc-title my-5">領　収　書</div>
          <div class="text-lg font-bold border-b-2 border-ink-900 pb-1 mb-6 w-3/4">${esc(fmt.customer(sel.customer_id))}　様</div>
          <div class="bg-gray-100 border-2 border-ink-900 text-center py-4 mb-5">
            <span class="text-3xl font-black tracking-wider">${fmt.money(sel.amount)}−</span>
            <span class="text-xs ml-2">（税込）</span>
          </div>
          <div class="text-sm mb-1">但し　<span class="border-b border-ink-500 px-2">${esc(sel.tadashi)}</span></div>
          <div class="text-sm mb-6">上記正に領収いたしました（${sel.method}）</div>
          <div class="text-xs text-ink-500 mb-6">内訳：税抜金額 ${fmt.money(ex)} ／ 消費税(10%) ${fmt.money(sel.amount - ex)}</div>
          <div class="flex justify-between items-end">
            ${needStamp
              ? `<div class="border-2 border-dashed border-ink-300 text-ink-300 text-[10px] w-20 h-20 flex items-center justify-center text-center">収入印紙<br>200円</div>`
              : `<div class="text-[10px] text-ink-300">${sel.method === '振込' ? '※銀行振込のため収入印紙は不要です' : '※5万円未満のため収入印紙は不要です'}</div>`}
            ${v4CompanyBlock()}
          </div>
        </div>
      </div>
    </div>`;
  },
  bind() {
    $$('[data-rc]').forEach(b => b.addEventListener('click', () => { this.selectedId = b.dataset.rc; App.render(); }));
    $('#rc-print')?.addEventListener('click', () => window.print());
    $('#rc-tadashi')?.addEventListener('click', () => {
      const r = DB.find('receipts', this.selectedId);
      const t = prompt('但し書きを入力してください', r.tadashi || '印刷代として');
      if (t != null) { r.tadashi = t.trim() || '印刷代として'; DB.save(); App.render(); }
    });
  },
};

/* ========= 画面: 時系列記録表 ========= */
Screens.timeline = {
  selectedId: null,
  q: '',
  onlyOpen: false,
  events(o) {
    const ev = [];
    const fr = DB.all('factory_records').find(f => f.order_id === o.id);
    const note = DB.all('delivery_notes').find(n => n.order_id === o.id);
    const b = v4Billing(o);
    ev.push({ d: o.received_date, label: '受注', desc: `${fmt.customer(o.customer_id)}より受注（${o.reception_method || ''}・受注者 ${fmt.user(o.received_by_id)}）`, color: 'bg-red-500' });
    if (fr?.started_at) ev.push({ d: fr.started_at.slice(0, 10), label: '製作開始', desc: '製版・印刷工程へ', color: 'bg-amber-500' });
    if (fr?.completed_at) ev.push({ d: fr.completed_at.slice(0, 10), label: '完成', desc: `工場完了${fr.completed_by_id ? '（' + fmt.user(fr.completed_by_id) + '）' : ''}`, color: 'bg-ok' });
    const dd = v4DeliveredDate(o);
    if (dd) ev.push({ d: dd, label: '納品', desc: '納品完了 → 売上帳へ自動記帳', color: 'bg-ok-dark' });
    if (note && note.status === '発行済') ev.push({ d: note.issued_date, label: '納品書発行', desc: note.note_number, color: 'bg-brand' });
    if (b.inv?.issued_date) ev.push({ d: b.inv.issued_date, label: '請求書発行', desc: `${b.inv.invoice_number}（${b.inv.type}${b.inv.target_month ? '・' + b.inv.target_month.replace('-', '年') + '月分' : ''}）`, color: 'bg-purple-500' });
    if (b.inv?.paid_date) ev.push({ d: b.inv.paid_date, label: '入金', desc: `${fmt.money(v4InvoiceAmount(b.inv))} 入金確認・消込`, color: 'bg-ok-dark' });
    if (b.rec) ev.push({ d: b.rec.issued_date, label: '領収書発行', desc: `${b.rec.receipt_number}（${b.rec.method}）`, color: 'bg-blue-500' });
    return ev.filter(e => e.d).sort((a, b2) => a.d.localeCompare(b2.d));
  },
  stages(o) {
    const b = v4Billing(o);
    const dd = v4DeliveredDate(o);
    return {
      受注: o.received_date,
      納品: dd,
      請求: b.cash ? (dd ? '現金' : null) : (b.inv?.issued_date || null),
      入金: b.cash ? (b.rec?.issued_date || null) : (b.inv?.paid_date || null),
      領収: b.rec?.issued_date || null,
      b, dd,
    };
  },
  render() {
    const q = this.q.trim();
    let orders = DB.all('orders').slice()
      .filter(o => o.status !== '見積もり段階')
      .sort((a, b) => (b.received_date || '').localeCompare(a.received_date || ''));
    if (q) orders = orders.filter(o => (fmt.customer(o.customer_id) + (o.title || '') + o.order_number).includes(q));
    const shown = orders.slice(0, 30);

    const sel = DB.find('orders', this.selectedId) || shown[0];
    if (sel) this.selectedId = sel.id;

    const cell = (v, danger) => v == null
      ? `<td class="px-2 py-2 text-center ${danger ? 'bg-red-50 text-red-500 font-bold' : 'text-ink-300'}">${danger ? '未' : '—'}</td>`
      : `<td class="px-2 py-2 text-center whitespace-nowrap">${v === '現金' ? '<span class="text-xs font-bold text-ok-dark">現金</span>' : fmt.date(v)}</td>`;

    let detail = '';
    if (sel) {
      const evs = this.events(sel);
      const s = this.stages(sel);
      let next = '';
      if (!s.dd) next = `<div class="flex gap-3 relative"><div class="tl-dot bg-gray-300"></div><div><div class="font-bold text-sm text-ink-500">製作中…</div></div></div>`;
      else if (s.b.cash && !s.b.rec) next = `<div class="flex gap-3 relative"><div class="tl-dot bg-red-500 animate-pulse"></div><div><div class="font-bold text-sm text-red-600">⚠ 現金未回収</div><div class="text-xs text-ink-500">領収書発行と同時に回収記録（案）</div></div></div>`;
      else if (!s.b.cash && s.b.status === '未請求') next = `<div class="flex gap-3 relative"><div class="tl-dot bg-red-500 animate-pulse"></div><div><div class="font-bold text-sm text-red-600">⚠ 請求書が未作成です</div><div class="text-xs text-ink-500">請求書タブから月締め／個別で作成</div></div></div>`;
      else if (!s.b.cash && s.b.status === '未発行') next = `<div class="flex gap-3 relative"><div class="tl-dot bg-red-500 animate-pulse"></div><div><div class="font-bold text-sm text-red-600">⚠ 請求書が未発行です</div><div class="text-xs text-ink-500">請求書タブから発行できます</div></div></div>`;
      else if (!s.b.cash && s.b.status === '入金待ち') next = `<div class="flex gap-3 relative"><div class="tl-dot bg-amber-500 animate-pulse"></div><div><div class="font-bold text-sm text-amber-600">入金待ち（期限 ${fmt.dateW(s.b.inv?.due_date)}）</div><div class="text-xs text-ink-500">期限超過で赤色表示＋通知（案）</div></div></div>`;
      else next = `<div class="flex gap-3 relative"><div class="tl-dot bg-ok"></div><div><div class="font-bold text-sm text-ok-dark">✓ この案件は完結しています</div></div></div>`;

      detail = `
      <div class="bg-white rounded shadow-sm border p-5 h-fit lg:sticky lg:top-28">
        <div class="font-black">${esc(sel.title || '—')}</div>
        <div class="text-xs text-ink-500 mb-1">${esc(fmt.customer(sel.customer_id))}｜${esc(sel.order_number)}｜${fmt.money(sel.total_amount)}（税込）</div>
        <a href="#order/${sel.id}" class="text-xs text-blue-700 hover:underline">受注詳細を開く →</a>
        <div class="relative pl-2 mt-4">
          <div class="tl-line"></div>
          ${evs.map(e => `
          <div class="flex gap-3 mb-4 relative">
            <div class="tl-dot ${e.color}"></div>
            <div>
              <div class="text-xs text-ink-500">${fmt.dateW(e.d)}</div>
              <div class="font-bold text-sm">${e.label}</div>
              <div class="text-xs text-ink-500">${e.desc}</div>
            </div>
          </div>`).join('')}
          ${next}
        </div>
      </div>`;
    }

    return `
    <h1 class="text-2xl font-black mb-1">時系列記録表</h1>
    <p class="text-sm text-ink-500 mb-4">全受注の「受注 → 納品 → 請求 → 入金 → 領収」を一覧で。<span class="text-red-500 font-bold">赤の「未」</span>＝止まっている工程。行クリックで詳細タイムライン（すべて自動記録・手入力なし）。</p>

    <div class="flex items-center gap-3 mb-3 flex-wrap text-sm">
      <input id="tl-q" value="${esc(this.q)}" placeholder="顧客名・品名・受注Noで絞込" class="border rounded px-3 py-1.5 w-64 bg-white">
      <span class="text-xs text-ink-300">${orders.length}件中 ${shown.length}件を表示</span>
    </div>

    <div class="grid lg:grid-cols-[1fr_400px] gap-5 items-start">
      <div class="bg-white rounded shadow-sm border overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-ink-900 text-white text-xs">
            <tr>
              <th class="px-2 py-2 text-left">受注No / 顧客 / 品名</th>
              <th class="px-2 py-2">受注</th><th class="px-2 py-2">納品</th>
              <th class="px-2 py-2">請求</th><th class="px-2 py-2">入金</th><th class="px-2 py-2">領収書</th>
            </tr>
          </thead>
          <tbody>
            ${shown.map(o => {
              const s = this.stages(o);
              return `
              <tr data-tl="${o.id}" class="border-b cursor-pointer hover:bg-brand-light/40 ${sel && o.id === sel.id ? 'bg-brand-light' : ''}">
                <td class="px-2 py-2">
                  <div class="font-mono text-[10px] text-ink-500">${esc(o.order_number)} <span class="st st-${o.status} text-[10px]">${o.status}</span></div>
                  <div class="font-bold text-xs">${esc(fmt.customer(o.customer_id))}</div>
                  <div class="text-[11px] text-ink-500">${esc(o.title || '—')}</div>
                </td>
                ${cell(s.受注)}
                ${cell(s.納品, false)}
                ${cell(s.請求, !!s.dd && !s.請求)}
                ${cell(s.入金, !!s.dd && !!s.請求 && !s.入金)}
                ${cell(s.領収, false)}
              </tr>`; }).join('')}
          </tbody>
        </table>
      </div>
      ${detail}
    </div>`;
  },
  bind() {
    $$('[data-tl]').forEach(r => r.addEventListener('click', () => { this.selectedId = r.dataset.tl; App.render(); }));
    const q = $('#tl-q');
    q?.addEventListener('input', debounce(() => { this.q = q.value; App.render(); }, 300));
  },
};

/* ========= 自動連携フック =========
 * 受注が「納品済み」になった瞬間に納品書レコードを自動作成（v4の目玉動作） */
(function hookUpdateOrder() {
  const orig = DB.updateOrder.bind(DB);
  DB.updateOrder = function(id, patch, logMsg) {
    const result = orig(id, patch, logMsg);
    if (result && v4DeliveredDate(result) && !DB.all('delivery_notes').some(n => n.order_id === id)) {
      DB.data.delivery_notes.push({
        id: DB.nextId('dn'),
        note_number: 'D-' + (result.order_number || id),
        order_id: id,
        issued_date: v4DeliveredDate(result),
        status: '未発行',
      });
      DB.save();
      toast('納品書が自動作成されました（納品書タブ → 未発行）', 'ok');
    }
    return result;
  };
})();

/* リセット時もv4テーブルを再シード */
(function hookReset() {
  const orig = DB.reset.bind(DB);
  DB.reset = function() { orig(); ensureV4(); };
})();

// ========= v4 初期化 =========
ensureV4();
// 初期ハッシュがv4画面だった場合に備えて再描画
App.render();
