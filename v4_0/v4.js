/* =====================================================================
 * 渡辺謄写堂 業務管理システム v4.0 追加モジュール
 * 帳簿 / 納品書 / 請求書 / 領収書 / 時系列記録表（日報型）
 * ---------------------------------------------------------------------
 * app.js (v3) の後に読み込む追加ファイル。v3本体は無改変（DBキーのみ分離）。
 * 各帳票は「手入力＋受注等からの引用」で作成する（機能一覧 2026-08-04 版）。
 * ===================================================================== */

// ========= データ移行・シード =========
function ensureV4() {
  const d = DB.data;
  let changed = false;
  ['ledger_entries', 'dnote_docs', 'invoice_docs', 'receipt_docs', 'daily_logs'].forEach(t => {
    if (!d[t]) { d[t] = []; changed = true; }
  });

  if (!d._v4_1_seeded) {
    d.ledger_entries.push(
      { id: 'le1', entry_date: '2026-05-10', customer_id: 'c5', item_name: '名刺 500枚',           quantity: 500,  amount: 4620,  memo: '', order_id: 'o_260508-005' },
      { id: 'le2', entry_date: '2026-05-09', customer_id: 'c1', item_name: '営業案内 500枚',       quantity: 500,  amount: 22000, memo: '', order_id: 'o_260506-002' },
      { id: 'le3', entry_date: '2026-05-06', customer_id: 'c8', item_name: '市報お知らせ折り込み', quantity: 2000, amount: 88000, memo: '3つ折加工', order_id: 'o_260501-001' },
      { id: 'le4', entry_date: '2026-05-06', customer_id: 'c2', item_name: '車両配布チラシ',       quantity: 1000, amount: 11000, memo: '', order_id: 'o_260503-001' },
      { id: 'le5', entry_date: '2026-05-05', customer_id: 'c6', item_name: '建築案内',             quantity: 500,  amount: 9900,  memo: '', order_id: 'o_260502-004' },
      { id: 'le6', entry_date: '2026-04-28', customer_id: 'c10', item_name: 'メニュー差替',        quantity: 500,  amount: 16500, memo: '現金', order_id: 'o_260423-006' },
    );
    d.dnote_docs.push(
      { id: 'dn1', number: 'D-260510-01', customer_id: 'c5', delivery_date: '2026-05-10',
        items: [{ name: '名刺 フミス200kg 4C×4C', qty: 500, price: 8 }], order_id: 'o_260508-005' },
      { id: 'dn2', number: 'D-260509-01', customer_id: 'c1', delivery_date: '2026-05-09',
        items: [{ name: '営業案内 A4 コート135kg 4C×4C', qty: 500, price: 40 }], order_id: 'o_260506-002' },
      { id: 'dn3', number: 'D-260506-01', customer_id: 'c8', delivery_date: '2026-05-06',
        items: [{ name: '市報折込 A4 3つ折 4C×4C', qty: 2000, price: 40 }], order_id: 'o_260501-001' },
    );
    d.invoice_docs.push(
      { id: 'iv1', number: 'I-260512-01', customer_id: 'c1', issue_date: '2026-05-12', paid: false,
        items: [{ date: '2026-05-09', name: '営業案内 A4 コート135kg 4C×4C', qty: 500, price: 40 }], source_note_ids: ['dn2'] },
      { id: 'iv2', number: 'I-260507-01', customer_id: 'c8', issue_date: '2026-05-07', paid: true,
        items: [{ date: '2026-05-06', name: '市報折込 A4 3つ折 4C×4C', qty: 2000, price: 40 }], source_note_ids: ['dn3'] },
    );
    d.receipt_docs.push(
      { id: 'rp1', number: 'R-260514-01', customer_id: 'c8', issue_date: '2026-05-14',
        items: [{ name: '市報折込 印刷代', qty: 1, price: 80000 }], tadashi: '印刷代として', invoice_id: 'iv2' },
    );
    d.daily_logs.push(
      { date: '2026-05-15', tasks: [
          { t: '高拡散様 名刺500枚 印刷・納品', done: false },
          { t: '昭和タクシー様 ポスター 校正戻し確認', done: false },
          { t: '足立高校様 見積送付', done: true },
        ], note: '' },
      { date: '2026-05-14', tasks: [
          { t: '佐々木畳店様 チラシ納品', done: true },
          { t: '院内掲示物 完成連絡', done: true },
        ], note: '畳店様より次回もお願いしたいとのこと。' },
    );
    d._v4_1_seeded = true;
    changed = true;
  }
  if (changed) DB.save();
}

// ========= 共通ヘルパー =========
function v4Kind(cid) { return DB.find('customers', cid)?.kind || ''; }
function v4Sums(items) {
  const sub = (items || []).reduce((s, it) => s + (+it.qty || 0) * (+it.price || 0), 0);
  const tax = Math.floor(sub * 0.1);
  return { sub, tax, total: sub + tax };
}
function v4Number(prefix, table) {
  const p = prefix + TODAY.slice(2).replace(/-/g, '');
  const n = DB.all(table).filter(x => (x.number || '').startsWith(p)).length + 1;
  return `${p}-${String(n).padStart(2, '0')}`;
}
function v4CompanyBlock() {
  const s = DB.data.settings;
  return `<div class="text-right text-xs leading-5">
    <div class="font-black text-base">${esc(s.company_name)}</div>
    <div>${esc(s.company_postal)} ${esc(s.company_address)}</div>
    <div>TEL ${esc(s.company_phone)}　FAX ${esc(s.company_fax)}</div>
    <div>登録番号: ${esc(s.invoice_number)}</div>
  </div>`;
}
function v4CustSelect(id, selected) {
  const opts = DB.all('customers').map(c =>
    `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.company_name || c.individual_name)}</option>`).join('');
  return `<select id="${id}" class="border rounded px-3 py-2 w-full bg-white"><option value="">— 顧客を選択 —</option>${opts}</select>`;
}
// 一覧の検索バー（顧客名検索＋種別検索）
function v4SearchBar(state, extra = '') {
  return `
  <div class="flex items-center gap-2 mb-3 flex-wrap text-sm">
    <input id="v4-q" value="${esc(state.q || '')}" placeholder="顧客名で検索" class="border rounded px-3 py-1.5 w-56 bg-white">
    <select id="v4-kind" class="border rounded px-3 py-1.5 bg-white">
      <option value="">種別: すべて</option>
      ${CUSTOMER_KINDS.map(k => `<option value="${k}" ${state.kind === k ? 'selected' : ''}>${k}</option>`).join('')}
    </select>
    ${extra}
  </div>`;
}
function v4BindSearch(state) {
  const q = $('#v4-q');
  q?.addEventListener('input', debounce(() => { state.q = q.value; App.render(); }, 300));
  $('#v4-kind')?.addEventListener('change', (e) => { state.kind = e.target.value; App.render(); });
}
function v4Match(state, cid) {
  const name = fmt.customer(cid);
  if (state.q && !name.includes(state.q.trim())) return false;
  if (state.kind && v4Kind(cid) !== state.kind) return false;
  return true;
}
// 明細エディタ（品名・数量・単価・金額）
function v4ItemsEditor(items, withDate) {
  return `
  <table class="w-full text-sm border">
    <thead class="bg-gray-100 text-xs text-ink-500">
      <tr>${withDate ? '<th class="p-1.5 w-28">納品日</th>' : ''}<th class="p-1.5 text-left">品名</th><th class="p-1.5 w-16">数量</th><th class="p-1.5 w-20">単価</th><th class="p-1.5 w-24 text-right">金額</th><th class="p-1.5 w-8"></th></tr>
    </thead>
    <tbody>
      ${items.map((it, i) => `
      <tr class="border-t">
        ${withDate ? `<td class="p-1"><input type="date" data-it="${i}" data-k="date" value="${esc(it.date || '')}" class="it-in border rounded px-1 py-1 w-full text-xs"></td>` : ''}
        <td class="p-1"><input data-it="${i}" data-k="name" value="${esc(it.name || '')}" class="it-in border rounded px-2 py-1 w-full"></td>
        <td class="p-1"><input type="number" data-it="${i}" data-k="qty" value="${it.qty ?? ''}" class="it-in border rounded px-1 py-1 w-full text-right"></td>
        <td class="p-1"><input type="number" data-it="${i}" data-k="price" value="${it.price ?? ''}" class="it-in border rounded px-1 py-1 w-full text-right"></td>
        <td class="p-1 text-right font-bold" id="it-amt-${i}">${fmt.money((+it.qty || 0) * (+it.price || 0))}</td>
        <td class="p-1 text-center"><button data-del-it="${i}" class="text-red-500 font-bold px-1">×</button></td>
      </tr>`).join('')}
    </tbody>
  </table>
  <button id="add-it" class="mt-2 text-sm font-bold text-brand-dark border border-brand rounded px-3 py-1 hover:bg-brand-light">＋ 明細を追加</button>`;
}
function v4BindItemsEditor(draft, refreshPreview) {
  $$('.it-in').forEach(inp => inp.addEventListener('input', () => {
    const i = +inp.dataset.it, k = inp.dataset.k;
    draft.items[i][k] = (k === 'qty' || k === 'price') ? +inp.value : inp.value;
    const it = draft.items[i];
    const amt = $('#it-amt-' + i);
    if (amt) amt.textContent = fmt.money((+it.qty || 0) * (+it.price || 0));
    refreshPreview();
  }));
  $$('[data-del-it]').forEach(b => b.addEventListener('click', () => { draft.items.splice(+b.dataset.delIt, 1); App.render(); }));
  $('#add-it')?.addEventListener('click', () => { draft.items.push({ name: '', qty: 0, price: 0 }); App.render(); });
}
function v4EmptyRows(n, cols) {
  return Array.from({ length: Math.max(0, n) }).map(() => `<tr>${'<td>&nbsp;</td>'.repeat(cols)}</tr>`).join('');
}

/* =====================================================================
 * 1. 帳簿
 * ===================================================================== */
Screens.ledger = {
  q: '', kind: '', month: '2026-05',
  render() {
    const months = [...new Set(DB.all('ledger_entries').map(e => e.entry_date.slice(0, 7)))].sort().reverse();
    if (!months.includes(this.month) && months.length) this.month = months[0];
    const rows = DB.all('ledger_entries')
      .filter(e => e.entry_date.slice(0, 7) === this.month && v4Match(this, e.customer_id))
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date));
    const sum = rows.reduce((s, e) => s + (+e.amount || 0), 0);
    return `
    <div class="flex items-center justify-between mb-1 flex-wrap gap-2">
      <h1 class="text-2xl font-black">帳簿一覧</h1>
      <a href="#ledger_edit/new" class="bg-brand text-white font-bold px-4 py-2 rounded shadow hover:bg-brand-dark">＋ 帳簿に記入</a>
    </div>
    <p class="text-sm text-ink-500 mb-4">行をクリックで編集。</p>
    ${v4SearchBar(this, `
      <select id="ledger-month" class="border rounded px-3 py-1.5 bg-white font-bold">
        ${months.map(m => `<option value="${m}" ${m === this.month ? 'selected' : ''}>${m.replace('-', '年')}月</option>`).join('')}
      </select>`)}
    <div class="bg-white rounded shadow-sm border overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-ink-900 text-white text-xs">
          <tr><th class="px-3 py-2 text-left">記入日</th><th class="px-3 py-2 text-left">顧客</th><th class="px-3 py-2 text-left">種別</th><th class="px-3 py-2 text-left">品目</th><th class="px-3 py-2 text-right">数量</th><th class="px-3 py-2 text-right">金額（税込）</th><th class="px-3 py-2 text-left">メモ</th></tr>
        </thead>
        <tbody>
          ${rows.length === 0 ? '<tr><td colspan="7" class="px-3 py-10 text-center text-ink-300">記入がありません</td></tr>' : rows.map(e => `
          <tr class="border-b cursor-pointer hover:bg-brand-light/40" onclick="location.hash='#ledger_edit/${e.id}'">
            <td class="px-3 py-2 whitespace-nowrap">${fmt.dateW(e.entry_date)}</td>
            <td class="px-3 py-2 font-bold whitespace-nowrap">${esc(fmt.customer(e.customer_id))}</td>
            <td class="px-3 py-2 text-xs text-ink-500 whitespace-nowrap">${esc(v4Kind(e.customer_id))}</td>
            <td class="px-3 py-2">${esc(e.item_name)}</td>
            <td class="px-3 py-2 text-right">${(+e.quantity || 0).toLocaleString()}</td>
            <td class="px-3 py-2 text-right font-bold">${fmt.money(e.amount)}</td>
            <td class="px-3 py-2 text-xs text-ink-500">${esc(e.memo || '')}</td>
          </tr>`).join('')}
        </tbody>
        ${rows.length ? `<tfoot class="bg-gray-50 font-black"><tr><td colspan="5" class="px-3 py-2 text-right">月計（${rows.length}件）</td><td class="px-3 py-2 text-right">${fmt.money(sum)}</td><td></td></tr></tfoot>` : ''}
      </table>
    </div>`;
  },
  bind() {
    v4BindSearch(this);
    $('#ledger-month')?.addEventListener('change', (e) => { this.month = e.target.value; App.render(); });
  },
};

Screens.ledger_edit = {
  draft: null, _id: null,
  init(id) {
    this._id = id;
    const src = id !== 'new' ? DB.all('ledger_entries').find(e => e.id === id) : null;
    this.draft = src ? clone(src) : { entry_date: TODAY, customer_id: '', item_name: '', quantity: 0, amount: 0, memo: '', order_id: null };
  },
  render(id = 'new') {
    if (this._id !== id || !this.draft) this.init(id);
    const d = this.draft;
    const isNew = id === 'new';
    const orderOpts = DB.all('orders')
      .filter(o => o.status === '納品済み')
      .sort((a, b) => (b.delivered_date || b.received_date).localeCompare(a.delivered_date || a.received_date))
      .slice(0, 30)
      .map(o => `<option value="${o.id}">${esc(o.order_number)}｜${esc(fmt.customer(o.customer_id))}｜${esc(o.title || '')}｜${fmt.money(o.total_amount)}</option>`).join('');
    return `
    <h1 class="text-2xl font-black mb-4">帳簿${isNew ? '記入' : '編集'}</h1>
    <div class="max-w-xl bg-white rounded shadow-sm border p-5">
      <div class="mb-4 pb-4 border-b">
        <div class="text-xs font-bold text-ink-500 mb-1">受注からの引用（任意）</div>
        <select id="f-quote" class="border rounded px-3 py-2 w-full bg-white text-sm">
          <option value="">— 納品済みの受注を選ぶと自動で入ります —</option>${orderOpts}
        </select>
      </div>
      <div class="grid gap-3">
        <label><div class="text-xs font-bold text-ink-500 mb-1">記入日</div>
          <input type="date" id="f-date" value="${esc(d.entry_date)}" class="border rounded px-3 py-2 w-full"></label>
        <label><div class="text-xs font-bold text-ink-500 mb-1">顧客</div>${v4CustSelect('f-cust', d.customer_id)}</label>
        <label><div class="text-xs font-bold text-ink-500 mb-1">品目</div>
          <input id="f-item" value="${esc(d.item_name)}" class="border rounded px-3 py-2 w-full"></label>
        <div class="grid grid-cols-2 gap-3">
          <label><div class="text-xs font-bold text-ink-500 mb-1">数量</div>
            <input type="number" id="f-qty" value="${d.quantity || ''}" class="border rounded px-3 py-2 w-full text-right"></label>
          <label><div class="text-xs font-bold text-ink-500 mb-1">金額（税込）</div>
            <input type="number" id="f-amount" value="${d.amount || ''}" class="border rounded px-3 py-2 w-full text-right"></label>
        </div>
        <label><div class="text-xs font-bold text-ink-500 mb-1">メモ</div>
          <input id="f-memo" value="${esc(d.memo || '')}" class="border rounded px-3 py-2 w-full"></label>
      </div>
      <div class="flex gap-2 mt-5">
        <button id="f-save" class="bg-brand text-white font-bold px-5 py-2 rounded shadow hover:bg-brand-dark">保存</button>
        <a href="#ledger" class="border rounded px-4 py-2 font-bold text-ink-500">キャンセル</a>
        ${isNew ? '' : '<button id="f-del" class="ml-auto text-red-500 font-bold px-3 py-2 border border-red-300 rounded">削除</button>'}
      </div>
    </div>`;
  },
  bind(id = 'new') {
    const d = this.draft;
    $('#f-quote')?.addEventListener('change', (e) => {
      const o = DB.find('orders', e.target.value);
      if (!o) return;
      d.entry_date = o.delivered_date || o.delivery_date_start || TODAY;
      d.customer_id = o.customer_id;
      d.item_name = o.title || '';
      d.quantity = (o.items || [])[0]?.quantity || 0;
      d.amount = o.total_amount || 0;
      d.order_id = o.id;
      App.render();
    });
    $('#f-date')?.addEventListener('change', e => d.entry_date = e.target.value);
    $('#f-cust')?.addEventListener('change', e => d.customer_id = e.target.value);
    $('#f-item')?.addEventListener('input', e => d.item_name = e.target.value);
    $('#f-qty')?.addEventListener('input', e => d.quantity = +e.target.value);
    $('#f-amount')?.addEventListener('input', e => d.amount = +e.target.value);
    $('#f-memo')?.addEventListener('input', e => d.memo = e.target.value);
    $('#f-save')?.addEventListener('click', () => {
      if (!d.customer_id) { toast('顧客を選択してください', 'err'); return; }
      if (id === 'new') {
        d.id = DB.nextId('le');
        DB.data.ledger_entries.push(d);
      } else {
        Object.assign(DB.all('ledger_entries').find(e => e.id === id), d);
      }
      DB.save();
      this.draft = null; this._id = null;
      toast('帳簿に保存しました', 'ok');
      location.hash = '#ledger';
    });
    $('#f-del')?.addEventListener('click', () => {
      if (!confirm('この記入を削除しますか？')) return;
      DB.data.ledger_entries = DB.data.ledger_entries.filter(e => e.id !== id);
      DB.save();
      this.draft = null; this._id = null;
      toast('削除しました', 'ok');
      location.hash = '#ledger';
    });
  },
};

/* =====================================================================
 * 帳票（納品書・請求書・領収書）共通の一覧・編集ファクトリ
 * ===================================================================== */
function makeDocList(cfg) {
  return {
    q: '', kind: '',
    render() {
      const docs = DB.all(cfg.table)
        .filter(x => v4Match(this, x.customer_id))
        .sort((a, b) => (b[cfg.dateField] || '').localeCompare(a[cfg.dateField] || ''));
      return `
      <div class="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h1 class="text-2xl font-black">${cfg.title}一覧</h1>
        <a href="#${cfg.editRoute}/new" class="bg-brand text-white font-bold px-4 py-2 rounded shadow hover:bg-brand-dark">＋ ${cfg.title}を作成</a>
      </div>
      <p class="text-sm text-ink-500 mb-4">行をクリックで編集・印刷。</p>
      ${v4SearchBar(this)}
      <div class="bg-white rounded shadow-sm border overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-ink-900 text-white text-xs">
            <tr><th class="px-3 py-2 text-left">No</th><th class="px-3 py-2 text-left">${cfg.dateLabel}</th><th class="px-3 py-2 text-left">顧客</th><th class="px-3 py-2 text-left">種別</th><th class="px-3 py-2 text-left">品名</th><th class="px-3 py-2 text-right">合計（税込）</th>${cfg.paidCol ? '<th class="px-3 py-2 text-center">入金</th>' : ''}</tr>
          </thead>
          <tbody>
            ${docs.length === 0 ? `<tr><td colspan="7" class="px-3 py-10 text-center text-ink-300">${cfg.title}はまだありません</td></tr>` : docs.map(x => `
            <tr class="border-b cursor-pointer hover:bg-brand-light/40" onclick="location.hash='#${cfg.editRoute}/${x.id}'">
              <td class="px-3 py-2 font-mono text-xs whitespace-nowrap">${esc(x.number)}</td>
              <td class="px-3 py-2 whitespace-nowrap">${fmt.dateW(x[cfg.dateField])}</td>
              <td class="px-3 py-2 font-bold whitespace-nowrap">${esc(fmt.customer(x.customer_id))}</td>
              <td class="px-3 py-2 text-xs text-ink-500 whitespace-nowrap">${esc(v4Kind(x.customer_id))}</td>
              <td class="px-3 py-2">${esc((x.items[0]?.name || '') + (x.items.length > 1 ? ` ほか${x.items.length - 1}件` : ''))}</td>
              <td class="px-3 py-2 text-right font-bold">${fmt.money(v4Sums(x.items).total)}</td>
              ${cfg.paidCol ? `
              <td class="px-3 py-2 text-center" onclick="event.stopPropagation()">
                <label class="cursor-pointer font-bold text-xs ${x.paid ? 'text-ok-dark' : 'text-red-500'}">
                  <input type="checkbox" data-paid="${x.id}" ${x.paid ? 'checked' : ''}> ${x.paid ? '入金済' : '未入金'}
                </label>
              </td>` : ''}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    },
    bind() {
      v4BindSearch(this);
      $$('[data-paid]').forEach(cb => cb.addEventListener('change', () => {
        const x = DB.all(cfg.table).find(v => v.id === cb.dataset.paid);
        x.paid = cb.checked;
        DB.save();
        toast(cb.checked ? '入金済にしました' : '未入金に戻しました', 'ok');
        App.render();
      }));
    },
  };
}

function makeDocEdit(cfg) {
  return {
    draft: null, _id: null,
    init(id) {
      this._id = id;
      const src = id !== 'new' ? DB.all(cfg.table).find(x => x.id === id) : null;
      this.draft = src ? clone(src) : cfg.empty();
    },
    render(id = 'new') {
      if (this._id !== id || !this.draft) this.init(id);
      const d = this.draft;
      const isNew = id === 'new';
      return `
      <h1 class="text-2xl font-black mb-4">${cfg.title}${isNew ? '作成' : '編集'} ${isNew ? '' : `<span class="font-mono text-sm text-ink-500">${esc(d.number)}</span>`}</h1>
      <div class="grid lg:grid-cols-[440px_1fr] gap-5 items-start">
        <div class="bg-white rounded shadow-sm border p-5">
          ${cfg.quoteUi(d)}
          <div class="grid gap-3 mb-4">
            <label><div class="text-xs font-bold text-ink-500 mb-1">${cfg.dateLabel}</div>
              <input type="date" id="f-date" value="${esc(d[cfg.dateField])}" class="border rounded px-3 py-2 w-full"></label>
            <label><div class="text-xs font-bold text-ink-500 mb-1">顧客名</div>${v4CustSelect('f-cust', d.customer_id)}</label>
            ${cfg.extraFields ? cfg.extraFields(d) : ''}
          </div>
          <div class="text-xs font-bold text-ink-500 mb-1">明細</div>
          ${v4ItemsEditor(d.items, cfg.itemDate)}
          <div class="flex gap-2 mt-5 flex-wrap">
            <button id="f-save" class="bg-brand text-white font-bold px-5 py-2 rounded shadow hover:bg-brand-dark">保存</button>
            <button id="f-print" class="bg-white border font-bold px-4 py-2 rounded text-ink-700 hover:bg-gray-50">🖨 印刷 / PDF</button>
            <a href="#${cfg.listRoute}" class="border rounded px-4 py-2 font-bold text-ink-500">戻る</a>
            ${isNew ? '' : '<button id="f-del" class="ml-auto text-red-500 font-bold px-3 py-2 border border-red-300 rounded">削除</button>'}
          </div>
        </div>
        <div id="doc-preview">${cfg.preview(d)}</div>
      </div>`;
    },
    bind(id = 'new') {
      const d = this.draft;
      const refresh = () => { $('#doc-preview').innerHTML = cfg.preview(d); };
      $('#f-date')?.addEventListener('change', e => { d[cfg.dateField] = e.target.value; refresh(); });
      $('#f-cust')?.addEventListener('change', e => { d.customer_id = e.target.value; refresh(); });
      v4BindItemsEditor(d, refresh);
      cfg.bindQuote?.(d, refresh);
      cfg.bindExtra?.(d, refresh);
      $('#f-print')?.addEventListener('click', () => window.print());
      $('#f-save')?.addEventListener('click', () => {
        if (!d.customer_id) { toast('顧客を選択してください', 'err'); return; }
        if (id === 'new') {
          d.id = DB.nextId(cfg.idPrefix);
          d.number = v4Number(cfg.numPrefix, cfg.table);
          DB.data[cfg.table].push(d);
        } else {
          Object.assign(DB.all(cfg.table).find(x => x.id === id), d);
        }
        DB.save();
        this.draft = null; this._id = null;
        toast(`${cfg.title}を保存しました`, 'ok');
        location.hash = '#' + cfg.listRoute;
      });
      $('#f-del')?.addEventListener('click', () => {
        if (!confirm(`この${cfg.title}を削除しますか？`)) return;
        DB.data[cfg.table] = DB.data[cfg.table].filter(x => x.id !== id);
        DB.save();
        this.draft = null; this._id = null;
        toast('削除しました', 'ok');
        location.hash = '#' + cfg.listRoute;
      });
    },
  };
}

/* =====================================================================
 * 2. 納品書
 * ===================================================================== */
function dnotePreview(d) {
  const s = v4Sums(d.items);
  return `
  <div class="a4doc print-doc mx-auto">
    <div class="doc-title mb-6">納　品　書</div>
    <div class="flex justify-between items-start mb-6">
      <div>
        <div class="text-lg font-bold border-b-2 border-ink-900 pb-1 pr-10">${esc(fmt.customer(d.customer_id) === '—' ? '' : fmt.customer(d.customer_id))}　御中</div>
        <div class="text-xs mt-3 text-ink-500">下記の通り納品いたしました。</div>
      </div>
      <div class="text-xs text-right leading-5">
        <div>No: ${esc(d.number || '（保存時に採番）')}</div>
        <div>納品日: ${fmt.dateWY(d.delivery_date)}</div>
      </div>
    </div>
    <table class="doc-table mb-4">
      <thead><tr><th class="w-1/2">品名</th><th>数量</th><th>単価</th><th>金額</th></tr></thead>
      <tbody>
        ${d.items.map(it => `<tr><td>${esc(it.name)}</td><td class="text-right">${(+it.qty || 0).toLocaleString()}</td><td class="text-right">${fmt.money(it.price)}</td><td class="text-right">${fmt.money((+it.qty || 0) * (+it.price || 0))}</td></tr>`).join('')}
        ${v4EmptyRows(5 - d.items.length, 4)}
      </tbody>
    </table>
    <div class="flex justify-end mb-8">
      <table class="w-64 doc-table">
        <tr><td class="bg-gray-100 font-bold">小計</td><td class="text-right">${fmt.money(s.sub)}</td></tr>
        <tr><td class="bg-gray-100 font-bold">消費税（10%）</td><td class="text-right">${fmt.money(s.tax)}</td></tr>
        <tr><td class="bg-gray-100 font-black">合計</td><td class="text-right font-black">${fmt.money(s.total)}</td></tr>
      </table>
    </div>
    <div class="flex justify-end">${v4CompanyBlock()}</div>
  </div>`;
}
Screens.delivery_notes = makeDocList({
  table: 'dnote_docs', title: '納品書', dateField: 'delivery_date', dateLabel: '納品日', editRoute: 'dn_edit',
});
Screens.dn_edit = makeDocEdit({
  table: 'dnote_docs', title: '納品書', idPrefix: 'dn', numPrefix: 'D-',
  dateField: 'delivery_date', dateLabel: '納品日', listRoute: 'delivery_notes', itemDate: false,
  empty: () => ({ delivery_date: TODAY, customer_id: '', items: [{ name: '', qty: 0, price: 0 }], order_id: null }),
  preview: dnotePreview,
  quoteUi() {
    const opts = DB.all('orders')
      .sort((a, b) => (b.received_date || '').localeCompare(a.received_date || ''))
      .slice(0, 30)
      .map(o => `<option value="${o.id}">${esc(o.order_number)}｜${esc(fmt.customer(o.customer_id))}｜${esc(o.title || '')}</option>`).join('');
    return `
    <div class="mb-4 pb-4 border-b">
      <div class="text-xs font-bold text-ink-500 mb-1">受注からの引用（任意）</div>
      <select id="f-quote" class="border rounded px-3 py-2 w-full bg-white text-sm">
        <option value="">— 受注を選ぶと明細が自動で入ります —</option>${opts}
      </select>
    </div>`;
  },
  bindQuote(d, refresh) {
    $('#f-quote')?.addEventListener('change', (e) => {
      const o = DB.find('orders', e.target.value);
      if (!o) return;
      d.customer_id = o.customer_id;
      d.delivery_date = o.delivered_date || o.delivery_date_start || TODAY;
      d.order_id = o.id;
      d.items = (o.items || []).map(it => {
        const p = calcItemPrice(it);
        return { name: it.title || o.title || fmt.paperText(it), qty: it.quantity || 0, price: p.unit_price || 0 };
      });
      if (!d.items.length) d.items = [{ name: o.title || '', qty: 0, price: 0 }];
      App.render();
    });
  },
});

/* =====================================================================
 * 3. 請求書
 * ===================================================================== */
function invoicePreview(d) {
  const s = v4Sums(d.items);
  const st = DB.data.settings;
  return `
  <div class="a4doc print-doc mx-auto">
    <div class="doc-title mb-6">御　請　求　書</div>
    <div class="flex justify-between items-start mb-4">
      <div>
        <div class="text-lg font-bold border-b-2 border-ink-900 pb-1 pr-10">${esc(fmt.customer(d.customer_id) === '—' ? '' : fmt.customer(d.customer_id))}　御中</div>
        <div class="text-xs mt-3 text-ink-500">毎度ありがとうございます。下記の通りご請求申し上げます。</div>
        <div class="mt-4 bg-gray-100 border-2 border-ink-900 px-5 py-3 inline-block">
          <span class="text-xs font-bold mr-3">御請求金額</span>
          <span class="text-2xl font-black">${fmt.money(s.total)}</span><span class="text-xs ml-1">（税込）</span>
        </div>
      </div>
      <div class="text-xs text-right leading-5">
        <div>No: ${esc(d.number || '（保存時に採番）')}</div>
        <div>発行日: ${fmt.dateWY(d.issue_date)}</div>
      </div>
    </div>
    <table class="doc-table mb-4">
      <thead><tr><th class="w-24">納品日</th><th class="w-1/2">品名</th><th>数量</th><th>単価</th><th>金額</th></tr></thead>
      <tbody>
        ${d.items.map(it => `<tr><td class="text-center">${it.date ? fmt.date(it.date) : ''}</td><td>${esc(it.name)}</td><td class="text-right">${(+it.qty || 0).toLocaleString()}</td><td class="text-right">${fmt.money(it.price)}</td><td class="text-right">${fmt.money((+it.qty || 0) * (+it.price || 0))}</td></tr>`).join('')}
        ${v4EmptyRows(6 - d.items.length, 5)}
      </tbody>
    </table>
    <div class="flex justify-end mb-6">
      <table class="w-72 doc-table">
        <tr><td class="bg-gray-100 font-bold">小計</td><td class="text-right">${fmt.money(s.sub)}</td></tr>
        <tr><td class="bg-gray-100 font-bold">消費税（10%）</td><td class="text-right">${fmt.money(s.tax)}</td></tr>
        <tr><td class="bg-gray-100 font-black">合計</td><td class="text-right font-black">${fmt.money(s.total)}</td></tr>
      </table>
    </div>
    <div class="flex justify-between items-end">
      <div class="text-xs border rounded p-3 w-80 leading-5">
        <div class="font-bold mb-1">お振込先</div>
        <div>${esc(st.bank_info_1)}</div>
        <div>${esc(st.bank_info_2)}</div>
        <div>${esc(st.bank_holder)}</div>
      </div>
      ${v4CompanyBlock()}
    </div>
  </div>`;
}
Screens.invoices = makeDocList({
  table: 'invoice_docs', title: '請求書', dateField: 'issue_date', dateLabel: '発行日', editRoute: 'inv_edit', paidCol: true,
});
Screens.inv_edit = makeDocEdit({
  table: 'invoice_docs', title: '請求書', idPrefix: 'iv', numPrefix: 'I-',
  dateField: 'issue_date', dateLabel: '発行日', listRoute: 'invoices', itemDate: true,
  empty: () => ({ issue_date: TODAY, customer_id: '', items: [{ date: '', name: '', qty: 0, price: 0 }], source_note_ids: [], paid: false }),
  preview: invoicePreview,
  quoteUi(d) {
    const notes = DB.all('dnote_docs')
      .sort((a, b) => (b.delivery_date || '').localeCompare(a.delivery_date || ''))
      .slice(0, 15);
    return `
    <div class="mb-4 pb-4 border-b">
      <div class="text-xs font-bold text-ink-500 mb-1">納品書からの引用（複数選択可）</div>
      <div class="border rounded max-h-36 overflow-y-auto text-sm divide-y">
        ${notes.length === 0 ? '<div class="p-2 text-ink-300 text-xs">納品書がありません</div>' : notes.map(n => `
        <label class="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-brand-light/40">
          <input type="checkbox" data-src-note="${n.id}" ${d.source_note_ids?.includes(n.id) ? 'checked' : ''}>
          <span class="font-mono text-xs text-ink-500">${esc(n.number)}</span>
          <span class="font-bold text-xs">${esc(fmt.customer(n.customer_id))}</span>
          <span class="text-xs text-ink-500">${fmt.date(n.delivery_date)}｜${fmt.money(v4Sums(n.items).total)}</span>
        </label>`).join('')}
      </div>
      <button id="f-quote-notes" class="mt-2 text-sm font-bold text-brand-dark border border-brand rounded px-3 py-1 hover:bg-brand-light">選択した納品書を引用</button>
      <div class="text-[11px] text-ink-300 mt-1">月末にその月の納品書をまとめて選べば月締め請求になります</div>
    </div>`;
  },
  bindQuote(d) {
    $('#f-quote-notes')?.addEventListener('click', () => {
      const ids = $$('[data-src-note]:checked').map(cb => cb.dataset.srcNote);
      const notes = ids.map(i => DB.all('dnote_docs').find(n => n.id === i)).filter(Boolean);
      if (!notes.length) { toast('納品書を選択してください', 'err'); return; }
      d.customer_id = notes[0].customer_id;
      d.source_note_ids = ids;
      d.items = notes.flatMap(n => n.items.map(it => ({ date: n.delivery_date, name: it.name, qty: it.qty, price: it.price })));
      App.render();
    });
  },
});

/* =====================================================================
 * 4. 領収書
 * ===================================================================== */
function receiptPreview(d) {
  const s = v4Sums(d.items);
  return `
  <div class="receipt-doc print-doc mx-auto">
    <div class="flex justify-between items-start">
      <div class="text-xs text-ink-500">No. ${esc(d.number || '（保存時に採番）')}</div>
      <div class="text-xs">発行日: ${fmt.dateWY(d.issue_date)}</div>
    </div>
    <div class="doc-title my-5">領　収　書</div>
    <div class="text-lg font-bold border-b-2 border-ink-900 pb-1 mb-6 w-3/4">${esc(fmt.customer(d.customer_id) === '—' ? '' : fmt.customer(d.customer_id))}　様</div>
    <div class="bg-gray-100 border-2 border-ink-900 text-center py-4 mb-5">
      <span class="text-3xl font-black tracking-wider">${fmt.money(s.total)}−</span>
      <span class="text-xs ml-2">（税込）</span>
    </div>
    <div class="text-sm mb-1">但し　<span class="border-b border-ink-500 px-2">${esc(d.tadashi || '　　　　　　　　　　')}</span></div>
    <div class="text-sm mb-6">上記正に領収いたしました</div>
    <div class="text-xs text-ink-500 mb-6">内訳：税抜金額 ${fmt.money(s.sub)} ／ 消費税(10%) ${fmt.money(s.tax)}</div>
    <div class="flex justify-end">${v4CompanyBlock()}</div>
  </div>`;
}
Screens.receipts = makeDocList({
  table: 'receipt_docs', title: '領収書', dateField: 'issue_date', dateLabel: '発行日', editRoute: 'rc_edit',
});
Screens.rc_edit = makeDocEdit({
  table: 'receipt_docs', title: '領収書', idPrefix: 'rp', numPrefix: 'R-',
  dateField: 'issue_date', dateLabel: '発行日', listRoute: 'receipts', itemDate: false,
  empty: () => ({ issue_date: TODAY, customer_id: '', items: [{ name: '', qty: 1, price: 0 }], tadashi: '印刷代として', invoice_id: null }),
  preview: receiptPreview,
  extraFields(d) {
    return `<label><div class="text-xs font-bold text-ink-500 mb-1">但し書き</div>
      <input id="f-tadashi" value="${esc(d.tadashi || '')}" class="border rounded px-3 py-2 w-full"></label>`;
  },
  bindExtra(d, refresh) {
    $('#f-tadashi')?.addEventListener('input', e => { d.tadashi = e.target.value; refresh(); });
  },
  quoteUi() {
    const opts = DB.all('invoice_docs')
      .sort((a, b) => (b.issue_date || '').localeCompare(a.issue_date || ''))
      .slice(0, 20)
      .map(v => `<option value="${v.id}">${esc(v.number)}｜${esc(fmt.customer(v.customer_id))}｜${fmt.money(v4Sums(v.items).total)}</option>`).join('');
    return `
    <div class="mb-4 pb-4 border-b">
      <div class="text-xs font-bold text-ink-500 mb-1">請求書からの引用（任意）</div>
      <select id="f-quote" class="border rounded px-3 py-2 w-full bg-white text-sm">
        <option value="">— 請求書を選ぶと金額・宛名が自動で入ります —</option>${opts}
      </select>
    </div>`;
  },
  bindQuote(d) {
    $('#f-quote')?.addEventListener('change', (e) => {
      const v = DB.all('invoice_docs').find(x => x.id === e.target.value);
      if (!v) return;
      const s = v4Sums(v.items);
      d.customer_id = v.customer_id;
      d.invoice_id = v.id;
      d.items = [{ name: `ご請求分（${v.number}）`, qty: 1, price: s.sub }];
      App.render();
    });
  },
});

/* =====================================================================
 * 5. 時系列記録表（日報型）
 * ===================================================================== */
Screens.timeline = {
  date: TODAY,
  getLog(create) {
    let log = DB.all('daily_logs').find(l => l.date === this.date);
    if (!log && create) {
      log = { date: this.date, tasks: [], note: '' };
      DB.data.daily_logs.push(log);
    }
    return log;
  },
  render() {
    const log = this.getLog(false) || { tasks: [], note: '' };
    const deliveries = DB.all('orders').filter(o =>
      (o.delivered_date === this.date) || (!o.delivered_date && o.status === '納品済み' && o.delivery_date_start === this.date));
    const shift = (n) => {
      const dt = new Date(this.date);
      dt.setDate(dt.getDate() + n);
      return dt.toISOString().slice(0, 10);
    };
    return `
    <h1 class="text-2xl font-black mb-1">時系列記録表</h1>
    <p class="text-sm text-ink-500 mb-4">日ごとに、今日のタスクと納品物を記録します。</p>
    <div class="flex items-center gap-2 mb-4">
      <button id="tl-prev" class="border rounded px-3 py-1.5 bg-white font-bold" data-d="${shift(-1)}">←</button>
      <input type="date" id="tl-date" value="${this.date}" class="border rounded px-3 py-1.5 bg-white font-bold">
      <button id="tl-next" class="border rounded px-3 py-1.5 bg-white font-bold" data-d="${shift(1)}">→</button>
      ${this.date === TODAY ? '<span class="text-xs font-bold text-brand">本日</span>' : `<button id="tl-today" class="text-xs font-bold text-blue-700 hover:underline">本日へ戻る</button>`}
    </div>

    <div class="grid lg:grid-cols-2 gap-5 items-start max-w-5xl">
      <div class="bg-white rounded shadow-sm border p-5">
        <h2 class="font-black mb-3">今日のタスク</h2>
        <div class="flex gap-2 mb-3">
          <input id="tl-new-task" placeholder="タスクを入力してEnter" class="border rounded px-3 py-2 flex-1">
          <button id="tl-add-task" class="bg-brand text-white font-bold px-4 rounded">追加</button>
        </div>
        ${log.tasks.length === 0 ? '<div class="text-ink-300 text-sm py-4 text-center">タスクはありません</div>' : `
        <div class="divide-y">
          ${log.tasks.map((t, i) => `
          <div class="flex items-center gap-2 py-2">
            <input type="checkbox" data-task="${i}" ${t.done ? 'checked' : ''} class="w-4 h-4 accent-ok">
            <span class="flex-1 text-sm ${t.done ? 'line-through text-ink-300' : 'font-bold'}">${esc(t.t)}</span>
            <button data-del-task="${i}" class="text-red-400 font-bold px-1">×</button>
          </div>`).join('')}
        </div>`}
      </div>

      <div class="bg-white rounded shadow-sm border p-5">
        <h2 class="font-black mb-3">納品物</h2>
        ${deliveries.length === 0 ? '<div class="text-ink-300 text-sm py-2">この日の納品はありません</div>' : `
        <div class="divide-y mb-3">
          ${deliveries.map(o => `
          <div class="py-2 text-sm">
            <span class="font-mono text-xs text-ink-500">${esc(o.order_number)}</span>
            <span class="font-bold ml-1">${esc(fmt.customer(o.customer_id))}</span>
            <div class="text-xs text-ink-500">${esc(o.title || '')}｜${fmt.money(o.total_amount)}</div>
          </div>`).join('')}
        </div>`}
        <div class="text-xs text-ink-500 mb-1 font-bold">メモ（手書き追記）</div>
        <textarea id="tl-note" rows="4" class="border rounded px-3 py-2 w-full text-sm" placeholder="その日の記録を自由に記入">${esc(log.note || '')}</textarea>
      </div>
    </div>`;
  },
  bind() {
    $('#tl-date')?.addEventListener('change', (e) => { this.date = e.target.value; App.render(); });
    $('#tl-prev')?.addEventListener('click', (e) => { this.date = e.currentTarget.dataset.d; App.render(); });
    $('#tl-next')?.addEventListener('click', (e) => { this.date = e.currentTarget.dataset.d; App.render(); });
    $('#tl-today')?.addEventListener('click', () => { this.date = TODAY; App.render(); });
    const addTask = () => {
      const inp = $('#tl-new-task');
      const t = (inp?.value || '').trim();
      if (!t) return;
      this.getLog(true).tasks.push({ t, done: false });
      DB.save();
      App.render();
      setTimeout(() => $('#tl-new-task')?.focus(), 0);
    };
    $('#tl-add-task')?.addEventListener('click', addTask);
    $('#tl-new-task')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });
    $$('[data-task]').forEach(cb => cb.addEventListener('change', () => {
      this.getLog(true).tasks[+cb.dataset.task].done = cb.checked;
      DB.save();
      App.render();
    }));
    $$('[data-del-task]').forEach(b => b.addEventListener('click', () => {
      this.getLog(true).tasks.splice(+b.dataset.delTask, 1);
      DB.save();
      App.render();
    }));
    $('#tl-note')?.addEventListener('change', (e) => {
      this.getLog(true).note = e.target.value;
      DB.save();
      toast('メモを保存しました', 'ok');
    });
  },
};

/* =====================================================================
 * v3側へのつなぎ（提案済みの最小フック）
 * 受注を「納品済み」にした日を納品日として自動記録（帳簿引用・時系列の納品物欄で使用）
 * ===================================================================== */
(function hookDeliveredDate() {
  const orig = DB.updateOrder.bind(DB);
  DB.updateOrder = function(id, patch, logMsg) {
    const r = orig(id, patch, logMsg);
    if (r && r.status === '納品済み' && !r.delivered_date) {
      r.delivered_date = TODAY;
      DB.save();
    }
    return r;
  };
})();

/* リセット時もv4テーブルを再シード */
(function hookReset() {
  const orig = DB.reset.bind(DB);
  DB.reset = function() { orig(); ensureV4(); };
})();

// ========= 初期化 =========
ensureV4();
App.render();
