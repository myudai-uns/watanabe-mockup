/* extra_pages.js — .bubble に存在しないページの追加（data.js 読込直後・core.js より前に実行）
   見積書一覧(quotes): 領収書一覧(receipts)ページを複製し、データ型を quote に差し替えて生成する。
   ヘッダーのナビゲーションにも「見積書」ボタンを追加する。 */
(function () {
  const APP = window.BUBBLE_APP;
  const SRC_KEY = "bTLQa"; // receipts
  if (!APP || !APP.pages[SRC_KEY] || APP.pages.bTQAa) return;

  /* ---------- ID 振り直し（このページ内で定義された要素/WF/アクションの id のみ） ---------- */
  let seq = 0;
  const newId = () => "bTQ" + (seq++).toString(36).padStart(3, "0");
  const idMap = {};
  function collect(obj) {
    if (!obj || typeof obj !== "object") return;
    for (const [k, v] of Object.entries(obj)) {
      if ((k === "elements" || k === "workflows" || k === "actions") && v && typeof v === "object") {
        for (const [ck, cv] of Object.entries(v)) {
          if (!/^\d+$/.test(ck) && !idMap[ck]) idMap[ck] = newId();
          if (cv && cv.id && !idMap[cv.id]) idMap[cv.id] = newId();
        }
      }
      collect(v);
    }
  }
  const src = APP.pages[SRC_KEY];
  collect(src);
  idMap[src.id] = "bTQAb";
  let json = JSON.stringify(src).replace(/"([A-Za-z0-9]{4,7})"/g, (m, id) => (idMap[id] ? `"${idMap[id]}"` : m));

  /* ---------- 型・フィールドの差し替え ---------- */
  json = json
    .split('"custom.receipt"').join('"custom.quote"')
    .split('"issue_date_date"').join('"issued_date_date"')
    .split('"number_text"').join('"quote_number_text"')
    .split('"payment_method_option_paymentmethod"').join('"status_option_quotestatus"');
  const page = JSON.parse(json);
  page.name = "quotes";
  page.id = "bTQAb";

  const TEXTS = {
    "領収書一覧": "見積書一覧",
    "+領収書を作成": "+見積書を作成",
    "領収書番号": "見積番号",
    "発行日": "見積日",
    "但し書き": "件名",
    "支払方法": "状態",
  };
  const msg = (name, next) => (next ? { next, type: "Message", name, is_slidable: false } : { type: "Message", name, is_slidable: false });

  function fix(node) {
    if (!node || typeof node !== "object") return;
    // 固定テキスト
    if (node.type === "TextExpression" && node.entries) {
      for (const k of Object.keys(node.entries)) {
        const v = node.entries[k];
        if (typeof v === "string" && TEXTS[v.trim()]) node.entries[k] = TEXTS[v.trim()];
      }
    }
    // セル: 親(quote) → customer は order 経由、但し書き → 受注の件名
    if (node.type === "ElementParent" && node.next && node.next.type === "Message") {
      if (node.next.name === "customer_custom_customer") node.next = msg("order_custom_order", node.next);
      else if (node.next.name === "tadashi_text") node.next = msg("order_custom_order", msg("title_text", node.next.next));
      else if (node.next.name === "amount_number") node.next.name = "total_amount_number";
    }
    if (node.type === "Message" && node.name === "amount_number") node.name = "total_amount_number";
    // 検索条件: customer in (...) → order in Search(order: customer in (...))
    if (node.type === "Search" && node.properties && node.properties.type_to_find === "custom.quote") {
      const p = node.properties;
      if (p.sort_field === "issue_date_date") p.sort_field = "issued_date_date";
      const cs = p.constraints || {};
      for (const k of Object.keys(cs)) {
        if (cs[k].key === "customer_custom_customer") {
          cs[k] = {
            key: "order_custom_order",
            value: {
              properties: { constraints: { 0: cs[k] }, type_to_find: "custom.order", ignore_empty_constraints: true },
              type: "Search",
            },
            constraint_type: "in",
          };
        }
      }
    }
    if (node.group_type === "custom.receipt") node.group_type = "custom.quote";
    for (const v of Object.values(node)) fix(v);
  }
  fix(page);
  if (page.properties) page.properties.page_item_type = undefined;

  /* ---------- ワークフロー: 行クリック → 見積書(受注) / 作成ボタン → 受注一覧 ---------- */
  const QUOTE_PAGE = APP.pages.bTIxM.id; // quote（page_item_type = order）
  const ORDERS_PAGE = APP.pages.bTGXL.id;
  for (const wf of Object.values(page.workflows || {})) {
    for (const a of Object.values(wf.actions || {})) {
      if (a.type !== "ChangePage" || !a.properties) continue;
      const dts = a.properties.data_to_send;
      if (dts && dts.type === "ElementParent") {
        a.properties.element_id = QUOTE_PAGE;
        a.properties.data_to_send = { type: "ElementParent", is_slidable: false, next: msg("order_custom_order") };
      } else if (dts && dts.type === "Search") {
        a.properties.element_id = ORDERS_PAGE;
        delete a.properties.data_to_send;
      }
    }
  }
  APP.pages.bTQAa = page;

  /* ---------- ヘッダーのナビに「見積書」を追加（新規受注の右） ---------- */
  const hdr = APP.element_definitions.bTGOw;
  const nav = hdr && hdr.elements && hdr.elements.bTGPO;
  if (nav && nav.elements.bTLBZ) {
    for (const el of Object.values(nav.elements)) {
      if (el.properties && el.properties.order >= 8) el.properties.order += 1;
    }
    // 選択中ハイライト条件（Current Page Name）を receipts → quotes に差し替え
    const btn = JSON.parse(
      JSON.stringify(nav.elements.bTLBZ).split('"receipts_detail"').join('"quotes"').split('"receipts"').join('"quotes"')
    );
    btn.id = "bTQNb";
    btn.properties.text = { entries: { 0: "見積書" }, type: "TextExpression" };
    btn.properties.order = 8;
    nav.elements.bTQNa = btn;
    hdr.workflows = hdr.workflows || {};
    hdr.workflows.bTQNw = {
      properties: { element_id: "bTQNb" },
      type: "ButtonClicked",
      id: "bTQNx",
      actions: { 0: { properties: { element_id: "bTQAb" }, type: "ChangePage", id: "bTQNy" } },
    };
  }
})();
