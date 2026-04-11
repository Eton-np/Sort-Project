(function () {
  const app = (window.SortingApp = window.SortingApp || {});
  const { DEFAULT_SAMPLE, ALGORITHM_INFO, elements, state } = app;
  const { buildTraceRows, generateOperations, parseInput } = app.algorithms;
  // เพิ่มการดึง renderRoundSummaryTable มาใช้งาน
  const { getSelectedAlgorithm, renderBars, renderHeapTree, renderNumberBoxes, renderProcessGallery, renderRoundSummaryTable, renderStepsTable, setStatus, updateAlgorithmGuide, updateCounters, updateValidation } = app.renderers;

  function stopAutoplay() {
    if (state.autoplayId !== null) {
      window.clearInterval(state.autoplayId);
      state.autoplayId = null;
    }
  }

  function resetExecutionState() {
    stopAutoplay();
    state.workingArray = getSelectedAlgorithm() === "heap" && state.prepared ? [] : [...state.sourceArray];
    state.currentStep = 0;
    state.comparisons = 0;
    state.swaps = 0;
    state.roundsSeen = new Set();
    state.sortedIndices = new Set();
    state.currentOperation = null;
    state.running = false;
    updateCounters();
    renderBars(state.workingArray);
    renderHeapTree();
    renderProcessGallery();
    renderRoundSummaryTable(); // อัปเดตตารางที่ 1
    renderStepsTable();
    elements.currentStepMessage.textContent = "กดดูทีละขั้นหรือรันอัตโนมัติเพื่อเริ่มแสดงขั้นตอน";
  }

  function clearPreparedRun() {
    state.operations = [];
    state.traceRows = [];
    state.finalArray = [];
    state.prepared = false;
    resetExecutionState();
  }

  function prepareRun() {
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
    state.operations = operations;
    state.traceRows = buildTraceRows(parsed.values, operations);
    state.finalArray = sortedArray;
    state.prepared = true;
    resetExecutionState();
    setStatus("เตรียมข้อมูลพร้อมแล้ว");
    return true;
  }

  function finishRun() {
    stopAutoplay();
    state.running = false;
    state.currentStep = state.operations.length;
    state.currentOperation = null;
    renderBars(state.workingArray, [], [], Array.from({ length: state.workingArray.length }, (_, index) => index), []);
    renderHeapTree();
    renderProcessGallery();
    renderRoundSummaryTable(); // อัปเดตตารางที่ 1 ตอนจบ
    renderStepsTable();
    elements.currentStepMessage.textContent = "เรียงข้อมูลเสร็จสมบูรณ์แล้ว";
    setStatus("เรียงข้อมูลเสร็จแล้ว");
  }

  function executeOperation(operation) {
    if (typeof operation.round === "number" && operation.round > 0) state.roundsSeen.add(operation.round);
    if (operation.type === "compare") state.comparisons += 1;
    if (operation.type === "swap" || operation.type === "overwrite") state.swaps += 1;
    if (typeof operation.apply === "function") operation.apply(state.workingArray);
    if (operation.type === "markSorted") operation.sortedIndices.forEach((index) => state.sortedIndices.add(index));
    state.currentOperation = operation;
    updateCounters();
    elements.currentStepMessage.textContent = operation.message;
    
    renderBars(operation.displayArray ?? state.workingArray, operation.indices, operation.swapIndices, [...state.sortedIndices], operation.pivotIndices);
    renderHeapTree();
    renderProcessGallery();
    renderRoundSummaryTable(); // อัปเดตตารางที่ 1 Real-time!
  }

  function stepForward() {
    if (!state.prepared && !prepareRun()) return;
    if (state.currentStep >= state.operations.length) return finishRun();
    setStatus("กำลังแสดงผล");
    executeOperation(state.operations[state.currentStep]);
    state.currentStep += 1;
    renderStepsTable();
    if (state.currentStep >= state.operations.length) finishRun();
  }

  function autoplay() {
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
    elements.dataInput.value = "";
    clearPreparedRun();
    state.sourceArray = [];
    state.displaySourceArray = [];
    renderBars([]);
    updateValidation("ล้างข้อมูลแล้ว กรุณากรอกตัวเลขใหม่");
    setStatus("รอข้อมูลใหม่");
  }

  function registerEvents() {
    elements.algorithmSelect.addEventListener("change", () => {
      updateAlgorithmGuide();
      clearPreparedRun();
      renderBars(state.sourceArray);
      setStatus(`เลือก ${ALGORITHM_INFO[getSelectedAlgorithm()].name} แล้ว`);
    });
    
    elements.speedRange.addEventListener("input", () => {
      elements.speedLabel.textContent = `${elements.speedRange.value} ms`;
    });
    
    elements.sampleButton.addEventListener("click", generateRandomSample);
    elements.clearInputButton.addEventListener("click", clearInput);
    
    elements.startButton.addEventListener("click", () => {
      if (!state.prepared) {
        if (!prepareRun()) return;
      }
      autoplay();
    });

    elements.stepButton.addEventListener("click", () => {
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
      if (getSelectedAlgorithm() === "heap") {
        renderHeapTree();
        renderProcessGallery();
      }
    });
  }

  app.initApp = function initApp() {
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