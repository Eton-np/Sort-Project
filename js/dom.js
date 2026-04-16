(function () {
  // ดึง reference ของ DOM element ที่ต้องใช้บ่อยมาเก็บรวมกันไว้ใน object เดียว
  // แนวทางนี้ช่วยลดการ query ซ้ำหลายรอบ ทำให้โค้ดส่วน controller / renderer อ่านง่ายขึ้น
  // และยังทำหน้าที่เป็นเหมือน "แผนที่ของหน้าเว็บ" ว่าระบบควบคุม element ไหนอยู่บ้าง
  const app = (window.SortingApp = window.SortingApp || {});
  app.elements = {
    // ช่องกรอกข้อมูลดิบจากผู้ใช้ เช่น "5, 3, 9, 1"
    dataInput: document.querySelector("#dataInput"),

    // พื้นที่แสดงข้อความ validation เมื่อรูปแบบข้อมูลไม่ถูกต้อง
    validationMessage: document.querySelector("#validationMessage"),

    // ปุ่มใส่ชุดข้อมูลตัวอย่างอัตโนมัติ
    sampleButton: document.querySelector("#sampleButton"),

    // ปุ่มล้างข้อมูลในช่อง input
    clearInputButton: document.querySelector("#clearInputButton"),

    // dropdown สำหรับเลือกอัลกอริทึมที่ต้องการสาธิต
    algorithmSelect: document.querySelector("#algorithmSelect"),

    // slider ปรับความเร็วการเล่น animation
    speedRange: document.querySelector("#speedRange"),

    // label ที่สะท้อนค่าความเร็วปัจจุบันของ slider
    speedLabel: document.querySelector("#speedLabel"),

    // ปุ่มเริ่มกระบวนการ sort ใหม่ตั้งแต่ต้น
    startButton: document.querySelector("#startButton"),

    // ปุ่มเดินทีละ step เพื่อใช้สาธิตแบบ manual
    stepButton: document.querySelector("#stepButton"),

    // ปุ่มเล่นอัตโนมัติทีละหลาย step ตามความเร็วที่เลือก
    autoButton: document.querySelector("#autoButton"),

    // ปุ่มหยุดการเล่นอัตโนมัติ
    stopButton: document.querySelector("#stopButton"),

    // ปุ่มรีเซ็ตสถานะการแสดงผลทั้งหมด
    resetButton: document.querySelector("#resetButton"),

    // ข้อความ hero ด้านบนที่โชว์ชื่ออัลกอริทึมเด่น ๆ
    heroAlgorithm: document.querySelector("#heroAlgorithm"),

    // พื้นที่สื่อสารสถานะการรัน เช่น พร้อมเริ่ม / กำลังเล่น / เสร็จแล้ว
    runStatus: document.querySelector("#runStatus"),

    // ตัวนับจำนวนรอบที่อัลกอริทึมทำงานไปแล้ว
    roundCount: document.querySelector("#roundCount"),

    // ตัวนับจำนวนครั้งที่มีการเปรียบเทียบข้อมูล
    comparisonCount: document.querySelector("#comparisonCount"),

    // ตัวนับจำนวนครั้งที่มีการสลับข้อมูล
    swapCount: document.querySelector("#swapCount"),

    // กล่องแสดงข้อมูลก่อนเริ่ม sort
    beforeArray: document.querySelector("#beforeArray"),

    // กล่องแสดงข้อมูลหลัง sort เสร็จ
    afterArray: document.querySelector("#afterArray"),

    // ข้อความอธิบายว่าขณะนี้ step ปัจจุบันกำลังทำอะไรอยู่
    currentStepMessage: document.querySelector("#currentStepMessage"),

    // container หลักของ visualization แบบกล่องเรียงแนวนอน
    barsContainer: document.querySelector("#barsContainer"),

    // tbody ของตารางบันทึก step แบบละเอียด
    stepsTableBody: document.querySelector("#stepsTableBody"),

    // หัวข้อส่วนอธิบายอัลกอริทึม
    algorithmTitle: document.querySelector("#algorithmTitle"),

    // ย่อหน้าหลักการทำงานของอัลกอริทึม
    algorithmPrinciple: document.querySelector("#algorithmPrinciple"),

    // ย่อหน้าขยายภาพแนวคิดสำคัญเพื่อช่วยพรีเซนต์
    algorithmIdea: document.querySelector("#algorithmIdea"),

    // ช่องแสดง best case
    bestCase: document.querySelector("#bestCase"),

    // ช่องแสดง average case
    averageCase: document.querySelector("#averageCase"),

    // ช่องแสดง worst case
    worstCase: document.querySelector("#worstCase"),

    // ช่องแสดง space complexity
    spaceCase: document.querySelector("#spaceCase"),

    // รายการ bullet ของ highlights
    algorithmHighlights: document.querySelector("#algorithmHighlights"),

    // section พิเศษสำหรับแสดง heap tree ซึ่งจะแสดงเฉพาะเมื่อเลือก Heap Sort
    heapTreeSection: document.querySelector("#heapTreeSection"),

    // ข้อความอธิบายสถานะของ heap ณ step ปัจจุบัน
    heapTreeMessage: document.querySelector("#heapTreeMessage"),

    // container ที่ใช้วาดโหนดและเส้นของ heap tree
    heapTreeContainer: document.querySelector("#heapTreeContainer"),

    // พื้นที่แสดงสมาชิกที่ถูกย้ายไปเป็น sorted tail ของ heap แล้ว
    heapSortedTail: document.querySelector("#heapSortedTail"),

    // ข้อความนำของโซน process gallery
    processGalleryMessage: document.querySelector("#processGalleryMessage"),
    
    // พื้นที่แสดงการ์ด snapshot ราย step สำหรับสรุปการทำงาน
    processGallery: document.querySelector("#processGallery"),
  };
})();
