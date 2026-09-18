(function () {
  'use strict';

  const R = window.MT_RATES;
  const AGENT = window.MT_AGENT;
  const BRANDS = window.MT_BRANDS.map((b) => ({
    ...b,
    models: b.models.map(([name, kind, from, to]) => ({ name, kind, from, to })),
  }));
  const THIS_YEAR = new Date().getFullYear();
  const OLDEST_YEAR = THIS_YEAR - 30;
  const STORE_KEY = 'mt-quote-state-v2';
  const TOP_MODELS = 8;
  const TOP_YEARS = 6;
  const MAX_PICKS = 4; // จำนวนแผนสูงสุดต่อใบเสนอราคา (ให้ตารางเปรียบเทียบยังอยู่ใน A4 หน้าเดียว)
  const PAGE_W = 794; // A4 ที่ 96dpi
  const PAGE_H = 1122;

  const KINDS = {
    car: { label: 'รถเก๋ง / SUV / PPV', short: 'เก๋ง / SUV' },
    pickup: { label: 'รถกระบะ (ไม่เกิน 4 ตัน)', short: 'กระบะ' },
    van: { label: 'รถตู้ (ไม่เกิน 15 ที่นั่ง)', short: 'รถตู้' },
    truck6: { label: 'รถบรรทุก 6 ล้อ (ไม่เกิน 12 ตัน)', short: 'บรรทุก 6 ล้อ' },
    truck10: { label: 'รถบรรทุก 10 ล้อ (เกิน 12 ตัน)', short: 'บรรทุก 10 ล้อ' },
  };
  const BODY_LABEL = {
    standard: 'กระบะทั่วไป',
    fridge: 'ต่อเติมตู้เย็น',
    plain: 'ไม่มีอุปกรณ์พิเศษ',
    equip: 'มีอุปกรณ์พิเศษ',
  };
  const TIER_TH = { PLATINUM: 'แพลทินัม', GOLD: 'โกลด์', SILVER: 'ซิลเวอร์' };
  const CLS_CLASS = { '2+': 'c2p', '3+': 'c3p', 3: 'c3' };
  const CLS_ORDER = { '2+': 0, '3+': 1, 3: 2 };
  const TIER_ORDER = { PLATINUM: 0, GOLD: 1, SILVER: 2 };

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const round2 = (n) => Math.round(n * 100) / 100;
  const money = (n) => {
    n = round2(n);
    return n.toLocaleString('th-TH', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
  };
  const signed = (n) => `${n < 0 ? '-' : '+'}${money(Math.abs(n))}`;
  const yearLabel = (y) => `${y} (${y + 543})`;

  const ICONS = {
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    x: '<path d="M7 7l10 10M17 7L7 17"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    camera: '<path d="M4 8.5h3.2L9 6h6l1.8 2.5H20V19H4z"/><circle cx="12" cy="13.3" r="3.2"/>',
    alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.2M12 17.2v.1"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.1"/>',
    share: '<circle cx="17.5" cy="5.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/><path d="M8.7 10.7l6.6-3.9M8.7 13.3l6.6 3.9"/>',
    print: '<path d="M7 9V4h10v5"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.7"/><path d="M20.5 16l-5-5-9 8.5"/>',
    car: '<path d="M3.5 16.5v-4.2L5.8 7h12.4l2.3 5.3v4.2z"/><path d="M3.5 12.3h17"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>',
    truck: '<path d="M2.5 6.5h11v10h-11zM13.5 10h4.5l3.5 3.5v3h-8z"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z"/><path d="M8.7 12l2.3 2.3 4.3-4.6"/>',
    refresh: '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 5v6h-6"/>',
    phone: '<path d="M5.5 3.5h3.2l1.8 4.6-2.2 1.4a11.5 11.5 0 006.2 6.2l1.4-2.2 4.6 1.8v3.2a2 2 0 01-2.1 2A16.5 16.5 0 013.5 5.6a2 2 0 012-2.1z"/>',
  };
  const icon = (name, cls = '') =>
    `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

  // ---------- state ----------
  const initialState = () => ({
    view: 'search',
    brandId: null,
    customBrand: '',
    modelName: null,
    customModel: false,
    customModelName: '',
    customKind: null,
    year: null,
    body: null,
    usage: 'personal',
    deduct: true,
    filter: 'all',
    sums: { plus2: 100000, plus3: 100000 },
    // แผนที่เลือกลงใบเสนอราคา: { key, sum (เฉพาะ 2+/3+), deduct (null = ไม่มีตัวเลือก Deduct) }
    picks: [],
    picksSig: null,
    addons: { ncd: 0, tpbi: 500000, cmi: false },
    customer: { name: '', phone: '' },
    quote: null,
  });

  let state = initialState();
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || 'null');
    if (saved) state = { ...state, ...saved };
  } catch (e) { /* storage unavailable */ }

  const save = () => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  };

  function getBrand() {
    if (state.brandId === 'other') {
      return { id: 'other', name: state.customBrand || 'ยี่ห้ออื่นๆ', th: '', group: 'other', models: [] };
    }
    return BRANDS.find((b) => b.id === state.brandId) || null;
  }

  function getModel() {
    const brand = getBrand();
    if (!brand) return null;
    if (state.customModel) return { name: state.customModelName.trim(), kind: state.customKind, custom: true };
    return brand.models.find((m) => m.name === state.modelName) || null;
  }

  function yearsFor(model) {
    const from = Math.max(model && model.from ? model.from : OLDEST_YEAR, OLDEST_YEAR);
    const to = Math.min(model && model.to ? model.to : THIS_YEAR, THIS_YEAR);
    const ys = [];
    for (let y = to; y >= from; y--) ys.push(y);
    return ys;
  }

  const needsBody = (kind) => kind === 'pickup' || kind === 'truck6' || kind === 'truck10';

  function isComplete() {
    const m = getModel();
    return !!(getBrand() && m && m.kind && state.year && (!needsBody(m.kind) || state.body));
  }

  const carSig = () => JSON.stringify([state.brandId, state.customBrand, state.modelName, state.customModel, state.customKind, state.year, state.body]);

  function vehicle() {
    const brand = getBrand();
    const model = getModel();
    const kind = model.kind;
    const code = kind === 'car' ? (state.usage === 'commercial' ? '120' : '110') : kind === 'van' ? '210' : '320';
    return {
      brand,
      model,
      kind,
      code,
      year: state.year,
      age: THIS_YEAR - state.year,
      body: needsBody(kind) ? state.body : null,
      name: [brand.name, model.name].filter(Boolean).join(' '),
    };
  }

  // ---------- premium engine ----------
  function plusBlockReason(v) {
    if (v.kind !== 'car' && v.kind !== 'pickup') return 'ป.2+ และ ป.3+ รับเฉพาะรถเก๋ง (รหัส 110) และรถกระบะไม่เกิน 4 ตัน (รหัส 320)';
    if (v.kind === 'car' && state.usage === 'commercial') return 'ป.2+ และ ป.3+ รับเฉพาะรถใช้ส่วนบุคคล';
    if (v.brand.group === 'luxury') return `${v.brand.name} ไม่อยู่ในตารางเบี้ย ป.2+ / ป.3+ (รับเฉพาะรถญี่ปุ่นและรถตลาด) หากต้องการให้สอบถามฝ่ายรับประกันภัย`;
    if (v.brand.group === 'super') return `${v.brand.name} เป็นรถกลุ่ม Super Car ไม่สามารถซื้อตามตารางเบี้ยได้ กรุณาติดต่อฝ่ายรับประกันภัย`;
    return null;
  }

  // opts.sums / opts.deduct ใช้คำนวณแผนที่เลือกไว้แล้ว ถ้าไม่ส่งมาจะใช้ค่าที่แสดงอยู่ในหน้ารายการแผน
  function buildOffers(v, opts) {
    const sums = (opts && opts.sums) || state.sums;
    const deduct = opts && 'deduct' in opts ? opts.deduct : state.deduct;
    const offers = [];

    if (!plusBlockReason(v)) {
      const group = v.kind === 'pickup' && v.body === 'fridge' ? 'fridge' : 'standard';
      ['plus2', 'plus3'].forEach((pid) => {
        const p = R.plus[pid];
        const sum = p.sums.includes(sums[pid]) ? sums[pid] : p.sums[0];
        const i = p.sums.indexOf(sum);
        Object.keys(p.rates[group]).forEach((tier) => {
          offers.push({
            key: `${pid}.${tier}`,
            type: 'plus',
            pid,
            tier,
            cls: p.cls,
            product: p.name,
            planTh: `แผน ${TIER_TH[tier]}`,
            sum,
            sums: p.sums,
            deductible: deduct ? p.deductible : 0,
            deductAmount: p.deductible,
            price: p.rates[group][tier][deduct ? 'deduct' : 'noDeduct'][i],
            cov: p.coverage[tier],
          });
        });
      });
    }

    if ((v.kind === 'car' || v.kind === 'pickup' || v.kind === 'van') && v.brand.group !== 'super') {
      const t = R.tawikoon;
      const rates = t.rates[v.code] || {};
      Object.keys(rates).forEach((plan) => {
        offers.push({
          key: `tawikoon.${plan}`,
          type: 'tawikoon',
          cls: t.cls,
          product: t.name,
          planTh: t.plans[plan].label,
          price: rates[plan],
          cov: t.plans[plan].coverage,
        });
      });
    }

    if (v.kind === 'truck6' || v.kind === 'truck10') {
      const t = R.truck;
      const size = t.sizes[v.kind === 'truck6' ? 'le12' : 'gt12'];
      const table = size.rates[v.body === 'equip' ? 'equip' : 'plain'][deduct ? 'deduct' : 'noDeduct'];
      t.tppdOptions.forEach((tppd, i) => {
        offers.push({
          key: `truck.${i}`,
          type: 'truck',
          cls: t.cls,
          product: `${t.name} ${size.label}`,
          planTh: `ทรัพย์สินคู่กรณี ${money(tppd)}`,
          price: table[i],
          deductible: deduct ? size.deductible : 0,
          deductAmount: size.deductible,
          cov: { ...t.coverage, tppd, bail: size.bail },
        });
      });
    }

    return offers.sort((a, b) => a.price - b.price);
  }

  // ---------- picks (หลายแผนในใบเสนอราคาเดียว) ----------
  const pickFromOffer = (o) => ({
    key: o.key,
    sum: o.type === 'plus' ? o.sum : null,
    deduct: o.type === 'tawikoon' ? null : o.deductible > 0,
  });
  const pickId = (p) => `${p.key}|${p.sum || ''}|${p.deduct === null ? '' : p.deduct ? 1 : 0}`;

  function resolvePick(v, p) {
    const sums = p.sum ? { plus2: p.sum, plus3: p.sum } : state.sums;
    const o = buildOffers(v, { sums, deduct: p.deduct !== false }).find((x) => x.key === p.key);
    if (!o || (o.type === 'plus' && o.sum !== p.sum)) return null;
    return o;
  }

  const planOrder = (a, b) =>
    CLS_ORDER[a.cls] - CLS_ORDER[b.cls] ||
    (a.tier in TIER_ORDER ? TIER_ORDER[a.tier] : 9) - (b.tier in TIER_ORDER ? TIER_ORDER[b.tier] : 9) ||
    a.price - b.price;

  function pickedOffers(v) {
    return state.picks
      .map((p, i) => {
        const o = resolvePick(v, p);
        return o && { ...o, pickIndex: i };
      })
      .filter(Boolean)
      .sort(planOrder);
  }

  const isPicked = (o) => state.picks.some((p) => pickId(p) === pickId(pickFromOffer(o)));

  const shortName = (o) => `ชั้น ${o.cls} ${o.tier || (o.type === 'truck' ? 'รถบรรทุก' : 'ทวีคูณ')}`;

  function pickDetail(o) {
    const d = o.deductible ? `Deduct ${money(o.deductible)}` : 'ไม่มี Deduct';
    if (o.type === 'plus') return `ทุน ${money(o.sum)} · ${d}`;
    if (o.type === 'truck') return `ทรัพย์สิน ${money(o.cov.tppd)} · ${d}`;
    return o.planTh;
  }

  // ---------- coverage & pricing ----------
  function seatsFor(o, v) {
    if (o.type === 'plus') return v.code === '320' ? 3 : 5;
    if (o.type === 'truck') return 3;
    return null;
  }

  const COVERAGE_ROWS = [
    { id: 'own', label: 'ความเสียหายต่อตัวรถ', plusSub: 'เฉพาะชนกับยานพาหนะทางบก' },
    { id: 'theft', label: 'รถยนต์สูญหาย / ไฟไหม้' },
    { id: 'tpbi', label: 'ชีวิต ร่างกาย บุคคลภายนอก' },
    { id: 'tppd', label: 'ทรัพย์สินบุคคลภายนอก' },
    { id: 'pa', label: 'อุบัติเหตุส่วนบุคคล', sub: 'ผู้ขับขี่และผู้โดยสาร' },
    { id: 'med', label: 'ค่ารักษาพยาบาล' },
    { id: 'bail', label: 'ประกันตัวผู้ขับขี่' },
    { id: 'daily', label: 'เงินชดเชยรายได้', sub: 'นอนโรงพยาบาล สูงสุด 30 วัน/คน ไม่เกิน 7 คน', plus2Only: true },
    { id: 'travel', label: 'ค่าเดินทางระหว่างรถเข้าซ่อม', sub: 'ไม่เกิน 3 ครั้ง/ปี', plus2Only: true },
  ];

  // ค่าความคุ้มครองของแผน (HTML) — null = ไม่คุ้มครอง
  function coverageValue(id, o, v, tpbiPerson) {
    const c = o.cov;
    const seats = seatsFor(o, v);
    const seatTxt = seats ? `<br><small>ไม่เกิน ${seats} ที่นั่ง</small>` : '';
    switch (id) {
      case 'own': return o.type === 'plus' ? `ตามทุน ${money(o.sum)}` : null;
      case 'theft': return o.type === 'plus' && c.theftFire ? `ตามทุน ${money(o.sum)}` : null;
      case 'tpbi': return `${money(tpbiPerson || c.tpbiPerson)} /คน<br>${money(c.tpbiTime)} /ครั้ง`;
      case 'tppd': return `${money(c.tppd)} /ครั้ง` + (o.type === 'truck' && o.deductible ? `<br><small>ค่าเสียหายส่วนแรก ${money(o.deductible)}</small>` : '');
      case 'pa': return c.pa ? `${money(c.pa)} /คน${seatTxt}` : null;
      case 'med': return c.med ? `${money(c.med)} /คน${seatTxt}` : null;
      case 'bail': return `${money(c.bail)} /ครั้ง`;
      case 'daily': return c.dailyComp ? `${money(c.dailyComp)} /วัน` : null;
      case 'travel': return c.travelComp ? `${money(c.travelComp)} /ครั้ง` : null;
      default: return null;
    }
  }

  function rowLabel(row, offers) {
    const sub = row.plusSub ? (offers.some((o) => o.type === 'plus') ? row.plusSub : '') : row.sub;
    return `${row.label}${sub ? `<small>${sub}</small>` : ''}`;
  }

  function rowsFor(offers) {
    return COVERAGE_ROWS.filter((r) => !r.plus2Only || offers.some((o) => o.pid === 'plus2'));
  }

  function highlights(o) {
    const c = o.cov;
    if (o.type === 'plus') {
      const list = [
        [true, `ชนกับยานพาหนะทางบก ซ่อมรถคุณตามทุน ${money(o.sum)}`],
        c.theftFire ? [true, 'รถหาย / ไฟไหม้ คุ้มครองตามทุน'] : [false, 'ไม่คุ้มครองรถหาย / ไฟไหม้'],
        [true, `ทรัพย์สินคู่กรณี ${money(c.tppd)} บาท`],
      ];
      if (c.dailyComp) list.push([true, `ชดเชยรายได้ ${money(c.dailyComp)} บาท/วัน + ค่าเดินทาง`]);
      return list;
    }
    if (o.type === 'tawikoon') {
      return [
        [false, 'ไม่คุ้มครองความเสียหายของรถคุณ'],
        [true, `ทรัพย์สินคู่กรณี ${money(c.tppd)} บาท`],
        c.pa ? [true, `อุบัติเหตุส่วนบุคคล / ค่ารักษา ${money(c.pa)} บาท`] : [false, 'ไม่มีอุบัติเหตุส่วนบุคคล (PA)'],
      ];
    }
    return [
      [false, 'ไม่คุ้มครองความเสียหายของรถคุณ'],
      [true, `ทรัพย์สินคู่กรณี ${money(c.tppd)} บาท`],
      [true, `ประกันตัวผู้ขับขี่ ${money(c.bail)} บาท`],
    ];
  }

  function offerNotes(o, v) {
    const notes = [];
    if (o.type !== 'tawikoon') notes.push({ icon: 'camera', text: 'ราคาสำหรับรถที่ติดกล้องติดรถยนต์' });
    if (o.type === 'plus' && v.age > R.plusRules.maxAge) {
      notes.push({ icon: 'alert', warn: true, text: `รถอายุ ${v.age} ปี (เกิน ${R.plusRules.maxAge} ปี) ต้องส่งพิจารณาอนุมัติ` });
    }
    if (o.type === 'plus' && v.body === 'fridge') notes.push({ icon: 'info', text: 'ไม่คุ้มครองอุปกรณ์ต่อเติมตู้เย็น' });
    return notes;
  }

  function cmiAmount(o, v) {
    return o.type === 'truck' ? 0 : R.compulsory[v.code] || 0;
  }

  // เบี้ยของแต่ละแผน แยกเป็นรายการ (ส่วนลด/ความคุ้มครองเพิ่ม/พ.ร.บ. ใช้ร่วมกันทุกแผน)
  function pricing(o, v) {
    const p = { premium: o.price, ncd: 0, tpbi: 0, cmi: 0 };
    if (o.type === 'plus') {
      const ncd = R.plusRules.noClaimDiscount.find((x) => x.years === state.addons.ncd);
      if (ncd) p.ncd = -ncd.amount;
      const up = R.plusRules.tpbiUpgrade.find((x) => x.perPerson === state.addons.tpbi);
      if (up) p.tpbi = up.amount;
    }
    if (state.addons.cmi) p.cmi = cmiAmount(o, v);
    p.total = round2(p.premium + p.ncd + p.tpbi + p.cmi);
    return p;
  }

  function quoteConditions(v, offers) {
    const plus = offers.some((o) => o.type === 'plus');
    const truck = offers.some((o) => o.type === 'truck');
    const mixed = plus && offers.some((o) => o.type !== 'plus');
    const scope = mixed ? 'ชั้น 2+ / 3+ ' : '';
    const max = R.plusRules.maxAge;
    const list = [];
    if (plus) {
      list.push(`${scope}สำหรับรถใช้ส่วนบุคคล เฉพาะรถญี่ปุ่นและรถตลาด (รหัส 110) และรถปิคอัพไม่เกิน 4 ตัน (รหัส 320) อายุรถไม่เกิน ${max} ปีนับจากปีจดทะเบียน`
        + (v.age > max ? ` — รถคันนี้อายุ ${v.age} ปี ต้องส่งฝ่ายรับประกันภัยพิจารณาอนุมัติ` : ''));
      if (v.body === 'fridge') list.push(`${scope}ไม่คุ้มครองอุปกรณ์ต่อเติมตู้เย็น ลูกค้าต้องกรอกแบบฟอร์มรับผิดชอบอุปกรณ์ต่อเติมเอง`);
      if (state.addons.ncd) list.push('ส่วนลดประวัติดีสำหรับรถที่ไม่มีเคลม (ไม่ว่าฝ่ายถูกหรือฝ่ายผิด) พิจารณาประวัติตั้งแต่ปีรับประกันภัย 2558');
    }
    if (truck) list.push('ส่วนลดประวัติพิจารณาตามนโยบายของบริษัทฯ ไม่มีการให้ส่วนลดกลุ่ม');
    if (plus || truck) list.push(`อัตราเบี้ย${scope ? `${scope.trim()} ` : ''}สำหรับรถที่ติดตั้งกล้องติดรถยนต์ที่บันทึกภาพเคลื่อนไหวได้`);
    list.push('คำนวณจากตารางอัตราเบี้ยของบริษัทฯ รวมภาษีมูลค่าเพิ่มและอากรแสตมป์แล้ว บริษัทฯ ขอสงวนสิทธิ์ในการพิจารณารับประกันภัยและเปลี่ยนแปลงอัตราเบี้ยโดยไม่ต้องแจ้งให้ทราบล่วงหน้า');
    return list;
  }

  // ---------- navigation ----------
  const depth = () => (history.state && history.state.depth) || 0;
  const PARENT = { plans: 'search', checkout: 'plans', quote: 'checkout' };

  function canShow(view) {
    if (view === 'search') return true;
    if (!isComplete()) return false;
    if (view === 'plans') return true;
    const n = pickedOffers(vehicle()).length;
    if (view === 'checkout') return n > 0;
    if (view === 'quote') return n > 0 && !!state.quote && !!state.customer.name.trim();
    return false;
  }

  function go(view) {
    state.view = view;
    history.pushState({ view, depth: depth() + 1 }, '', `#${view}`);
    render();
    window.scrollTo(0, 0);
  }

  function goBack() {
    if (depth() > 0) {
      history.back();
    } else {
      state.view = PARENT[state.view] || 'search';
      history.replaceState({ view: state.view, depth: 0 }, '', `#${state.view}`);
      render();
      window.scrollTo(0, 0);
    }
  }

  // ---------- views ----------
  const app = $('#app');

  function render() {
    let view = state.view;
    while (!canShow(view)) view = PARENT[view] || 'search';
    if (view !== state.view) {
      state.view = view;
      history.replaceState({ view, depth: depth() }, '', `#${view}`);
    }
    if (view !== 'search') {
      const v = vehicle();
      state.picks = state.picks.filter((p) => resolvePick(v, p));
    }
    document.body.dataset.view = view;
    $('#backBtn').hidden = view === 'search';
    const views = { search: renderSearch, plans: renderPlans, checkout: renderCheckout, quote: renderQuote };
    app.innerHTML = views[view]();
    if (view === 'quote') layoutQuote();
    save();
  }

  function stepHead(num, title, done) {
    return `<div class="step-head"><span class="step-num ${done ? 'is-done' : ''}">${done ? icon('check') : num}</span><h3>${title}</h3></div>`;
  }

  function renderSearch() {
    const brand = getBrand();
    const model = getModel();
    const modelOk = !!(model && model.kind);
    const bodyNeeded = modelOk && needsBody(model.kind);
    const total = bodyNeeded ? 4 : 3;
    const done = [!!brand, modelOk, !!state.year, bodyNeeded && !!state.body].filter(Boolean).length;
    const complete = isComplete();

    return `
      <section class="hero">
        <p class="hero-kicker">${icon('shield')} มิตรแท้ประกันภัย</p>
        <h1>เช็คเบี้ยประกันรถยนต์<br><span>รู้ราคาทันที พร้อมใบเสนอราคา</span></h1>
        <div class="hero-classes"><span>ชั้น 2+</span><span>ชั้น 3+</span><span>ชั้น 3</span></div>
      </section>
      <section class="card finder">
        <div class="progress" aria-hidden="true"><i style="width:${Math.round((done / total) * 100)}%"></i></div>
        <h2 class="finder-title">ค้นหาแผนประกันรถยนต์</h2>
        ${stepBrand(brand)}
        ${brand ? stepModel(brand, model) : ''}
        ${modelOk ? stepYear(model) : ''}
        ${bodyNeeded && state.year ? stepBody(model.kind) : ''}
        <button class="btn btn-primary btn-block see-plans" id="seePlans" data-action="see-plans" ${complete ? '' : 'disabled'}>ดูแผนประกันเลย</button>
      </section>
      ${agentCard()}
      <p class="page-note">เบี้ยประกันจากตารางอัตราเบี้ยมิตรแท้ประกันภัย รวมภาษีมูลค่าเพิ่มและอากรแสตมป์แล้ว</p>`;
  }

  function agentCard() {
    return `
      <a class="agent-card" href="tel:${AGENT.phone.replace(/[^\d+]/g, '')}">
        <span class="agent-ico">${icon('phone')}</span>
        <span class="agent-text"><small>${esc(AGENT.office)}</small><b>${esc(AGENT.name)}</b><span>โทร ${esc(AGENT.phone)}</span></span>
        <span class="agent-call">โทรเลย</span>
      </a>`;
  }

  function stepBrand(brand) {
    const popular = BRANDS.filter((b) => b.popular);
    const inGrid = brand && popular.some((p) => p.id === brand.id);
    return `
      <div class="step" id="step-brand">
        ${stepHead(1, 'เลือกยี่ห้อรถ', !!brand)}
        <div class="brand-grid">
          ${popular.map((p) => `
            <button class="brand-tile ${brand && brand.id === p.id ? 'is-on' : ''}" data-action="brand" data-value="${p.id}" aria-pressed="${!!brand && brand.id === p.id}">
              <span class="wm ${p.name.length > 7 ? 'long' : ''}" style="color:${p.color}">${esc(p.name.toUpperCase())}</span>
              <small>${esc(p.th)}</small>
            </button>`).join('')}
        </div>
        <button class="select-btn ${brand && !inGrid ? 'is-on' : ''}" data-action="brand-more">
          <span>${brand && !inGrid ? esc(brand.name) : 'เลือกยี่ห้ออื่นๆ'}</span>${icon('chev')}
        </button>
      </div>`;
  }

  function stepModel(brand, model) {
    const hasList = brand.models.length > 0;
    const top = brand.models.slice(0, TOP_MODELS);
    if (model && !model.custom && !top.includes(model)) top.push(model);
    const kindChips = Object.keys(KINDS).map((k) => `
      <button class="chip ${state.customKind === k ? 'is-on' : ''}" data-action="kind" data-value="${k}" aria-pressed="${state.customKind === k}">${KINDS[k].label}</button>`).join('');

    return `
      <div class="step" id="step-model">
        ${stepHead(2, 'เลือกรุ่นรถ', !!(model && model.kind))}
        ${hasList ? `
          <div class="chip-grid">
            ${top.map((m) => `<button class="chip ${model === m ? 'is-on' : ''}" data-action="model" data-value="${esc(m.name)}" aria-pressed="${model === m}">${esc(m.name)}</button>`).join('')}
          </div>
          <button class="select-btn ${state.customModel ? 'is-on' : ''}" data-action="model-more">
            <span>${state.customModel ? 'ไม่พบรุ่นรถ (ระบุเอง)' : brand.models.length > TOP_MODELS ? `ค้นหารุ่นอื่นๆ (${brand.models.length} รุ่น)` : 'ไม่พบรุ่นรถ'}</span>${icon('chev')}
          </button>` : ''}
        ${state.customModel ? `
          <div class="custom-box">
            <label class="field">
              <span>ชื่อรุ่นรถ <small>(ไม่บังคับ)</small></span>
              <input id="customModelName" type="text" value="${esc(state.customModelName)}" placeholder="เช่น Corolla Altis" autocomplete="off" maxlength="40">
            </label>
            <p class="field-label">ประเภทรถ</p>
            <div class="chip-grid one-col">${kindChips}</div>
          </div>` : ''}
      </div>`;
  }

  function stepYear(model) {
    const ys = yearsFor(model);
    const top = ys.slice(0, TOP_YEARS);
    if (state.year && !top.includes(state.year)) top.push(state.year);
    return `
      <div class="step" id="step-year">
        ${stepHead(3, 'เลือกปีรถยนต์', !!state.year)}
        <div class="chip-grid">
          ${top.map((y) => `<button class="chip ${state.year === y ? 'is-on' : ''}" data-action="year" data-value="${y}" aria-pressed="${state.year === y}">${yearLabel(y)}</button>`).join('')}
        </div>
        ${ys.length > TOP_YEARS ? `<button class="select-btn" data-action="year-more"><span>เลือกปีอื่นๆ</span>${icon('chev')}</button>` : ''}
      </div>`;
  }

  function stepBody(kind) {
    const pickup = kind === 'pickup';
    const opts = pickup
      ? [['standard', 'กระบะทั่วไป', 'ไม่ได้ต่อเติมตู้เย็น'], ['fridge', 'ต่อเติมตู้เย็น', 'มี / ไม่มีเครื่องทำความเย็น']]
      : [['plain', 'ไม่มีอุปกรณ์พิเศษ', 'ตัวรถมาตรฐาน'], ['equip', 'มีอุปกรณ์พิเศษ', 'ติดตั้งอุปกรณ์พิเศษเพิ่มบนตัวรถ']];
    return `
      <div class="step" id="step-body">
        ${stepHead(4, pickup ? 'ลักษณะรถกระบะ' : 'อุปกรณ์พิเศษ', !!state.body)}
        <div class="option-list">
          ${opts.map(([val, title, desc]) => `
            <button class="option ${state.body === val ? 'is-on' : ''}" data-action="body" data-value="${val}" aria-pressed="${state.body === val}">
              <span class="radio"></span><span><b>${title}</b><small>${desc}</small></span>
            </button>`).join('')}
        </div>
      </div>`;
  }

  function carSummary(v) {
    const meta = [`ปี ${yearLabel(v.year)}`, KINDS[v.kind].short, `รหัส ${v.code}`];
    if (v.body) meta.push(BODY_LABEL[v.body]);
    return `
      <section class="card car-summary">
        <div class="car-row">
          <span class="car-ico">${icon(v.kind.startsWith('truck') ? 'truck' : 'car')}</span>
          <div class="car-text"><b>${esc(v.name)}</b><small>${meta.join(' · ')}</small></div>
          <button class="link-btn" data-action="edit-car">แก้ไข</button>
        </div>
        ${v.kind === 'car' ? `
          <div class="usage">
            <span>การใช้รถ</span>
            <div class="seg small">
              <button class="${state.usage === 'personal' ? 'is-on' : ''}" data-action="usage" data-value="personal">ส่วนบุคคล</button>
              <button class="${state.usage === 'commercial' ? 'is-on' : ''}" data-action="usage" data-value="commercial">เพื่อการพาณิชย์</button>
            </div>
          </div>` : ''}
      </section>`;
  }

  function renderPlans() {
    const v = vehicle();
    const offers = buildOffers(v);
    const counts = { '2+': 0, '3+': 0, 3: 0 };
    offers.forEach((o) => { counts[o.cls]++; });
    if (state.filter !== 'all' && !counts[state.filter]) state.filter = 'all';
    const shown = state.filter === 'all' ? offers : offers.filter((o) => o.cls === state.filter);
    const block = plusBlockReason(v);
    const notices = [];
    if (block && !v.kind.startsWith('truck')) notices.push(block);
    if (v.brand.group === 'other' || (v.model && v.model.custom)) {
      notices.push('รถที่ไม่มีในรายการ บริษัทฯ จะพิจารณาการรับประกันภัยอีกครั้ง (ป.2+ / ป.3+ รับเฉพาะรถญี่ปุ่นและรถตลาด)');
    }

    const tabs = [['all', 'ทั้งหมด', offers.length], ['2+', 'ชั้น 2+', counts['2+']], ['3+', 'ชั้น 3+', counts['3+']], ['3', 'ชั้น 3', counts[3]]]
      .filter(([id, , n]) => id === 'all' || n > 0);
    const withDeduct = shown.find((o) => o.type !== 'tawikoon');

    return `
      ${carSummary(v)}
      ${notices.map((n) => `<div class="notice">${icon('info')}<p>${esc(n)}</p></div>`).join('')}
      ${offers.length ? `
        <div class="tabs" role="tablist">
          ${tabs.map(([id, label, n]) => `<button role="tab" class="tab ${state.filter === id ? 'is-on' : ''}" data-action="filter" data-value="${id}" aria-selected="${state.filter === id}">${label}<span>${n}</span></button>`).join('')}
        </div>
        ${withDeduct ? `
          <div class="deduct">
            <p class="field-label">ค่าเสียหายส่วนแรก (Deduct)<small>${withDeduct.type === 'truck' ? 'ต่อทรัพย์สินบุคคลภายนอก' : 'ใช้กับแผนชั้น 2+ และ 3+'}</small></p>
            <div class="seg">
              <button class="${state.deduct ? 'is-on' : ''}" data-action="deduct" data-value="1">มี ${money(withDeduct.deductAmount)} บาท<small>เบี้ยถูกกว่า</small></button>
              <button class="${!state.deduct ? 'is-on' : ''}" data-action="deduct" data-value="0">ไม่มี<small>ไม่ต้องจ่ายส่วนแรก</small></button>
            </div>
          </div>` : ''}
        <p class="result-count">พบ ${shown.length} แผน · เรียงจากเบี้ยต่ำสุด · เลือกได้สูงสุด ${MAX_PICKS} แผน</p>
        <div class="offer-list">${shown.map((o) => offerCard(o, v)).join('')}</div>
        ${agentCard()}
        <p class="page-note">เบี้ยประกันรวมภาษีมูลค่าเพิ่มและอากรแสตมป์แล้ว · บริษัทฯ ขอสงวนสิทธิ์ในการพิจารณารับประกันภัย</p>
        ${pickTray(v)}`
      : `
        <section class="card empty">
          ${icon('info')}
          <h3>ไม่มีแผนที่คำนวณจากตารางเบี้ยได้</h3>
          <p>กรุณาติดต่อ Mittare Contact Center <a href="tel:${R.contact.center.replace(/-/g, '')}">${R.contact.center}</a></p>
          <button class="btn btn-ghost" data-action="edit-car">เลือกรถใหม่</button>
        </section>`}`;
  }

  function offerCard(o, v) {
    const sumField = o.type === 'plus'
      ? `<label class="sum-field">
          <span>ทุนรถชนรถ</span>
          <select data-action="sum" data-pid="${o.pid}" aria-label="ทุนประกันรถชนรถ">
            ${o.sums.map((s) => `<option value="${s}" ${s === o.sum ? 'selected' : ''}>${money(s)} บาท</option>`).join('')}
          </select>${icon('chev')}
        </label>`
      : '';
    const deductTag = o.type === 'tawikoon' ? '' : `<span class="tag">${o.deductible ? `Deduct ${money(o.deductible)}` : 'ไม่มี Deduct'}</span>`;
    const notes = offerNotes(o, v);
    const picked = isPicked(o);
    const rows = rowsFor([o]);

    return `
      <article class="offer ${picked ? 'is-picked' : ''}">
        <div class="offer-top">
          <span class="cls ${CLS_CLASS[o.cls]}">ชั้น ${o.cls}</span>
          ${o.tier ? `<span class="tier t-${o.tier.toLowerCase()}">${o.tier}</span>` : ''}
          ${deductTag}
        </div>
        <div class="offer-main">
          <div class="offer-name"><h3>${esc(o.product)}</h3><p>${esc(o.planTh)}</p></div>
          <div class="price"><b>${money(o.price)}</b><small>บาท/ปี</small></div>
        </div>
        ${sumField}
        <ul class="hl">
          ${highlights(o).map(([ok, t]) => `<li class="${ok ? 'ok' : 'no'}">${icon(ok ? 'check' : 'x')}<span>${esc(t)}</span></li>`).join('')}
        </ul>
        ${notes.length ? `<div class="notes">${notes.map((n) => `<span class="note ${n.warn ? 'warn' : ''}">${icon(n.icon)}${esc(n.text)}</span>`).join('')}</div>` : ''}
        <details class="cov" data-key="${o.key}" ${openCov.has(o.key) ? 'open' : ''}>
          <summary>ดูความคุ้มครองทั้งหมด ${icon('chev')}</summary>
          <table class="cov-table"><tbody>
            ${rows.map((r) => {
              const val = coverageValue(r.id, o, v);
              return `<tr><th>${rowLabel(r, [o])}</th><td class="${val ? '' : 'no'}">${val || 'ไม่คุ้มครอง'}</td></tr>`;
            }).join('')}
          </tbody></table>
        </details>
        <button class="btn ${picked ? 'btn-primary' : 'btn-outline'} btn-block pick-btn" data-action="pick" data-value="${o.key}" aria-pressed="${picked}">
          ${icon(picked ? 'check' : 'plus')}${picked ? 'เลือกแล้ว' : 'เลือกแผนนี้'}
        </button>
      </article>`;
  }

  function pickTray(v) {
    const offers = pickedOffers(v);
    if (!offers.length) return '';
    return `
      <div class="bottom-bar tray">
        <div class="bottom-inner col">
          <div class="tray-chips">
            ${offers.map((o) => `
              <span class="pchip">
                <span><b>${esc(shortName(o))}</b><small>${esc(pickDetail(o))}</small></span>
                <button data-action="unpick" data-value="${o.pickIndex}" aria-label="เอา ${esc(shortName(o))} ออก">${icon('x')}</button>
              </span>`).join('')}
          </div>
          <div class="tray-row">
            <span>เลือกแล้ว <b>${offers.length}</b> / ${MAX_PICKS} แผน</span>
            <button class="btn btn-primary" data-action="to-checkout">ขอใบเสนอราคา</button>
          </div>
        </div>
      </div>`;
  }

  function radioList(action, items, current) {
    return `<div class="option-list compact">
      ${items.map(([val, title, extra]) => `
        <button class="option ${String(current) === String(val) ? 'is-on' : ''}" data-action="${action}" data-value="${val}" aria-pressed="${String(current) === String(val)}">
          <span class="radio"></span><span><b>${title}</b></span>${extra ? `<em>${extra}</em>` : ''}
        </button>`).join('')}
    </div>`;
  }

  function pickCard(o) {
    const opts = [];
    if (o.type === 'plus') {
      opts.push(`
        <label class="mini-select">
          <span>ทุนรถชนรถ</span>
          <select data-action="pick-sum" data-index="${o.pickIndex}">
            ${o.sums.map((s) => `<option value="${s}" ${s === o.sum ? 'selected' : ''}>${money(s)}</option>`).join('')}
          </select>${icon('chev')}
        </label>`);
    }
    if (o.type !== 'tawikoon') {
      opts.push(`
        <label class="mini-select">
          <span>ค่าเสียหายส่วนแรก</span>
          <select data-action="pick-deduct" data-index="${o.pickIndex}">
            <option value="1" ${o.deductible ? 'selected' : ''}>มี ${money(o.deductAmount)}</option>
            <option value="0" ${o.deductible ? '' : 'selected'}>ไม่มี</option>
          </select>${icon('chev')}
        </label>`);
    }
    return `
      <article class="card pick-card">
        <div class="offer-top">
          <span class="cls ${CLS_CLASS[o.cls]}">ชั้น ${o.cls}</span>
          ${o.tier ? `<span class="tier t-${o.tier.toLowerCase()}">${o.tier}</span>` : ''}
          <button class="icon-btn remove" data-action="unpick" data-value="${o.pickIndex}" aria-label="เอาแผนนี้ออก">${icon('x')}</button>
        </div>
        <div class="offer-main">
          <div class="offer-name"><h3>${esc(o.product)}</h3><p>${esc(o.planTh)}</p></div>
          <div class="price"><b>${money(o.price)}</b><small>บาท/ปี</small></div>
        </div>
        ${opts.length ? `<div class="pick-opts ${opts.length === 1 ? 'one' : ''}">${opts.join('')}</div>` : ''}
      </article>`;
  }

  function renderCheckout() {
    const v = vehicle();
    const offers = pickedOffers(v);
    const anyPlus = offers.some((o) => o.type === 'plus');
    const cmi = offers.map((o) => cmiAmount(o, v)).find(Boolean) || 0;
    const rules = R.plusRules;
    const totals = offers.map((o) => ({ o, p: pricing(o, v) }));
    const minTotal = Math.min(...totals.map((t) => t.p.total));

    const extras = [];
    if (anyPlus) {
      const note = offers.some((o) => o.type !== 'plus') ? '<small>ใช้กับแผนชั้น 2+ และ 3+</small>' : '';
      extras.push(`
        <p class="field-label">ส่วนลดประวัติดี${note || '<small>ไม่มีเคลมทั้งฝ่ายถูกและฝ่ายผิด</small>'}</p>
        ${radioList('ncd', rules.noClaimDiscount.map((d) => [d.years, d.label, d.amount ? `-${money(d.amount)}` : '']), state.addons.ncd)}`);
      extras.push(`
        <p class="field-label">ความคุ้มครองชีวิต ร่างกาย บุคคลภายนอก${note}</p>
        ${radioList('tpbi', rules.tpbiUpgrade.map((u) => [u.perPerson, `${money(u.perPerson)} บาท/คน${u.amount ? '' : ' (มาตรฐาน)'}`, u.amount ? `+${money(u.amount)}` : '']), state.addons.tpbi)}`);
    }
    if (cmi) {
      extras.push(`
        <button class="toggle-row ${state.addons.cmi ? 'is-on' : ''}" data-action="cmi" aria-pressed="${state.addons.cmi}">
          <span><b>ซื้อรวม พ.ร.บ.</b><small>ประกันภาคบังคับ รหัส ${v.code}</small></span>
          <em>+${money(cmi)}</em><span class="switch"></span>
        </button>`);
    }

    return `
      <div class="section-head">
        <h2>แผนที่เลือก <span>${offers.length} แผน</span></h2>
        <p>${icon(v.kind.startsWith('truck') ? 'truck' : 'car')} ${esc(v.name)} · ปี ${yearLabel(v.year)}</p>
      </div>
      ${offers.map((o) => pickCard(o)).join('')}
      ${offers.length < MAX_PICKS ? `<button class="add-more" data-action="back">${icon('plus')}เลือกแผนเพิ่ม (ได้อีก ${MAX_PICKS - offers.length} แผน)</button>` : ''}

      ${extras.length ? `<section class="card"><h2 class="card-title">ส่วนลดและความคุ้มครองเพิ่ม <small>ไม่บังคับ</small></h2>${extras.join('')}</section>` : ''}

      <section class="card">
        <h2 class="card-title">ข้อมูลสำหรับใบเสนอราคา</h2>
        <label class="field">
          <span>ชื่อลูกค้า <i class="req">*</i></span>
          <input id="custName" type="text" value="${esc(state.customer.name)}" placeholder="เช่น คุณสมชาย ใจดี" autocomplete="name" maxlength="80">
          <em class="field-error" id="nameError" hidden>กรุณากรอกชื่อลูกค้า</em>
        </label>
        <label class="field">
          <span>เบอร์โทรศัพท์ <small>(ไม่บังคับ)</small></span>
          <input id="custPhone" type="tel" inputmode="tel" value="${esc(state.customer.phone)}" placeholder="08x-xxx-xxxx" autocomplete="tel" maxlength="20">
          <em class="field-error" id="phoneError" hidden>เบอร์โทรไม่ถูกต้อง</em>
        </label>
      </section>

      <section class="card">
        <h2 class="card-title">สรุปเบี้ยประกัน</h2>
        <dl class="bd plan-totals">
          ${totals.map(({ o, p }) => {
            const parts = [`เบี้ย ${money(p.premium)}`];
            if (p.ncd) parts.push(`ส่วนลด ${signed(p.ncd)}`);
            if (p.tpbi) parts.push(`วงเงินบุคคลภายนอก ${signed(p.tpbi)}`);
            if (p.cmi) parts.push(`พ.ร.บ. ${signed(p.cmi)}`);
            return `<div><dt><b>${esc(shortName(o))}</b><small>${esc(pickDetail(o))}${parts.length > 1 ? `<br>${esc(parts.join(' · '))}` : ''}</small></dt><dd>${money(p.total)}</dd></div>`;
          }).join('')}
        </dl>
      </section>

      <div class="bottom-bar">
        <div class="bottom-inner">
          <div><small>${offers.length > 1 ? `ใบเสนอราคา ${offers.length} แผน · เริ่มต้น` : 'รวมทั้งสิ้น'}</small><b>${money(minTotal)} <span>บาท</span></b></div>
          <button class="btn btn-primary" data-action="make-quote">ออกใบเสนอราคา</button>
        </div>
      </div>`;
  }

  // ---------- quote (A4 หนึ่งหน้า) ----------
  function renderQuote() {
    return `
      <div class="quote-actions">
        <button class="btn btn-primary" data-action="save-image">${icon('image')}บันทึกรูป</button>
        <button class="btn btn-ghost" data-action="print">${icon('print')}PDF</button>
        <button class="btn btn-ghost" data-action="share">${icon('share')}แชร์</button>
      </div>
      <p class="quote-hint">ใบเสนอราคาขนาด A4 หนึ่งหน้า · ถ่างนิ้วเพื่อซูมดู</p>
      <div class="quote-stage" id="quoteStage">
        <div class="quote-scaler" id="quoteScaler">${quotePage()}</div>
      </div>
      <button class="btn btn-ghost btn-block restart" data-action="restart">${icon('refresh')}เช็คเบี้ยคันใหม่</button>`;
  }

  function quotePage() {
    const v = vehicle();
    const offers = pickedOffers(v);
    const n = offers.length;
    const q = state.quote;
    const date = new Date(q.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    const prices = offers.map((o) => pricing(o, v));
    const anyPlus = offers.some((o) => o.type === 'plus');
    const anyDeduct = offers.some((o) => o.type !== 'tawikoon');
    const labelWidth = { 1: 46, 2: 34, 3: 28, 4: 25 }[n];
    const tpbiFor = (o) => (o.type === 'plus' ? state.addons.tpbi : null);

    const car = [
      ['ยี่ห้อ / รุ่น', esc(v.name)],
      ['ปีรถ', yearLabel(v.year)],
      ['ประเภทรถ', `${KINDS[v.kind].label} · รหัส ${v.code}`],
    ];
    if (v.body) car.push(['ลักษณะรถ', BODY_LABEL[v.body]]);
    else if (v.kind === 'car') car.push(['การใช้รถ', state.usage === 'commercial' ? 'เพื่อการพาณิชย์' : 'ส่วนบุคคล']);

    const row = (label, cells, cls = '') => `<tr class="${cls}"><th>${label}</th>${cells.join('')}</tr>`;
    const cell = (val) => `<td class="${val == null ? 'no' : ''}">${val == null ? 'ไม่คุ้มครอง' : val}</td>`;
    const dash = '<td class="na">—</td>';
    const group = (title) => `<tr class="grp"><td colspan="${n + 1}">${title}</td></tr>`;

    const body = [];
    body.push(group('รายละเอียดแผน'));
    if (anyPlus) body.push(row('ทุนประกันรถชนรถ', offers.map((o) => (o.type === 'plus' ? `<td>${money(o.sum)}</td>` : dash))));
    if (anyDeduct) {
      body.push(row(offers.some((o) => o.type === 'truck') ? 'ค่าเสียหายส่วนแรก<small>ต่อทรัพย์สินบุคคลภายนอก</small>' : 'ค่าเสียหายส่วนแรก (Deduct)',
        offers.map((o) => (o.type === 'tawikoon' ? dash : `<td>${o.deductible ? money(o.deductible) : 'ไม่มี'}</td>`))));
    }
    body.push(group('ความคุ้มครอง (บาท)'));
    rowsFor(offers).forEach((r) => {
      body.push(row(rowLabel(r, offers), offers.map((o) => {
        if (r.plus2Only && o.pid !== 'plus2') return cell(null);
        return cell(coverageValue(r.id, o, v, tpbiFor(o)));
      })));
    });
    body.push(group('เบี้ยประกันภัย (บาท)'));
    body.push(row('เบี้ยประกันภัย<small>รวมภาษีมูลค่าเพิ่มและอากรแสตมป์</small>', prices.map((p) => `<td>${money(p.premium)}</td>`)));
    if (prices.some((p) => p.ncd)) {
      const ncd = R.plusRules.noClaimDiscount.find((x) => x.years === state.addons.ncd);
      body.push(row(`ส่วนลดประวัติดี<small>${esc(ncd.label)}</small>`, offers.map((o, i) => (o.type === 'plus' ? `<td class="minus">${signed(prices[i].ncd)}</td>` : dash))));
    }
    if (prices.some((p) => p.tpbi)) {
      body.push(row(`เพิ่มวงเงินชีวิตบุคคลภายนอก<small>เป็น ${money(state.addons.tpbi)} บาท/คน</small>`, offers.map((o, i) => (o.type === 'plus' ? `<td>${signed(prices[i].tpbi)}</td>` : dash))));
    }
    if (prices.some((p) => p.cmi)) {
      body.push(row('พ.ร.บ.<small>รวมภาษีอากร</small>', prices.map((p) => (p.cmi ? `<td>${signed(p.cmi)}</td>` : dash))));
    }
    body.push(row('รวมทั้งสิ้น', prices.map((p) => `<td>${money(p.total)}</td>`), 'total'));

    return `
      <article class="qp" id="quoteDoc">
        <div class="qp-inner">
          <header class="qp-head">
            <div class="qp-brand">
              ${icon('shield')}
              <div><small>${esc(AGENT.office)}</small><b>${esc(AGENT.name)}</b><span>${icon('phone')}โทร ${esc(AGENT.phone)}</span></div>
            </div>
            <div class="qp-title">
              <h1>ใบเสนอราคา</h1>
              <p>ประกันภัยรถยนต์ภาคสมัครใจ</p>
              <p class="qp-insurer">ผู้รับประกันภัย บริษัท มิตรแท้ประกันภัย จำกัด (มหาชน)</p>
            </div>
          </header>
          <div class="qp-meta">
            <div><small>เรียน</small><b>${esc(state.customer.name.trim())}</b>${state.customer.phone.trim() ? `<span>โทร ${esc(state.customer.phone.trim())}</span>` : ''}</div>
            <div><small>เลขที่</small><b>${esc(q.no)}</b></div>
            <div><small>วันที่</small><b>${date}</b></div>
          </div>
          <section class="qp-sec">
            <h4>รายละเอียดรถยนต์</h4>
            <dl class="qp-car">${car.map(([k, val]) => `<div><dt>${k}</dt><dd>${val}</dd></div>`).join('')}</dl>
          </section>
          <section class="qp-sec">
            <h4>${n > 1 ? `เปรียบเทียบแผนประกันภัย ${n} แผน` : 'แผนประกันภัย'}</h4>
            <table class="qp-table">
              <colgroup><col style="width:${labelWidth}%">${offers.map(() => '<col>').join('')}</colgroup>
              <thead>
                <tr>
                  <th></th>
                  ${offers.map((o) => `
                    <th>
                      <span class="qp-badges"><span class="cls ${CLS_CLASS[o.cls]}">ชั้น ${o.cls}</span>${o.tier ? `<span class="tier t-${o.tier.toLowerCase()}">${o.tier}</span>` : ''}</span>
                      <b>${esc(o.product)}</b>
                      <small>${esc(o.planTh)}</small>
                    </th>`).join('')}
                </tr>
              </thead>
              <tbody>${body.join('')}</tbody>
            </table>
          </section>
          <section class="qp-sec qp-cond">
            <h4>เงื่อนไข</h4>
            <ol>${quoteConditions(v, offers).map((c) => `<li>${esc(c)}</li>`).join('')}</ol>
          </section>
          <footer class="qp-foot">
            <span>Mittare Contact Center <b>${R.contact.center}</b></span>
            <span>แจ้งอุบัติเหตุ 24 ชม. <b>${R.contact.accident}</b></span>
          </footer>
        </div>
      </article>`;
  }

  // ย่อขนาดตัวอักษรจนเนื้อหาพอดี A4 หนึ่งหน้า แล้วย่อทั้งหน้าให้พอดีความกว้างจอ
  function layoutQuote() {
    const page = $('#quoteDoc');
    if (!page) return;
    const inner = page.querySelector('.qp-inner');
    // วัดความสูงจริงของเนื้อหา (ไม่ยืดเต็มหน้า) และเผื่อที่ว่างไว้ เพราะตอนบันทึกรูปตัวอักษรกว้างกว่าบนจอเล็กน้อย
    page.classList.add('is-measuring');
    let fs = 13;
    page.style.setProperty('--qfs', `${fs}px`);
    while (inner.offsetHeight > PAGE_H - 24 && fs > 8) {
      fs -= 0.25;
      page.style.setProperty('--qfs', `${fs}px`);
    }
    page.classList.remove('is-measuring');
    scaleQuote();
  }

  function scaleQuote() {
    const stage = $('#quoteStage');
    const scaler = $('#quoteScaler');
    if (!stage || !scaler) return;
    const s = Math.min(1, stage.clientWidth / PAGE_W);
    scaler.style.transform = `scale(${s})`;
    stage.style.height = `${Math.ceil(PAGE_H * s)}px`;
  }

  function shareText() {
    const v = vehicle();
    const offers = pickedOffers(v);
    const lines = [
      'ใบเสนอราคาประกันภัยรถยนต์ มิตรแท้ประกันภัย',
      `เลขที่ ${state.quote.no}`,
      `ลูกค้า: ${state.customer.name.trim()}`,
      `รถ: ${v.name} ปี ${yearLabel(v.year)}`,
      '',
    ];
    offers.forEach((o, i) => {
      const p = pricing(o, v);
      lines.push(`${i + 1}) ${shortName(o)} ${o.product}`);
      lines.push(`   ${pickDetail(o)}`);
      lines.push(`   เบี้ยรวม ${money(p.total)} บาท`);
    });
    const extra = [];
    const ncd = R.plusRules.noClaimDiscount.find((x) => x.years === state.addons.ncd);
    if (ncd && ncd.amount && offers.some((o) => o.type === 'plus')) extra.push(`ส่วนลดประวัติดี ${money(ncd.amount)} บาท`);
    if (state.addons.tpbi !== 500000 && offers.some((o) => o.type === 'plus')) extra.push(`วงเงินชีวิตบุคคลภายนอก ${money(state.addons.tpbi)} บาท/คน`);
    if (state.addons.cmi) extra.push('รวม พ.ร.บ.');
    if (extra.length) lines.push('', `(รวม ${extra.join(' · ')} แล้ว)`);
    lines.push('', `${AGENT.office} ${AGENT.name}`, `โทร ${AGENT.phone}`);
    return lines.join('\n');
  }

  // ---------- bottom sheet ----------
  const sheetEl = $('#sheet');
  let sheet = null;
  let skipPop = false;

  function openSheet(cfg) {
    sheet = { query: '', ...cfg };
    sheetEl.innerHTML = `
      <div class="sheet-backdrop" data-action="sheet-close"></div>
      <div class="sheet-panel" role="dialog" aria-modal="true" aria-label="${esc(cfg.title)}">
        <div class="sheet-head"><b>${esc(cfg.title)}</b><button class="icon-btn" data-action="sheet-close" aria-label="ปิด">${icon('x')}</button></div>
        ${cfg.search ? `<div class="sheet-search">${icon('search')}<input id="sheetSearch" type="search" placeholder="${esc(cfg.placeholder || 'ค้นหา')}" autocomplete="off"></div>` : ''}
        <ul class="sheet-list" id="sheetList"></ul>
      </div>`;
    drawSheetList();
    sheetEl.hidden = false;
    document.body.classList.add('no-scroll');
    history.pushState({ view: state.view, depth: depth() + 1, sheet: true }, '');
    const input = $('#sheetSearch');
    if (input && window.matchMedia('(pointer: fine)').matches) input.focus();
  }

  function drawSheetList() {
    const q = sheet.query.trim().toLowerCase();
    const items = sheet.items.filter((it) => !q || `${it.label} ${it.sub || ''}`.toLowerCase().includes(q));
    const extra = sheet.extra ? sheet.extra(sheet.query.trim()) : null;
    const all = extra ? items.concat(extra) : items;
    $('#sheetList').innerHTML = all.length
      ? all.map((it) => `
          <li><button class="${it.selected ? 'is-on' : ''} ${it.muted ? 'muted' : ''}" data-action="sheet-pick" data-value="${esc(it.value)}">
            <span>${esc(it.label)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}${it.selected ? icon('check') : ''}
          </button></li>`).join('')
      : '<li class="sheet-empty">ไม่พบรายการ</li>';
  }

  function hideSheet() {
    sheet = null;
    sheetEl.hidden = true;
    sheetEl.innerHTML = '';
    document.body.classList.remove('no-scroll');
  }

  function closeSheet() {
    if (!sheet) return;
    hideSheet();
    skipPop = true;
    history.back();
  }

  // ---------- actions ----------
  function scrollToStep(id) {
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function nextStepId() {
    const m = getModel();
    if (!m || !m.kind) return 'step-model';
    if (!state.year) return 'step-year';
    if (needsBody(m.kind) && !state.body) return 'step-body';
    return 'seePlans';
  }

  function resetCar() {
    Object.assign(state, { modelName: null, customModel: false, customModelName: '', customKind: null, year: null, body: null, usage: 'personal' });
  }

  function selectBrand(id, customName) {
    if (state.brandId === id && !customName) return;
    state.brandId = id;
    state.customBrand = customName || '';
    resetCar();
    if (id === 'other') state.customModel = true;
    render();
    scrollToStep('step-model');
  }

  function selectModel(name) {
    const prev = getModel();
    state.modelName = name;
    state.customModel = false;
    const m = getModel();
    if (!prev || m.kind !== prev.kind) state.body = null;
    if (state.year && !yearsFor(m).includes(state.year)) state.year = null;
    render();
    scrollToStep(nextStepId());
  }

  function pickCustomModel() {
    state.customModel = true;
    state.modelName = null;
    state.customKind = null;
    state.body = null;
    render();
    scrollToStep('step-model');
  }

  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  function togglePick(key) {
    const o = buildOffers(vehicle()).find((x) => x.key === key);
    if (!o) return;
    const p = pickFromOffer(o);
    const idx = state.picks.findIndex((x) => pickId(x) === pickId(p));
    if (idx >= 0) {
      state.picks.splice(idx, 1);
    } else if (state.picks.length >= MAX_PICKS) {
      toast(`เลือกได้สูงสุด ${MAX_PICKS} แผนต่อใบเสนอราคา`);
      return;
    } else {
      state.picks.push(p);
    }
    render();
  }

  function updatePick(index, patch) {
    const next = { ...state.picks[index], ...patch };
    if (state.picks.some((p, j) => j !== index && pickId(p) === pickId(next))) {
      toast('มีแผนนี้ในใบเสนอราคาแล้ว');
    } else {
      state.picks[index] = next;
    }
    render();
  }

  function makeQuote() {
    const name = state.customer.name.trim();
    const phone = state.customer.phone.trim();
    $('#nameError').hidden = !!name;
    const digits = phone.replace(/\D/g, '');
    const phoneBad = !!phone && (digits.length < 9 || digits.length > 10);
    $('#phoneError').hidden = !phoneBad;
    if (!name) { $('#custName').focus(); return; }
    if (phoneBad) { $('#custPhone').focus(); return; }
    const now = new Date();
    const pad = (x) => String(x).padStart(2, '0');
    state.quote = {
      no: `MT${String(now.getFullYear() + 543).slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      date: now.toISOString(),
    };
    go('quote');
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // html-to-image อ่านสไตล์ชีตข้าม origin ของ Google Fonts ไม่ได้ → ฝังฟอนต์ไทย/ละตินเองเป็น data URL
  // ไม่เช่นนั้นรูปจะใช้ฟอนต์สำรองที่กว้างกว่า ทำให้ข้อความตัดบรรทัดทับกัน
  let fontCSS = null;
  async function embeddedFontCSS() {
    if (fontCSS !== null) return fontCSS;
    try {
      const link = document.querySelector('link[href*="fonts.googleapis.com/css2"]');
      const raw = await (await fetch(link.href)).text();
      let css = raw.split('/* ')
        .filter((b) => b.startsWith('thai */') || b.startsWith('latin */'))
        .map((b) => b.slice(b.indexOf('*/') + 2))
        .join('\n');
      const urls = [...new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)'"\s]+/g) || [])];
      const toDataURL = (blob) => new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.readAsDataURL(blob);
      });
      await Promise.all(urls.map(async (u) => {
        const data = await toDataURL(await (await fetch(u)).blob());
        css = css.split(u).join(data);
      }));
      fontCSS = css;
    } catch (e) {
      fontCSS = '';
    }
    return fontCSS;
  }

  async function saveImage(btn) {
    btn.disabled = true;
    toast('กำลังสร้างรูปภาพ…');
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js');
      const blob = await window.htmlToImage.toBlob($('#quoteDoc'), {
        width: PAGE_W,
        height: PAGE_H,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        fontEmbedCSS: await embeddedFontCSS(),
      });
      const file = new File([blob], `ใบเสนอราคา-${state.quote.no}.png`, { type: 'image/png' });
      const mobile = window.matchMedia('(pointer: coarse)').matches;
      if (mobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'ใบเสนอราคาประกันภัยรถยนต์' });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        toast('บันทึกรูปภาพแล้ว');
      }
    } catch (e) {
      if (e && e.name !== 'AbortError') toast('สร้างรูปภาพไม่สำเร็จ ลองใช้ปุ่ม PDF');
    } finally {
      btn.disabled = false;
    }
  }

  async function share() {
    const text = shareText();
    try {
      if (navigator.share) {
        await navigator.share({ title: 'ใบเสนอราคาประกันภัยรถยนต์', text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast('คัดลอกข้อความใบเสนอราคาแล้ว');
    } catch (e) {
      if (e && e.name !== 'AbortError') toast('แชร์ไม่สำเร็จ');
    }
  }

  const openCov = new Set();

  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (d.matches && d.matches('details.cov')) d.open ? openCov.add(d.dataset.key) : openCov.delete(d.dataset.key);
  }, true);

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.tagName === 'SELECT') return;
    const val = el.dataset.value;

    switch (el.dataset.action) {
      case 'back': goBack(); break;
      case 'brand': selectBrand(val); break;
      case 'brand-more': {
        const current = getBrand();
        openSheet({
          title: 'เลือกยี่ห้อรถ',
          search: true,
          placeholder: 'ค้นหายี่ห้อ เช่น Toyota, BYD',
          items: [...BRANDS].sort((a, b) => a.name.localeCompare(b.name)).map((b) => ({ value: b.id, label: b.name, sub: b.th, selected: current && current.id === b.id })),
          extra: (q) => [{ value: '__other', label: q ? `ใช้ยี่ห้อ “${q}”` : 'ไม่พบยี่ห้อรถ', sub: 'ยี่ห้ออื่นที่ไม่มีในรายการ', muted: true }],
          onPick: (v, q) => (v === '__other' ? selectBrand('other', q) : selectBrand(v)),
        });
        break;
      }
      case 'model': selectModel(val); break;
      case 'model-more': {
        const brand = getBrand();
        const model = getModel();
        openSheet({
          title: `รุ่นรถ ${brand.name}`,
          search: brand.models.length > TOP_MODELS,
          placeholder: 'ค้นหารุ่นรถ',
          items: brand.models.map((m) => ({ value: m.name, label: m.name, sub: KINDS[m.kind].short, selected: model === m })),
          extra: () => [{ value: '__custom', label: 'ไม่พบรุ่นรถ', sub: 'ระบุรุ่นและประเภทรถเอง', muted: true }],
          onPick: (v) => (v === '__custom' ? pickCustomModel() : selectModel(v)),
        });
        break;
      }
      case 'kind':
        state.customKind = val;
        state.body = null;
        render();
        scrollToStep(nextStepId());
        break;
      case 'year':
        state.year = Number(val);
        render();
        scrollToStep(nextStepId());
        break;
      case 'year-more': {
        const model = getModel();
        openSheet({
          title: 'เลือกปีรถยนต์',
          items: yearsFor(model).map((y) => ({ value: String(y), label: yearLabel(y), selected: state.year === y })),
          onPick: (v) => { state.year = Number(v); render(); scrollToStep(nextStepId()); },
        });
        break;
      }
      case 'body':
        state.body = val;
        render();
        scrollToStep('seePlans');
        break;
      case 'see-plans':
        if (!isComplete()) break;
        if (state.picksSig !== carSig()) {
          state.picks = [];
          state.picksSig = carSig();
          state.filter = 'all';
        }
        go('plans');
        break;
      case 'edit-car':
        if (depth() > 0 && history.state && history.state.view === 'plans') goBack();
        else go('search');
        break;
      case 'usage': state.usage = val; render(); break;
      case 'filter': state.filter = val; render(); break;
      case 'deduct': state.deduct = val === '1'; render(); break;
      case 'pick': togglePick(val); break;
      case 'unpick': state.picks.splice(Number(val), 1); render(); break;
      case 'to-checkout': go('checkout'); break;
      case 'ncd': state.addons.ncd = Number(val); render(); break;
      case 'tpbi': state.addons.tpbi = Number(val); render(); break;
      case 'cmi': state.addons.cmi = !state.addons.cmi; render(); break;
      case 'make-quote': makeQuote(); break;
      case 'save-image': saveImage(el); break;
      case 'print': window.print(); break;
      case 'share': share(); break;
      case 'restart': {
        state = { ...initialState(), deduct: state.deduct };
        history.replaceState({ view: 'search', depth: 0 }, '', '#search');
        render();
        window.scrollTo(0, 0);
        break;
      }
      case 'sheet-close': closeSheet(); break;
      case 'sheet-pick': {
        const { onPick, query } = sheet;
        closeSheet();
        onPick(val, query.trim());
        break;
      }
      default: break;
    }
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    const action = el.dataset && el.dataset.action;
    if (action === 'sum') {
      state.sums[el.dataset.pid] = Number(el.value);
      render();
    } else if (action === 'pick-sum') {
      updatePick(Number(el.dataset.index), { sum: Number(el.value) });
    } else if (action === 'pick-deduct') {
      updatePick(Number(el.dataset.index), { deduct: el.value === '1' });
    }
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.id === 'sheetSearch' && sheet) { sheet.query = el.value; drawSheetList(); return; }
    if (el.id === 'custName') { state.customer.name = el.value; $('#nameError').hidden = true; save(); return; }
    if (el.id === 'custPhone') { state.customer.phone = el.value; $('#phoneError').hidden = true; save(); return; }
    if (el.id === 'customModelName') { state.customModelName = el.value; save(); }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheet) closeSheet();
  });

  window.addEventListener('resize', scaleQuote);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutQuote);

  window.addEventListener('popstate', (e) => {
    if (skipPop) { skipPop = false; return; }
    if (sheet) { hideSheet(); return; }
    state.view = (e.state && e.state.view) || 'search';
    render();
    window.scrollTo(0, 0);
  });

  // ---------- boot ----------
  const hashView = location.hash.replace('#', '');
  state.view = ['search', 'plans', 'checkout', 'quote'].includes(hashView) ? hashView : 'search';
  history.replaceState({ view: state.view, depth: 0 }, '', `#${state.view}`);
  render();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
