//Prem
(function () {
  // state กลางของแอป ใช้เก็บทั้งข้อมูลอินพุต สถานะการรัน และผลสรุปที่ renderer ต้องอ่าน
  // การรวม state ไว้ตรงนี้ช่วยให้แต่ละไฟล์สื่อสารกันผ่านแหล่งข้อมูลเดียว ลดการส่งค่าข้ามฟังก์ชันที่ซับซ้อน
  const app = (window.SortingApp = window.SortingApp || {});
  app.state = {
    // ข้อมูลต้นฉบับที่ผู้ใช้ป้อนหรือกดใช้ sample และจะไม่ถูกแก้ระหว่างแสดงผล
    sourceArray: [...app.DEFAULT_SAMPLE],

    // สำเนาที่ถูกใช้เป็นอาร์เรย์ทำงานจริงระหว่างการ sort และเปลี่ยนค่าไปตามแต่ละ operation
    workingArray: [...app.DEFAULT_SAMPLE],

    // ผลลัพธ์สุดท้ายหลังเรียงเสร็จ ใช้แสดงส่วน after array หรือใช้ตรวจว่าสิ้นสุดแล้ว
    finalArray: [],

    // เวอร์ชันของ sourceArray ที่ถูกปรับให้อยู่ในรูปที่เหมาะกับการแสดงผล
    displaySourceArray: [...app.DEFAULT_SAMPLE],

    // ลิสต์ operation แบบละเอียดที่ถูกสร้างจากอัลกอริทึม เพื่อนำไปเล่นทีละ step
    operations: [],

    // ข้อมูลแต่ละแถวของตาราง trace สำหรับอธิบายลำดับเหตุการณ์ย้อนหลัง
    traceRows: [],

    // บอกว่าระบบเตรียม operation พร้อมสำหรับการเล่นแล้วหรือยัง
    prepared: false,

    // step ปัจจุบันที่ผู้ใช้กำลังดูอยู่
    currentStep: 0,

    // จำนวนครั้งที่เกิดการเปรียบเทียบ
    comparisons: 0,

    // จำนวนครั้งที่เกิดการสลับหรือเคลื่อนย้ายข้อมูล
    swaps: 0,

    // เก็บเลขรอบที่เคยเกิดขึ้นแล้วในรูปแบบ Set เพื่อใช้คำนวณจำนวนรอบแบบไม่ซ้ำ
    roundsSeen: new Set(),

    // index ที่เรียงเสร็จแล้ว ณ เวลาปัจจุบัน
    sortedIndices: new Set(),

    // operation ที่กำลังถูกแสดงอยู่ตอนนี้ เพื่อให้ renderer รู้ว่าจะเน้น node หรือช่องไหน
    currentOperation: null,

    // id ของ timer สำหรับโหมด autoplay เพื่อให้หยุดหรือเริ่มใหม่ได้ถูกตัว
    autoplayId: null,

    // flag รวมว่าตอนนี้ระบบกำลังเล่น animation อยู่หรือไม่
    running: false,
  };
})();
