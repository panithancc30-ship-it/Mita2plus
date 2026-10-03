(function () {
  'use strict';

  const R = window.MT_RATES;
  const AGENT = window.MT_AGENT;
  const PA = window.MT_PA;
  const BRANDS = window.MT_BRANDS.map((b) => ({
    ...b,
    models: b.models.map(([name, kind, from, to]) => ({ name, kind, from, to })),
  }));
  const MOTO_BRANDS = window.MT_MOTO_BRANDS.map((b) => ({
    ...b,
    group: 'moto',
    models: b.models.map(([name, cc, from, to]) => ({ name, kind: 'moto', cc, from, to })),
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
    moto: { label: 'รถจักรยานยนต์', short: 'มอเตอร์ไซค์' },
  };
  const CAR_KINDS = ['car', 'pickup', 'van', 'truck6', 'truck10'];
  // แท็บประเภทประกันในหน้าแรก — ประกันอื่น (เช่น อัคคีภัย) เพิ่มต่อท้ายที่นี่
  const VTYPES = {
    car: { label: 'รถยนต์', icon: 'car', noun: 'รถยนต์', brandHint: 'ค้นหายี่ห้อ เช่น Toyota, BYD', modelHint: 'เช่น Corolla Altis' },
    moto: { label: 'มอเตอร์ไซค์', icon: 'moto', noun: 'มอเตอร์ไซค์', brandHint: 'ค้นหายี่ห้อ เช่น Honda, Yamaha', modelHint: 'เช่น Wave 125i' },
    pa: { label: 'อุบัติเหตุ', icon: 'person', noun: 'อุบัติเหตุส่วนบุคคล' },
  };
  // รุ่นมอเตอร์ไซค์ที่ไม่มีในรายการ: เลือกช่วงขนาดเครื่องยนต์ เก็บเป็น cc สูงสุดของช่วง
  const CC_CHOICES = [[110, 'ไม่เกิน 110 cc'], [125, '111 – 125 cc'], [150, '126 – 150 cc'], [200, '151 – 200 cc'], [250, 'เกิน 200 cc']];
  const BODY_LABEL = {
    standard: 'กระบะทั่วไป',
    fridge: 'ต่อเติมตู้เย็น',
    plain: 'ไม่มีอุปกรณ์พิเศษ',
    equip: 'มีอุปกรณ์พิเศษ',
    reg4: 'จดทะเบียน กทม./สมุทรปราการ/อุบลฯ/นครสวรรค์',
    regOther: 'จดทะเบียนจังหวัดอื่น',
  };
  const REG_LABEL = { reg4: 'กทม. สมุทรปราการ อุบลฯ นครสวรรค์', regOther: 'จังหวัดอื่นๆ' };
  const TIER_TH = { PLATINUM: 'แพลทินัม', GOLD: 'โกลด์', SILVER: 'ซิลเวอร์' };
  const CLS_CLASS = { '2+': 'c2p', '3+': 'c3p', 3: 'c3', PLV: 'c2p', PA700: 'c3p', BONE: 'c3' };
  const CLS_ORDER = { '2+': 0, '3+': 1, 3: 2, PLV: 0, PA700: 1, BONE: 2 };
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
    moto: '<circle cx="5.5" cy="16" r="3.5"/><circle cx="18.5" cy="16" r="3.5"/><path d="M5.5 16h6l3.5-6"/><path d="M18.5 16L15 6.5h-2.5"/><path d="M7.5 10.5h5"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z"/><path d="M8.7 12l2.3 2.3 4.3-4.6"/>',
    refresh: '<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 5v6h-6"/>',
    person: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20.5c0-4 3.1-7 7-7s7 3 7 7"/>',
    phone: '<path d="M5.5 3.5h3.2l1.8 4.6-2.2 1.4a11.5 11.5 0 006.2 6.2l1.4-2.2 4.6 1.8v3.2a2 2 0 01-2.1 2A16.5 16.5 0 013.5 5.6a2 2 0 012-2.1z"/>',
  };
  const icon = (name, cls = '') =>
    `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

  // ---------- state ----------
  const initialState = () => ({
    view: 'search',
    vtype: 'car', // แท็บประเภทประกัน (VTYPES)
    brandId: null,
    customBrand: '',
    modelName: null,
    customModel: false,
    customModelName: '',
    customKind: null,
    customCc: null, // มอเตอร์ไซค์รุ่นที่ไม่มีในรายการ (CC_CHOICES)
    paAge: null, // ประกันอุบัติเหตุ: id ช่วงอายุ (PA.ages)
    paOcc: null, // ประกันอุบัติเหตุ: id ชั้นอาชีพ ('1'–'4' | 'student')
    paOccName: '', // ชื่ออาชีพที่เลือกจากช่องค้นหา (ว่าง = เลือกจากปุ่มชั้น)
    year: null,
    body: null, // ขั้นที่ 4: ลักษณะรถกระบะ / อุปกรณ์รถบรรทุก / จังหวัดที่จดทะเบียนมอเตอร์ไซค์
    usage: 'personal',
    custType: 'new', // 'new' = ลูกค้าใหม่ปี 2569, 'old' = ลูกค้าเดิม — ใช้กับ ป.2+/ป.3+ ญี่ปุ่น/รถตลาดเท่านั้น
    deduct: true,
    filter: 'all',
    sums: { plus2: 100000, plus3: 100000, moto: 10000 },
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

  const isMotoTab = () => state.vtype === 'moto';
  const isPaTab = () => state.vtype === 'pa';
  const brandList = () => (isMotoTab() ? MOTO_BRANDS : BRANDS);

  function getBrand() {
    if (state.brandId === 'other') {
      return { id: 'other', name: state.customBrand || 'ยี่ห้ออื่นๆ', th: '', group: 'other', models: [] };
    }
    return brandList().find((b) => b.id === state.brandId) || null;
  }

  function getModel() {
    const brand = getBrand();
    if (!brand) return null;
    if (state.customModel) return { name: state.customModelName.trim(), kind: state.customKind, cc: state.customCc, custom: true };
    return brand.models.find((m) => m.name === state.modelName) || null;
  }

  const ccLabel = (m) => (m.custom ? (CC_CHOICES.find(([cc]) => cc === m.cc) || [])[1] : `${m.cc} cc`);
  const vehicleIcon = (v) => (v.kind === 'pa' ? 'person' : v.kind === 'moto' ? 'moto' : v.kind.startsWith('truck') ? 'truck' : 'car');
  const usageTh = () => (state.usage === 'commercial' ? 'เพื่อการพาณิชย์' : 'ส่วนบุคคล');

  function yearsFor(model) {
    const from = Math.max(model && model.from ? model.from : OLDEST_YEAR, OLDEST_YEAR);
    const to = Math.min(model && model.to ? model.to : THIS_YEAR, THIS_YEAR);
    const ys = [];
    for (let y = to; y >= from; y--) ys.push(y);
    return ys;
  }

  const needsBody = (kind) => kind === 'pickup' || kind === 'truck6' || kind === 'truck10' || kind === 'moto';

  function isComplete() {
    if (isPaTab()) return PA.ages.some((a) => a.id === state.paAge) && PA.occs.some((o) => o.id === state.paOcc);
    const m = getModel();
    return !!(getBrand() && m && m.kind && state.year && (!needsBody(m.kind) || state.body));
  }

  const carSig = () => JSON.stringify([state.vtype, state.brandId, state.customBrand, state.modelName, state.customModel, state.customKind, state.customCc, state.year, state.body, state.paAge, state.paOcc, state.paOccName]);

  // ประกันอุบัติเหตุ: "ผู้เอาประกัน" ใช้แทนรถในทุกหน้า (kind: 'pa')
  function paSubject() {
    const age = PA.ages.find((a) => a.id === state.paAge);
    const group = PA.occs.find((o) => o.id === state.paOcc);
    const student = state.paOcc === 'student';
    const listed = state.paOccName && PA.occList.find(([name]) => name === state.paOccName);
    const occLabel = state.paOccName || (student ? group.label : `อาชีพ${group.label}`);
    return {
      kind: 'pa',
      ageId: age.id,
      ageLabel: age.label,
      student,
      cls: student ? 2 : Number(state.paOcc),
      occLabel,
      occNote: listed && listed[2] ? listed[2] : '',
      occNoteFor: listed && listed[3] ? listed[3] : null, // null = ใช้กับทุกแผน
      name: `อายุ ${age.label} · ${occLabel}`,
      body: null,
    };
  }

  function vehicle() {
    if (isPaTab()) return paSubject();
    const brand = getBrand();
    const model = getModel();
    const kind = model.kind;
    const commercial = state.usage === 'commercial';
    const code = kind === 'moto' ? (commercial ? '620' : '610')
      : kind === 'car' ? (commercial ? '120' : '110') : kind === 'van' ? '210' : '320';
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
  // สินค้า ป.2+/ป.3+ ที่ใช้ได้กับรถคันนี้ (ตามยี่ห้อ/รหัสรถ/ลักษณะตัวถัง/ประเภทลูกค้า)
  function plusProducts(v) {
    if (v.kind !== 'car' && v.kind !== 'pickup') return [];
    if (v.brand.group === 'super') return [];
    if (v.brand.group === 'luxury') return v.code === '110' ? ['plus2_euro', 'plus3_euro'] : [];
    if (v.code === '120') return ['plus2_com', 'plus3_com'];
    if (v.kind === 'pickup' && v.body === 'fridge') return ['plus2_tu', 'plus3_tu'];
    return state.custType === 'old' ? ['plus2', 'plus3'] : ['plus2_new', 'plus3_new'];
  }

  // สวิตช์ "ลูกค้าใหม่/เดิม" มีผลเฉพาะรถญี่ปุ่น/รถตลาดมาตรฐาน (ไม่ใช่ตู้เย็น/ยุโรป/พาณิชย์)
  function custTypeApplicable(v) {
    return (v.kind === 'car' || v.kind === 'pickup')
      && v.brand.group !== 'luxury' && v.brand.group !== 'super'
      && v.code !== '120'
      && !(v.kind === 'pickup' && v.body === 'fridge');
  }

  function plusBlockReason(v) {
    if (v.kind === 'moto') return null;
    if (v.kind !== 'car' && v.kind !== 'pickup') return 'ป.2+ และ ป.3+ รับเฉพาะรถเก๋ง (รหัส 110/120) และรถกระบะไม่เกิน 4 ตัน (รหัส 320)';
    if (v.brand.group === 'super') return `${v.brand.name} เป็นรถกลุ่ม Super Car ไม่สามารถซื้อตามตารางเบี้ยได้ กรุณาติดต่อฝ่ายรับประกันภัย`;
    if (v.brand.group === 'luxury' && v.code !== '110') return `${v.brand.name} ที่ใช้เพื่อการพาณิชย์ไม่อยู่ในตารางเบี้ย ป.2+ / ป.3+ กรุณาติดต่อฝ่ายรับประกันภัย`;
    return null;
  }

  // มอเตอร์ไซค์: 2+/3+ เฉพาะรหัส 610 ตามอายุรถ · ป.3 ได้ทั้ง 610/620 · เกิน 200cc ไม่อยู่ในตาราง
  function motoOffers(v, sums) {
    const M = R.moto;
    if (v.model.cc > M.maxCc) return [];
    const table = v.body === 'reg4' ? 'normal' : 'special';
    const offers = [];

    if (v.code === '610') {
      const sum = M.sums.includes(sums.moto) ? sums.moto : M.sums[0];
      Object.keys(M.plus).forEach((pid) => {
        const p = M.plus[pid];
        if (v.age > p.maxAge) return;
        const cap = p.theftCap && v.age >= p.theftCap.fromAge ? p.theftCap.max : Infinity;
        Object.keys(M.plans).forEach((plan) => {
          offers.push({
            key: `${pid}.${plan}`,
            type: 'moto',
            own: true, // คุ้มครองตัวรถ (ชนกับยานพาหนะทางบก)
            pid,
            family: 'moto',
            tier: null,
            cls: p.cls,
            product: p.name,
            planTh: M.plans[plan].label,
            planShort: M.plans[plan].short,
            sum,
            sums: M.sums,
            theftSum: p.theftFire ? Math.min(sum, cap) : 0,
            deductible: 0,
            price: p.rates[table][plan],
            special: table === 'special',
            cov: { ...M.plans[plan].coverage, theftFire: p.theftFire },
          });
        });
      });
    }

    const t = M.type3;
    const small = v.model.cc <= M.smallCc;
    offers.push({
      key: 'moto_t3',
      type: 'moto',
      own: false,
      tier: null,
      cls: t.cls,
      product: t.name,
      planTh: `ขนาด${small ? 'ไม่เกิน' : 'เกิน'} ${M.smallCc} cc`,
      price: t.rates[v.code][table][small ? 0 : 1],
      special: v.code === '610' && table === 'special',
      cov: t.coverage,
    });
    return offers;
  }

  function motoNotices(v) {
    const M = R.moto;
    if (v.model.cc > M.maxCc) return [`รถจักรยานยนต์ขนาดเกิน ${M.maxCc} cc ไม่อยู่ในตารางเบี้ย กรุณาติดต่อฝ่ายรับประกันภัย`];
    if (v.code !== '610') return ['รถใช้เพื่อการพาณิชย์ (รหัส 620) ซื้อได้เฉพาะชั้น 3 · ชั้น 2+ และ 3+ รับเฉพาะรถใช้ส่วนบุคคล'];
    const out = Object.values(M.plus).filter((p) => v.age > p.maxAge);
    if (!out.length) return [];
    return [`รถอายุ ${v.age} ปี ซื้อชั้น ${out.map((p) => p.cls).join(' / ')} ไม่ได้ (${out.map((p) => `ชั้น ${p.cls} รับรถอายุไม่เกิน ${p.maxAge} ปี`).join(' · ')})`];
  }

  // ประกันอุบัติเหตุ: เหตุผลที่สินค้านี้ซื้อไม่ได้ (null = ซื้อได้)
  function paBlockReason(p, v) {
    if (v.student && p.noStudent) return `${p.badge} ไม่รับนักเรียน / นิสิต / นักศึกษา`;
    if (!(v.ageId in p.bands)) return `${p.badge} รับอายุ ${p.ageText} เท่านั้น`;
    if (!p.classes.includes(v.cls)) return `${p.badge} รับอาชีพชั้น ${p.classText} เท่านั้น`;
    return null;
  }

  function paOffers(v) {
    const out = [];
    Object.keys(PA.products).forEach((pid) => {
      const p = PA.products[pid];
      if (paBlockReason(p, v)) return;
      p.plans.filter((pl) => pl.classes.includes(v.cls)).forEach((pl) => {
        const cov = { ...pl };
        out.push({
          key: `${pid}.${pl.code}`,
          type: 'pa',
          pid,
          cls: p.key,
          badge: p.badge,
          tier: null,
          product: p.name,
          planTh: pl.label,
          planShort: pl.short,
          taxNote: p.taxNote,
          notes: p.notes,
          price: pl.prices[p.bands[v.ageId]],
          cov,
        });
      });
    });
    return out;
  }

  // opts.sums / opts.deduct ใช้คำนวณแผนที่เลือกไว้แล้ว ถ้าไม่ส่งมาจะใช้ค่าที่แสดงอยู่ในหน้ารายการแผน
  function buildOffers(v, opts) {
    if (v.kind === 'pa') return paOffers(v).sort((a, b) => a.price - b.price);
    const sums = (opts && opts.sums) || state.sums;
    const deduct = opts && 'deduct' in opts ? opts.deduct : state.deduct;
    if (v.kind === 'moto') return motoOffers(v, sums).sort((a, b) => a.price - b.price);
    const offers = [];

    plusProducts(v).forEach((pid) => {
      const p = R.plus[pid];
      const family = pid.startsWith('plus2') ? 'plus2' : 'plus3';
      const sum = p.sums.includes(sums[family]) ? sums[family] : p.sums[0];
      const i = p.sums.indexOf(sum);
      const rateKey = (p.noDeductOption && !deduct) ? 'noDeduct' : 'deduct';
      Object.keys(p.rates).forEach((tier) => {
        offers.push({
          key: `${pid}.${tier}`,
          type: 'plus',
          pid,
          family,
          tier: p.single ? null : tier,
          cls: p.cls,
          product: p.name,
          planTh: p.single ? (p.planTh || 'แผนมาตรฐาน') : `แผน ${TIER_TH[tier]}`,
          sum,
          sums: p.sums,
          deductChoice: !!p.noDeductOption,
          deductible: (!p.noDeductOption || deduct) ? p.deductible : 0,
          deductAmount: p.deductible,
          tppdDeduct: p.tppdDeduct || 0,
          price: p.rates[tier][rateKey][i],
          cov: p.coverage[tier],
          ncd: p.ncd,
          campaign: !!p.campaign,
          needsQT: !!p.needsQT,
        });
      });
    });

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

  // แผนที่คุ้มครองตัวรถตามทุนประกัน / แผนที่มีเรื่องค่าเสียหายส่วนแรก (Deduct)
  const hasSum = (o) => o.type === 'plus' || (o.type === 'moto' && o.own);
  const hasDeduct = (o) => o.type === 'plus' || o.type === 'truck' || (o.type === 'moto' && o.own);

  // ---------- picks (หลายแผนในใบเสนอราคาเดียว) ----------
  const pickFromOffer = (o) => ({
    key: o.key,
    sum: hasSum(o) ? o.sum : null,
    deduct: o.type === 'tawikoon' || o.type === 'moto' || o.type === 'pa' ? null : o.deductible > 0,
  });
  const pickId = (p) => `${p.key}|${p.sum || ''}|${p.deduct === null ? '' : p.deduct ? 1 : 0}`;

  function resolvePick(v, p) {
    const sums = p.sum ? { plus2: p.sum, plus3: p.sum, moto: p.sum } : state.sums;
    const o = buildOffers(v, { sums, deduct: p.deduct !== false }).find((x) => x.key === p.key);
    if (!o || (hasSum(o) && o.sum !== p.sum)) return null;
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

  // ป้ายชั้น/สินค้าบนการ์ดแผน (ประกันรถ = "ชั้น 2+" ฯลฯ, ประกันอุบัติเหตุ = ชื่อสินค้า)
  const clsBadge = (o) => `<span class="cls ${CLS_CLASS[o.cls]}">${o.type === 'pa' ? esc(o.badge) : `ชั้น ${o.cls}`}</span>`;

  const shortName = (o) => {
    if (o.type === 'pa') return `${o.badge} ${o.planShort}`.trim();
    if ((o.type === 'plus' && !o.tier) || o.type === 'moto') return `ชั้น ${o.cls}`;
    return `ชั้น ${o.cls} ${o.tier || (o.type === 'truck' ? 'รถบรรทุก' : 'ทวีคูณ')}`;
  };

  function pickDetail(o) {
    if (o.type === 'pa') {
      const c = o.cov;
      return [`เสียชีวิต ${money(c.death)}`, c.bone ? `กระดูกแตกหัก ${money(c.bone)}` : c.med ? `ค่ารักษา ${money(c.med)}` : null].filter(Boolean).join(' · ');
    }
    const d = o.deductible ? `Deduct ${money(o.deductible)}` : 'ไม่มี Deduct';
    if (o.type === 'moto' && o.own) return `${o.planShort} · ทุน ${money(o.sum)}`;
    if (o.type === 'plus') return `ทุน ${money(o.sum)} · ${d}`;
    if (o.type === 'truck') return `ทรัพย์สิน ${money(o.cov.tppd)} · ${d}`;
    return o.planTh;
  }

  // ---------- coverage & pricing ----------
  function seatsFor(o, v) {
    if (o.type === 'plus') return v.code === '320' ? 3 : 5;
    if (o.type === 'truck') return 3;
    if (o.type === 'moto') return 2;
    return null;
  }

  const COVERAGE_ROWS = [
    { id: 'own', label: 'ความเสียหายต่อตัวรถ', plusSub: 'เฉพาะชนกับยานพาหนะทางบก' },
    { id: 'theft', label: 'รถยนต์สูญหาย / ไฟไหม้', motoLabel: 'รถจักรยานยนต์สูญหาย / ไฟไหม้' },
    { id: 'tpbi', label: 'ชีวิต ร่างกาย บุคคลภายนอก' },
    { id: 'tppd', label: 'ทรัพย์สินบุคคลภายนอก' },
    { id: 'tppdDeduct', label: 'ค่าเสียหายส่วนแรก (ทรัพย์สินคู่กรณี)', tppdDeductOnly: true },
    { id: 'pa', label: 'อุบัติเหตุส่วนบุคคล', sub: 'ผู้ขับขี่และผู้โดยสาร' },
    { id: 'med', label: 'ค่ารักษาพยาบาล' },
    { id: 'bail', label: 'ประกันตัวผู้ขับขี่' },
    { id: 'daily', label: 'เงินชดเชยรายได้', sub: 'นอนโรงพยาบาล สูงสุด 30 วัน/คน ไม่เกิน 7 คน', show: (offers) => offers.some((o) => o.cov.dailyComp) },
    { id: 'travel', label: 'ค่าเดินทางระหว่างรถเข้าซ่อม', sub: 'ไม่เกิน 3 ครั้ง/ปี', show: (offers) => offers.some((o) => o.cov.travelComp) },
  ];

  // ประกันอุบัติเหตุ: แถวความคุ้มครอง (แสดงเฉพาะแถวที่มีในสินค้าที่เลือก)
  const PA_ROWS = [
    { id: 'death', label: 'เสียชีวิต สูญเสียอวัยวะ สายตา ทุพพลภาพถาวร', sub: 'จากอุบัติเหตุ' },
    { id: 'murder', label: 'ถูกฆาตกรรม / ถูกทำร้ายร่างกาย' },
    { id: 'moto', label: 'เสียชีวิตจากการขับขี่ / โดยสารรถจักรยานยนต์' },
    { id: 'public', label: 'อุบัติเหตุสาธารณะ / วันหยุดนักขัตฤกษ์', sub: 'รับเพิ่มจากเสียชีวิตทั่วไป' },
    { id: 'med', label: 'ค่ารักษาพยาบาล', sub: 'ต่ออุบัติเหตุแต่ละครั้ง' },
    { id: 'bone', label: 'กระดูกแตกหัก', sub: 'เหมาจ่าย ต่อครั้งต่อปี' },
    { id: 'income', label: 'ชดเชยรายได้นอนโรงพยาบาล', sub: 'ผู้ป่วยในจากอุบัติเหตุ' },
    { id: 'funeral', label: 'ค่าปลงศพ / จัดการงานศพ' },
  ];

  // undefined = สินค้านี้ไม่มีผลประโยชน์ข้อนี้ · null = มี แต่แผนนี้ไม่คุ้มครอง
  function paCoverageValue(id, o) {
    const c = o.cov;
    const val = c[id];
    if (val === undefined) return undefined;
    if (!val) return null;
    const note = (t) => (t ? `<br><small>${[].concat(t).join('<br>')}</small>` : '');
    switch (id) {
      case 'death': return money(val) + note(c.deathNote);
      case 'moto': return money(val) + note(c.motoNote);
      case 'med': return money(val) + note(c.medNote);
      case 'public': return `เพิ่มอีก ${money(val)}`;
      case 'bone': return `${money(val)} /ครั้ง`;
      case 'income': return `ห้องปกติ ${money(val.room)} /วัน<br>ห้อง ICU ${money(val.icu)} /วัน<br><small>ไม่เกิน 14 วัน/ครั้ง<br>รวมไม่เกิน 365 วัน</small>`;
      case 'funeral': return money(val) + note(c.funeralNote);
      default: return money(val);
    }
  }

  // ค่าความคุ้มครองของแผน (HTML) — null = ไม่คุ้มครอง
  function coverageValue(id, o, v, tpbiPerson) {
    if (o.type === 'pa') return paCoverageValue(id, o);
    const c = o.cov;
    const seats = seatsFor(o, v);
    const seatTxt = seats ? `<br><small>ไม่เกิน ${seats} ที่นั่ง</small>` : '';
    switch (id) {
      case 'own': return hasSum(o) ? `ตามทุน ${money(o.sum)}` : null;
      case 'theft': return hasSum(o) && c.theftFire ? `ตามทุน ${money(o.theftSum || o.sum)}` : null;
      case 'tpbi': return `${money(tpbiPerson || c.tpbiPerson)} /คน<br>${money(c.tpbiTime)} /ครั้ง`;
      case 'tppd': return `${money(c.tppd)} /ครั้ง` + (o.type === 'truck' && o.deductible ? `<br><small>ค่าเสียหายส่วนแรก ${money(o.deductible)}</small>` : '');
      case 'tppdDeduct': return o.tppdDeduct ? `${money(o.tppdDeduct)} /ครั้ง` : null;
      case 'pa': return c.pa ? `${money(c.pa)} /คน${seatTxt}` : null;
      case 'med': return c.med ? `${money(c.med)} /คน${seatTxt}` : null;
      case 'bail': return `${money(c.bail)} /ครั้ง`;
      case 'daily': return c.dailyComp ? `${money(c.dailyComp)} /วัน` : null;
      case 'travel': return c.travelComp ? `${money(c.travelComp)} /ครั้ง` : null;
      default: return null;
    }
  }

  function rowLabel(row, offers) {
    const label = row.motoLabel && offers.some((o) => o.type === 'moto') ? row.motoLabel : row.label;
    const sub = row.plusSub ? (offers.some(hasSum) ? row.plusSub : '') : row.sub;
    return `${label}${sub ? `<small>${sub}</small>` : ''}`;
  }

  function rowsFor(offers) {
    if (offers.some((o) => o.type === 'pa')) return PA_ROWS.filter((r) => offers.some((o) => o.cov[r.id] !== undefined));
    return COVERAGE_ROWS.filter((r) => {
      if (r.show && !r.show(offers)) return false;
      if (r.tppdDeductOnly && !offers.some((o) => o.tppdDeduct)) return false;
      return true;
    });
  }

  function highlights(o) {
    const c = o.cov;
    if (o.type === 'pa') {
      const list = [
        [true, `เสียชีวิต / ทุพพลภาพถาวร ${money(c.death)} บาท`],
        [true, `ขับขี่ / โดยสารมอเตอร์ไซค์ ${money(c.moto)} บาท`],
        c.med ? [true, `ค่ารักษาพยาบาล ${money(c.med)} บาท/ครั้ง`] : [false, 'ไม่มีค่ารักษาพยาบาล'],
      ];
      if (c.bone) list.push([true, `กระดูกแตกหัก เหมาจ่าย ${money(c.bone)} บาท + ชดเชยรายได้นอน รพ.`]);
      else if (c.funeral) list.push([true, `ค่าปลงศพ ${money(c.funeral)} บาท`]);
      return list;
    }
    if (o.type === 'plus') {
      const list = [
        [true, `ชนกับยานพาหนะทางบก ซ่อมรถคุณตามทุน ${money(o.sum)}`],
        c.theftFire ? [true, 'รถหาย / ไฟไหม้ คุ้มครองตามทุน'] : [false, 'ไม่คุ้มครองรถหาย / ไฟไหม้'],
        [true, `ทรัพย์สินคู่กรณี ${money(c.tppd)} บาท`],
      ];
      if (c.dailyComp) list.push([true, `ชดเชยรายได้ ${money(c.dailyComp)} บาท/วัน + ค่าเดินทาง`]);
      return list;
    }
    if (o.type === 'moto' && o.own) {
      return [
        [true, `ชนกับยานพาหนะทางบก ซ่อมรถคุณตามทุน ${money(o.sum)}`],
        c.theftFire ? [true, `รถหาย / ไฟไหม้ คุ้มครอง ${money(o.theftSum)} บาท`] : [false, 'ไม่คุ้มครองรถหาย / ไฟไหม้'],
        c.med ? [true, `ค่ารักษาพยาบาล ${money(c.med)} บาท/คน`] : [false, 'ไม่มีค่ารักษาพยาบาล'],
        [true, 'ไม่มีค่าเสียหายส่วนแรก'],
      ];
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
    if (o.type === 'pa') {
      o.notes.forEach((text) => notes.push({ icon: 'info', text }));
      if (v.cls === 4) notes.push({ icon: 'info', text: 'ชั้นอาชีพ 4 ใช้ตารางเบี้ยอาชีพพิเศษ' });
      return notes;
    }
    if (o.type === 'moto') {
      notes.push({ icon: 'camera', text: 'ราคาสำหรับรถที่ติดกล้องบันทึกภาพ' });
      const cap = o.own && R.moto.plus[o.pid].theftCap;
      if (cap && v.age >= cap.fromAge) notes.push({ icon: 'info', text: `รถอายุ ${v.age} ปี ทุนรถหาย / ไฟไหม้ไม่เกิน ${money(cap.max)} บาท` });
      if (o.own) notes.push({ icon: 'info', text: 'ไม่ต้องถ่ายรูปรถ บันทึกใบเสนอราคาให้หน่วยงานรับประกันภัยพิจารณาอนุมัติ' });
      else notes.push({ icon: 'info', text: 'ไม่รับประกันภัยรถจักรยานยนต์รับจ้างสาธารณะ' });
      return notes;
    }
    if (o.type !== 'tawikoon') notes.push({ icon: 'camera', text: 'ราคาสำหรับรถที่ติดกล้องติดรถยนต์' });
    if (o.type === 'plus' && v.age > R.plusRules.maxAge) {
      notes.push({ icon: 'alert', warn: true, text: `รถอายุ ${v.age} ปี (เกิน ${R.plusRules.maxAge} ปี) ต้องส่งพิจารณาอนุมัติ` });
    }
    if (o.pid && o.pid.endsWith('_tu')) {
      notes.push({ icon: 'info', text: 'ไม่คุ้มครองอุปกรณ์ต่อเติมตู้ทึบ ตู้แห้ง ตู้เย็น ลูกค้าต้องกรอกแบบฟอร์มรับผิดชอบอุปกรณ์ตกแต่งต่อเติมเอง' });
      notes.push({ icon: 'info', text: 'ไม่รับประกันภัยรถ Load เตี้ย หรือติด Skirt งานปั้น' });
      if (o.tppdDeduct) notes.push({ icon: 'info', text: `ค่าเสียหายส่วนแรกทรัพย์สินคู่กรณี ${money(o.tppdDeduct)} บาท` });
    }
    if (o.campaign) notes.push({ icon: 'info', text: 'รวมส่วนลดไม่มีเคลม 500 บาทในเบี้ยนี้แล้ว (แคมเปญลูกค้าใหม่ปี 2569)' });
    if (o.needsQT) notes.push({ icon: 'info', text: 'ต้องถ่ายรูปรถประกอบการพิจารณา และบันทึกเป็น QT เพื่อขออนุมัติ' });
    return notes;
  }

  function cmiAmount(o, v) {
    if (v.kind === 'pa') return 0;
    if (v.kind === 'moto') return R.moto.compulsory.find(([maxCc]) => v.model.cc <= maxCc)[1];
    return o.type === 'truck' ? 0 : R.compulsory[v.code] || 0;
  }

  // เบี้ยของแต่ละแผน แยกเป็นรายการ (ส่วนลด/ความคุ้มครองเพิ่ม/พ.ร.บ. ใช้ร่วมกันทุกแผน)
  function pricing(o, v) {
    const p = { premium: o.price, ncd: 0, tpbi: 0, cmi: 0 };
    if (o.type === 'plus') {
      const amount = o.ncd[Math.min(state.addons.ncd, o.ncd.length - 1)];
      if (amount) p.ncd = -amount;
      const up = R.plusRules.tpbiUpgrade.find((x) => x.perPerson === state.addons.tpbi);
      if (up) p.tpbi = up.amount;
    }
    if (state.addons.cmi) p.cmi = cmiAmount(o, v);
    p.total = round2(p.premium + p.ncd + p.tpbi + p.cmi);
    return p;
  }

  const RESERVE_NOTE = 'คำนวณจากตารางอัตราเบี้ยของบริษัทฯ รวมภาษีมูลค่าเพิ่มและอากรแสตมป์แล้ว บริษัทฯ ขอสงวนสิทธิ์ในการพิจารณารับประกันภัยและเปลี่ยนแปลงอัตราเบี้ยโดยไม่ต้องแจ้งให้ทราบล่วงหน้า';

  function motoConditions(v, offers) {
    const M = R.moto;
    const own = offers.filter((o) => o.own);
    const t3 = offers.some((o) => !o.own);
    const list = [];
    if (own.length) {
      const products = [...new Set(own.map((o) => o.pid))].map((pid) => M.plus[pid]);
      const scope = `ชั้น ${products.map((p) => p.cls).join(' / ')}`;
      list.push(`${scope} สำหรับรถจักรยานยนต์ใช้ส่วนบุคคล (รหัส 610) ขนาดไม่เกิน ${M.maxCc} cc `
        + products.map((p) => `ชั้น ${p.cls} อายุรถไม่เกิน ${p.maxAge} ปี`).join(' '));
      const theft = products.find((p) => p.theftFire);
      list.push(`ทุนประกันภัยรถชนรถคิดที่ 60% ของราคาตลาด แต่ไม่เกิน ${money(M.sums[0])} บาท`
        + (theft ? ` ชั้น ${theft.cls} คุ้มครองรถสูญหาย / ไฟไหม้ตามทุนรถชนรถ (รถอายุ ${theft.theftCap.fromAge}–${theft.maxAge} ปี ไม่เกิน ${money(theft.theftCap.max)} บาท)` : '')
        + ' ไม่มีค่าเสียหายส่วนแรกของความเสียหายต่อรถจักรยานยนต์คันเอาประกันภัย');
    }
    if (t3) list.push(`${own.length ? 'ชั้น 3 ' : ''}สำหรับรถจักรยานยนต์ใช้ส่วนบุคคล (รหัส 610) และใช้เพื่อการพาณิชย์ (รหัส 620) ขนาดไม่เกิน ${M.maxCc} cc ไม่รับประกันภัยรถรับจ้างสาธารณะ`);
    if (offers.some((o) => o.special)) list.push('ราคาพิเศษสำหรับรถที่ไม่ได้จดทะเบียนในกรุงเทพฯ สมุทรปราการ อุบลราชธานี และนครสวรรค์');
    list.push(`ไม่มีส่วนลดประวัติ${t3 ? ' และไม่มีการให้ส่วนลดกลุ่ม' : ''} บริษัทฯ จะตรวจสอบประวัติการใช้รถ ซึ่งอาจส่งผลให้เปลี่ยนแปลงเบี้ยประกันภัย เงื่อนไข หรืองดรับประกันภัย`);
    list.push('อัตราเบี้ยสำหรับรถที่ติดตั้งกล้องที่บันทึกภาพเคลื่อนไหวได้');
    list.push(RESERVE_NOTE);
    return list;
  }

  // หมายเหตุอาชีพ (เช่น ทนายความ / อาชีพจากใบเก่า) แสดงเมื่อเกี่ยวกับแผนที่มีอยู่
  const occNoteApplies = (v, offers) => !!v.occNote && (!v.occNoteFor || offers.some((o) => v.occNoteFor.includes(o.pid)));

  function paConditions(v, offers) {
    const C = PA.conditions;
    const list = Object.keys(PA.products).filter((pid) => offers.some((o) => o.pid === pid)).map((pid) => C[pid]);
    if (occNoteApplies(v, offers)) list.push(v.occNote);
    return [...list, ...C.common, 'คำนวณจากตารางเบี้ยตามโบรชัวร์ของบริษัทฯ บริษัทฯ ขอสงวนสิทธิ์ในการพิจารณารับประกันภัยและเปลี่ยนแปลงอัตราเบี้ยโดยไม่ต้องแจ้งให้ทราบล่วงหน้า'];
  }

  function quoteConditions(v, offers) {
    if (v.kind === 'pa') return paConditions(v, offers);
    if (v.kind === 'moto') return motoConditions(v, offers);
    const plusOffers = offers.filter((o) => o.type === 'plus');
    const truck = offers.some((o) => o.type === 'truck');
    const mixed = plusOffers.length && offers.some((o) => o.type !== 'plus');
    const scope = mixed ? 'ชั้น 2+ / 3+ ' : '';
    const max = R.plusRules.maxAge;
    const list = [];
    const hasPid = (re) => plusOffers.some((o) => re.test(o.pid));

    if (hasPid(/^plus[23](_new)?$/)) {
      list.push(`${scope}สำหรับรถใช้ส่วนบุคคล เฉพาะรถญี่ปุ่นและรถตลาด (รหัส 110) และรถปิคอัพไม่เกิน 4 ตัน (รหัส 320) อายุรถไม่เกิน ${max} ปีนับจากปีจดทะเบียน`
        + (v.age > max ? ` — รถคันนี้อายุ ${v.age} ปี ต้องส่งฝ่ายรับประกันภัยพิจารณาอนุมัติ` : ''));
    }
    if (hasPid(/_new$/)) {
      list.push(`${scope}แคมเปญลูกค้าใหม่ปี 2569 ส่วนลดไม่มีเคลม 500 บาท รวมอยู่ในเบี้ยข้างต้นแล้ว`);
    }
    if (hasPid(/_tu$/)) {
      list.push(`${scope}สำหรับรถกระบะต่อเติมตู้ทึบ ตู้แห้ง ตู้เย็น (รหัส 320) ไม่คุ้มครองอุปกรณ์ตกแต่งต่อเติม ลูกค้าต้องกรอกแบบฟอร์มรับผิดชอบอุปกรณ์ตกแต่งต่อเติมเอง มีค่าเสียหายส่วนแรกทรัพย์สินคู่กรณี 5,000 บาท ไม่รับประกันภัยรถ Load เตี้ยหรือติด Skirt งานปั้น`);
    }
    if (hasPid(/_euro$/)) {
      list.push(`${scope}สำหรับรถยุโรป อเมริกา หรือนำเข้า ที่ใช้ส่วนบุคคล (รหัส 110) อายุรถไม่เกิน ${max} ปีนับจากปีจดทะเบียน`
        + (v.age > max ? ` — รถคันนี้อายุ ${v.age} ปี ต้องส่งฝ่ายรับประกันภัยพิจารณาอนุมัติ` : ''));
    }
    if (hasPid(/_com$/)) {
      list.push(`${scope}สำหรับรถยนต์นั่งใช้เชิงพาณิชย์ (รหัส 120) เฉพาะรถญี่ปุ่นและรถตลาด ต้องถ่ายรูปประกอบการพิจารณา และบันทึกเป็น QT เพื่อให้หน่วยงานรับประกันภัยพิจารณาอนุมัติ`);
    }
    if (plusOffers.length && state.addons.ncd && !plusOffers.every((o) => o.campaign)) {
      list.push('ส่วนลดประวัติดีสำหรับรถที่ไม่มีเคลม (ไม่ว่าฝ่ายถูกหรือฝ่ายผิด) พิจารณาประวัติตั้งแต่ปีรับประกันภัย 2558');
    }
    if (truck) list.push('ส่วนลดประวัติพิจารณาตามนโยบายของบริษัทฯ ไม่มีการให้ส่วนลดกลุ่ม');
    if (plusOffers.length || truck) list.push(`อัตราเบี้ย${scope ? `${scope.trim()} ` : ''}สำหรับรถที่ติดตั้งกล้องติดรถยนต์ที่บันทึกภาพเคลื่อนไหวได้`);
    list.push(RESERVE_NOTE);
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
      // ประกันอุบัติเหตุ: รหัสแผนซ้ำกันข้ามอายุ/ชั้นอาชีพ จึงล้างแผนที่เลือกไว้เมื่อผู้เอาประกันเปลี่ยน (เช่น กดย้อนกลับ แก้ แล้วกดไปข้างหน้า)
      if (isPaTab() && state.picksSig !== carSig()) state.picks = [];
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

  function vtypeTabs() {
    return `
        <div class="seg vtype" role="tablist" aria-label="ประเภทประกัน">
          ${Object.keys(VTYPES).map((k) => `
            <button role="tab" class="${state.vtype === k ? 'is-on' : ''}" data-action="vtype" data-value="${k}" aria-selected="${state.vtype === k}">${icon(VTYPES[k].icon)}${VTYPES[k].label}</button>`).join('')}
        </div>`;
  }

  // ประกันอุบัติเหตุ: เลือกแค่ช่วงอายุ + ชั้นอาชีพ (กดปุ่มอย่างเดียว ไม่ต้องพิมพ์)
  function renderPaSearch() {
    const complete = isComplete();
    const done = [!!state.paAge, !!state.paOcc].filter(Boolean).length;
    const vt = VTYPES.pa;
    const searched = !!state.paOccName;
    return `
      <section class="hero">
        <p class="hero-kicker">${icon('shield')} มิตรแท้ประกันภัย</p>
        <h1>เช็คเบี้ยประกันอุบัติเหตุ<span class="nw">ส่วนบุคคล</span><br><span>เลือกอายุ + อาชีพ รู้ราคาทันที</span></h1>
        <div class="hero-classes"><span>PLV</span><span>PA 700</span><span>กระดูกแตกหัก</span></div>
      </section>
      <section class="card finder">
        ${vtypeTabs()}
        <div class="progress" aria-hidden="true"><i style="width:${Math.round((done / 2) * 100)}%"></i></div>
        <h2 class="finder-title">ค้นหาแผนประกัน${vt.noun}</h2>
        <div class="step" id="step-age">
          ${stepHead(1, 'ช่วงอายุผู้เอาประกันภัย', !!state.paAge)}
          <div class="chip-grid span-last">
            ${PA.ages.map((a) => `<button class="chip ${state.paAge === a.id ? 'is-on' : ''}" data-action="pa-age" data-value="${a.id}" aria-pressed="${state.paAge === a.id}">${a.label}</button>`).join('')}
          </div>
        </div>
        ${state.paAge ? `
        <div class="step" id="step-occ">
          ${stepHead(2, 'อาชีพ', !!state.paOcc)}
          <div class="option-list">
            ${PA.occs.map((o) => {
              const on = state.paOcc === o.id && !searched;
              return `<button class="option ${on ? 'is-on' : ''}" data-action="pa-occ" data-value="${o.id}" aria-pressed="${on}">
                <span class="radio"></span><span><b>${o.label}</b><small>${o.desc}</small></span>
              </button>`;
            }).join('')}
          </div>
          <button class="select-btn ${searched ? 'is-on' : ''}" data-action="pa-occ-more">
            <span>${searched ? esc(state.paOccName) : 'ไม่แน่ใจ? ค้นหาจากรายชื่ออาชีพ'}</span>${icon('chev')}
          </button>
        </div>` : ''}
        <button class="btn btn-primary btn-block see-plans" id="seePlans" data-action="see-plans" ${complete ? '' : 'disabled'}>ดูแผนประกันเลย</button>
      </section>
      ${agentCard()}
      <p class="page-note">เบี้ยประกันตามโบรชัวร์มิตรแท้ประกันภัย ต่อคนต่อปี (PLV และ PA 700 รวมภาษีมูลค่าเพิ่มและอากรแสตมป์ · กระดูกแตกหักรวมอากรแสตมป์)</p>`;
  }

  function renderSearch() {
    if (isPaTab()) return renderPaSearch();
    const brand = getBrand();
    const model = getModel();
    const modelOk = !!(model && model.kind);
    const bodyNeeded = modelOk && needsBody(model.kind);
    const total = bodyNeeded ? 4 : 3;
    const done = [!!brand, modelOk, !!state.year, bodyNeeded && !!state.body].filter(Boolean).length;
    const complete = isComplete();
    const vt = VTYPES[state.vtype];

    return `
      <section class="hero">
        <p class="hero-kicker">${icon('shield')} มิตรแท้ประกันภัย</p>
        <h1>เช็คเบี้ยประกัน${vt.noun}<br><span>รู้ราคาทันที พร้อมใบเสนอราคา</span></h1>
        <div class="hero-classes"><span>ชั้น 2+</span><span>ชั้น 3+</span><span>ชั้น 3</span></div>
      </section>
      <section class="card finder">
        ${vtypeTabs()}
        <div class="progress" aria-hidden="true"><i style="width:${Math.round((done / total) * 100)}%"></i></div>
        <h2 class="finder-title">ค้นหาแผนประกัน${vt.noun}</h2>
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
    const popular = brandList().filter((b) => b.popular);
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
    const moto = isMotoTab();
    const kindChips = moto
      ? CC_CHOICES.map(([cc, label]) => `
        <button class="chip ${state.customCc === cc ? 'is-on' : ''}" data-action="cc" data-value="${cc}" aria-pressed="${state.customCc === cc}">${label}</button>`).join('')
      : CAR_KINDS.map((k) => `
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
              <input id="customModelName" type="text" value="${esc(state.customModelName)}" placeholder="${VTYPES[state.vtype].modelHint}" autocomplete="off" maxlength="40">
            </label>
            <p class="field-label">${moto ? 'ขนาดเครื่องยนต์' : 'ประเภทรถ'}</p>
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
        ${stepHead(3, `เลือกปี${VTYPES[state.vtype].noun}`, !!state.year)}
        <div class="chip-grid">
          ${top.map((y) => `<button class="chip ${state.year === y ? 'is-on' : ''}" data-action="year" data-value="${y}" aria-pressed="${state.year === y}">${yearLabel(y)}</button>`).join('')}
        </div>
        ${ys.length > TOP_YEARS ? `<button class="select-btn" data-action="year-more"><span>เลือกปีอื่นๆ</span>${icon('chev')}</button>` : ''}
      </div>`;
  }

  function stepBody(kind) {
    const [title, opts] = {
      pickup: ['ลักษณะรถกระบะ', [['standard', 'กระบะทั่วไป', 'ไม่ได้ต่อเติมตู้เย็น'], ['fridge', 'ต่อเติมตู้เย็น', 'มี / ไม่มีเครื่องทำความเย็น']]],
      moto: ['จังหวัดที่จดทะเบียน', [['reg4', 'กรุงเทพฯ สมุทรปราการ อุบลราชธานี นครสวรรค์', 'ราคาปกติ'], ['regOther', 'จังหวัดอื่นๆ', 'ได้ราคาพิเศษ (รถใช้ส่วนบุคคล)']]],
    }[kind] || ['อุปกรณ์พิเศษ', [['plain', 'ไม่มีอุปกรณ์พิเศษ', 'ตัวรถมาตรฐาน'], ['equip', 'มีอุปกรณ์พิเศษ', 'ติดตั้งอุปกรณ์พิเศษเพิ่มบนตัวรถ']]];
    return `
      <div class="step" id="step-body">
        ${stepHead(4, title, !!state.body)}
        <div class="option-list">
          ${opts.map(([val, title, desc]) => `
            <button class="option ${state.body === val ? 'is-on' : ''}" data-action="body" data-value="${val}" aria-pressed="${state.body === val}">
              <span class="radio"></span><span><b>${title}</b><small>${desc}</small></span>
            </button>`).join('')}
        </div>
      </div>`;
  }

  function paSummary(v) {
    return `
      <section class="card car-summary">
        <div class="car-row">
          <span class="car-ico">${icon('person')}</span>
          <div class="car-text"><b>อายุ ${v.ageLabel}</b><small>${state.paOccName || v.student ? `${esc(v.occLabel)} (ชั้นอาชีพ ${v.cls})` : esc(v.occLabel)}</small></div>
          <button class="link-btn" data-action="edit-car">แก้ไข</button>
        </div>
      </section>`;
  }

  function carSummary(v) {
    const meta = [`ปี ${yearLabel(v.year)}`, KINDS[v.kind].short, `รหัส ${v.code}`];
    if (v.kind === 'moto') meta.push(ccLabel(v.model));
    if (v.body) meta.push(BODY_LABEL[v.body]);
    return `
      <section class="card car-summary">
        <div class="car-row">
          <span class="car-ico">${icon(vehicleIcon(v))}</span>
          <div class="car-text"><b>${esc(v.name)}</b><small>${meta.join(' · ')}</small></div>
          <button class="link-btn" data-action="edit-car">แก้ไข</button>
        </div>
        ${v.kind === 'car' || v.kind === 'moto' ? `
          <div class="usage">
            <span>การใช้รถ</span>
            <div class="seg small">
              <button class="${state.usage === 'personal' ? 'is-on' : ''}" data-action="usage" data-value="personal">ส่วนบุคคล</button>
              <button class="${state.usage === 'commercial' ? 'is-on' : ''}" data-action="usage" data-value="commercial">เพื่อการพาณิชย์</button>
            </div>
          </div>` : ''}
        ${custTypeApplicable(v) ? `
          <div class="usage">
            <span>ประเภทลูกค้า</span>
            <div class="seg small">
              <button class="${state.custType === 'new' ? 'is-on' : ''}" data-action="cust" data-value="new">ลูกค้าใหม่ 2569</button>
              <button class="${state.custType === 'old' ? 'is-on' : ''}" data-action="cust" data-value="old">ลูกค้าเดิม</button>
            </div>
          </div>` : ''}
      </section>`;
  }

  function renderPaPlans(v) {
    const offers = buildOffers(v);
    const counts = {};
    offers.forEach((o) => { counts[o.cls] = (counts[o.cls] || 0) + 1; });
    if (state.filter !== 'all' && !counts[state.filter]) state.filter = 'all';
    const shown = state.filter === 'all' ? offers : offers.filter((o) => o.cls === state.filter);
    const notices = [];
    Object.values(PA.products).forEach((p) => {
      const why = paBlockReason(p, v);
      if (why) notices.push(why);
    });
    if (occNoteApplies(v, offers)) notices.push(v.occNote);
    const tabs = [['all', 'ทั้งหมด', offers.length]];
    Object.values(PA.products).forEach((p) => { if (counts[p.key]) tabs.push([p.key, p.badge, counts[p.key]]); });

    return `
      ${paSummary(v)}
      ${offers.length ? `
        ${notices.map((n) => `<div class="notice">${icon('info')}<p>${esc(n)}</p></div>`).join('')}
        ${tabs.length > 2 ? `<div class="tabs ${tabs.length > 3 ? 'compact' : ''}" role="tablist">
          ${tabs.map(([id, label, n]) => `<button role="tab" class="tab ${state.filter === id ? 'is-on' : ''}" data-action="filter" data-value="${id}" aria-selected="${state.filter === id}">${label}<span>${n}</span></button>`).join('')}
        </div>` : ''}
        <p class="result-count">พบ ${shown.length} แผน · เรียงจากเบี้ยต่ำสุด · เลือกได้สูงสุด ${MAX_PICKS} แผน</p>
        <div class="offer-list rows">${shown.map((o) => paRow(o, v)).join('')}</div>
        ${agentCard()}
        <p class="page-note">เบี้ยประกันต่อคนต่อปีตามโบรชัวร์ · บริษัทฯ ขอสงวนสิทธิ์ในการพิจารณารับประกันภัย</p>
        ${pickTray(v)}`
      : `
        ${notices.map((n) => `<div class="notice">${icon('info')}<p>${esc(n)}</p></div>`).join('')}
        <section class="card empty">
          ${icon('info')}
          <h3>ไม่มีแผนที่ซื้อได้จากข้อมูลนี้</h3>
          <p>กรุณาติดต่อ Mittare Contact Center <a href="tel:${R.contact.center.replace(/-/g, '')}">${R.contact.center}</a></p>
          <button class="btn btn-ghost" data-action="edit-car">แก้ไขข้อมูล</button>
        </section>`}`;
  }

  function renderPlans() {
    const v = vehicle();
    if (v.kind === 'pa') return renderPaPlans(v);
    const offers = buildOffers(v);
    const counts = { '2+': 0, '3+': 0, 3: 0 };
    offers.forEach((o) => { counts[o.cls]++; });
    if (state.filter !== 'all' && !counts[state.filter]) state.filter = 'all';
    const shown = state.filter === 'all' ? offers : offers.filter((o) => o.cls === state.filter);
    const block = plusBlockReason(v);
    const notices = [];
    if (block && !v.kind.startsWith('truck')) notices.push(block);
    if (v.kind === 'moto') notices.push(...motoNotices(v));
    else if (v.brand.group === 'other' || (v.model && v.model.custom)) {
      notices.push('รถที่ไม่มีในรายการ บริษัทฯ จะพิจารณาการรับประกันภัยอีกครั้ง (ป.2+ / ป.3+ รับเฉพาะรถญี่ปุ่น รถตลาด และรถยุโรป/นำเข้า เท่านั้น)');
    }

    const tabs = [['all', 'ทั้งหมด', offers.length], ['2+', 'ชั้น 2+', counts['2+']], ['3+', 'ชั้น 3+', counts['3+']], ['3', 'ชั้น 3', counts[3]]]
      .filter(([id, , n]) => id === 'all' || n > 0);
    const withDeduct = shown.find((o) => o.type === 'truck' || o.deductChoice);

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
    const sumField = hasSum(o)
      ? `<label class="sum-field">
          <span>ทุนรถชนรถ${o.type === 'moto' ? '<small>60% ของราคาตลาด</small>' : ''}</span>
          <select data-action="sum" data-fam="${o.family}" aria-label="ทุนประกันรถชนรถ">
            ${o.sums.map((s) => `<option value="${s}" ${s === o.sum ? 'selected' : ''}>${money(s)} บาท</option>`).join('')}
          </select>${icon('chev')}
        </label>`
      : '';
    const deductTag = hasDeduct(o) ? `<span class="tag">${o.deductible ? `Deduct ${money(o.deductible)}` : 'ไม่มี Deduct'}</span>` : '';
    const notes = offerNotes(o, v);
    const picked = isPicked(o);
    const rows = rowsFor([o]);

    return `
      <article class="offer ${picked ? 'is-picked' : ''}">
        <div class="offer-top">
          ${clsBadge(o)}
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

  // ประกันอุบัติเหตุ: แผนเยอะ (PLV 20 แผน) จึงใช้แถวสั้น — แตะทั้งแถวเพื่อเลือก, ลูกศรขวาเปิดความคุ้มครองเต็ม
  function paRow(o, v) {
    const c = o.cov;
    const picked = isPicked(o);
    const open = openCov.has(o.key);
    const facts = [`เสียชีวิต ${money(c.death)}`, c.bone ? `กระดูกแตก ${money(c.bone)}` : `มอไซค์ ${money(c.moto)}`];
    facts.push(c.med ? `รักษา ${money(c.med)}` : 'ไม่มีค่ารักษา');
    if (c.income) facts.push(`นอน รพ. ${money(c.income.room)}/วัน`);
    else if (c.funeral) facts.push(`ปลงศพ ${money(c.funeral)}`);
    const notes = offerNotes(o, v);
    return `
      <article class="prow ${picked ? 'is-picked' : ''}">
        <div class="prow-line">
          <button class="prow-pick" data-action="pick" data-value="${o.key}" aria-pressed="${picked}">
            <span class="pcheck">${icon('check')}</span>
            <span class="prow-text">
              <b>${clsBadge(o)}<span>${esc(o.planShort || 'แผนเดียว')}</span></b>
              <small>${facts.map((f) => `<span>${f}</span>`).join(' · ')}</small>
            </span>
            <span class="prow-price"><b>${money(o.price)}</b><small>บาท/ปี</small></span>
          </button>
          <button class="prow-more ${open ? 'is-open' : ''}" data-action="cov-toggle" data-value="${o.key}" aria-expanded="${open}" aria-label="ความคุ้มครอง ${esc(shortName(o))}">${icon('chev')}</button>
        </div>
        ${open ? `
          <div class="prow-detail">
            ${notes.length ? `<div class="notes">${notes.map((n) => `<span class="note ${n.warn ? 'warn' : ''}">${icon(n.icon)}${esc(n.text)}</span>`).join('')}</div>` : ''}
            <table class="cov-table"><tbody>
              ${rowsFor([o]).map((r) => {
                const val = coverageValue(r.id, o, v);
                return `<tr><th>${rowLabel(r, [o])}</th><td class="${val ? '' : 'no'}">${val || 'ไม่คุ้มครอง'}</td></tr>`;
              }).join('')}
            </tbody></table>
          </div>` : ''}
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
    if (hasSum(o)) {
      opts.push(`
        <label class="mini-select">
          <span>ทุนรถชนรถ</span>
          <select data-action="pick-sum" data-index="${o.pickIndex}">
            ${o.sums.map((s) => `<option value="${s}" ${s === o.sum ? 'selected' : ''}>${money(s)}</option>`).join('')}
          </select>${icon('chev')}
        </label>`);
    }
    if (o.type === 'truck' || o.deductChoice) {
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
          ${clsBadge(o)}
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
    const plusOffers = offers.filter((o) => o.type === 'plus');
    const anyPlus = plusOffers.length > 0;
    const cmi = offers.map((o) => cmiAmount(o, v)).find(Boolean) || 0;
    const rules = R.plusRules;
    const totals = offers.map((o) => ({ o, p: pricing(o, v) }));
    const minTotal = Math.min(...totals.map((t) => t.p.total));

    const extras = [];
    if (anyPlus) {
      const note = offers.some((o) => o.type !== 'plus') ? '<small>ใช้กับแผนชั้น 2+ และ 3+</small>' : '';
      const allCampaign = plusOffers.every((o) => o.campaign);
      const maxTiers = Math.max(...plusOffers.map((o) => o.ncd.length));
      if (allCampaign) {
        extras.push(`<div class="notice">${icon('info')}<p>ส่วนลดไม่มีเคลมรวมอยู่ในเบี้ยแล้ว (แคมเปญลูกค้าใหม่ปี 2569)</p></div>`);
      } else if (maxTiers > 1) {
        const ncdOptions = rules.ncdLabels.slice(0, maxTiers).map((label, years) => {
          if (years === 0) return [years, label, ''];
          const amounts = plusOffers.map((o) => o.ncd[Math.min(years, o.ncd.length - 1)]);
          const allSame = amounts.every((a) => a === amounts[0]);
          return [years, label, allSame ? `-${money(amounts[0])}` : 'ตามแผน'];
        });
        extras.push(`
          <p class="field-label">ส่วนลดประวัติดี${note || '<small>ไม่มีเคลมทั้งฝ่ายถูกและฝ่ายผิด</small>'}</p>
          ${radioList('ncd', ncdOptions, state.addons.ncd)}`);
      }
      extras.push(`
        <p class="field-label">ความคุ้มครองชีวิต ร่างกาย บุคคลภายนอก${note}</p>
        ${radioList('tpbi', rules.tpbiUpgrade.map((u) => [u.perPerson, `${money(u.perPerson)} บาท/คน${u.amount ? '' : ' (มาตรฐาน)'}`, u.amount ? `+${money(u.amount)}` : '']), state.addons.tpbi)}`);
    }
    if (cmi) {
      extras.push(`
        <button class="toggle-row ${state.addons.cmi ? 'is-on' : ''}" data-action="cmi" aria-pressed="${state.addons.cmi}">
          <span><b>ซื้อรวม พ.ร.บ.</b><small>ประกันภาคบังคับ ${v.kind === 'moto' ? `รถจักรยานยนต์ ${ccLabel(v.model)}` : `รหัส ${v.code}`}</small></span>
          <em>+${money(cmi)}</em><span class="switch"></span>
        </button>`);
    }

    return `
      <div class="section-head">
        <h2>แผนที่เลือก <span>${offers.length} แผน</span></h2>
        <p>${icon(vehicleIcon(v))} ${esc(v.name)}${v.kind === 'pa' ? '' : ` · ปี ${yearLabel(v.year)}`}</p>
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
      <button class="btn btn-ghost btn-block restart" data-action="restart">${icon('refresh')}เช็คเบี้ย${isPaTab() ? 'คน' : 'คัน'}ใหม่</button>`;
  }

  function quotePage() {
    const v = vehicle();
    const offers = pickedOffers(v);
    const n = offers.length;
    const q = state.quote;
    const date = new Date(q.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
    const prices = offers.map((o) => pricing(o, v));
    const anySum = offers.some(hasSum);
    const anyDeduct = offers.some(hasDeduct);
    const labelWidth = { 1: 46, 2: 34, 3: 28, 4: 25 }[n];
    const tpbiFor = (o) => (o.type === 'plus' ? state.addons.tpbi : null);
    const moto = v.kind === 'moto';
    const pa = v.kind === 'pa';

    const car = pa
      ? [
        ['ช่วงอายุ', `${v.ageLabel}`],
        ['ชั้นอาชีพ', `ชั้น ${v.cls}${v.student ? ' (นักเรียน / นักศึกษา)' : ''}`],
        ...(state.paOccName ? [['อาชีพ', esc(state.paOccName)]] : []),
      ]
      : [
        ['ยี่ห้อ / รุ่น', esc(v.name)],
        ['ปีรถ', yearLabel(v.year)],
        ['ประเภทรถ', `${KINDS[v.kind].label} · รหัส ${v.code}`],
      ];
    if (moto) car.push(['ขนาดเครื่องยนต์', esc(ccLabel(v.model))], ['การใช้รถ', usageTh()], ['จังหวัดที่จดทะเบียน', REG_LABEL[v.body]]);
    else if (v.body) car.push(['ลักษณะรถ', BODY_LABEL[v.body]]);
    else if (v.kind === 'car') car.push(['การใช้รถ', usageTh()]);

    const row = (label, cells, cls = '') => `<tr class="${cls}"><th>${label}</th>${cells.join('')}</tr>`;
    const cell = (val) => (val === undefined ? dash : `<td class="${val == null ? 'no' : ''}">${val == null ? 'ไม่คุ้มครอง' : val}</td>`);
    const dash = '<td class="na">—</td>';
    const group = (title) => `<tr class="grp"><td colspan="${n + 1}">${title}</td></tr>`;

    const body = [];
    if (!pa) body.push(group('รายละเอียดแผน'));
    if (anySum) body.push(row('ทุนประกันรถชนรถ', offers.map((o) => (hasSum(o) ? `<td>${money(o.sum)}</td>` : dash))));
    if (anyDeduct) {
      body.push(row(offers.some((o) => o.type === 'truck') ? 'ค่าเสียหายส่วนแรก<small>ต่อทรัพย์สินบุคคลภายนอก</small>' : 'ค่าเสียหายส่วนแรก (Deduct)',
        offers.map((o) => (hasDeduct(o) ? `<td>${o.deductible ? money(o.deductible) : 'ไม่มี'}</td>` : dash))));
    }
    body.push(group('ความคุ้มครอง (บาท)'));
    rowsFor(offers).forEach((r) => {
      body.push(row(rowLabel(r, offers), offers.map((o) => cell(coverageValue(r.id, o, v, tpbiFor(o))))));
    });
    body.push(group('เบี้ยประกันภัย (บาท)'));
    if (pa) body.push(row('เบี้ยประกันภัยต่อคนต่อปี', prices.map((p, i) => `<td>${money(p.premium)}<br><small>${offers[i].taxNote}</small></td>`)));
    else body.push(row('เบี้ยประกันภัย<small>รวมภาษีมูลค่าเพิ่มและอากรแสตมป์</small>', prices.map((p) => `<td>${money(p.premium)}</td>`)));
    if (prices.some((p) => p.ncd)) {
      const label = R.plusRules.ncdLabels[state.addons.ncd];
      body.push(row(`ส่วนลดประวัติดี<small>${esc(label)}</small>`, offers.map((o, i) => (o.type === 'plus' ? `<td class="minus">${signed(prices[i].ncd)}</td>` : dash))));
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
              <p>${productTitle(v)}</p>
              <p class="qp-insurer">ผู้รับประกันภัย บริษัท มิตรแท้ประกันภัย จำกัด (มหาชน)</p>
            </div>
          </header>
          <div class="qp-meta">
            <div><small>เรียน</small><b>${esc(state.customer.name.trim())}</b>${state.customer.phone.trim() ? `<span>โทร ${esc(state.customer.phone.trim())}</span>` : ''}</div>
            <div><small>เลขที่</small><b>${esc(q.no)}</b></div>
            <div><small>วันที่</small><b>${date}</b></div>
          </div>
          <section class="qp-sec">
            <h4>รายละเอียด${pa ? 'ผู้เอาประกันภัย' : moto ? 'รถจักรยานยนต์' : 'รถยนต์'}</h4>
            <dl class="qp-car ${moto ? 'is-moto' : ''} ${pa ? 'is-pa' : ''}">${car.map(([k, val]) => `<div><dt>${k}</dt><dd>${val}</dd></div>`).join('')}</dl>
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
                      <span class="qp-badges">${clsBadge(o)}${o.tier ? `<span class="tier t-${o.tier.toLowerCase()}">${o.tier}</span>` : ''}</span>
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

  const productTitle = (v) => (v.kind === 'pa' ? 'ประกันภัยอุบัติเหตุส่วนบุคคล' : `ประกันภัย${v.kind === 'moto' ? 'รถจักรยานยนต์' : 'รถยนต์'}ภาคสมัครใจ`);
  const shareTitle = () => {
    const k = vehicle().kind;
    return `ใบเสนอราคาประกันภัย${k === 'pa' ? 'อุบัติเหตุส่วนบุคคล' : k === 'moto' ? 'รถจักรยานยนต์' : 'รถยนต์'}`;
  };

  function shareText() {
    const v = vehicle();
    const offers = pickedOffers(v);
    const lines = [
      `${shareTitle()} มิตรแท้ประกันภัย`,
      `เลขที่ ${state.quote.no}`,
      `ลูกค้า: ${state.customer.name.trim()}`,
      v.kind === 'pa' ? `ผู้เอาประกันภัย: ${v.name}` : `รถ: ${v.name} ปี ${yearLabel(v.year)}`,
      '',
    ];
    offers.forEach((o, i) => {
      const p = pricing(o, v);
      lines.push(`${i + 1}) ${o.type === 'pa' ? `${o.product} ${o.planShort}`.trim() : `${shortName(o)} ${o.product}`}`);
      lines.push(`   ${pickDetail(o)}`);
      lines.push(`   เบี้ยรวม ${money(p.total)} บาท`);
    });
    const extra = [];
    if (state.addons.ncd && offers.some((o) => o.type === 'plus')) extra.push(`ส่วนลดประวัติดี: ${R.plusRules.ncdLabels[state.addons.ncd]}`);
    if (state.addons.tpbi !== 500000 && offers.some((o) => o.type === 'plus')) extra.push(`วงเงินชีวิตบุคคลภายนอก ${money(state.addons.tpbi)} บาท/คน`);
    if (state.addons.cmi && offers.some((o) => cmiAmount(o, v))) extra.push('พ.ร.บ.');
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
    // ไม่สนช่องว่าง/เครื่องหมาย / ในคำค้น เช่น "ครู อาจารย์" หาเจอ "ครู / อาจารย์"
    const norm = (t) => t.toLowerCase().replace(/[\s/]+/g, '');
    const q = norm(sheet.query);
    const items = sheet.items.filter((it) => !q || norm(`${it.label} ${it.sub || ''}`).includes(q));
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
    if (isPaTab()) return !state.paAge ? 'step-age' : !state.paOcc ? 'step-occ' : 'seePlans';
    const m = getModel();
    if (!m || !m.kind) return 'step-model';
    if (!state.year) return 'step-year';
    if (needsBody(m.kind) && !state.body) return 'step-body';
    return 'seePlans';
  }

  function resetCar() {
    Object.assign(state, { modelName: null, customModel: false, customModelName: '', customKind: null, customCc: null, year: null, body: null, usage: 'personal' });
  }

  function selectVtype(vtype) {
    if (state.vtype === vtype || !VTYPES[vtype]) return;
    state.vtype = vtype;
    state.filter = 'all';
    state.brandId = null;
    state.customBrand = '';
    resetCar();
    render();
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
    state.customCc = null;
    if (!isMotoTab()) state.body = null; // จังหวัดที่จดทะเบียนไม่ขึ้นกับรุ่น
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
        await navigator.share({ files: [file], title: shareTitle() });
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
        await navigator.share({ title: shareTitle(), text });
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
      case 'vtype': selectVtype(val); break;
      case 'brand': selectBrand(val); break;
      case 'brand-more': {
        const current = getBrand();
        openSheet({
          title: 'เลือกยี่ห้อรถ',
          search: true,
          placeholder: VTYPES[state.vtype].brandHint,
          items: [...brandList()].sort((a, b) => a.name.localeCompare(b.name)).map((b) => ({ value: b.id, label: b.name, sub: b.th, selected: current && current.id === b.id })),
          extra: (q) => [{ value: '__other', label: q ? `ใช้ยี่ห้อ “${q}”` : 'ไม่พบยี่ห้อรถ', sub: 'ยี่ห้ออื่นที่ไม่มีในรายการ', muted: true }],
          onPick: (v, q) => (v === '__other' ? selectBrand('other', q) : selectBrand(v)),
        });
        break;
      }
      case 'pa-age':
        state.paAge = val;
        render();
        scrollToStep(nextStepId());
        break;
      case 'pa-occ':
        state.paOcc = val;
        state.paOccName = '';
        render();
        scrollToStep('seePlans');
        break;
      case 'pa-occ-more':
        openSheet({
          title: 'ค้นหาอาชีพ',
          search: true,
          placeholder: 'พิมพ์ชื่ออาชีพ เช่น ครู, ช่างไฟ',
          items: PA.occList.map(([name, id, note]) => ({
            value: name,
            label: name,
            sub: (id === 'student' ? 'นักเรียน / นักศึกษา' : `ชั้น ${id}`) + (note === PA.legacyNote ? ' · ใบเก่า' : ''),
            selected: state.paOccName === name,
          })),
          onPick: (name) => {
            const found = PA.occList.find(([n]) => n === name);
            if (!found) return;
            state.paOcc = found[1];
            state.paOccName = name;
            render();
            scrollToStep('seePlans');
          },
        });
        break;
      case 'model': selectModel(val); break;
      case 'model-more': {
        const brand = getBrand();
        const model = getModel();
        openSheet({
          title: `รุ่นรถ ${brand.name}`,
          search: brand.models.length > TOP_MODELS,
          placeholder: 'ค้นหารุ่นรถ',
          items: brand.models.map((m) => ({ value: m.name, label: m.name, sub: m.kind === 'moto' ? ccLabel(m) : KINDS[m.kind].short, selected: model === m })),
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
      case 'cc':
        state.customKind = 'moto';
        state.customCc = Number(val);
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
          title: `เลือกปี${VTYPES[state.vtype].noun}`,
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
      case 'cust': state.custType = val; render(); break;
      case 'filter': state.filter = val; render(); break;
      case 'deduct': state.deduct = val === '1'; render(); break;
      case 'pick': togglePick(val); break;
      case 'cov-toggle':
        if (openCov.has(val)) openCov.delete(val); else openCov.add(val);
        render();
        break;
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
        state = { ...initialState(), deduct: state.deduct, custType: state.custType, vtype: state.vtype };
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
      state.sums[el.dataset.fam] = Number(el.value);
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
