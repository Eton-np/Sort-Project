//Eton
(function () {
  // โมดูลนี้รับผิดชอบ "การแสดงผลทั้งหมด" ของหน้า visualizer
  // ไม่ได้คำนวณลอจิกการ sort เอง แต่จะอ่านข้อมูลจาก state และ constants
  // แล้วแปลงออกมาเป็นข้อความ ตัวเลข ตาราง การ์ด และภาพเคลื่อนไหวที่ผู้ใช้มองเห็น
  const app = (window.SortingApp = window.SortingApp || {});
  const { ALGORITHM_INFO, elements, state } = app;
  const { cloneArray, getDisplayValue, getNumericValue } = app.algorithms;

  // ดึงชื่ออัลกอริทึมที่ผู้ใช้เลือกอยู่ใน dropdown เพื่อให้ renderer ส่วนต่าง ๆ ใช้อ้างอิงตรงกัน
  const getSelectedAlgorithm = () => elements.algorithmSelect.value;

  // อัปเดตข้อความ validation ใต้ input เช่น เมื่อรูปแบบข้อมูลไม่ถูกต้อง
  const updateValidation = (message = "") => { elements.validationMessage.textContent = message; };

  // อัปเดตข้อความสถานะการทำงานหลักของระบบ
  const setStatus = (text) => { elements.runStatus.textContent = text; };
  
  // เก็บ id เชิงภาพสำหรับ object แต่ละตัวด้วย WeakMap เพื่อให้ element DOM ของ item เดิมถูก reuse ได้
  // วิธีนี้ช่วยให้ animation ลื่นและลดปัญหากล่องกระพริบตอนตำแหน่งสลับกัน
  const objectVisualIds = new WeakMap();
  let nextVisualId = 1;

  // แปลง phase ภายในของ heap ให้เป็นข้อความอ่านง่ายสำหรับผู้ใช้
  const getHeapPhaseLabel = (phase) => {
    if (phase === "build-heap") return "สร้าง Max Heap";
    if (phase === "heap-sort") return "Heap Sort";
    return "สถานะปัจจุบัน";
  };
  // ฟังก์ชันหลักที่ใช้สร้าง key สำหรับการแสดงผลของแต่ละ item ในอาร์เรย์
  function getStableVisualKey(item, occurrence) {
    // ถ้าเป็น object จะผูก key ตามตัว object จริง เพื่อให้แม้ตำแหน่งเปลี่ยน
    // DOM node เดิมก็ยังตาม item เดิมได้อย่างเสถียร
    if (item && typeof item === "object") {
      if (!objectVisualIds.has(item)) objectVisualIds.set(item, `obj-${nextVisualId++}`);
      return objectVisualIds.get(item);
    }

    // ถ้าเป็น primitive เช่น number/string ให้ใช้ค่ารวมกับจำนวนครั้งที่พบ
    // เพื่อแยกสมาชิกที่มีค่าเท่ากันไม่ให้ใช้ key ซ้ำกัน
    return `primitive-${String(item)}-${occurrence}`;
  }
  // สร้างรายการข้อมูลที่พร้อมสำหรับ render โดยแนบทั้ง item, index และ key ที่เสถียรเพื่อใช้กับการจัดการ DOM cache
  function buildVisualEntries(array) {
    // สร้างรายการข้อมูลที่พร้อมสำหรับ render
    // โดยแนบทั้ง item, index และ key ที่เสถียรเพื่อใช้กับการจัดการ DOM cache
    const seen = new Map();
    return array.map((item, index) => {
      const occurrence = seen.get(item) ?? 0;
      seen.set(item, occurrence + 1);
      return { item, index, key: getStableVisualKey(item, occurrence) };
    });
  }
  // ฟังก์ชันนี้ใช้วาดชุดตัวเลขในรูปแบบกล่องสั้น ๆ เช่น ใน before array และ after array
  function renderNumberBoxes(container, values, emptyMessage) {
    // ฟังก์ชันกลางสำหรับวาดชุดตัวเลขแบบกล่องสั้น ๆ
    // ใช้กับหลายจุด เช่น before array และ after array
    if (!container) return;
    container.innerHTML = "";
    if (!values.length) {
      // ถ้าไม่มีข้อมูล ให้แสดงข้อความแทนการปล่อยพื้นที่ว่าง
      const note = document.createElement("p");
      note.className = "text-slate-400 italic text-sm";
      note.textContent = emptyMessage;
      container.appendChild(note);
      return;
    }
    values.forEach((value) => {
      const chip = document.createElement("div");
      chip.className = "px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm font-bold text-blue-700";
      chip.textContent = String(getDisplayValue(value));
      container.appendChild(chip);
    });
  }
  // ฟังก์ชันนี้ใช้วาดชุดตัวเลขในรูปแบบกล่องสั้น ๆ เช่น ใน before array และ after array
  function updateAlgorithmGuide() {
    // โหลด metadata ของอัลกอริทึมที่เลือก แล้วสะท้อนลงทุกส่วนของหน้า
    // ทำให้ dropdown, hero และรายละเอียด Big-O สอดคล้องกันเสมอ
    const meta = ALGORITHM_INFO[getSelectedAlgorithm()];
    elements.heroAlgorithm.textContent = meta.name;
    elements.algorithmTitle.textContent = meta.name;
    elements.algorithmPrinciple.textContent = meta.principle;
    elements.algorithmIdea.textContent = meta.idea;
    elements.bestCase.textContent = meta.best;
    elements.averageCase.textContent = meta.average;
    elements.worstCase.textContent = meta.worst;
    elements.spaceCase.textContent = meta.space;
    elements.algorithmHighlights.innerHTML = "";
    meta.highlights.forEach((text) => {
      // สร้าง bullet ใหม่ทุกครั้งจากข้อมูลกลาง เพื่อไม่ให้เหลือรายการเก่าค้างอยู่
      const item = document.createElement("li");
      item.textContent = text;
      elements.algorithmHighlights.appendChild(item);
    });
  }
  // ฟังก์ชันนี้อัปเดตตัวนับต่าง ๆ ที่ใช้แสดงประสิทธิภาพและความคืบหน้าของการ sort
  function updateCounters() {
    // สรุปตัวเลขสถานะที่ใช้พรีเซนต์ประสิทธิภาพและความคืบหน้า
    elements.comparisonCount.textContent = String(state.comparisons);
    elements.swapCount.textContent = String(state.swaps);
    elements.roundCount.textContent = String(state.roundsSeen.size);
  }
  // ฟังก์ชันนี้วาดตารางที่บันทึกรายละเอียดของทุก step ที่เกิดขึ้นในระหว่างการ sort
  function renderStepsTable() {
    // ตารางนี้ทำหน้าที่เป็น log แบบละเอียดของทุกเหตุการณ์
    // ผู้ใช้สามารถดูย้อนหลังได้ว่า step ไหนเกิดอะไรขึ้นกับอาร์เรย์
    elements.stepsTableBody.innerHTML = "";
    if (!state.traceRows.length) {
      const row = document.createElement("tr");
      row.innerHTML = '<td colspan="5" class="p-4 text-center text-slate-400">ยังไม่มีขั้นตอนการทำงาน กรุณากดเริ่มเรียงข้อมูล</td>';
      elements.stepsTableBody.appendChild(row);
      return;
    }
    const reversedRows = [...state.traceRows].reverse();
    reversedRows.forEach((traceRow) => {
      const row = document.createElement("tr");
      // เน้นแถวที่ตรงกับ step ปัจจุบันเพื่อให้ผู้ใช้จับตำแหน่งในตารางได้เร็ว
      if (state.currentStep > 0 && traceRow.step === state.currentStep) row.classList.add("bg-blue-50", "font-bold", "text-blue-900");
      else row.classList.add("hover:bg-slate-50");
      row.innerHTML = `<td class="p-4 border-b border-slate-100">${traceRow.step}</td><td class="p-4 border-b border-slate-100">${traceRow.round}</td><td class="p-4 border-b border-slate-100">${traceRow.type}</td><td class="p-4 border-b border-slate-100">${traceRow.message}</td><td class="p-4 border-b border-slate-100 font-mono text-xs"><span>${traceRow.arrayText}</span></td>`;
      elements.stepsTableBody.appendChild(row);
    });
  }
  //Prem
  // ฟังก์ชันนี้จำลองการ apply operations ทีละตัวเพื่อสร้าง snapshot ของทุกช่วงเวลา
  function buildVisualSnapshots() {
    // จำลองการ apply operations ทีละตัวเพื่อสร้าง snapshot ของทุกช่วงเวลา
    // snapshot เหล่านี้จะถูกใช้ทั้งใน process gallery และ round summary
    const snapshots = [];
    const tempArray = state.operations.some((operation) => operation.phase === "build-heap") ? [] : cloneArray(state.sourceArray);
    const cumulativeSorted = new Set();
    state.operations.forEach((operation, index) => {
      // apply จะเปลี่ยน tempArray ให้เหมือนสถานะจริงหลัง operation นั้น ๆ
      if (typeof operation.apply === "function") operation.apply(tempArray);
      // markSorted ต้องสะสมต่อเนื่อง เพราะสมาชิกที่เรียงแล้วจะยังคงสถานะนั้นใน step ถัดไป
      if (operation.type === "markSorted") operation.sortedIndices.forEach((idx) => cumulativeSorted.add(idx));
      snapshots.push({
        step: index + 1, round: operation.round ?? "-", message: operation.message,
        array: operation.displayArray ? cloneArray(operation.displayArray) : cloneArray(tempArray),
        indices: [...operation.indices], swapIndices: [...operation.swapIndices],
        pivotIndices: [...operation.pivotIndices], sortedIndices: [...cumulativeSorted],
        phase: operation.phase, quick: operation.quick ? { ...operation.quick } : null,
      });
    });
    return snapshots;
  }

  if (!window.__barCache) window.__barCache = new Map();
  if (!window.__heapCache) window.__heapCache = new Map();
  // ฟังก์ชันนี้วาดชุดตัวเลขในรูปแบบกล่องเรียงตาม index พร้อมไฮไลต์สถานะต่าง ๆ เช่น active, swapping, sorted และ pivot
  function renderBars(array, active = [], swapping = [], sorted = [], pivot = []) {
    // แสดงข้อมูลหลักในรูป "กล่องตัวเลขเรียงตาม index"
    // ใช้ได้กับหลายอัลกอริทึมและเป็นภาพรวมที่เข้าใจง่ายที่สุดของสถานะปัจจุบัน
    elements.barsContainer.className = "relative w-full h-[140px] mt-8 mx-auto overflow-hidden";
    if (!array.length) {
      elements.barsContainer.innerHTML = "<p class='text-slate-400 absolute w-full text-center top-1/2 -translate-y-1/2'>กรอกข้อมูลเพื่อดูพรีวิว</p>";
      window.__barCache.clear();
      return;
    }
    const note = elements.barsContainer.querySelector("p");
    if (note) note.remove();

    const activeSet = new Set(active);
    const swapSet = new Set(swapping);
    const sortedSet = new Set(sorted);
    const pivotSet = new Set(pivot);

    const visualEntries = buildVisualEntries(array.filter((item) => item !== null));
    const currentKeys = new Set(visualEntries.map((entry) => entry.key));
    window.__barCache.forEach((cell, key) => {
      // ลบ DOM node ที่ไม่เกี่ยวกับข้อมูลชุดปัจจุบันแล้ว เพื่อไม่ให้มี ghost element ค้างอยู่
      if (!currentKeys.has(key)) { cell.remove(); window.__barCache.delete(key); }
    });

    const nodeWidth = 56;
    const gap = 16;
    const totalWidth = array.length * nodeWidth + (array.length - 1) * gap;// คำนวณความกว้างรวมของกล่องทั้งหมดรวมช่องว่าง เพื่อจัดกึ่งกลางใน container

    visualEntries.forEach(({ item, index, key }) => {
      let cell = window.__barCache.get(key);
      if (!cell) {
        // สร้าง node ใหม่เฉพาะเมื่อยังไม่มีใน cache
        // หากเคยมีแล้วจะ reuse เพื่อให้ transition ตอนย้ายตำแหน่งนุ่มนวล
        cell = document.createElement("div");
        const indexLabel = document.createElement("span");
        indexLabel.className = "absolute -top-6 text-xs text-slate-400 font-mono";
        const valueLabel = document.createElement("span");
        valueLabel.className = "font-bold text-lg";
        cell.appendChild(indexLabel);
        cell.appendChild(valueLabel);
        cell.style.position = "absolute";
        cell.style.transition = "all 0.5s cubic-bezier(0.25, 1, 0.5, 1)"; 
        window.__barCache.set(key, cell);
      }

      if (cell.parentNode !== elements.barsContainer) elements.barsContainer.appendChild(cell);

      let tone = "bg-white border-blue-300 text-blue-700 shadow-sm";
      let scale = "scale-100"; let zIndex = "z-10";

      // จัดลำดับความสำคัญของสีอย่างชัดเจน:
      // swap สำคัญที่สุดเพราะเป็น action ที่ผู้ใช้ต้องเห็นเด่นสุด
      // รองลงมาคือ pivot และ active ส่วน sorted จะติดสีเมื่อไม่ได้อยู่ในสถานะอื่นทับอยู่
      if (swapSet.has(index)) { 
        tone = "bg-red-100 border-red-500 text-red-700 shadow-lg shadow-red-500/30"; scale = "scale-110"; zIndex = "z-30"; 
      } else if (pivotSet.has(index)) { 
        tone = "bg-purple-100 border-purple-500 text-purple-700 shadow-lg shadow-purple-500/30"; scale = "scale-110"; zIndex = "z-20"; 
      } else if (activeSet.has(index)) { 
        tone = "bg-amber-100 border-amber-500 text-amber-700 shadow-lg shadow-amber-500/30"; scale = "scale-110"; zIndex = "z-20"; 
      } else if (sortedSet.has(index)) { 
        tone = "bg-emerald-100 border-emerald-500 text-emerald-700 shadow-sm"; 
      }

      cell.className = `w-[56px] h-[56px] border-2 rounded-xl flex items-center justify-center transform ${scale} ${tone} ${zIndex}`;
      cell.children[0].textContent = `[${index}]`;
      cell.children[1].textContent = String(getDisplayValue(item));
      cell.style.left = `calc(50% - ${totalWidth / 2}px + ${index * (nodeWidth + gap)}px)`;
      cell.style.top = "40px"; 
    });
  }
  
  //Guy
  function renderHeapTree() {
    // heap tree เป็น visualization พิเศษสำหรับ Heap Sort
    // ถ้าไม่ได้เลือก heap จะซ่อน section นี้ทันทีเพื่อลดความซับซ้อนบนหน้าจอ
    const isHeap = getSelectedAlgorithm() === "heap";
    elements.heapTreeSection.style.display = isHeap ? "block" : "none";
    if (!isHeap) return;

    // active heap คือส่วนหน้าของอาร์เรย์ที่ยังอยู่ใน heap จริง
    // ส่วนท้ายที่ถูก mark ว่า sorted แล้วจะไม่ถูกวาดในต้นไม้
    const activeSize = Math.max(state.workingArray.length - state.sortedIndices.size, 0);
    const activeHeap = state.workingArray.slice(0, activeSize);

    const phaseLabel = state.currentOperation?.phase ? getHeapPhaseLabel(state.currentOperation.phase) : "ก่อนสร้าง Max Heap";
    elements.heapTreeMessage.textContent = !activeHeap.length 
      ? (state.prepared && state.currentStep === 0 && !state.currentOperation ? "ก่อนสร้าง Max Heap" : "Heap Sort เสร็จแล้ว")
      : `${phaseLabel}: ตอนนี้ heap มี ${activeHeap.length} โหนด`;

    if (!activeHeap.length) {
      elements.heapTreeContainer.innerHTML = "<p class='text-slate-400 text-center w-full py-10'>ไม่มีโหนดใน Heap</p>";
      window.__heapCache.clear();
      return;
    }

    if (!elements.heapTreeContainer.querySelector(".heap-svg-edges")) {
       // สร้างโครงหลักของต้นไม้เพียงครั้งเดียว
       // จากนั้นในการ render รอบถัดไปจะอัปเดตเฉพาะเส้นและโหนดภายใน
       elements.heapTreeContainer.innerHTML = `
          <div class="relative w-full h-[350px] mx-auto mt-6">
             <svg class="heap-svg-edges absolute inset-0 w-full h-full pointer-events-none z-0"></svg>
             <div class="heap-nodes-wrapper absolute inset-0 w-full h-full z-10"></div>
          </div>
       `;
    }

    const svg = elements.heapTreeContainer.querySelector(".heap-svg-edges");
    const nodesWrap = elements.heapTreeContainer.querySelector(".heap-nodes-wrapper");

    const heapEntries = buildVisualEntries(activeHeap);
    const currentKeys = new Set(heapEntries.map((entry) => entry.key));
    window.__heapCache.forEach((cell, key) => {
      if (!currentKeys.has(key)) { cell.remove(); window.__heapCache.delete(key); }
    });

    const n = heapEntries.length;
    const maxDepth = Math.floor(Math.log2(n || 1));// คำนวณความลึกสูงสุดของต้นไม้เพื่อใช้ในการจัดวางโหนดในแนวตั้ง
    const levelHeight = 100 / (maxDepth + 1.2);// คำนวณความสูงของแต่ละชั้นในต้นไม้เพื่อให้กระจายตัวอย่างสวยงามในพื้นที่ที่กำหนด
    const nodesData = [];
    const linesData = [];

    // คำนวณพิกัด x, y ของแต่ละโหนดจาก index ใน heap array
    // สูตรนี้อิงโครงสร้าง complete binary tree ทำให้ตำแหน่งกระจายเป็นชั้น ๆ อย่างสม่ำเสมอ
    for (let i = 0; i < n; i++) {
      const depth = Math.floor(Math.log2(i + 1));
      const posInLevel = i - (Math.pow(2, depth) - 1);
      const nodesInLevel = Math.pow(2, depth);
      const x = ((posInLevel + 0.5) / nodesInLevel) * 100;
      const y = (depth + 0.5) * levelHeight;
      nodesData.push({ ...heapEntries[i], x, y });
    }

    // สร้างข้อมูลเส้นเชื่อมจาก parent ไปยัง left/right child ตามกฎของ heap
    for (let i = 0; i < n; i++) {
      const leftIdx = 2 * i + 1;
      const rightIdx = 2 * i + 2;
      if (leftIdx < n) linesData.push({ x1: nodesData[i].x, y1: nodesData[i].y, x2: nodesData[leftIdx].x, y2: nodesData[leftIdx].y });
      if (rightIdx < n) linesData.push({ x1: nodesData[i].x, y1: nodesData[i].y, x2: nodesData[rightIdx].x, y2: nodesData[rightIdx].y });
    }

    svg.innerHTML = ""; 
    linesData.forEach(line => {
       const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
       l.setAttribute("x1", line.x1 + "%"); l.setAttribute("y1", line.y1 + "%");
       l.setAttribute("x2", line.x2 + "%"); l.setAttribute("y2", line.y2 + "%");
       l.setAttribute("stroke", "#cbd5e1"); l.setAttribute("stroke-width", "3");
       svg.appendChild(l);
    });

    const op = state.currentOperation || {};
    const activeSet = new Set(op.indices || []);
    const swapSet = new Set(op.swapIndices || []);
    const pivotSet = new Set(op.pivotIndices || []);
    const sortedSet = new Set(state.sortedIndices || []);

    nodesData.forEach((node, i) => {
       let cell = window.__heapCache.get(node.key);
       if (!cell) {
          cell = document.createElement("div");
          cell.style.position = "absolute";
          cell.style.transition = "left 0.5s cubic-bezier(0.25, 1, 0.5, 1), top 0.5s cubic-bezier(0.25, 1, 0.5, 1), transform 0.3s ease, background-color 0.3s ease";
          window.__heapCache.set(node.key, cell);
       }
       if (cell.parentNode !== nodesWrap) nodesWrap.appendChild(cell);

       let tone = "bg-white border-blue-400 text-blue-700 shadow-sm";
       let scale = "scale-100"; let zIndex = "z-10";

       // ใช้หลัก priority สีเดียวกับ renderBars เพื่อให้ผู้ใช้ตีความสีได้คงที่ทุก visualization
       if (swapSet.has(i)) { 
         tone = "bg-red-100 border-red-500 text-red-700 shadow-lg shadow-red-500/40"; scale = "scale-110"; zIndex = "z-30"; 
       } else if (pivotSet.has(i)) { 
         tone = "bg-purple-100 border-purple-500 text-purple-700 shadow-lg shadow-purple-500/40"; scale = "scale-110"; zIndex = "z-20"; 
       } else if (activeSet.has(i)) { 
         tone = "bg-amber-100 border-amber-500 text-amber-700 shadow-lg shadow-amber-500/40"; scale = "scale-110"; zIndex = "z-20"; 
       } else if (sortedSet.has(i)) {
         tone = "bg-emerald-100 border-emerald-500 text-emerald-700 shadow-sm"; 
       }

       cell.className = `w-[50px] h-[50px] -translate-x-1/2 -translate-y-1/2 border-[3px] rounded-full flex items-center justify-center font-bold text-lg transform ${scale} ${tone} ${zIndex}`;
       cell.textContent = String(getDisplayValue(node.item));
       cell.style.left = node.x + "%";
       cell.style.top = node.y + "%";
    });
  }
  //Ice
  // ฟังก์ชันนี้สร้างภาพย่อของ heap สำหรับใส่ในการ์ด gallery ของแต่ละ step
  function renderRoundSummaryTable() {
    // สรุป "ผลลัพธ์ปลายรอบ" ของแต่ละ pass เพื่อให้ผู้ใช้มองภาพรวมได้เร็ว
    // ต่างจาก steps table ที่เน้นรายละเอียดรายเหตุการณ์
    const tbody = document.getElementById("roundSummaryTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!state.operations.length || state.currentStep === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-slate-400">กำลังรอเริ่มการทำงาน...</td></tr>';
      return;
    }

    const snapshots = buildVisualSnapshots();
    const visibleSnapshots = snapshots.slice(0, state.currentStep);

    const roundMap = new Map();
    visibleSnapshots.forEach(snap => {
      // เก็บ snapshot ล่าสุดของแต่ละรอบ เพราะสิ่งที่ต้องการคือผลสรุปเมื่อจบรอบนั้น
      if (snap.round && snap.round !== "-") {
        roundMap.set(snap.round, snap);
      }
    });

    if (roundMap.size === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="p-4 text-center text-slate-400">ยังไม่จบการทำงานรอบแรก</td></tr>';
      return;
    }

    roundMap.forEach((snap, round) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-50 transition-colors";
      const arrayStr = snap.array.map(v => v === null ? "_" : getDisplayValue(v)).join(", ");
      tr.innerHTML = `
        <td class="p-4 border-b border-slate-100 font-bold text-blue-700">รอบที่ ${round}</td>
        <td class="p-4 border-b border-slate-100 text-center">
          <span class="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg font-mono font-bold tracking-widest text-sm">
            [${arrayStr}]
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
  // ฟังก์ชันนี้สร้างภาพย่อของ heap สำหรับใส่ในการ์ด gallery ของแต่ละ step
  function buildMiniHeapSnapshot(snapshot) {
    // สร้างภาพย่อของ heap สำหรับใส่ในการ์ด gallery ของแต่ละ step
    // เป็นเวอร์ชันเบากว่า heap tree หลัก แต่ยังรักษาแนวคิด parent-child ไว้ครบ
    const activeSize = Math.max(snapshot.array.length - snapshot.sortedIndices.length, 0);
    const activeHeap = snapshot.array.slice(0, activeSize);
    const wrapper = document.createElement("div");
    wrapper.className = "relative w-full h-[140px] bg-slate-50 border border-slate-200 rounded-xl mt-3 overflow-hidden";

    if (!activeHeap.length) {
        wrapper.innerHTML = "<p class='text-slate-400 text-center pt-12 text-xs'>Heap ว่าง</p>";
        return wrapper;
    }

    const n = activeHeap.length;
    const maxDepth = Math.floor(Math.log2(n || 1));
    const levelHeight = 100 / (maxDepth + 1.5);
    const nodesData = []; const linesData = [];

    for (let i = 0; i < n; i++) {
      const depth = Math.floor(Math.log2(i + 1));
      nodesData.push({ 
        value: activeHeap[i], 
        x: (((i - (Math.pow(2, depth) - 1)) + 0.5) / Math.pow(2, depth)) * 100, 
        y: (depth + 0.5) * levelHeight 
      });
    }

    for (let i = 0; i < n; i++) {
       const leftIdx = 2 * i + 1; const rightIdx = 2 * i + 2;
       if(leftIdx < n) linesData.push({ x1: nodesData[i].x, y1: nodesData[i].y, x2: nodesData[leftIdx].x, y2: nodesData[leftIdx].y });
       if(rightIdx < n) linesData.push({ x1: nodesData[i].x, y1: nodesData[i].y, x2: nodesData[rightIdx].x, y2: nodesData[rightIdx].y });
    }

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "absolute inset-0 w-full h-full z-0");
    linesData.forEach(line => {
       const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
       l.setAttribute("x1", line.x1 + "%"); l.setAttribute("y1", line.y1 + "%");
       l.setAttribute("x2", line.x2 + "%"); l.setAttribute("y2", line.y2 + "%");
       l.setAttribute("stroke", "#cbd5e1"); l.setAttribute("stroke-width", "2");
       svg.appendChild(l);
    });
    wrapper.appendChild(svg);

    const activeSet = new Set(snapshot.indices);
    const swapSet = new Set(snapshot.swapIndices);
    const pivotSet = new Set(snapshot.pivotIndices);
    const sortedSet = new Set(snapshot.sortedIndices);

    nodesData.forEach((node, i) => {
       const el = document.createElement("div");
       let tone = "bg-white border-blue-300 text-blue-600 scale-100 z-10";

       // ใช้ priority สีแบบเดียวกับมุมมองหลัก เพื่อให้สีมีความหมายตรงกันทุกจุดในระบบ
       if (swapSet.has(i)) tone = "bg-red-100 border-red-400 text-red-600 scale-110 z-20";
       else if (pivotSet.has(i)) tone = "bg-purple-100 border-purple-400 text-purple-600 scale-110 z-20";
       else if (activeSet.has(i)) tone = "bg-amber-100 border-amber-400 text-amber-600 scale-110 z-20";
       else if (sortedSet.has(i)) tone = "bg-emerald-100 border-emerald-400 text-emerald-600 scale-100 z-10";

       el.className = `absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transform ${tone}`;
       el.style.left = node.x + "%"; el.style.top = node.y + "%";
       el.textContent = String(getDisplayValue(node.value));
       wrapper.appendChild(el);
    });
    return wrapper;
  }
  // ฟังก์ชันนี้สร้างภาพย่อของ heap สำหรับใส่ในการ์ด gallery ของแต่ละ step
  function renderMiniArraySnapshot(snapshot) {
    // ภาพย่อแบบอาร์เรย์สำหรับอัลกอริทึมที่ไม่ต้องใช้โครงสร้างพิเศษ
    // เหมาะกับการดูย้อนหลังใน gallery เพราะใช้พื้นที่น้อยและอ่านเร็ว
    const wrap = document.createElement("div");
    wrap.className = "flex flex-wrap justify-center gap-1.5 p-3";
    const activeSet = new Set(snapshot.indices);
    const swapSet = new Set(snapshot.swapIndices);
    const pivotSet = new Set(snapshot.pivotIndices);
    const sortedSet = new Set(snapshot.sortedIndices);
    
    snapshot.array.forEach((value, index) => {
      const chip = document.createElement("div");
      let tone = "bg-white border-slate-200 text-slate-600";

      // ลำดับการทับสีต้องคงที่ เพื่อไม่ให้ chip ที่กำลัง swap ถูกกลบด้วยสถานะ sorted หรือ active
      if (swapSet.has(index)) tone = "bg-red-100 border-red-400 text-red-700 scale-110";
      else if (pivotSet.has(index)) tone = "bg-purple-100 border-purple-400 text-purple-700 scale-110";
      else if (activeSet.has(index)) tone = "bg-amber-100 border-amber-400 text-amber-700 scale-110";
      else if (sortedSet.has(index)) tone = "bg-emerald-100 border-emerald-400 text-emerald-700";
      
      chip.className = `min-w-[32px] h-[32px] px-2 border-2 rounded-lg flex items-center justify-center text-[11px] font-bold transform transition-transform ${tone}`;
      chip.textContent = value === null ? "" : String(getDisplayValue(value));
      wrap.appendChild(chip);
    });
    return wrap;
  }
  //Ball
  function buildQuickBadge(text, tone = "") {
    // badge ขนาดเล็กสำหรับอธิบาย pointer และ pivot ของ Quick Sort
    // ช่วยให้การ์ดแต่ละใบสื่อความหมายได้โดยไม่ต้องอ่านข้อความยาว
    const badge = document.createElement("span");
    badge.className = `px-2 py-1 text-[10px] font-bold rounded-full ${tone === 'cross' ? 'bg-red-100 text-red-700' : tone === 'pivot' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-700'}`;
    badge.textContent = text;
    return badge;
  }

  function buildMiniQuickSnapshot(snapshot) {
    // การ์ดย่อเฉพาะของ Quick Sort
    // นอกจากแสดงอาร์เรย์แล้ว ยังเพิ่ม pointer ซ้าย/ขวาและ pivot เพื่ออธิบายขั้น partition
    const wrap = document.createElement("div");
    wrap.className = "flex flex-col gap-2 mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl";
    const quick = snapshot.quick ?? {};
    const low = Number.isInteger(quick.low) ? quick.low : null;
    const high = Number.isInteger(quick.high) ? quick.high : null;
    const leftPointer = Number.isInteger(quick.leftPointer) ? quick.leftPointer : null;
    const rightPointer = Number.isInteger(quick.rightPointer) ? quick.rightPointer : null;
    const pivotIndex = Number.isInteger(quick.pivotIndex) ? quick.pivotIndex : null;
    const crossed = Boolean(quick.crossed);

    const badges = document.createElement("div");
    badges.className = "flex flex-wrap gap-1.5 mb-1";
    if (low !== null && high !== null) badges.appendChild(buildQuickBadge(`ช่วง ${low + 1}-${high + 1}`));
    if (leftPointer !== null) badges.appendChild(buildQuickBadge(`L ${leftPointer + 1}`, crossed ? "cross" : ""));
    if (rightPointer !== null) badges.appendChild(buildQuickBadge(`R ${rightPointer + 1}`, crossed ? "cross" : ""));
    if (pivotIndex !== null) badges.appendChild(buildQuickBadge(`Pivot ${pivotIndex + 1}`, "pivot"));
    if (badges.childNodes.length) wrap.appendChild(badges);

    const lane = document.createElement("div");
    lane.className = "flex gap-1 overflow-x-auto pb-1";
    snapshot.array.forEach((value, index) => {
      const slot = document.createElement("div");
      let tone = "bg-white border-blue-200 text-blue-700";
      const inRange = low !== null && high !== null && index >= low && index <= high;
      
      if (!inRange) tone = "bg-slate-100 border-transparent text-slate-400";
      
      // ลำดับสีถูกออกแบบให้ผู้ใช้มองเห็น action สำคัญของการ partition ก่อน
      if (snapshot.swapIndices.includes(index)) tone = "bg-red-100 border-red-500 text-red-700 scale-110";
      else if (pivotIndex === index) tone = "bg-purple-100 border-purple-500 text-purple-700 font-black";
      else if (snapshot.indices.includes(index)) tone = "bg-amber-100 border-amber-500 text-amber-700 scale-110";
      else if (snapshot.sortedIndices.includes(index)) tone = "bg-emerald-100 border-emerald-400 text-emerald-700";
      else if (inRange) tone = "bg-blue-50 border-blue-300 text-blue-800";
      
      slot.className = `min-w-[28px] h-[28px] flex items-center justify-center border-2 rounded text-[11px] font-bold transform transition-transform ${tone}`;
      slot.textContent = String(getDisplayValue(value));
      lane.appendChild(slot);
    });
    wrap.appendChild(lane);
    return wrap;
  }

  if (!document.getElementById("card-anim-style")) {
    // inject style เฉพาะสำหรับ animation ของ process card หนึ่งครั้งตอนโหลดโมดูล
    // เช็กด้วย id ก่อนเพื่อป้องกันการเพิ่ม <style> ซ้ำ
    const style = document.createElement("style");
    style.id = "card-anim-style";
    style.innerHTML = `
      @keyframes fadeInSoft { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
      .anim-pop-card { animation: fadeInSoft 0.3s ease-out forwards; }
    `;
    document.head.appendChild(style);
  }

  function renderProcessGallery() {
    // gallery นี้ทำหน้าที่เป็น "timeline แบบรูปภาพ" ของทุก step
    // เหมาะมากสำหรับพรีเซนต์ เพราะมองเห็นทั้งข้อความอธิบายและภาพ snapshot คู่กัน
    if (!state.operations.length || state.currentStep === 0) {
      elements.processGallery.innerHTML = "<p class='text-slate-400 text-sm py-4 w-full col-span-full'>กำลังรอเริ่มการทำงาน... การ์ดภาพในแต่ละ Step จะโผล่ขึ้นมาที่นี่แบบเรียลไทม์</p>";
      return;
    }

    const algorithm = getSelectedAlgorithm();
    const snapshots = buildVisualSnapshots();
    
    if (algorithm === "heap") {
      // Heap Sort มีขั้น build heap ก่อนเริ่ม operation ปกติ
      // จึงเติมการ์ดเริ่มต้นเข้าไปเพื่อให้ผู้ใช้เข้าใจว่า heap ค่อย ๆ ถูกสร้างขึ้นจากค่าว่าง
      snapshots.unshift({
        step: "Start", round: "-", message: "เริ่มจาก heap ว่าง แล้วค่อยเพิ่มข้อมูลทีละตัวเพื่อสร้าง Max Heap",
        array: [], indices: [], swapIndices: [], pivotIndices: [], sortedIndices: [], phase: "build-heap",
      });
    }

    const limit = algorithm === "heap" ? state.currentStep + 1 : state.currentStep;
    const visibleSnapshots = snapshots.slice(0, limit);

    if (elements.processGallery.querySelector('p')) elements.processGallery.innerHTML = "";
    if (elements.processGallery.children.length > visibleSnapshots.length) elements.processGallery.innerHTML = "";

    visibleSnapshots.forEach((snapshot, index) => {
      // เพิ่มเฉพาะการ์ดใหม่ที่ยังไม่เคยถูก render
      // ช่วยให้ gallery โตทีละใบแบบ realtime โดยไม่ต้องสร้างใหม่ทั้งหมดทุกครั้ง
      if (index < elements.processGallery.children.length) return;

      const card = document.createElement("article");
      card.className = "anim-pop-card p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between";
      const phaseText = algorithm === "heap" ? `${getHeapPhaseLabel(snapshot.phase)} | รอบ ${snapshot.round}` : `รอบ ${snapshot.round}`;
      card.innerHTML = `
        <div>
          <div class="flex justify-between items-start mb-3">
            <strong class="bg-blue-100 text-blue-800 px-2.5 py-1 rounded text-[11px] uppercase tracking-wide">Step ${snapshot.step}</strong>
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">${phaseText}</span>
          </div>
          <p class="text-sm text-slate-600 mb-2 h-10 leading-snug">${snapshot.message}</p>
        </div>
      `;
      
      // เลือกชนิดของภาพย่อตามธรรมชาติของอัลกอริทึม
      // heap ใช้ tree, quick ใช้กระดาน pointer, ที่เหลือใช้อาร์เรย์ย่อทั่วไป
      card.appendChild(
        algorithm === "heap"
          ? buildMiniHeapSnapshot(snapshot)
          : algorithm === "quick"
            ? buildMiniQuickSnapshot(snapshot)
            : renderMiniArraySnapshot(snapshot),
      );
      elements.processGallery.appendChild(card);
    });
  }

  // export ชุดฟังก์ชัน renderer ให้ไฟล์อื่นเรียกใช้งานผ่าน namespace กลาง
  app.renderers = { getSelectedAlgorithm, updateValidation, setStatus, renderNumberBoxes, updateAlgorithmGuide, renderBars, updateCounters, renderStepsTable, renderHeapTree, renderProcessGallery, renderRoundSummaryTable };
})();
