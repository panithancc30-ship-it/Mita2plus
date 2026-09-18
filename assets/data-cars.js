/*
 * ยี่ห้อ / รุ่นรถ สำหรับขั้นตอนเลือกรถ
 *
 * group  jp, market = รถญี่ปุ่น / รถตลาด → คำนวณ ป.2+ และ ป.3+ ได้
 *        luxury     = รถยุโรป (ไม่อยู่ในตารางเบี้ย ป.2+ / ป.3+) → แสดงเฉพาะ ป.3
 *        super      = Super Car (บริษัทระบุว่าไม่รับตามตาราง) → ให้ติดต่อเจ้าหน้าที่
 *        truck      = ยี่ห้อรถบรรทุก
 * popular = แสดงเป็นปุ่มโลโก้ในหน้าแรก
 *
 * รุ่นรถ: [ชื่อรุ่น, ประเภท, ปีเริ่ม, ปีสุดท้าย]
 *   ประเภท car = เก๋ง/SUV/PPV (รหัส 110) · pickup = กระบะไม่เกิน 4 ตัน (320) · van = รถตู้ (210)
 *          truck6 = บรรทุก 6 ล้อ ไม่เกิน 12 ตัน · truck10 = บรรทุก 10 ล้อ เกิน 12 ตัน
 *   ไม่ใส่ปีเริ่ม = แสดงทุกปี, ไม่ใส่ปีสุดท้าย = ยังขายอยู่
 *   รุ่นยอดนิยมเรียงไว้ก่อน (8 รุ่นแรกแสดงเป็นปุ่ม)
 */
window.MT_BRANDS = [
  { id: 'toyota', name: 'Toyota', th: 'โตโยต้า', group: 'jp', popular: true, color: '#E50012', models: [
    ['Hilux Revo', 'pickup', 2015], ['Yaris ATIV', 'car', 2017], ['Fortuner', 'car', 2004], ['Corolla Cross', 'car', 2020],
    ['Hilux Vigo', 'pickup', 2004, 2015], ['Vios', 'car', 2002, 2022], ['Yaris', 'car', 2005], ['Corolla Altis', 'car', 2001],
    ['Camry', 'car'], ['Veloz', 'car', 2022], ['Yaris Cross', 'car', 2023], ['Hilux Champ', 'pickup', 2023],
    ['C-HR', 'car', 2017, 2024], ['Innova', 'car', 2004, 2020], ['Avanza', 'car', 2004, 2022], ['Sienta', 'car', 2016, 2023],
    ['Alphard', 'car', 2008], ['Vellfire', 'car', 2009], ['Prius', 'car', 2009], ['bZ4X', 'car', 2022],
    ['Hilux Tiger', 'pickup', 1998, 2005], ['Commuter', 'van', 2005], ['Hiace', 'van'], ['Majesty', 'van', 2019],
  ] },
  { id: 'honda', name: 'Honda', th: 'ฮอนด้า', group: 'jp', popular: true, color: '#CC0000', models: [
    ['City', 'car'], ['Civic', 'car'], ['HR-V', 'car', 2014], ['CR-V', 'car'],
    ['City Hatchback', 'car', 2021], ['Jazz', 'car', 2003, 2022], ['Accord', 'car'], ['BR-V', 'car', 2016],
    ['WR-V', 'car', 2023], ['ZR-V', 'car', 2023], ['e:N1', 'car', 2024], ['Brio', 'car', 2011, 2019],
    ['Mobilio', 'car', 2014, 2019], ['Freed', 'car', 2010, 2017],
  ] },
  { id: 'mazda', name: 'Mazda', th: 'มาสด้า', group: 'jp', popular: true, color: '#1F1F1F', models: [
    ['Mazda2', 'car', 2009], ['CX-30', 'car', 2019], ['CX-3', 'car', 2015], ['Mazda3', 'car', 2004],
    ['BT-50', 'pickup', 2006], ['CX-5', 'car', 2013], ['CX-8', 'car', 2019], ['CX-60', 'car', 2023],
  ] },
  { id: 'nissan', name: 'Nissan', th: 'นิสสัน', group: 'jp', popular: true, color: '#2B2B2B', models: [
    ['Navara', 'pickup', 2007], ['Almera', 'car', 2011], ['Kicks', 'car', 2020], ['Terra', 'car', 2018],
    ['X-Trail', 'car'], ['March', 'car', 2010, 2023], ['Note', 'car', 2017, 2023], ['Sylphy', 'car', 2012, 2020],
    ['Teana', 'car', 2004, 2020], ['Frontier', 'pickup', 1998, 2007], ['Tiida', 'car', 2006, 2012], ['Pulsar', 'car', 2013, 2017],
    ['Juke', 'car', 2013, 2018], ['Leaf', 'car', 2018], ['Urvan', 'van'],
  ] },
  { id: 'isuzu', name: 'Isuzu', th: 'อีซูซุ', group: 'jp', popular: true, color: '#D5001C', models: [
    ['D-Max', 'pickup', 2002], ['V-Cross', 'pickup', 2012], ['MU-X', 'car', 2013], ['MU-7', 'car', 2004, 2013],
    ['รถบรรทุก 6 ล้อ', 'truck6'], ['รถบรรทุก 10 ล้อ', 'truck10'],
  ] },
  { id: 'mitsubishi', name: 'Mitsubishi', th: 'มิตซูบิชิ', group: 'jp', popular: true, color: '#E60012', models: [
    ['Triton', 'pickup', 2005], ['Pajero Sport', 'car', 2008], ['Xpander', 'car', 2017], ['Xpander Cross', 'car', 2020],
    ['Attrage', 'car', 2013], ['Mirage', 'car', 2012], ['Xforce', 'car', 2024], ['Outlander PHEV', 'car', 2021],
    ['Lancer EX', 'car', 2009, 2017], ['Lancer', 'car', 1996, 2012], ['Space Wagon', 'car', 2004, 2012], ['Strada', 'pickup', 1996, 2005],
  ] },
  { id: 'ford', name: 'Ford', th: 'ฟอร์ด', group: 'market', popular: true, color: '#003478', models: [
    ['Ranger', 'pickup'], ['Everest', 'car', 2003], ['Ranger Raptor', 'pickup', 2018], ['Territory', 'car', 2022],
    ['Focus', 'car', 2005, 2019], ['Fiesta', 'car', 2010, 2018], ['EcoSport', 'car', 2014, 2019],
  ] },
  { id: 'suzuki', name: 'Suzuki', th: 'ซูซูกิ', group: 'jp', popular: true, color: '#1B3F8B', models: [
    ['Swift', 'car', 2008], ['Ciaz', 'car', 2015, 2023], ['Celerio', 'car', 2014, 2022], ['XL7', 'car', 2020],
    ['Ertiga', 'car', 2013], ['Carry', 'pickup', 2007], ['Jimny', 'car', 2018], ['Vitara', 'car', 2016, 2020],
  ] },
  { id: 'mg', name: 'MG', th: 'เอ็มจี', group: 'market', popular: true, color: '#B5121B', models: [
    ['MG ZS', 'car', 2017], ['MG5', 'car', 2015], ['MG HS', 'car', 2019], ['MG4 Electric', 'car', 2022],
    ['MG3', 'car', 2014], ['MG Extender', 'pickup', 2019], ['MG ZS EV', 'car', 2019], ['MG VS HEV', 'car', 2023],
    ['MG EP', 'car', 2020, 2023], ['MG6', 'car', 2014, 2019], ['MG Maxus 9', 'car', 2023],
  ] },

  { id: 'byd', name: 'BYD', th: 'บีวายดี', group: 'market', models: [
    ['Atto 3', 'car', 2022], ['Seal', 'car', 2023], ['Dolphin', 'car', 2023], ['Sealion 6', 'car', 2024],
    ['Sealion 7', 'car', 2025], ['M6', 'car', 2024], ['Atto 2', 'car', 2025], ['Shark 6', 'pickup', 2025],
  ] },
  { id: 'chevrolet', name: 'Chevrolet', th: 'เชฟโรเลต', group: 'market', models: [
    ['Colorado', 'pickup', 2004, 2020], ['Trailblazer', 'car', 2012, 2020], ['Captiva', 'car', 2007, 2020], ['Cruze', 'car', 2010, 2017],
    ['Sonic', 'car', 2012, 2016], ['Spin', 'car', 2013, 2017], ['Aveo', 'car', 2006, 2014], ['Optra', 'car', 2003, 2012],
  ] },
  { id: 'gwm', name: 'GWM', th: 'เกรท วอลล์ มอเตอร์ (Haval / ORA / Tank)', group: 'market', models: [
    ['Haval H6', 'car', 2021], ['Haval Jolion', 'car', 2021], ['ORA Good Cat', 'car', 2021], ['ORA 07', 'car', 2023],
    ['Tank 300', 'car', 2023], ['Tank 500', 'car', 2023],
  ] },
  { id: 'hyundai', name: 'Hyundai', th: 'ฮุนได', group: 'market', models: [
    ['Creta', 'car', 2023], ['Stargazer', 'car', 2023], ['Tucson', 'car', 2010], ['Ioniq 5', 'car', 2022],
    ['Staria', 'van', 2021], ['H-1', 'van', 2008, 2021],
  ] },
  { id: 'kia', name: 'Kia', th: 'เกีย', group: 'market', models: [
    ['Carnival', 'car', 2006], ['Sorento', 'car', 2010], ['EV5', 'car', 2024], ['EV6', 'car', 2022], ['EV9', 'car', 2024],
  ] },
  { id: 'neta', name: 'Neta', th: 'เนต้า', group: 'market', models: [
    ['Neta V', 'car', 2022], ['Neta V-II', 'car', 2024], ['Neta X', 'car', 2024],
  ] },
  { id: 'changan', name: 'Changan', th: 'ฉางอาน (Deepal)', group: 'market', models: [
    ['Deepal S07', 'car', 2024], ['Deepal L07', 'car', 2024], ['Lumin', 'car', 2024],
  ] },
  { id: 'subaru', name: 'Subaru', th: 'ซูบารุ', group: 'jp', models: [
    ['Forester', 'car'], ['XV / Crosstrek', 'car', 2012],
  ] },
  { id: 'lexus', name: 'Lexus', th: 'เลกซัส', group: 'jp', models: [
    ['ES', 'car'], ['NX', 'car', 2014], ['RX', 'car'], ['UX', 'car', 2019], ['IS', 'car'], ['LM', 'car', 2020],
  ] },

  { id: 'mercedes', name: 'Mercedes-Benz', th: 'เมอร์เซเดส-เบนซ์', group: 'luxury', models: [
    ['C-Class', 'car'], ['E-Class', 'car'], ['GLC', 'car', 2016], ['A-Class', 'car', 2013], ['CLA', 'car', 2014],
    ['GLA', 'car', 2014], ['GLE', 'car', 2016], ['S-Class', 'car'], ['GLB', 'car', 2020], ['GLS', 'car', 2016],
    ['CLS', 'car'], ['EQA', 'car', 2022], ['EQB', 'car', 2023], ['EQE', 'car', 2023], ['EQS', 'car', 2022],
  ] },
  { id: 'bmw', name: 'BMW', th: 'บีเอ็มดับเบิลยู', group: 'luxury', models: [
    ['Series 3', 'car'], ['Series 5', 'car'], ['X1', 'car', 2010], ['X3', 'car'], ['X5', 'car'], ['Series 7', 'car'],
    ['Series 1', 'car', 2005], ['Series 2', 'car', 2014], ['Series 4', 'car', 2014], ['X4', 'car', 2015], ['X6', 'car', 2008],
    ['X7', 'car', 2019], ['iX', 'car', 2022], ['iX1', 'car', 2023], ['iX3', 'car', 2022], ['i4', 'car', 2022], ['i5', 'car', 2024], ['i7', 'car', 2023],
  ] },
  { id: 'volvo', name: 'Volvo', th: 'วอลโว่', group: 'luxury', models: [
    ['XC60', 'car'], ['XC40', 'car', 2018], ['XC90', 'car'], ['S60', 'car'], ['S90', 'car', 2017], ['V60', 'car', 2019],
    ['EX30', 'car', 2024], ['C40', 'car', 2022],
  ] },
  { id: 'audi', name: 'Audi', th: 'อาวดี้', group: 'luxury', models: [
    ['A4', 'car'], ['A6', 'car'], ['Q3', 'car', 2012], ['Q5', 'car', 2009], ['Q7', 'car'], ['e-tron', 'car', 2021], ['Q8 e-tron', 'car', 2023],
  ] },
  { id: 'mini', name: 'MINI', th: 'มินิ', group: 'luxury', models: [
    ['Cooper', 'car'], ['Countryman', 'car', 2011], ['Clubman', 'car', 2008],
  ] },
  { id: 'porsche', name: 'Porsche', th: 'ปอร์เช่', group: 'super', models: [
    ['Cayenne', 'car'], ['Macan', 'car', 2014], ['Panamera', 'car', 2010], ['911', 'car'], ['Taycan', 'car', 2020], ['718', 'car', 2016],
  ] },

  { id: 'hino', name: 'Hino', th: 'ฮีโน่', group: 'truck', models: [
    ['รถบรรทุก 6 ล้อ', 'truck6'], ['รถบรรทุก 10 ล้อ', 'truck10'],
  ] },
  { id: 'fuso', name: 'Mitsubishi Fuso', th: 'มิตซูบิชิ ฟูโซ่', group: 'truck', models: [
    ['รถบรรทุก 6 ล้อ', 'truck6'], ['รถบรรทุก 10 ล้อ', 'truck10'],
  ] },
  { id: 'ud', name: 'UD Trucks', th: 'ยูดี ทรัคส์', group: 'truck', models: [
    ['รถบรรทุก 6 ล้อ', 'truck6'], ['รถบรรทุก 10 ล้อ', 'truck10'],
  ] },
];
