/*
 * ยี่ห้อ / รุ่นรถจักรยานยนต์ สำหรับขั้นตอนเลือกรถ (แท็บมอเตอร์ไซค์)
 *
 * popular = แสดงเป็นปุ่มโลโก้ในหน้าแรก
 *
 * รุ่นรถ: [ชื่อรุ่น, ขนาดเครื่องยนต์ cc, ปีเริ่ม, ปีสุดท้าย]
 *   cc ใช้แยกราคา ป.3 (ไม่เกิน 110 / เกิน 110), เช็คเงื่อนไขไม่เกิน 200cc และคิด พ.ร.บ.
 *   รุ่นที่เกิน 200cc ใส่ไว้ด้วย เพื่อให้แอพแจ้งว่าไม่อยู่ในตารางเบี้ย
 *   ไม่ใส่ปีเริ่ม = แสดงทุกปี, ไม่ใส่ปีสุดท้าย = ยังขายอยู่
 *   รุ่นยอดนิยมเรียงไว้ก่อน (8 รุ่นแรกแสดงเป็นปุ่ม)
 */
window.MT_MOTO_BRANDS = [
  { id: 'honda', name: 'Honda', th: 'ฮอนด้า', popular: true, color: '#CC0000', models: [
    ['Wave 110i', 110], ['Click 125i', 125], ['Click 160', 160, 2022], ['Scoopy', 110],
    ['Wave 125i', 125], ['PCX 160', 160, 2021], ['Giorno+', 125, 2022], ['ADV 160', 160, 2022],
    ['Lead 125', 125], ['Super Cub', 110], ['Dream 110i', 110], ['Zoomer-X', 110],
    ['Monkey', 125], ['CT125', 125], ['Grom', 125], ['CBR150R', 150], ['CB150R', 150],
    ['Forza 350', 330, 2020], ['ADV 350', 330, 2022],
  ] },
  { id: 'yamaha', name: 'Yamaha', th: 'ยามาฮ่า', popular: true, color: '#1B2A7B', models: [
    ['Fino 125', 125], ['Grand Filano', 125], ['NMAX 155', 155, 2015], ['Aerox 155', 155, 2017],
    ['Finn 115', 115, 2018], ['Exciter 155', 155], ['QBIX 125', 125], ['Spark 115i', 115],
    ['GT125', 125], ['XSR155', 155], ['MT-15', 155], ['YZF-R15', 155],
    ['XMAX 300', 300, 2017],
  ] },
  { id: 'suzuki', name: 'Suzuki', th: 'ซูซูกิ', popular: true, color: '#1B3F8B', models: [
    ['Smash 115', 115], ['Burgman Street 125', 125], ['Avenis 125', 125], ['Raider R150', 150],
    ['GSX-R150', 150], ['GD110', 110],
  ] },
  { id: 'kawasaki', name: 'Kawasaki', th: 'คาวาซากิ', popular: true, color: '#2F7D16', models: [
    ['W175', 175], ['KLX150', 150], ['Z125 Pro', 125], ['KLX230', 230],
    ['Ninja 250', 250], ['Ninja 400', 400], ['Z400', 400], ['Z650', 650],
  ] },
  { id: 'gpx', name: 'GPX', th: 'จีพีเอ็กซ์', popular: true, color: '#C8102E', models: [
    ['Drone 150', 150], ['Demon 150', 150], ['Legend 150', 150], ['Legend 200', 200],
    ['Gentleman 200', 200], ['Popz 125', 125], ['Tuscany 150', 150], ['Legend 250 Twin', 250],
  ] },
  { id: 'vespa', name: 'Vespa', th: 'เวสป้า', popular: true, color: '#1C6E8C', models: [
    ['Sprint 150', 155], ['Primavera 150', 155], ['Sprint 125', 125], ['Primavera 125', 125],
    ['LX 125', 125], ['GTS 300', 300],
  ] },

  { id: 'lambretta', name: 'Lambretta', th: 'แลมเบรตต้า', models: [
    ['V125', 125], ['V200', 170], ['X300', 280],
  ] },
  { id: 'royalenfield', name: 'Royal Enfield', th: 'รอยัล เอ็นฟีลด์', models: [
    ['Hunter 350', 350], ['Classic 350', 350], ['Meteor 350', 350],
  ] },
];
