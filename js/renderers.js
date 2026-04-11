(function () {
  const app = (window.SortingApp = window.SortingApp || {});
  const { ALGORITHM_INFO, elements, state } = app;
  const { cloneArray, getDisplayValue, getNumericValue } = app.algorithms;

  const getSelectedAlgorithm = () => elements.algorithmSelect.value;
  const updateValidation = (message = "") => { elements.validationMessage.textContent = message; };
  const setStatus = (text) => { elements.runStatus.textContent = text; };
  const getHeapPhaseLabel = (phase) => {
    if (phase === "build-heap") return "สร้าง Max Heap";
    if (phase === "heap-sort") return "Heap Sort";
    return "สถานะปัจจุบัน";
  };

  function renderNumberBoxes(container, values, emptyMessage) {
    if (!container) return;
    container.innerHTML = "";
    if (!values.length) {
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

  function updateAlgorithmGuide() {
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
      const item = document.createElement("li");
      item.textContent = text;
      elements.algorithmHighlights.appendChild(item);
    });
  }

  function updateCounters() {
    elements.comparisonCount.textContent = String(state.comparisons);
    elements.swapCount.textContent = String(state.swaps);
    elements.roundCount.textContent = String(state.roundsSeen.size);
  }

  function renderStepsTable() {
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
      if (state.currentStep > 0 && traceRow.step === state.currentStep) row.classList.add("bg-blue-50", "font-bold", "text-blue-900");
      else row.classList.add("hover:bg-slate-50");
      row.innerHTML = `<td class="p-4 border-b border-slate-100">${traceRow.step}</td><td class="p-4 border-b border-slate-100">${traceRow.round}</td><td class="p-4 border-b border-slate-100">${traceRow.type}</td><td class="p-4 border-b border-slate-100">${traceRow.message}</td><td class="p-4 border-b border-slate-100 font-mono text-xs"><span>${traceRow.arrayText}</span></td>`;
      elements.stepsTableBody.appendChild(row);
    });
  }

  function buildVisualSnapshots() {
    const snapshots = [];
    const tempArray = state.operations.some((operation) => operation.phase === "build-heap") ? [] : cloneArray(state.sourceArray);
    const cumulativeSorted = new Set();
    state.operations.forEach((operation, index) => {
      if (typeof operation.apply === "function") operation.apply(tempArray);
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

  function renderBars(array, active = [], swapping = [], sorted = [], pivot = []) {
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

    const currentItems = new Set(array);
    window.__barCache.forEach((cell, item) => {
      if (!currentItems.has(item)) { cell.remove(); window.__barCache.delete(item); }
    });

    const nodeWidth = 56;
    const gap = 16;
    const totalWidth = array.length * nodeWidth + (array.length - 1) * gap;

    array.forEach((item, index) => {
      if (item === null) return;
      let cell = window.__barCache.get(item);
      if (!cell) {
        cell = document.createElement("div");
        const indexLabel = document.createElement("span");
        indexLabel.className = "absolute -top-6 text-xs text-slate-400 font-mono";
        const valueLabel = document.createElement("span");
        valueLabel.className = "font-bold text-lg";
        cell.appendChild(indexLabel);
        cell.appendChild(valueLabel);
        cell.style.position = "absolute";
        cell.style.transition = "all 0.5s cubic-bezier(0.25, 1, 0.5, 1)"; 
        window.__barCache.set(item, cell);
      }

      if (cell.parentNode !== elements.barsContainer) elements.barsContainer.appendChild(cell);

      let tone = "bg-white border-blue-300 text-blue-700 shadow-sm";
      let scale = "scale-100"; let zIndex = "z-10";

      // แก้บัค Priority ของสีที่นี่! (เช็คการสลับก่อนเสมอ)
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

  function renderHeapTree() {
    const isHeap = getSelectedAlgorithm() === "heap";
    elements.heapTreeSection.style.display = isHeap ? "block" : "none";
    if (!isHeap) return;

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
       elements.heapTreeContainer.innerHTML = `
          <div class="relative w-full h-[350px] mx-auto mt-6">
             <svg class="heap-svg-edges absolute inset-0 w-full h-full pointer-events-none z-0"></svg>
             <div class="heap-nodes-wrapper absolute inset-0 w-full h-full z-10"></div>
          </div>
       `;
    }

    const svg = elements.heapTreeContainer.querySelector(".heap-svg-edges");
    const nodesWrap = elements.heapTreeContainer.querySelector(".heap-nodes-wrapper");

    const currentHeapItems = new Set(activeHeap);
    window.__heapCache.forEach((cell, item) => {
      if (!currentHeapItems.has(item)) { cell.remove(); window.__heapCache.delete(item); }
    });

    const n = activeHeap.length;
    const maxDepth = Math.floor(Math.log2(n || 1));
    const levelHeight = 100 / (maxDepth + 1.2);
    const nodesData = [];
    const linesData = [];

    for (let i = 0; i < n; i++) {
      const depth = Math.floor(Math.log2(i + 1));
      const posInLevel = i - (Math.pow(2, depth) - 1);
      const nodesInLevel = Math.pow(2, depth);
      const x = ((posInLevel + 0.5) / nodesInLevel) * 100;
      const y = (depth + 0.5) * levelHeight;
      nodesData.push({ item: activeHeap[i], x, y });
    }

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
       let cell = window.__heapCache.get(node.item);
       if (!cell) {
          cell = document.createElement("div");
          cell.style.position = "absolute";
          cell.style.transition = "left 0.5s cubic-bezier(0.25, 1, 0.5, 1), top 0.5s cubic-bezier(0.25, 1, 0.5, 1), transform 0.3s ease, background-color 0.3s ease";
          window.__heapCache.set(node.item, cell);
       }
       if (cell.parentNode !== nodesWrap) nodesWrap.appendChild(cell);

       let tone = "bg-white border-blue-400 text-blue-700 shadow-sm";
       let scale = "scale-100"; let zIndex = "z-10";

       // แก้บัค Priority ของสี (Heap Tree)
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

  function renderRoundSummaryTable() {
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

  function buildMiniHeapSnapshot(snapshot) {
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

       // แก้บัค Priority ของสี (Mini Heap Tree)
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

  function renderMiniArraySnapshot(snapshot) {
    const wrap = document.createElement("div");
    wrap.className = "flex flex-wrap justify-center gap-1.5 p-3";
    const activeSet = new Set(snapshot.indices);
    const swapSet = new Set(snapshot.swapIndices);
    const pivotSet = new Set(snapshot.pivotIndices);
    const sortedSet = new Set(snapshot.sortedIndices);
    
    snapshot.array.forEach((value, index) => {
      const chip = document.createElement("div");
      let tone = "bg-white border-slate-200 text-slate-600";

      // แก้บัค Priority ของสี (Mini Array)
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

  function buildQuickBadge(text, tone = "") {
    const badge = document.createElement("span");
    badge.className = `px-2 py-1 text-[10px] font-bold rounded-full ${tone === 'cross' ? 'bg-red-100 text-red-700' : tone === 'pivot' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-700'}`;
    badge.textContent = text;
    return badge;
  }

  function buildMiniQuickSnapshot(snapshot) {
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
      
      // แก้บัค Priority ของสี (Quick Sort Mini Board)
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
    const style = document.createElement("style");
    style.id = "card-anim-style";
    style.innerHTML = `
      @keyframes fadeInSoft { 0% { opacity: 0; transform: translateY(10px); } 100% { opacity: 1; transform: translateY(0); } }
      .anim-pop-card { animation: fadeInSoft 0.3s ease-out forwards; }
    `;
    document.head.appendChild(style);
  }

  function renderProcessGallery() {
    if (!state.operations.length || state.currentStep === 0) {
      elements.processGallery.innerHTML = "<p class='text-slate-400 text-sm py-4 w-full col-span-full'>กำลังรอเริ่มการทำงาน... การ์ดภาพในแต่ละ Step จะโผล่ขึ้นมาที่นี่แบบเรียลไทม์</p>";
      return;
    }

    const algorithm = getSelectedAlgorithm();
    const snapshots = buildVisualSnapshots();
    
    if (algorithm === "heap") {
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

  app.renderers = { getSelectedAlgorithm, updateValidation, setStatus, renderNumberBoxes, updateAlgorithmGuide, renderBars, updateCounters, renderStepsTable, renderHeapTree, renderProcessGallery, renderRoundSummaryTable };
})();