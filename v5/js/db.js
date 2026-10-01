/* db.js — user_types スキーマに基づくローカルDB（localStorage）
   シードデータは .bubble のスキーマ/オプションセットから生成したダミー。 */
(function () {
  const KEY = "wtb_db_v5"; // v5: 見積書(quote)シード追加に伴い更新
  const DB = (window.DB = {});
  let store = null;
  let uid = 1000;

  function nowIso(offsetDays) {
    const d = new Date();
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    return d.toISOString();
  }
  function newId(type) {
    return type.replace(/^custom\./, "") + "_" + Date.now().toString(36) + "_" + ++uid;
  }

  DB.load = function () {
    try {
      store = JSON.parse(localStorage.getItem(KEY));
    } catch (e) {
      store = null;
    }
    if (!store || !store.tables) {
      store = { tables: {}, session: { userId: null } };
      seed();
      DB.save();
    }
  };
  DB.save = function () {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch (e) {}
  };
  DB.reset = function () {
    localStorage.removeItem(KEY);
    DB.load();
  };

  function table(type) {
    const t = String(type).replace(/^custom\./, "");
    return (store.tables[t] = store.tables[t] || []);
  }

  DB.create = function (type, fields) {
    const rec = Object.assign(
      {
        _id: newId(type),
        _type: String(type).replace(/^custom\./, ""),
        "Created Date": nowIso(),
        "Modified Date": nowIso(),
      },
      fields || {}
    );
    table(type).push(rec);
    DB.save();
    return rec;
  };
  DB.update = function (thing, changes) {
    if (!thing) return null;
    Object.assign(thing, changes, { "Modified Date": nowIso() });
    // storeに実体反映（thingが参照でない場合に備えidで検索）
    const t = table(thing._type);
    const idx = t.findIndex((r) => r._id === thing._id);
    if (idx >= 0) Object.assign(t[idx], thing);
    DB.save();
    return thing;
  };
  DB.remove = function (thing) {
    if (!thing) return;
    const t = table(thing._type);
    const idx = t.findIndex((r) => r._id === thing._id);
    if (idx >= 0) t.splice(idx, 1);
    DB.save();
  };
  DB.all = function (type) {
    return table(type).slice();
  };
  DB.byId = function (id) {
    for (const tn of Object.keys(store.tables)) {
      const r = store.tables[tn].find((x) => x._id === id);
      if (r) return r;
    }
    return null;
  };

  /* ---------- 検索 (Search ノード用) ---------- */
  function cmpDates(a, b) {
    return new Date(a).getTime() - new Date(b).getTime();
  }
  function valForCompare(v) {
    if (v && v._set) return v.db_value; // option
    if (v && v._id) return v._id; // thing
    return v;
  }
  DB.matches = function (rec, c, evaluatedValue) {
    const key = c.key;
    const ct = c.constraint_type;
    const rv = rec[key];
    const cv = evaluatedValue;
    const empty = cv == null || cv === "" || (Array.isArray(cv) && !cv.length);
    switch (ct) {
      case "equals":
        if (empty) return true; // ignore_empty_constraints 前提で呼び分け
        return valForCompare(rv) === valForCompare(cv) || (rv == null && cv === false);
      case "not equal":
        return valForCompare(rv) !== valForCompare(cv);
      case "is_empty":
        return rv == null || rv === "" || (Array.isArray(rv) && !rv.length);
      case "is_not_empty":
        return !(rv == null || rv === "" || (Array.isArray(rv) && !rv.length));
      case "lte":
        return rv != null && cmpDates(rv, cv) <= 0 || (typeof rv === "number" && rv <= cv);
      case "gte":
        return rv != null && cmpDates(rv, cv) >= 0 || (typeof rv === "number" && rv >= cv);
      case "contains": {
        const list = Array.isArray(rv) ? rv : [];
        return list.map(valForCompare).indexOf(valForCompare(cv)) >= 0;
      }
      case "not contains": {
        const list = Array.isArray(rv) ? rv : [];
        return list.map(valForCompare).indexOf(valForCompare(cv)) < 0;
      }
      case "in": {
        const list = Array.isArray(cv) ? cv : [cv];
        return list.map(valForCompare).indexOf(valForCompare(rv)) >= 0;
      }
      case "text contains string":
        return String(rv || "").toLowerCase().indexOf(String(cv || "").toLowerCase()) >= 0;
      default:
        return true;
    }
  };

  DB.search = function (typeToFind, constraints, evalConstraintValue, opts) {
    opts = opts || {};
    let list = DB.all(typeToFind);
    const cons = constraints || [];
    for (const c of cons) {
      let cv;
      try {
        cv = evalConstraintValue(c);
      } catch (e) {
        cv = null;
      }
      const empty = cv == null || cv === "" || (Array.isArray(cv) && !cv.length);
      const emptyOk = opts.ignoreEmpty !== false; // Bubble: ignore empty constraints
      if (empty && emptyOk && c.constraint_type !== "is_empty" && c.constraint_type !== "is_not_empty" && typeof c.value !== "boolean" && c.value !== 0) {
        continue;
      }
      const val = typeof c.value === "boolean" || typeof c.value === "number" ? c.value : cv;
      list = list.filter((r) => DB.matches(r, c, val));
    }
    if (opts.sortField) {
      list.sort((a, b) => {
        const av = a[opts.sortField], bv = b[opts.sortField];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        let r;
        if (typeof av === "number") r = av - bv;
        else if (/date/i.test(opts.sortField)) r = cmpDates(av, bv);
        else r = String(av).localeCompare(String(bv), "ja");
        return opts.descending ? -r : r;
      });
    }
    return list;
  };

  /* ---------- セッション ---------- */
  DB.currentUser = function () {
    return store.session.userId ? DB.byId(store.session.userId) : null;
  };
  DB.logIn = function (email, password) {
    let u = DB.all("user").find((x) => x.email === email);
    if (!u) {
      u = DB.create("user", {
        email: email || "guest@example.com",
        name_text: (email || "guest").split("@")[0],
        is_active_boolean: true,
        role_option_userrole: opt("userrole", "事務"),
      });
    }
    store.session.userId = u._id;
    DB.save();
    return u;
  };
  DB.logOut = function () {
    store.session.userId = null;
    DB.save();
  };

  /* ---------- ダミーシード ---------- */
  function opt(setKey, display) {
    const list = Core.optionList("option." + setKey);
    const v = list.find((x) => x.display === display) || list[0];
    return v ? { _set: "option." + setKey, _key: v._key, display: v.display, db_value: v.db_value } : null;
  }

  function seed() {
    const u1 = DB.create("user", {
      email: "admin@example.com",
      name_text: "渡辺 太郎",
      is_active_boolean: true,
      role_option_userrole: opt("userrole", "代表"),
    });
    const u2 = DB.create("user", {
      email: "jimu@example.com",
      name_text: "佐藤 花子",
      is_active_boolean: true,
      role_option_userrole: opt("userrole", "事務"),
    });

    DB.create("setting", {
      company_name__text: "有限会社渡辺謄写堂",
      company_postal_text: "964-0000",
      company_address_text: "福島県二本松市（サンプル住所）1-2-3",
      company_phone_text: "0243-00-0000",
      _company_fax_text: "0243-00-0001",
      invoice_number_text: "T0000000000000",
      bank_holder_text: "ﾕ)ﾜﾀﾅﾍﾞﾄｳｼｬﾄﾞｳ",
      bank_info_1_text: "サンプル銀行 本店 普通 0000000",
      bank_info_2__text: "サンプル信金 本店 普通 1111111",
      holidays_list_date: [],
    });

    const custs = [
      { company_name_text: "サンプル商店", kind: "企業・個人", area: "本町", phone: "0243-11-1111" },
      { company_name_text: "デモ神社", kind: "地域・団体", area: "二本松神社", phone: "0243-22-2222" },
      { company_name_text: "テスト工業株式会社", kind: "企業・個人", area: "亀谷", phone: "0243-33-3333" },
      { company_name_text: "サンプル小学校PTA", kind: "地域・団体", area: "二本松小", phone: "0243-44-4444" },
    ].map((c, i) =>
      DB.create("custom.customer", {
        company_name_text: c.company_name_text,
        kind_option_customerkind: opt("customerkind", c.kind),
        area_option_area: opt("area", c.area),
        phone__text: c.phone,
        fax_text: "",
        address_text: "福島県二本松市サンプル町" + (i + 1) + "-1",
        notes_text: "ダミーデータ",
      })
    );

    const statuses = ["見積もり段階", "受注", "印刷中", "完成", "納品済み"];
    let onum = 1;
    statuses.forEach((st, si) => {
      for (let i = 0; i < (si === 1 ? 2 : 1); i++) {
        const cust = custs[(si + i) % custs.length];
        const o = DB.create("custom.order", {
          order_number_text: "2026-" + String(onum++).padStart(4, "0"),
          title_text: ["会報誌 春号", "祭礼ポスター", "名入れ封筒", "式典プログラム", "領収書 複写式", "回覧板チラシ"][(si + i) % 6],
          customer_custom_customer: { _id: cust._id, _type: "customer" },
          status_option_orderstatus: opt("orderstatus", st),
          received_date_date: nowIso(-10 - si * 3),
          delivery_date_start_date: nowIso(5 + si * 2),
          delivery_date_end_date: nowIso(7 + si * 2),
          delivery_type_option_deliverytype: opt("deliverytype", "予定"),
          reception_method_option_receptionmethod: opt("receptionmethod", "電話"),
          data_status_option_datastatus: opt("datastatus", "持込"),
          tags_list_option_tag: si === 0 ? [opt("tag", "新規")] : si === 1 ? [opt("tag", "急ぎ")] : [opt("tag", "リピート")],
          received_by_user: { _id: u2._id, _type: "user" },
          created_by_user: { _id: u1._id, _type: "user" },
          is_draft_boolean: false,
          memo_text: "サンプル案件（ダミー）",
          subtotal_ex_tax_number: 25000 + si * 5000,
          tax_amount_number: Math.round((25000 + si * 5000) * 0.1),
          total_amount_number: Math.round((25000 + si * 5000) * 1.1),
          show_discount_boolean: false,
          discount_amount_number: 0,
          created_at__date: nowIso(-10 - si * 3),
          updated_at_date: nowIso(-1),
        });
        // 見積書（見積書一覧用ダミー）
        DB.create("custom.quote", {
          quote_number_text: "Q-" + o.order_number_text,
          order_custom_order: { _id: o._id, _type: "order" },
          issued_date_date: nowIso(-9 - si * 3),
          valid_until_date: nowIso(21 - si * 3),
          status_option_quotestatus: opt("quotestatus", ["作成中", "発行済", "受諾", "受諾", "受諾"][si]),
          send_method_option_sendmethod: opt("sendmethod", ["メール", "郵送", "直接手渡し", "メール", "LINE"][si]),
          total_amount_number: o.total_amount_number,
          memo_text: "",
        });
        DB.create("custom.orderitem", {
          order_custom_order: { _id: o._id, _type: "order" },
          title_text: o.title_text,
          type_option_itemtype: opt("itemtype", "normal"),
          quantity_number: 100 * (si + 1),
          unit_price_number: 50,
          subtotal_number: 100 * (si + 1) * 50,
          tax_rate_number: 10,
          paper_text: "上質紙 90kg",
          page_size_option_pagesize: opt("pagesize", "A4"),
          ink_pattern_option_inkpattern: opt("inkpattern", "モノクロ片面(1C×0)"),
          folding_option_foldingtype: null,
          hole_position_option_holeposition: null,
          nori_position_option_noriposition: null,
          lamination_option_laminationoption: null,
          numbering_enabled_boolean: false,
          yacho_style_boolean: false,
          is_deleted_boolean: false,
          is_committed_boolean: true,
          delivery_start_date: o.delivery_date_start_date,
          delivery_end_date: o.delivery_date_end_date,
        });
      }
    });

    const papers = [
      ["上質紙", "90kg", "白", 5],
      ["上質紙", "70kg", "白", 4],
      ["色上質", "中厚口", "クリーム", 6],
      ["コート紙", "110kg", "白", 8],
    ];
    papers.forEach(([q, th, col, up], i) =>
      DB.create("custom.paper", {
        paper_name_text: q + " " + th,
        quality_text: q,
        thickness_kg_number: parseFloat(th) || 0,
        color_text: col,
        unit_price_number: up,
        paper_size_text: "A4",
        is_major_boolean: i < 2,
      })
    );
  }

  DB.load();
})();
