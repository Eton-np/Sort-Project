(function () {
  // ไฟล์นี้เป็นศูนย์กลางการควบคุมการทำงานของหน้าเว็บ
  // หน้าที่หลักคือเชื่อม state, algorithms, renderers และ event ของผู้ใช้เข้าด้วยกัน
  // พูดง่าย ๆ คือเป็นชั้น controller ที่คุมว่า "เมื่อผู้ใช้กดอะไร ระบบต้องเตรียมข้อมูล รัน step และวาดผลอย่างไร"
  const app = (window.SortingApp = window.SortingApp || {});
  const { DEFAULT_SAMPLE, ALGORITHM_INFO, elements, state } = app;
  const { buildTraceRows, generateOperations, parseInput } = app.algorithms;
  // ดึงฟังก์ชัน render ที่จำเป็นมาใช้รวมกัน เพื่อให้ไฟล์นี้เป็นตัวสั่งอัปเดตหน้าจอในแต่ละเหตุการณ์
  const { getSelectedAlgorithm, renderBars, renderHeapTree, renderNumberBoxes, renderProcessGallery, renderRoundSummaryTable, renderStepsTable, setStatus, updateAlgorithmGuide, updateCounters, updateValidation } = app.renderers;

  function stopAutoplay() {
    // หยุด timer ของโหมดเล่นอัตโนมัติ ถ้ามีการรันค้างอยู่
    // ใช้ก่อนเริ่ม autoplay ใหม่, reset, เปลี่ยนอัลกอริทึม หรือหยุดชั่วคราว
    if (state.autoplayId !== null) {
      window.clearInterval(state.autoplayId);
      state.autoplayId = null;
    }
  }

  function resetExecutionState() {
    // รีเซ็ต "สถานะการรัน" โดยไม่ทิ้งข้อมูลต้นฉบับที่ผู้ใช้กรอก
    // เหมาะกับกรณีที่เตรียม operations แล้ว แต่อยากกลับไปเริ่มดูตั้งแต่ step 0 ใหม่
    stopAutoplay();
    state.workingArray = getSelectedAlgorithm() === "heap" && state.prepared ? [] : [...state.sourceArray];
    state.currentStep = 0;
    state.comparisons = 0;
    state.swaps = 0;
    state.roundsSeen = new Set();
    state.sortedIndices = new Set();
    state.currentOperation = null;
    state.running = false;

    // หลังรีเซ็ต state ต้องสั่ง render ทุก panel ใหม่ให้สอดคล้องกัน
    updateCounters();
    renderBars(state.workingArray);
    renderHeapTree();
    renderProcessGallery();
    renderRoundSummaryTable();
    renderStepsTable();
    elements.currentStepMessage.textContent = "กดดูทีละขั้นหรือรันอัตโนมัติเพื่อเริ่มแสดงขั้นตอน";
  }

  function clearPreparedRun() {
    // ล้างข้อมูลที่ถูก generate มาจากการรันก่อนหน้า เช่น operations และ trace rows
    // ใช้เมื่อมีการเปลี่ยน input หรือเปลี่ยนอัลกอริทึมจนต้องเตรียมใหม่ทั้งหมด
    state.operations = [];
    state.traceRows = [];
    state.finalArray = [];
    state.prepared = false;
    resetExecutionState();
  }

  function prepareRun() {
    // ขั้นแรกของการเริ่มงานจริง:
    // 1) parse ข้อมูลจาก input
    // 2) validate ว่าถูกต้องหรือไม่
    // 3) สร้าง operations ทั้งหมดล่วงหน้า
    // 4) สร้าง trace rows สำหรับตาราง
    const parsed = parseInput(elements.dataInput.value);
    if (parsed.error) {
      updateValidation(parsed.error);
      setStatus("ข้อมูลไม่ถูกต้อง");
      return false;
    }
    updateValidation("");
    stopAutoplay();
    state.sourceArray = [...parsed.values];
    state.displaySourceArray = [...parsed.values];
    const { operations, sortedArray } = generateOperations(parsed.values, getSelectedAlgorithm());
    // operations คือหัวใจของระบบ visualizer เพราะทุก step ที่แสดงบนหน้าจอมาจากชุดข้อมูลนี้
    state.operations = operations;
    state.traceRows = buildTraceRows(parsed.values, operations);
    state.finalArray = sortedArray;
    state.prepared = true;
    resetExecutionState();
    setStatus("เตรียมข้อมูลพร้อมแล้ว");
    return true;
  }

  function finishRun() {
    // ปิดงานเมื่อเล่นครบทุก operation แล้ว
    // ฟังก์ชันนี้จะบังคับให้หน้าจออยู่ในสภาพ "เสร็จสมบูรณ์" อย่างชัดเจน
    stopAutoplay();
    state.running = false;
    state.currentStep = state.operations.length;
    state.currentOperation = null;

    // highlight ทุกตำแหน่งว่า sorted แล้ว เพื่อสื่อผลลัพธ์สุดท้ายให้ผู้ใช้เห็นทันที
    renderBars(state.workingArray, [], [], Array.from({ length: state.workingArray.length }, (_, index) => index), []);
    renderHeapTree();
    renderProcessGallery();
    renderRoundSummaryTable();
    renderStepsTable();
    elements.currentStepMessage.textContent = "เรียงข้อมูลเสร็จสมบูรณ์แล้ว";
    setStatus("เรียงข้อมูลเสร็จแล้ว");
  }

  function executeOperation(operation) {
    // ประมวลผลหนึ่ง operation แล้วสะท้อนผลลง state และ UI
    // ฟังก์ชันนี้คือจุดที่ทำให้ระบบ "ขยับไปหนึ่ง step"
    if (typeof operation.round === "number" && operation.round > 0) state.roundsSeen.add(operation.round);
    if (operation.type === "compare") state.comparisons += 1;
    if (operation.type === "swap" || operation.type === "overwrite") state.swaps += 1;

    // apply จะเปลี่ยน workingArray ให้ตรงกับผลของ step นี้
    if (typeof operation.apply === "function") operation.apply(state.workingArray);
    if (operation.type === "markSorted") operation.sortedIndices.forEach((index) => state.sortedIndices.add(index));
    state.currentOperation = operation;
    updateCounters();
    elements.currentStepMessage.textContent = operation.message;
    
    // render แบบ real-time ทุกครั้งหลังจบ operation เพื่อให้ทุก panel เดินไปพร้อมกัน
    renderBars(operation.displayArray ?? state.workingArray, operation.indices, operation.swapIndices, [...state.sortedIndices], operation.pivotIndices);
    renderHeapTree();
    renderProcessGallery();
    renderRoundSummaryTable();
  }

  function stepForward() {
    // เดินหน้าไปทีละ step เหมาะกับการพรีเซนต์แบบอธิบายทีละจังหวะ
    if (!state.prepared && !prepareRun()) return;
    if (state.currentStep >= state.operations.length) return finishRun();
    setStatus("กำลังแสดงผล");
    executeOperation(state.operations[state.currentStep]);
    state.currentStep += 1;
    renderStepsTable();
    if (state.currentStep >= state.operations.length) finishRun();
  }

  function autoplay() {
    // เล่น step ต่อเนื่องอัตโนมัติตามความเร็วที่ผู้ใช้ตั้งไว้
    if (!state.prepared && !prepareRun()) return;
    stopAutoplay();
    state.running = true;
    setStatus("รันอัตโนมัติ");
    state.autoplayId = window.setInterval(() => {
      if (state.currentStep >= state.operations.length) return finishRun();
      stepForward();
    }, Number(elements.speedRange.value));
  }

  function handleReset() {
    // รีเซ็ตระบบทั้งหมดกลับสู่ค่าเริ่มต้นเหมือนเพิ่งเปิดหน้าเว็บ
    stopAutoplay();
    state.prepared = false;
    state.sourceArray = [...DEFAULT_SAMPLE];
    state.workingArray = [...DEFAULT_SAMPLE];
    state.operations = [];
    state.traceRows = [];
    state.finalArray = [];
    state.displaySourceArray = [...DEFAULT_SAMPLE];
    state.currentStep = 0;
    state.comparisons = 0;
    state.swaps = 0;
    state.roundsSeen = new Set();
    state.sortedIndices = new Set();
    state.currentOperation = null;
    state.running = false;
    elements.dataInput.value = DEFAULT_SAMPLE.join(", ");
    updateValidation("");
    renderBars(DEFAULT_SAMPLE);
    renderHeapTree();
    renderProcessGallery();
    renderRoundSummaryTable();
    renderStepsTable();
    updateCounters();
    elements.currentStepMessage.textContent = "กดเริ่มเรียงข้อมูลเพื่อดูขั้นตอนการทำงาน";
    setStatus("พร้อมเริ่ม");
  }

  function generateRandomSample() {
    // สุ่มข้อมูลชุดใหม่เพื่อให้ผู้ใช้ทดลองได้เร็ว โดยไม่ต้องพิมพ์เอง
    // จำกัดจำนวนสมาชิกให้อยู่ในช่วงที่ยังดู animation ได้ชัดเจน
    const total = 6 + Math.floor(Math.random() * 5);
    const numbers = Array.from({ length: total }, () => Math.floor(Math.random() * 90) + 10);
    elements.dataInput.value = numbers.join(", ");
    clearPreparedRun();
    state.sourceArray = [...numbers];
    state.displaySourceArray = [...numbers];
    renderBars(numbers);
    setStatus("สุ่มข้อมูลตัวอย่างแล้ว");
  }

  function clearInput() {
    // ล้าง input และล้างสถานะที่เตรียมไว้ เพื่อรอรับข้อมูลใหม่จากผู้ใช้
    elements.dataInput.value = "";
    clearPreparedRun();
    state.sourceArray = [];
    state.displaySourceArray = [];
    renderBars([]);
    updateValidation("ล้างข้อมูลแล้ว กรุณากรอกตัวเลขใหม่");
    setStatus("รอข้อมูลใหม่");
  }

  function registerEvents() {
    // รวม event listener ทั้งหมดไว้ที่เดียว
    // ทำให้เห็นชัดว่าหน้าเว็บตอบสนองต่อ action อะไรบ้าง และแต่ละ action ไปเรียก flow ไหน
    elements.algorithmSelect.addEventListener("change", () => {
      // เมื่อเปลี่ยนอัลกอริทึม ต้องอัปเดตคำอธิบายและล้างผลการรันเก่าที่ไม่สอดคล้องกัน
      updateAlgorithmGuide();
      clearPreparedRun();
      renderBars(state.sourceArray);
      setStatus(`เลือก ${ALGORITHM_INFO[getSelectedAlgorithm()].name} แล้ว`);
    });
    
    elements.speedRange.addEventListener("input", () => {
      // แสดงค่าความเร็วที่ slider เลือกอยู่แบบทันที
      elements.speedLabel.textContent = `${elements.speedRange.value} ms`;
    });
    
    elements.sampleButton.addEventListener("click", generateRandomSample);
    elements.clearInputButton.addEventListener("click", clearInput);
    
    elements.startButton.addEventListener("click", () => {
      // ปุ่ม start จะเตรียม run ก่อนถ้ายังไม่เคย generate operations
      // จากนั้นจึงเข้าสู่ autoplay
      if (!state.prepared) {
        if (!prepareRun()) return;
      }
      autoplay();
    });

    elements.stepButton.addEventListener("click", () => {
      // การกดทีละ step ต้องหยุด autoplay ก่อน เพื่อไม่ให้เกิด timer ซ้อนกัน
      stopAutoplay();
      stepForward();
    });
    
    elements.autoButton.addEventListener("click", autoplay);
    
    elements.stopButton.addEventListener("click", () => {
      stopAutoplay();
      state.running = false;
      setStatus("หยุดชั่วคราว");
    });
    
    elements.resetButton.addEventListener("click", handleReset);
    
    elements.dataInput.addEventListener("input", () => {
      // live preview: ขณะพิมพ์ข้อมูล จะพยายามแสดงกล่องตัวเลขคร่าว ๆ ทันที
      // แต่ยังไม่ generate operations จนกว่าจะกดเริ่มหรือกด step
      updateValidation("");
      state.prepared = false;
      stopAutoplay();

      const rawText = elements.dataInput.value;
      if (rawText.trim() === "") {
        renderBars([]);
        return;
      }

      const parts = rawText.split(",").map(p => p.trim()).filter(p => p !== "");
      const liveArray = [];
      parts.forEach(part => {
        // รองรับทั้งตัวอักษร a-z และตัวเลข
        // ตัวอักษรจะถูกแปลงเป็น object ที่เก็บทั้งค่าเชิงตัวเลขและ label สำหรับแสดงผล
        if (/^[a-z]$/i.test(part)) {
          liveArray.push({ value: part.toLowerCase().charCodeAt(0) - 96, label: part.toLowerCase() });
        } else {
          const num = Number(part);
          if (!Number.isNaN(num)) {
            liveArray.push({ value: num, label: part });
          }
        }
      });

      renderBars(liveArray);
    });

    window.addEventListener("resize", () => {
      // heap tree และ gallery บางแบบต้องคำนวณ layout ใหม่เมื่อขนาดหน้าจอเปลี่ยน
      if (getSelectedAlgorithm() === "heap") {
        renderHeapTree();
        renderProcessGallery();
      }
    });
  }

  app.initApp = function initApp() {
    // จุดเริ่มต้นของแอปเมื่อโหลดสคริปต์ครบแล้ว
    // ทำหน้าที่ตั้งค่า UI เริ่มต้น วาดตัวอย่างครั้งแรก และผูก event handler
    updateAlgorithmGuide();
    elements.speedLabel.textContent = `${elements.speedRange.value} ms`;
    renderBars(DEFAULT_SAMPLE);
    renderHeapTree();
    renderProcessGallery();
    renderRoundSummaryTable();
    renderStepsTable();
    updateCounters();
    setStatus("พร้อมเริ่ม");
    registerEvents();
  };
})();
