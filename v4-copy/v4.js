/* =====================================================================
 * 渡辺謄写堂 業務管理システム v4.1 追加モジュール
 * 帳簿 / 納品書・請求書 / 領収書
 * ---------------------------------------------------------------------
 * app.js (v3) の後に読み込む追加ファイル。v3本体は無改変。
 * 2026-08-06 決定事項を反映:
 *   ・帳簿は「納品済み」への移動で自動記帳。手入力画面は廃止
 *   ・時系列記録表は廃止
 *   ・納品書と請求書は同一画面で管理し、保存時に請求書を同時生成
 *   ・領収書に社印・偽造防止模様を表示（一旦ゴシック体）
 * ===================================================================== */

// ========= データ移行・シード =========
function ensureV4() {
  const d = DB.data;
  let changed = false;
  ['ledger_entries', 'dnote_docs', 'receipt_docs'].forEach(t => {
    if (!d[t]) { d[t] = []; changed = true; }
  });
  // 旧版で使っていたテーブルは破棄
  ['invoice_docs', 'daily_logs'].forEach(t => { if (d[t]) { delete d[t]; changed = true; } });

  if (!d._v4_4_seeded) {
    d.ledger_entries = [];
    d.dnote_docs = [];
    d.receipt_docs = [];

    // 納品済みの受注には納品日を入れ、帳簿へ自動記帳する（本番と同じ経路）
    DB.all('orders').filter(o => o.status === '納品済み').forEach(o => {
      if (!o.delivered_date) o.delivered_date = o.delivery_date_start || o.received_date;
      v4LedgerAdd(o);
    });

    // 納品書・請求書のサンプル（受注から引用した状態）
    const sample = DB.all('orders').filter(o => o.status === '納品済み').slice(0, 3);
    sample.forEach((o, i) => {
      const items = (o.items || []).map(it => {
        const p = calcItemPrice(it);
        return { name: it.title || o.title || '', qty: it.quantity || '', price: p.unit_price || '', amount: p.subtotal || '' };
      });
      d.dnote_docs.push({
        id: 'dn' + (i + 1),
        number: 'D-' + (o.delivered_date || '').slice(2).replace(/-/g, '') + '-01',
        invoice_number: 'I-' + (o.delivered_date || '').slice(2).replace(/-/g, '') + '-01',
        customer_id: o.customer_id,
        delivery_date: o.delivered_date,
        items: items.length ? items : [{ name: o.title || '', qty: '', price: '', amount: '' }],
        order_id: o.id,
      });
    });

    // 領収書のサンプル（請求書から作成した状態）
    const src = d.dnote_docs[0];
    if (src) {
      d.receipt_docs.push({
        id: 'rp1',
        number: 'R-' + (src.delivery_date || '').slice(2).replace(/-/g, '') + '-01',
        customer_id: src.customer_id,
        issue_date: src.delivery_date,
        amount: v4Sums(src.items).total,
        tadashi: '印刷代として',
        source_id: src.id,
      });
    }

    d._v4_4_seeded = true;
    changed = true;
  }
  if (changed) DB.save();
}

// ========= 共通ヘルパー =========
function v4Kind(cid) { return DB.find('customers', cid)?.kind || ''; }
function v4Area(cid) { return DB.find('customers', cid)?.area || ''; }
function v4Sums(items) {
  // 金額は手入力。数量×単価の自動計算は行わない
  const sub = (items || []).reduce((s, it) => s + (+it.amount || 0), 0);
  const tax = Math.floor(sub * 0.1);
  return { sub, tax, total: sub + tax };
}
// 未入力の数値欄は帳票に印字しない（0ではなく空欄にする）
const v4Blank = (v) => v === '' || v === null || v === undefined;
function v4Qty(v) { return v4Blank(v) ? '' : (+v || 0).toLocaleString(); }
function v4Yen(v) { return v4Blank(v) ? '' : fmt.money(v); }
function v4Number(prefix, table, field = 'number') {
  const p = prefix + TODAY.slice(2).replace(/-/g, '');
  const n = DB.all(table).filter(x => (x[field] || '').startsWith(p)).length + 1;
  return `${p}-${String(n).padStart(2, '0')}`;
}
function v4Seal() {
  return `<div class="v4-seal" title="社印（仮）">渡辺</div>`;
}
function v4CompanyBlock(withSeal) {
  const s = DB.data.settings;
  return `<div class="flex items-start justify-end gap-3">
    <div class="text-right text-xs leading-5">
      <div class="font-black text-base">${esc(s.company_name)}</div>
      <div>${esc(s.company_postal)} ${esc(s.company_address)}</div>
      <div>TEL ${esc(s.company_phone)}　FAX ${esc(s.company_fax)}</div>
      <div>登録番号: ${esc(s.invoice_number)}</div>
    </div>
    ${withSeal ? v4Seal() : ''}
  </div>`;
}
function v4CustSelect(id, selected) {
  const opts = DB.all('customers').map(c =>
    `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.company_name || c.individual_name)}</option>`).join('');
  return `<select id="${id}" class="border rounded px-3 py-2 w-full bg-white"><option value="">— 顧客を選択 —</option>${opts}</select>`;
}
// 一覧の検索バー（顧客名検索／地域／種別）
function v4SearchBar(state, opts = {}) {
  const area = opts.area === false ? '' : `
    <select id="v4-area" class="border rounded px-3 py-1.5 bg-white">
      <option value="">地域: すべて</option>
      ${AREAS.map(a => `<option value="${a}" ${state.area === a ? 'selected' : ''}>${a}</option>`).join('')}
    </select>`;
  const kind = opts.kind === false ? '' : `
    <select id="v4-kind" class="border rounded px-3 py-1.5 bg-white">
      <option value="">種別: すべて</option>
      ${CUSTOMER_KINDS.map(k => `<option value="${k}" ${state.kind === k ? 'selected' : ''}>${k}</option>`).join('')}
    </select>`;
  return `
  <div class="flex items-center gap-2 mb-3 flex-wrap text-sm">
    <input id="v4-q" value="${esc(state.q || '')}" placeholder="顧客名で検索" class="border rounded px-3 py-1.5 w-56 bg-white">
    ${area}${kind}
  </div>`;
}
function v4BindSearch(state) {
  const q = $('#v4-q');
  q?.addEventListener('input', debounce(() => { state.q = q.value; App.render(); }, 300));
  $('#v4-area')?.addEventListener('change', (e) => { state.area = e.target.value; App.render(); });
  $('#v4-kind')?.addEventListener('change', (e) => { state.kind = e.target.value; App.render(); });
}
function v4Match(state, cid) {
  const name = fmt.customer(cid);
  if (state.q && !name.includes(state.q.trim())) return false;
  if (state.area && v4Area(cid) !== state.area) return false;
  if (state.kind && v4Kind(cid) !== state.kind) return false;
  return true;
}
// 明細エディタ（品名・数量・単価・金額／金額は手入力）
function v4ItemsEditor(items) {
  return `
  <table class="w-full text-sm border">
    <thead class="bg-gray-100 text-xs text-ink-500">
      <tr><th class="p-1.5 text-left">品名</th><th class="p-1.5 w-16">数量</th><th class="p-1.5 w-20">単価</th><th class="p-1.5 w-24">金額</th><th class="p-1.5 w-8"></th></tr>
    </thead>
    <tbody>
      ${items.map((it, i) => `
      <tr class="border-t">
        <td class="p-1"><input data-it="${i}" data-k="name" value="${esc(it.name || '')}" class="it-in border rounded px-2 py-1 w-full"></td>
        <td class="p-1"><input type="number" data-it="${i}" data-k="qty" value="${it.qty ?? ''}" class="it-in border rounded px-1 py-1 w-full text-right"></td>
        <td class="p-1"><input type="number" data-it="${i}" data-k="price" value="${it.price ?? ''}" class="it-in border rounded px-1 py-1 w-full text-right"></td>
        <td class="p-1"><input type="number" data-it="${i}" data-k="amount" value="${it.amount ?? ''}" class="it-in border rounded px-1 py-1 w-full text-right font-bold"></td>
        <td class="p-1 text-center"><button data-del-it="${i}" class="text-red-500 font-bold px-1">×</button></td>
      </tr>`).join('')}
    </tbody>
  </table>
  <button id="add-it" class="mt-2 text-sm font-bold text-brand-dark border border-brand rounded px-3 py-1 hover:bg-brand-light">＋ 明細を追加</button>
  <div class="text-[11px] text-ink-300 mt-1">明細は何行でも追加できます</div>`;
}
function v4BindItemsEditor(draft, refreshPreview) {
  $$('.it-in').forEach(inp => inp.addEventListener('input', () => {
    const i = +inp.dataset.it, k = inp.dataset.k;
    const numeric = (k === 'qty' || k === 'price' || k === 'amount');
    draft.items[i][k] = numeric ? (inp.value === '' ? '' : +inp.value) : inp.value;
    refreshPreview();
  }));
  $$('[data-del-it]').forEach(b => b.addEventListener('click', () => { draft.items.splice(+b.dataset.delIt, 1); App.render(); }));
  $('#add-it')?.addEventListener('click', () => { draft.items.push({ name: '', qty: '', price: '', amount: '' }); App.render(); });
}
function v4EmptyRows(n, cols) {
  return Array.from({ length: Math.max(0, n) }).map(() => `<tr>${'<td>&nbsp;</td>'.repeat(cols)}</tr>`).join('');
}

/* =====================================================================
 * 1. 帳簿（自動記帳のみ・一覧のみ）
 * ===================================================================== */
// 受注を「納品済み」にした時点で1行自動登録
function v4LedgerAdd(order) {
  if (!order) return;
  const exists = DB.all('ledger_entries').some(e => e.order_id === order.id);
  if (exists) return;
  DB.data.ledger_entries.push({
    id: DB.nextId ? DB.nextId('le') : 'le' + (DB.data.ledger_entries.length + 1),
    order_id: order.id,
    customer_id: order.customer_id,
    item_name: order.title || '',
    amount_ex: calcOrderTotal(order.items || []),
    received_date: order.received_date || '',
    delivery_date: order.delivered_date || order.delivery_date_start || '',
    invoice_id: null,
  });
}
// 「納品済み」から外した場合は自動記帳した行を取り消す
function v4LedgerRemove(orderId) {
  const before = DB.data.ledger_entries.length;
  DB.data.ledger_entries = DB.data.ledger_entries.filter(e => e.order_id !== orderId);
  return DB.data.ledger_entries.length !== before;
}

// 受注一覧（Screens.orders）とまったく同じ体裁で表示する
Screens.ledger = {
  filter: { q: '', kind: '', area: '' },
  page: 1,
  PAGE_SIZE: 50,
  render() {
    const all = DB.all('ledger_entries').slice()
      .sort((a, b) => (b.delivery_date || '').localeCompare(a.delivery_date || ''));
    const f = this.filter;
    const filtered = all.filter(e => {
      if (f.q && !fmt.customer(e.customer_id).toLowerCase().includes(f.q.toLowerCase())) return false;
      if (f.kind && v4Kind(e.customer_id) !== f.kind) return false;
      if (f.area && v4Area(e.customer_id) !== f.area) return false;
      return true;
    });
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.PAGE_SIZE));
    const page = Math.min(Math.max(1, this.page), totalPages);
    this.page = page;
    const pageList = filtered.slice((page - 1) * this.PAGE_SIZE, page * this.PAGE_SIZE);
    return `
      <div class="flex justify-between items-center mb-4">
        <div>
          <h1 class="text-2xl font-black">帳簿</h1>
        </div>
      </div>
      <div class="bg-white p-4 rounded shadow-sm mb-4 grid grid-cols-6 gap-3 text-sm" id="filter-bar">
        <div class="col-span-2"><label class="block text-xs font-bold mb-1">顧客名検索</label><input id="f-q" class="w-full border rounded px-2 py-1.5" value="${esc(f.q)}" placeholder="例: タクシー, 高拡散"></div>
        <div><label class="block text-xs font-bold mb-1">種別</label>
          <select id="f-kind" class="w-full border rounded px-2 py-1.5">
            <option value="">すべて</option>
            ${CUSTOMER_KINDS.map(k => `<option ${f.kind === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}
          </select>
        </div>
        <div><label class="block text-xs font-bold mb-1">地域</label>
          <select id="f-area" class="w-full border rounded px-2 py-1.5">
            <option value="">すべて</option>
            ${AREAS.map(a => `<option ${f.area === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}
          </select>
        </div>
        <div class="flex items-end gap-2 col-span-6">
          <button id="btn-filter-clear" class="border px-3 py-1.5 rounded text-xs">クリア</button>
        </div>
      </div>

      <div class="bg-white rounded shadow-sm">
        <div class="flex justify-between items-center px-4 py-2 border-b">
          <span class="text-sm">結果 <span class="font-bold">${filtered.length}</span> / ${all.length} 件 <span class="text-ink-500 ml-2">(${filtered.length ? (page - 1) * this.PAGE_SIZE + 1 : 0}〜${Math.min(page * this.PAGE_SIZE, filtered.length)}件を表示)</span></span>
        </div>
        <table class="w-full text-sm">
          <thead class="bg-ink-700/5"><tr class="text-left">
            <th class="px-3 py-2">受注番号</th><th class="px-3 py-2">受付日</th><th class="px-3 py-2">顧客</th><th class="px-3 py-2">地域</th><th class="px-3 py-2">品目</th><th class="px-3 py-2">納品日</th><th class="px-3 py-2 text-right">税抜小計</th><th class="px-3 py-2 text-right">消費税</th><th class="px-3 py-2 text-right">税込合計</th><th class="px-3 py-2">状態</th>
          </tr></thead>
          <tbody>
            ${filtered.length === 0 ? `<tr><td colspan="10" class="text-center py-10 text-ink-500">該当なし</td></tr>` :
              pageList.map(e => {
                const o = DB.find('orders', e.order_id);
                const ex = +e.amount_ex || 0, tx = Math.floor(ex * 0.1);
                const st = o?.status || '';
                return `
                <tr class="border-t hover:bg-brand/5 cursor-pointer" onclick="location.hash='#order/${e.order_id}'">
                  <td class="px-3 py-2 font-mono text-xs">${esc(o?.order_number || '')}</td>
                  <td class="px-3 py-2">${esc(fmt.dateW(e.received_date))}</td>
                  <td class="px-3 py-2">${esc(fmt.customer(e.customer_id))}</td>
                  <td class="px-3 py-2 text-xs">${esc(v4Area(e.customer_id))}</td>
                  <td class="px-3 py-2 text-xs"><div class="font-bold">${esc(e.item_name || '—')}</div></td>
                  <td class="px-3 py-2">${esc(fmt.dateW(e.delivery_date))}</td>
                  <td class="px-3 py-2 text-right font-mono">${fmt.money(ex)}</td>
                  <td class="px-3 py-2 text-right font-mono text-ink-500">${fmt.money(tx)}</td>
                  <td class="px-3 py-2 text-right font-mono font-bold">${fmt.money(ex + tx)}</td>
                  <td class="px-3 py-2"><span class="st st-${esc(st)}">${esc(st)}</span></td>
                </tr>`;
              }).join('')}
          </tbody>
        </table>
        ${totalPages > 1 ? `
        <div class="flex justify-center items-center gap-3 p-3 text-sm border-t">
          <button id="pg-prev" class="px-3 py-1 border rounded ${page <= 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-ink-700/5'}" ${page <= 1 ? 'disabled' : ''}>← 前</button>
          <span class="font-bold">ページ ${page} / ${totalPages}</span>
          <button id="pg-next" class="px-3 py-1 border rounded ${page >= totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-ink-700/5'}" ${page >= totalPages ? 'disabled' : ''}>次 →</button>
        </div>` : ''}
      </div>`;
  },
  bind() {
    const apply = () => {
      this.filter = { q: $('#f-q').value, kind: $('#f-kind')?.value || '', area: $('#f-area')?.value || '' };
      this.page = 1;
      App.render();
    };
    ['#f-q', '#f-kind', '#f-area'].forEach(sel => {
      const el = $(sel);
      el && el.addEventListener('input', debounce(apply, 300));
      el && el.addEventListener('change', apply);
    });
    $('#btn-filter-clear')?.addEventListener('click', () => { this.filter = { q: '', kind: '', area: '' }; this.page = 1; App.render(); });
    $('#pg-prev')?.addEventListener('click', () => { this.page = Math.max(1, this.page - 1); App.render(); });
    $('#pg-next')?.addEventListener('click', () => { this.page = this.page + 1; App.render(); });
  },
};

/* =====================================================================
 * 2. 納品書・請求書（同一画面で管理／保存時に請求書を同時生成）
 * ===================================================================== */
// 実物の複写伝票に合わせた納品書・請求書（納品書と請求書は同一デザイン）
function v4Wareki(iso) {
  if (!iso) return '令和　　年　　月　　日';
  const [y, m, dd] = iso.split('-').map(Number);
  return `令和 ${y - 2018} 年 ${m} 月 ${dd} 日`;
}
function slipDoc(d, kind) {
  const s = v4Sums(d.items);
  const st = DB.data.settings;
  const cust = fmt.customer(d.customer_id);
  const rows = d.items.map(it => `
    <tr>
      <td>${esc(it.name || '')}</td>
      <td class="qty">${v4Qty(it.qty)}</td>
      <td class="prc">${v4Yen(it.price)}</td>
      <td class="amt">${v4Yen(it.amount)}</td>
    </tr>`).join('');
  return `
  <div class="slip-doc print-doc mx-auto">
    <!-- 1行目: 種別 ＋ 顧客名 -->
    <div class="slip-row1">
      <div class="slip-tab">${kind === 'invoice' ? '請求書' : '納品書'}</div>
      <div class="slip-addr">
        <div class="rule"></div>
        <div class="nm">${esc(cust === '—' ? '' : cust)}</div>
        <div class="rule"></div>
        <span class="sama">様</span>
      </div>
    </div>
    <!-- 2行目: 左＝振込先ほか / 右＝会社概要 -->
    <div class="slip-row2">
      <div class="slip-pay">
        <div class="pay-box">
          <div class="pay-ttl">お振込先</div>
          <div>${esc(st.bank_info_1)}</div>
          <div>${esc(st.bank_info_2)}</div>
          <div>${esc(st.bank_holder)}</div>
        </div>
        <div class="slip-lead">下記の通り${kind === 'invoice' ? '請求' : '納品'}申し上げます。</div>
      </div>
      <div class="slip-corp">
        <div class="date">${v4Wareki(d.delivery_date)}</div>
        <img class="corp-img" src="assets/corp_block.png" alt="有限会社 渡辺謄写堂">
      </div>
    </div>
    <!-- 3行目: 明細表 -->
    <div class="slip-row3">
        <table class="slip-table">
          <thead>
            <tr><th>品名</th><th class="qty">数量</th><th class="prc">単価</th><th class="amt">金額</th></tr>
          </thead>
          <tbody>
            ${rows}
            ${v4EmptyRows(7 - d.items.length, 4)}
          </tbody>
          <tfoot>
            <tr><td colspan="3" class="lbl">小計</td><td class="amt">${fmt.money(s.sub)}</td></tr>
            <tr><td colspan="3" class="lbl">消費税（適用税率10％）</td><td class="amt">${fmt.money(s.tax)}</td></tr>
            <tr class="grand"><td colspan="3" class="lbl">合計</td><td class="amt">${fmt.money(s.total)}</td></tr>
          </tfoot>
        </table>
    </div>
  </div>`;
}

function docTable(d) {
  return `
    <table class="doc-table mb-4">
      <thead><tr><th class="w-1/2">品名</th><th>数量</th><th>単価</th><th>金額</th></tr></thead>
      <tbody>
        ${d.items.map(it => `<tr><td>${esc(it.name)}</td><td class="text-right">${v4Qty(it.qty)}</td><td class="text-right">${v4Yen(it.price)}</td><td class="text-right">${v4Yen(it.amount)}</td></tr>`).join('')}
        ${v4EmptyRows(5 - d.items.length, 4)}
      </tbody>
    </table>`;
}
function docTotals(s) {
  return `
    <div class="flex justify-end mb-8">
      <table class="w-64 doc-table">
        <tr><td class="bg-gray-100 font-bold">小計</td><td class="text-right">${fmt.money(s.sub)}</td></tr>
        <tr><td class="bg-gray-100 font-bold">消費税（10%）</td><td class="text-right">${fmt.money(s.tax)}</td></tr>
        <tr><td class="bg-gray-100 font-black">合計</td><td class="text-right font-black">${fmt.money(s.total)}</td></tr>
      </table>
    </div>`;
}
const dnotePreview   = (d) => slipDoc(d, 'dnote');
const invoicePreview = (d) => slipDoc(d, 'invoice');

// 受注確認から「納品書を作成」で渡す受注ID
let V4_PENDING_ORDER = null;
function v4ItemsFromOrder(o) {
  const items = (o.items || []).map(it => {
    const p = calcItemPrice(it);
    return { name: it.title || o.title || fmt.paperText(it), qty: it.quantity || '', price: p.unit_price || '', amount: p.subtotal || '' };
  });
  return items.length ? items : [{ name: o.title || '', qty: '', price: '', amount: '' }];
}

// 受注一覧（Screens.orders）とまったく同じ体裁の一覧ファクトリ
function makeDocList(cfg) {
  return {
    filter: { q: '', area: '', kind: '' },
    page: 1,
    PAGE_SIZE: 50,
    render() {
      const all = DB.all(cfg.table).slice()
        .sort((a, b) => (b[cfg.dateField] || '').localeCompare(a[cfg.dateField] || ''));
      const f = this.filter;
      const filtered = all.filter(x => {
        if (f.q && !fmt.customer(x.customer_id).toLowerCase().includes(f.q.toLowerCase())) return false;
        if (f.area && v4Area(x.customer_id) !== f.area) return false;
        if (f.kind && v4Kind(x.customer_id) !== f.kind) return false;
        return true;
      });
      const totalPages = Math.max(1, Math.ceil(filtered.length / this.PAGE_SIZE));
      const page = Math.min(Math.max(1, this.page), totalPages);
      this.page = page;
      const pageList = filtered.slice((page - 1) * this.PAGE_SIZE, page * this.PAGE_SIZE);
      const cols = cfg.columns;
      return `
        <div class="flex justify-between items-center mb-4">
          <div>
            <h1 class="text-2xl font-black">${cfg.title}</h1>
            ${cfg.lead ? `<p class="text-xs text-ink-500">${cfg.lead}</p>` : ''}
          </div>
          <a href="#${cfg.editRoute}/new" class="bg-brand hover:bg-brand-dark text-white px-5 py-2 rounded font-bold shadow-sm">+ ${cfg.newLabel}</a>
        </div>
        <div class="bg-white p-4 rounded shadow-sm mb-4 grid grid-cols-6 gap-3 text-sm" id="filter-bar">
          <div class="col-span-2"><label class="block text-xs font-bold mb-1">顧客名検索</label><input id="f-q" class="w-full border rounded px-2 py-1.5" value="${esc(f.q)}" placeholder="例: タクシー, 高拡散"></div>
          <div><label class="block text-xs font-bold mb-1">種別</label>
            <select id="f-kind" class="w-full border rounded px-2 py-1.5">
              <option value="">すべて</option>
              ${CUSTOMER_KINDS.map(k => `<option ${f.kind === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}
            </select>
          </div>
          <div><label class="block text-xs font-bold mb-1">地域</label>
            <select id="f-area" class="w-full border rounded px-2 py-1.5">
              <option value="">すべて</option>
              ${AREAS.map(a => `<option ${f.area === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}
            </select>
          </div>
          <div class="flex items-end gap-2 col-span-6">
            <button id="btn-filter-clear" class="border px-3 py-1.5 rounded text-xs">クリア</button>
          </div>
        </div>

        <div class="bg-white rounded shadow-sm">
          <div class="flex justify-between items-center px-4 py-2 border-b">
            <span class="text-sm">結果 <span class="font-bold">${filtered.length}</span> / ${all.length} 件 <span class="text-ink-500 ml-2">(${filtered.length ? (page - 1) * this.PAGE_SIZE + 1 : 0}〜${Math.min(page * this.PAGE_SIZE, filtered.length)}件を表示)</span></span>
          </div>
          <table class="w-full text-sm">
            <thead class="bg-ink-700/5"><tr class="text-left">
              ${cols.map(c => `<th class="px-3 py-2${c.right ? ' text-right' : ''}">${c.label}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${filtered.length === 0 ? `<tr><td colspan="${cols.length}" class="text-center py-10 text-ink-500">該当なし</td></tr>` :
                pageList.map(x => `
                <tr class="border-t hover:bg-brand/5 cursor-pointer" onclick="location.hash='#${cfg.editRoute}/${x.id}'">
                  ${cols.map(c => `<td class="px-3 py-2${c.cls ? ' ' + c.cls : ''}">${c.get(x)}</td>`).join('')}
                </tr>`).join('')}
            </tbody>
          </table>
          ${totalPages > 1 ? `
          <div class="flex justify-center items-center gap-3 p-3 text-sm border-t">
            <button id="pg-prev" class="px-3 py-1 border rounded ${page <= 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-ink-700/5'}" ${page <= 1 ? 'disabled' : ''}>← 前</button>
            <span class="font-bold">ページ ${page} / ${totalPages}</span>
            <button id="pg-next" class="px-3 py-1 border rounded ${page >= totalPages ? 'opacity-40 cursor-not-allowed' : 'hover:bg-ink-700/5'}" ${page >= totalPages ? 'disabled' : ''}>次 →</button>
          </div>` : ''}
        </div>`;
    },
    bind() {
      const apply = () => {
        this.filter = { q: $('#f-q').value, area: $('#f-area')?.value || '', kind: $('#f-kind')?.value || '' };
        this.page = 1;
        App.render();
      };
      ['#f-q', '#f-area', '#f-kind'].forEach(sel => {
        const el = $(sel);
        el && el.addEventListener('input', debounce(apply, 300));
        el && el.addEventListener('change', apply);
      });
      $('#btn-filter-clear')?.addEventListener('click', () => { this.filter = { q: '', area: '', kind: '' }; this.page = 1; App.render(); });
      $('#pg-prev')?.addEventListener('click', () => { this.page = Math.max(1, this.page - 1); App.render(); });
      $('#pg-next')?.addEventListener('click', () => { this.page = this.page + 1; App.render(); });
    },
  };
}

Screens.delivery_notes = makeDocList({
  table: 'dnote_docs', dateField: 'delivery_date', editRoute: 'dn_edit',
  title: '納品書・請求書 一覧', newLabel: '納品書・請求書を作成',
  columns: [
    { label: '納品書番号', cls: 'font-mono text-xs', get: x => esc(x.number) },
    { label: '請求書番号', cls: 'font-mono text-xs', get: x => esc(x.invoice_number || '') },
    { label: '納品日', get: x => esc(fmt.dateW(x.delivery_date)) },
    { label: '顧客', get: x => esc(fmt.customer(x.customer_id)) },
    { label: '地域', cls: 'text-xs', get: x => esc(v4Area(x.customer_id)) },
    { label: '品名', cls: 'text-xs', get: x => `<div class="font-bold">${esc((x.items[0]?.name || '—') + (x.items.length > 1 ? ` ほか${x.items.length - 1}件` : ''))}</div>` },
    { label: '税抜小計', right: true, cls: 'text-right font-mono', get: x => fmt.money(v4Sums(x.items).sub) },
    { label: '消費税', right: true, cls: 'text-right font-mono text-ink-500', get: x => fmt.money(v4Sums(x.items).tax) },
    { label: '税込合計', right: true, cls: 'text-right font-mono font-bold', get: x => fmt.money(v4Sums(x.items).total) },
  ],
});

Screens.dn_edit = {
  draft: null, _id: null, mode: 'dnote',
  init(id) {
    this._id = id;
    const src = id !== 'new' ? DB.all('dnote_docs').find(x => x.id === id) : null;
    if (src) {
      this.draft = clone(src);
    } else {
      this.draft = { delivery_date: TODAY, customer_id: '', items: [{ name: '', qty: '', price: '', amount: '' }], order_id: null };
      // 受注確認の「納品書を作成」から来た場合は明細を引き継ぐ
      if (V4_PENDING_ORDER) {
        const o = DB.find('orders', V4_PENDING_ORDER);
        V4_PENDING_ORDER = null;
        if (o) {
          this.draft.customer_id = o.customer_id;
          this.draft.delivery_date = o.delivered_date || o.delivery_date_start || TODAY;
          this.draft.order_id = o.id;
          this.draft.items = v4ItemsFromOrder(o);
        }
      }
    }
    this.mode = 'dnote';
  },
  render(id = 'new') {
    if (this._id !== id || !this.draft) this.init(id);
    const d = this.draft;
    const isNew = id === 'new';
    const orderOpts = DB.all('orders')
      .sort((a, b) => (b.received_date || '').localeCompare(a.received_date || ''))
      .slice(0, 30)
      .map(o => `<option value="${o.id}" ${o.id === d.order_id ? 'selected' : ''}>${esc(o.order_number)}｜${esc(fmt.customer(o.customer_id))}｜${esc(o.title || '')}</option>`).join('');
    return `
      <div class="flex justify-between items-center mb-4">
        <div>
          <a href="#delivery_notes" class="text-ink-500 text-sm">← 一覧に戻る</a>
          <h1 class="text-2xl font-black">納品書・請求書 ${isNew ? '' : `<span class="font-mono">#${esc(d.number)}</span>`}</h1>
        </div>
        <div class="flex gap-2">
          <button id="f-print-dn" class="bg-ink-900 text-white px-4 py-2 rounded text-sm font-bold">納品書 PDF出力 (印刷)</button>
          <button id="f-print-iv" class="bg-ink-900 text-white px-4 py-2 rounded text-sm font-bold">請求書 PDF出力 (印刷)</button>
          ${isNew ? '' : '<button id="f-del" class="border border-red-500 text-red-500 px-4 py-2 rounded text-sm font-bold">削除</button>'}
          <button id="f-save" class="bg-brand text-white px-4 py-2 rounded text-sm font-bold">保存</button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white rounded shadow-sm p-4 text-sm space-y-3">
          <h3 class="font-bold text-sm">納品書・請求書 入力</h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2"><label class="block text-xs font-bold mb-1">受注票からの引用（任意）</label>
              <select id="f-quote" class="w-full border rounded px-2 py-1.5">
                <option value="">— 受注を選ぶと明細が自動で入ります —</option>${orderOpts}
              </select>
            </div>
            <div><label class="block text-xs font-bold mb-1"><span class="text-red-600">*</span>宛先</label>${v4CustSelect('f-cust', d.customer_id)}</div>
            <div><label class="block text-xs font-bold mb-1">納品日 / 請求日</label><input type="date" id="f-date" class="w-full border rounded px-2 py-1.5" value="${esc(d.delivery_date || '')}"></div>
          </div>

          <div class="border-t pt-3">
            <h4 class="font-bold mb-2">明細（<span class="text-brand">${d.items.length}件</span>）</h4>
            <p class="text-xs text-ink-500 mb-2">金額は手入力です。数量・単価が空欄の行は帳票でも空欄になります。</p>
            ${v4ItemsEditor(d.items)}
          </div>
        </div>
        <div class="bg-white rounded shadow-sm p-4" id="print-target">
          <div class="flex items-center justify-between mb-2 no-print">
            <div class="text-xs font-bold text-ink-500">PDFプレビュー</div>
            <div class="flex gap-1">
              <button data-mode="dnote" class="px-3 py-1 rounded text-xs font-bold ${this.mode === 'dnote' ? 'bg-ink-900 text-white' : 'bg-ink-700/10 text-ink-500'}">納品書</button>
              <button data-mode="invoice" class="px-3 py-1 rounded text-xs font-bold ${this.mode === 'invoice' ? 'bg-ink-900 text-white' : 'bg-ink-700/10 text-ink-500'}">請求書</button>
            </div>
          </div>
          <div id="doc-preview">${this.mode === 'dnote' ? dnotePreview(d) : invoicePreview(d)}</div>
        </div>
      </div>`;
  },
  bind(id = 'new') {
    const d = this.draft;
    const refresh = () => { $('#doc-preview').innerHTML = this.mode === 'dnote' ? dnotePreview(d) : invoicePreview(d); };
    $$('[data-mode]').forEach(b => b.addEventListener('click', () => { this.mode = b.dataset.mode; App.render(); }));
    $('#f-date')?.addEventListener('change', e => { d.delivery_date = e.target.value; refresh(); });
    $('#f-cust')?.addEventListener('change', e => { d.customer_id = e.target.value; refresh(); });
    v4BindItemsEditor(d, refresh);
    $('#f-quote')?.addEventListener('change', (e) => {
      const o = DB.find('orders', e.target.value);
      if (!o) return;
      d.customer_id = o.customer_id;
      d.delivery_date = o.delivered_date || o.delivery_date_start || TODAY;
      d.order_id = o.id;
      d.items = v4ItemsFromOrder(o);
      App.render();
    });
    const printAs = (mode) => {
      if (this.mode !== mode) { this.mode = mode; App.render(); }
      setTimeout(() => window.print(), 60);
    };
    $('#f-print-dn')?.addEventListener('click', () => printAs('dnote'));
    $('#f-print-iv')?.addEventListener('click', () => printAs('invoice'));
    $('#f-save')?.addEventListener('click', () => {
      if (!d.customer_id) { toast('顧客を選択してください', 'err'); return; }
      if (id === 'new') {
        d.id = DB.nextId('dn');
        d.number = v4Number('D-', 'dnote_docs', 'number');
        d.invoice_number = v4Number('I-', 'dnote_docs', 'invoice_number'); // 請求書を同時生成
        DB.data.dnote_docs.push(d);
      } else {
        const x = DB.all('dnote_docs').find(v => v.id === id);
        if (!d.invoice_number) d.invoice_number = v4Number('I-', 'dnote_docs', 'invoice_number');
        Object.assign(x, d);
      }
      DB.save();
      this.draft = null; this._id = null;
      toast('納品書と請求書を保存しました', 'ok');
      location.hash = '#delivery_notes';
    });
    $('#f-del')?.addEventListener('click', () => {
      if (!confirm('この納品書・請求書を削除しますか？')) return;
      DB.data.dnote_docs = DB.data.dnote_docs.filter(x => x.id !== id);
      DB.save();
      this.draft = null; this._id = null;
      toast('削除しました', 'ok');
      location.hash = '#delivery_notes';
    });
  },
};

/* =====================================================================
 * 3. 領収書
 * ===================================================================== */
// 領収書：実物の複写伝票に合わせたレイアウト（地紋つき）
function receiptPreview(d) {
  const st = DB.data.settings;
  const cust = fmt.customer(d.customer_id);
  const total = +d.amount || 0;
  const sub = Math.round(total / 1.1);
  const tax = total - sub;
  return `
  <div class="rc-doc print-doc mx-auto v4-guilloche">
    <div class="rc-inner">
      <div class="rc-title">領収書</div>
      <div class="rc-date">${v4Wareki(d.issue_date)}</div>
      <div class="rc-addr">
        <span class="nm">${esc(cust === '—' ? '' : cust)}</span>
        <span class="sama">様</span>
      </div>
      <div class="rc-lead">上記の金額正に領収致しました。</div>
      <div class="rc-amount">
        <div class="lbl">金額</div>
        <div class="val">${fmt.money(total)}</div>
      </div>
      <div class="rc-tadashi">但し　<span class="txt">${esc(d.tadashi || '')}</span></div>
      <div class="rc-foot">
        <table class="rc-bd">
          <tr><th>現金</th><td>${v4Yen(d.cash)}</td></tr>
          <tr><th>小切手</th><td>${v4Yen(d.check)}</td></tr>
          <tr><th></th><td></td></tr>
          <tr><th>適用税率10％対象</th><td>${fmt.money(sub)}</td></tr>
          <tr><th>消費税</th><td>${fmt.money(tax)}</td></tr>
        </table>
        <div class="rc-corp">
          <img class="corp-img" src="assets/corp_block.png" alt="有限会社 渡辺謄写堂">
        </div>
      </div>
    </div>
  </div>`;
}

Screens.receipts = makeDocList({
  table: 'receipt_docs', dateField: 'issue_date', editRoute: 'rc_edit',
  title: '領収書一覧', newLabel: '領収書を作成',
  columns: [
    { label: '領収書番号', cls: 'font-mono text-xs', get: x => esc(x.number) },
    { label: '発行日', get: x => esc(fmt.dateW(x.issue_date)) },
    { label: '顧客', get: x => esc(fmt.customer(x.customer_id)) },
    { label: '地域', cls: 'text-xs', get: x => esc(v4Area(x.customer_id)) },
    { label: '但し書き', cls: 'text-xs', get: x => `<div class="font-bold">${esc(x.tadashi || '—')}</div>` },
    { label: '税抜小計', right: true, cls: 'text-right font-mono', get: x => fmt.money(Math.round((+x.amount || 0) / 1.1)) },
    { label: '消費税', right: true, cls: 'text-right font-mono text-ink-500', get: x => fmt.money((+x.amount || 0) - Math.round((+x.amount || 0) / 1.1)) },
    { label: '税込合計', right: true, cls: 'text-right font-mono font-bold', get: x => fmt.money(x.amount) },
  ],
});

Screens.rc_edit = {
  draft: null, _id: null,
  init(id) {
    this._id = id;
    const src = id !== 'new' ? DB.all('receipt_docs').find(x => x.id === id) : null;
    this.draft = src ? clone(src)
      : { issue_date: TODAY, customer_id: '', amount: '', cash: '', check: '', tadashi: '印刷代として', source_id: null };
  },
  render(id = 'new') {
    if (this._id !== id || !this.draft) this.init(id);
    const d = this.draft;
    const isNew = id === 'new';
    const opts = DB.all('dnote_docs')
      .sort((a, b) => (b.issue_date || '').localeCompare(a.issue_date || ''))
      .slice(0, 20)
      .map(v => `<option value="${v.id}" ${v.id === d.source_id ? 'selected' : ''}>${esc(v.invoice_number || v.number)}｜${esc(fmt.customer(v.customer_id))}｜${fmt.money(v4Sums(v.items).total)}</option>`).join('');
    return `
      <div class="flex justify-between items-center mb-4">
        <div>
          <a href="#receipts" class="text-ink-500 text-sm">← 一覧に戻る</a>
          <h1 class="text-2xl font-black">領収書 ${isNew ? '' : `<span class="font-mono">#${esc(d.number)}</span>`}</h1>
        </div>
        <div class="flex gap-2">
          <button id="f-print" class="bg-ink-900 text-white px-4 py-2 rounded text-sm font-bold">PDF出力 (印刷)</button>
          ${isNew ? '' : '<button id="f-del" class="border border-red-500 text-red-500 px-4 py-2 rounded text-sm font-bold">削除</button>'}
          <button id="f-save" class="bg-brand text-white px-4 py-2 rounded text-sm font-bold">保存</button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white rounded shadow-sm p-4 text-sm space-y-3">
          <h3 class="font-bold text-sm">領収書入力</h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="col-span-2"><label class="block text-xs font-bold mb-1">請求書からの作成（任意）</label>
              <select id="f-quote" class="w-full border rounded px-2 py-1.5">
                <option value="">— 請求書を選ぶと金額・宛名が自動で入ります —</option>${opts}
              </select>
            </div>
            <div><label class="block text-xs font-bold mb-1"><span class="text-red-600">*</span>宛先</label>${v4CustSelect('f-cust', d.customer_id)}</div>
            <div><label class="block text-xs font-bold mb-1">発行日</label><input type="date" id="f-date" class="w-full border rounded px-2 py-1.5" value="${esc(d.issue_date || '')}"></div>
            <div><label class="block text-xs font-bold mb-1">金額（税込）</label><input type="number" id="f-amount" class="w-full border rounded px-2 py-1.5 text-right font-bold" value="${d.amount ?? ''}"></div>
            <div><label class="block text-xs font-bold mb-1">但し書き</label><input id="f-tadashi" class="w-full border rounded px-2 py-1.5" value="${esc(d.tadashi || '')}"></div>
            <div><label class="block text-xs font-bold mb-1">内訳：現金</label><input type="number" id="f-cash" class="w-full border rounded px-2 py-1.5 text-right" value="${d.cash ?? ''}"></div>
            <div><label class="block text-xs font-bold mb-1">内訳：小切手</label><input type="number" id="f-check" class="w-full border rounded px-2 py-1.5 text-right" value="${d.check ?? ''}"></div>
          </div>
        </div>
        <div class="bg-white rounded shadow-sm p-4" id="print-target">
          <div class="text-xs font-bold text-ink-500 mb-2 no-print">PDFプレビュー</div>
          <div id="doc-preview">${receiptPreview(d)}</div>
        </div>
      </div>`;
  },
  bind(id = 'new') {
    const d = this.draft;
    const refresh = () => { $('#doc-preview').innerHTML = receiptPreview(d); };
    $('#f-quote')?.addEventListener('change', (e) => {
      const v = DB.all('dnote_docs').find(x => x.id === e.target.value);
      if (!v) return;
      d.customer_id = v.customer_id;
      d.amount = v4Sums(v.items).total;
      d.cash = d.amount;
      d.source_id = v.id;
      App.render();
    });
    $('#f-date')?.addEventListener('change', e => { d.issue_date = e.target.value; refresh(); });
    $('#f-cust')?.addEventListener('change', e => { d.customer_id = e.target.value; refresh(); });
    $('#f-amount')?.addEventListener('input', e => { d.amount = e.target.value === '' ? '' : +e.target.value; refresh(); });
    $('#f-tadashi')?.addEventListener('input', e => { d.tadashi = e.target.value; refresh(); });
    $('#f-cash')?.addEventListener('input', e => { d.cash = e.target.value === '' ? '' : +e.target.value; refresh(); });
    $('#f-check')?.addEventListener('input', e => { d.check = e.target.value === '' ? '' : +e.target.value; refresh(); });
    $('#f-print')?.addEventListener('click', () => window.print());
    $('#f-save')?.addEventListener('click', () => {
      if (!d.customer_id) { toast('顧客を選択してください', 'err'); return; }
      if (id === 'new') {
        d.id = DB.nextId('rp');
        d.number = v4Number('R-', 'receipt_docs');
        DB.data.receipt_docs.push(d);
      } else {
        Object.assign(DB.all('receipt_docs').find(x => x.id === id), d);
      }
      DB.save();
      this.draft = null; this._id = null;
      toast('領収書を保存しました', 'ok');
      location.hash = '#receipts';
    });
    $('#f-del')?.addEventListener('click', () => {
      if (!confirm('この領収書を削除しますか？')) return;
      DB.data.receipt_docs = DB.data.receipt_docs.filter(x => x.id !== id);
      DB.save();
      this.draft = null; this._id = null;
      toast('削除しました', 'ok');
      location.hash = '#receipts';
    });
  },
};

/* =====================================================================
 * 4. v3側へのつなぎ
 * ===================================================================== */
// 納品日の自動記録＋帳簿への自動記帳（受注確認・工場カンバンの両方が通る経路）
(function hookDelivered() {
  const orig = DB.updateOrder.bind(DB);
  DB.updateOrder = function (id, patch, logMsg) {
    const r = orig(id, patch, logMsg);
    if (!r) return r;
    if (r.status === '納品済み') {
      if (!r.delivered_date) r.delivered_date = TODAY;
      v4LedgerAdd(r);
      DB.save();
    } else if (r.delivered_date) {
      // 納品済みから外したら納品日を削除し、自動記帳した行も取り消す
      r.delivered_date = null;
      v4LedgerRemove(r.id);
      DB.save();
    }
    return r;
  };
})();

// 受注確認画面に「納品書を作成」ボタンを差し込む（app.js は無改変）
(function hookOrderView() {
  const origRender = App.render.bind(App);
  App.render = function (...args) {
    origRender(...args);
    // 受注確認（#order/<id>）の操作ボタン列に差し込む
    const orderId = Router.params?.[0];
    if (!orderId || orderId === 'new' || !DB.find('orders', orderId)) return;
    const anchor = document.querySelector('#btn-quote');
    if (!anchor || document.querySelector('#btn-make-dnote')) return;
    const b = document.createElement('button');
    b.id = 'btn-make-dnote';
    b.className = anchor.className;
    b.textContent = '納品書を作成';
    anchor.parentNode.insertBefore(b, anchor.nextSibling);
    b.addEventListener('click', () => {
      V4_PENDING_ORDER = orderId;
      Screens.dn_edit.draft = null;
      Screens.dn_edit._id = null;
      location.hash = '#dn_edit/new';
    });
  };
})();

/* リセット時もv4テーブルを再シード */
(function hookReset() {
  const orig = DB.reset.bind(DB);
  DB.reset = function () { orig(); delete DB.data._v4_4_seeded; ensureV4(); };
})();

// ========= 初期化 =========
ensureV4();
App.render();
