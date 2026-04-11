(function () {
  const app = (window.SortingApp = window.SortingApp || {});

  const cloneArray = (array) => array.slice();
  const LETTER_PATTERN = /^[a-z]$/i;
  const isValueItem = (value) => typeof value === "object" && value !== null && "value" in value;
  const getNumericValue = (value) => (isValueItem(value) ? value.value : value);
  const getDisplayValue = (value) => {
    if (value === null) return null;
    return isValueItem(value) ? value.label : String(value);
  };

  function parseToken(part) {
    if (LETTER_PATTERN.test(part)) {
      const normalized = part.toLowerCase();
      return { value: normalized.charCodeAt(0) - 96, label: normalized };
    }
    const numericValue = Number(part);
    return { value: numericValue, label: part };
  }

  function parseInput(inputText) {
    const raw = inputText.trim();
    if (!raw) return { error: "กรุณากรอกข้อมูลอย่างน้อย 1 ค่า" };
    const parts = raw.split(",").map((part) => part.trim());
    if (parts.some((part) => part === "")) return { error: "พบค่าที่ว่างอยู่ กรุณากรอกข้อมูลให้ครบทุกตำแหน่ง" };
    const values = parts.map(parseToken);
    if (values.some((value) => Number.isNaN(getNumericValue(value)))) return { error: "ข้อมูลต้องเป็นตัวเลขหรือ a-z เท่านั้น และต้องคั่นด้วยเครื่องหมายจุลภาค" };
    if (values.length > 20) return { error: "เพื่อให้ดู animation ชัดเจน กรุณากรอกไม่เกิน 20 ค่า" };
    return { values };
  }

  function createOperation({ type, message, round = null, indices = [], swapIndices = [], sortedIndices = [], pivotIndices = [], apply = null, phase = "sort", displayArray = null, quick = null }) {
    return { type, message, round, indices, swapIndices, sortedIndices, pivotIndices, apply, phase, displayArray, quick };
  }

  function getTypeLabel(type) {
    return { compare: "Compare", swap: "Swap", overwrite: "Overwrite", pivot: "Focus", markSorted: "Sorted", note: "Note" }[type] ?? type;
  }

  function buildTraceRows(sourceArray, operations) {
    const rows = [];
    const isHeapBuild = operations.some((operation) => operation.phase === "build-heap");
    const tempArray = isHeapBuild ? [] : cloneArray(sourceArray);
    operations.forEach((operation, index) => {
      if (typeof operation.apply === "function") operation.apply(tempArray);
      const visibleArray = operation.displayArray ?? tempArray;
      rows.push({
        step: index + 1,
        round: operation.round ?? "-",
        type: getTypeLabel(operation.type),
        message: operation.message,
        arrayText: `[${visibleArray.map((value) => (value === null ? "_" : getDisplayValue(value))).join(", ")}]`,
      });
    });
    return rows;
  }

  function buildSelectionOperations(source) {
    const arr = cloneArray(source);
    const operations = [];
    const sortedSet = new Set();
    for (let i = 0; i < arr.length; i += 1) {
      let minIndex = i;
      for (let j = i + 1; j < arr.length; j += 1) {
        const currentMin = minIndex;
        operations.push(createOperation({ type: "compare", round: i + 1, indices: [currentMin, j], message: `รอบที่ ${i + 1}: เปรียบเทียบ ${getDisplayValue(arr[currentMin])} กับ ${getDisplayValue(arr[j])}` }));
        if (getNumericValue(arr[j]) < getNumericValue(arr[minIndex])) minIndex = j;
      }
      if (minIndex !== i) {
        const leftIndex = i;
        const rightIndex = minIndex;
        const leftValue = arr[i];
        const rightValue = arr[minIndex];
        operations.push(createOperation({ type: "swap", round: i + 1, swapIndices: [leftIndex, rightIndex], message: `รอบที่ ${i + 1}: สลับ ${getDisplayValue(leftValue)} กับ ${getDisplayValue(rightValue)}`, apply(target) { [target[leftIndex], target[rightIndex]] = [target[rightIndex], target[leftIndex]]; } }));
        [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
      }
      sortedSet.add(i);
      operations.push(createOperation({ type: "markSorted", round: i + 1, sortedIndices: [...sortedSet], message: `จบรอบที่ ${i + 1}: ตำแหน่งที่ ${i + 1} ถูกจัดเรียงแล้ว` }));
    }
    return { operations, sortedArray: arr };
  }

  // อัปเกรด: แก้จากเขียนทับ (Overwrite) มาใช้ สลับ (Swap) เพื่อป้องกันกล่องวาบหาย
  function buildInsertionOperations(source) {
    const arr = cloneArray(source);
    const operations = [];
    
    for (let i = 1; i < arr.length; i += 1) {
      const round = i;
      let j = i;

      operations.push(createOperation({
        type: "pivot", round, pivotIndices: [i],
        message: `รอบที่ ${round}: พิจารณาแทรก ${getDisplayValue(arr[i])}`
      }));

      let shifted = false;
      while (j > 0) {
        operations.push(createOperation({
          type: "compare", round, indices: [j - 1], pivotIndices: [j],
          message: `รอบที่ ${round}: เปรียบเทียบ ${getDisplayValue(arr[j])} กับ ${getDisplayValue(arr[j-1])}`
        }));

        if (getNumericValue(arr[j - 1]) > getNumericValue(arr[j])) {
           const leftVal = arr[j-1];
           const rightVal = arr[j];
           operations.push(createOperation({
              type: "swap", round, swapIndices: [j - 1, j],
              message: `รอบที่ ${round}: สลับ ${getDisplayValue(rightVal)} มาทางซ้าย`,
              apply(target) {
                  [target[j-1], target[j]] = [target[j], target[j-1]];
              }
           }));
           [arr[j-1], arr[j]] = [arr[j], arr[j-1]];
           shifted = true;
           j -= 1;
        } else {
           break;
        }
      }
      operations.push(createOperation({
        type: "note", round,
        message: shifted ? `รอบที่ ${round}: แทรกเข้าตำแหน่งเรียบร้อย` : `รอบที่ ${round}: ข้อมูลอยู่ในตำแหน่งที่ถูกต้องแล้ว`
      }));
    }
    
    if (arr.length) {
      operations.push(createOperation({
        type: "markSorted", round: Math.max(arr.length - 1, 1),
        sortedIndices: Array.from({ length: arr.length }, (_, index) => index),
        message: "Insertion Sort เสร็จสมบูรณ์ ข้อมูลเรียงครบทุกตำแหน่งแล้ว"
      }));
    }
    return { operations, sortedArray: arr };
  }

  function buildBubbleOperations(source) {
    const arr = cloneArray(source);
    const operations = [];
    const sortedSet = new Set();
    let lastRound = 0;
    for (let start = 0, round = 1; start < arr.length - 1; start += 1, round += 1) {
      lastRound = round;
      let swapped = false;
      for (let i = arr.length - 1; i > start; i -= 1) {
        const leftIndex = i - 1;
        const rightIndex = i;
        operations.push(createOperation({ type: "compare", round, indices: [leftIndex, rightIndex], message: `รอบที่ ${round}: เปรียบเทียบ ${getDisplayValue(arr[leftIndex])} กับ ${getDisplayValue(arr[rightIndex])} จากล่างขึ้นบน` }));
        if (getNumericValue(arr[leftIndex]) > getNumericValue(arr[rightIndex])) {
          const leftValue = arr[leftIndex];
          const rightValue = arr[rightIndex];
          [arr[leftIndex], arr[rightIndex]] = [arr[rightIndex], arr[leftIndex]];
          swapped = true;
          operations.push(createOperation({ type: "swap", round, swapIndices: [leftIndex, rightIndex], message: `รอบที่ ${round}: สลับ ${getDisplayValue(leftValue)} กับ ${getDisplayValue(rightValue)} เพื่อดันค่าน้อยกว่าไปด้านหน้า`, apply(target) { [target[leftIndex], target[rightIndex]] = [target[rightIndex], target[leftIndex]]; } }));
        }
      }
      sortedSet.add(start);
      operations.push(createOperation({ type: "markSorted", round, sortedIndices: [...sortedSet], message: `จบรอบที่ ${round}: ค่าน้อยที่สุดของรอบนี้ลอยขึ้นมาอยู่ตำแหน่งหน้าสุดที่ว่างแล้ว` }));
      
      if (!swapped) {
        for (let i = start + 1; i < arr.length; i += 1) sortedSet.add(i);
        operations.push(createOperation({ type: "markSorted", round, sortedIndices: [...sortedSet], message: `รอบที่ ${round}: ไม่มีการสลับค่าเลย แปลว่าข้อมูลเรียงเสร็จทั้งหมดแล้ว!` }));
        break;
      }
    }
    if (arr.length) sortedSet.add(arr.length - 1);
    operations.push(createOperation({ type: "markSorted", round: Math.max(lastRound, 1), sortedIndices: [...sortedSet], message: "ข้อมูลทุกตำแหน่งเรียงจากน้อยไปมากแล้ว" }));
    return { operations, sortedArray: arr };
  }

  function buildQuickOperations(source) {
    const arr = cloneArray(source);
    const operations = [];
    const sortedSet = new Set();
    let round = 0;
    function quickSort(low, high) {
      if (low > high) return;
      if (low === high) {
        sortedSet.add(low);
        operations.push(createOperation({
          type: "markSorted",
          round: round + 1,
          sortedIndices: [...sortedSet],
          message: `ช่วงย่อยตำแหน่ง ${low + 1} มีเพียงค่าเดียว จึงถือว่าเรียงแล้ว`,
          quick: { low, high, leftPointer: low, rightPointer: low, pivotIndex: low, crossed: false },
        }));
        return;
      }
      round += 1;
      const pivotValue = arr[high];
      operations.push(createOperation({
        type: "pivot",
        round,
        pivotIndices: [high],
        message: `รอบที่ ${round}: ใช้ a[r] = ${getDisplayValue(pivotValue)} เป็น Sentinel หรือ Pivot ของช่วง ${low + 1}-${high + 1}`,
        quick: { low, high, leftPointer: low, rightPointer: high - 1, pivotIndex: high, crossed: false },
      }));
      let leftPointer = low;
      let rightPointer = high - 1;
      while (leftPointer <= rightPointer) {
        operations.push(createOperation({
          type: "compare",
          round,
          indices: [leftPointer, high],
          pivotIndices: [high],
          message: `รอบที่ ${round}: Scan ซ้ายไปขวา หาเลขที่มากกว่า pivot โดย L อยู่ที่ตำแหน่ง ${leftPointer + 1}`,
          quick: { low, high, leftPointer, rightPointer, pivotIndex: high, crossed: false },
        }));
        while (leftPointer <= rightPointer && getNumericValue(arr[leftPointer]) <= getNumericValue(pivotValue)) {
          if (getNumericValue(arr[leftPointer]) === getNumericValue(pivotValue)) {
            operations.push(createOperation({
              type: "note",
              round,
              indices: [leftPointer, high],
              pivotIndices: [high],
              message: `รอบที่ ${round}: L พบค่า ${getDisplayValue(arr[leftPointer])} ที่ไม่มากกว่า pivot จึงขยับต่อ`,
              quick: { low, high, leftPointer, rightPointer, pivotIndex: high, crossed: false },
            }));
          }
          leftPointer += 1;
          if (leftPointer <= rightPointer) {
            operations.push(createOperation({
              type: "compare",
              round,
              indices: [leftPointer, high],
              pivotIndices: [high],
              message: `รอบที่ ${round}: L ขยับไปตำแหน่ง ${leftPointer + 1}`,
              quick: { low, high, leftPointer, rightPointer, pivotIndex: high, crossed: false },
            }));
          }
        }
        if (leftPointer > rightPointer) break;
        operations.push(createOperation({
          type: "compare",
          round,
          indices: [rightPointer, high],
          pivotIndices: [high],
          message: `รอบที่ ${round}: Scan ขวาไปซ้าย หาเลขที่น้อยกว่าหรือเท่ากับ pivot โดย R อยู่ที่ตำแหน่ง ${rightPointer + 1}`,
          quick: { low, high, leftPointer, rightPointer, pivotIndex: high, crossed: false },
        }));
        while (leftPointer <= rightPointer && getNumericValue(arr[rightPointer]) > getNumericValue(pivotValue)) {
          rightPointer -= 1;
          if (leftPointer <= rightPointer) {
            operations.push(createOperation({
              type: "compare",
              round,
              indices: [rightPointer, high],
              pivotIndices: [high],
              message: `รอบที่ ${round}: R ขยับไปตำแหน่ง ${rightPointer + 1}`,
              quick: { low, high, leftPointer, rightPointer, pivotIndex: high, crossed: false },
            }));
          }
        }
        if (leftPointer > rightPointer) break;
        const leftValue = arr[leftPointer];
        const rightValue = arr[rightPointer];
        [arr[leftPointer], arr[rightPointer]] = [arr[rightPointer], arr[leftPointer]];
        const swapLeft = leftPointer;
        const swapRight = rightPointer;
        operations.push(createOperation({
          type: "swap",
          round,
          swapIndices: [swapLeft, swapRight],
          pivotIndices: [high],
          message: `รอบที่ ${round}: สลับค่าที่ L พบ (${getDisplayValue(leftValue)}) กับค่าที่ R พบ (${getDisplayValue(rightValue)})`,
          apply(target) { [target[swapLeft], target[swapRight]] = [target[swapRight], target[swapLeft]]; },
          quick: { low, high, leftPointer: swapLeft, rightPointer: swapRight, pivotIndex: high, crossed: false },
        }));
        leftPointer += 1;
        rightPointer -= 1;
      }
      operations.push(createOperation({
        type: "note",
        round,
        indices: leftPointer < arr.length ? [leftPointer] : [],
        pivotIndices: [high],
        message: `รอบที่ ${round}: L กับ R crossing กันแล้ว จึงนำ pivot ไปวางที่ตำแหน่งของ L`,
        quick: { low, high, leftPointer, rightPointer, pivotIndex: high, crossed: true },
      }));
      const pivotTargetValue = arr[leftPointer];
      const pivotIndex = leftPointer;
      const highIndex = high;
      [arr[leftPointer], arr[high]] = [arr[high], arr[leftPointer]];
      operations.push(createOperation({
        type: "swap",
        round,
        swapIndices: [pivotIndex, highIndex],
        message: `รอบที่ ${round}: สลับ a[r] หรือ pivot ${getDisplayValue(pivotValue)} กับตำแหน่ง L ซึ่งเป็น ${getDisplayValue(pivotTargetValue)}`,
        apply(target) { [target[pivotIndex], target[highIndex]] = [target[highIndex], target[pivotIndex]]; },
        quick: { low, high, leftPointer: pivotIndex, rightPointer, pivotIndex, crossed: true },
      }));
      
      sortedSet.add(pivotIndex);
      operations.push(createOperation({
        type: "markSorted",
        round,
        sortedIndices: [...sortedSet],
        message: `pivot ${getDisplayValue(pivotValue)} อยู่ตำแหน่งสุดท้ายของตัวเองแล้ว`,
        quick: { low, high, leftPointer: pivotIndex, rightPointer, pivotIndex, crossed: true },
      }));
      
      operations.push(createOperation({
        type: "note",
        round,
        pivotIndices: [pivotIndex],
        message: `รอบที่ ${round}: ตั้ง Sentinel ตัวใหม่กับช่วงซ้ายและขวาของ pivot แล้วทำซ้ำ`,
        quick: { low, high, leftPointer: pivotIndex, rightPointer, pivotIndex, crossed: true },
      }));
      quickSort(low, pivotIndex - 1);
      quickSort(pivotIndex + 1, high);
    }
    quickSort(0, arr.length - 1);
    operations.push(createOperation({
      type: "markSorted",
      round,
      sortedIndices: Array.from({ length: arr.length }, (_, index) => index),
      message: "Quick Sort เสร็จสมบูรณ์ ข้อมูลเรียงครบทุกตำแหน่ง",
      quick: { low: 0, high: arr.length - 1, leftPointer: null, rightPointer: null, pivotIndex: null, crossed: false },
    }));
    return { operations, sortedArray: arr };
  }

  // อัปเกรด: In-Place Merge Sort แบบ "สไลด์สลับ" แก้ปัญหากล่องวาบหายไป 100%
  function buildMergeOperations(source) {
    const arr = cloneArray(source);
    const operations = [];
    let round = 0;

    function merge(left, mid, right) {
      let start = left;
      let start2 = mid + 1;

      operations.push(createOperation({
          type: "pivot", round,
          pivotIndices: Array.from({ length: right - left + 1 }, (_, offset) => left + offset),
          message: `รอบที่ ${round}: รวมช่วงซ้ายและขวา`
      }));

      if (getNumericValue(arr[mid]) <= getNumericValue(arr[start2])) {
          return;
      }

      while (start <= mid && start2 <= right) {
          operations.push(createOperation({
              type: "compare", round,
              indices: [start], pivotIndices: [start2],
              message: `รอบที่ ${round}: เปรียบเทียบ ${getDisplayValue(arr[start])} กับ ${getDisplayValue(arr[start2])}`
          }));

          if (getNumericValue(arr[start]) <= getNumericValue(arr[start2])) {
              start++;
          } else {
              let index = start2;

              // สลับ(Swap) ทีละช่องย้อนกลับไปจนถึงตำแหน่ง start 
              // วิธีนี้จะทำให้กล่องเลื่อนไหลสลับที่กัน ไม่มีตัวไหนโดนเขียนทับหายไป
              while (index !== start) {
                  const swapLeft = index - 1;
                  const swapRight = index;
                  const leftVal = arr[swapLeft];
                  const rightVal = arr[swapRight];
                  
                  operations.push(createOperation({
                      type: "swap", round,
                      swapIndices: [swapLeft, swapRight],
                      message: `รอบที่ ${round}: สลับ ${getDisplayValue(leftVal)} กับ ${getDisplayValue(rightVal)} เพื่อแทรกตัวที่น้อยกว่า`,
                      apply(target) {
                          [target[swapLeft], target[swapRight]] = [target[swapRight], target[swapLeft]];
                      }
                  }));
                  
                  [arr[swapLeft], arr[swapRight]] = [arr[swapRight], arr[swapLeft]];
                  index--;
              }
              start++;
              mid++;
              start2++;
          }
      }
    }

    function mergeSort(left, right) {
      if (left >= right) return;
      const mid = Math.floor((left + right) / 2);
      mergeSort(left, mid);
      mergeSort(mid + 1, right);
      round += 1;
      merge(left, mid, right);
    }

    mergeSort(0, arr.length - 1);
    operations.push(createOperation({ 
      type: "markSorted", round, 
      sortedIndices: Array.from({ length: arr.length }, (_, index) => index), 
      message: "Merge Sort เสร็จสมบูรณ์" 
    }));
    
    return { operations, sortedArray: arr };
  }

  function buildHeapOperations(source) {
    const arr = [];
    const operations = [];
    const sortedSet = new Set();
    let round = 0;
    function siftDown(heapSize, rootIndex, stageLabel) {
      let largest = rootIndex;
      const left = rootIndex * 2 + 1;
      const right = rootIndex * 2 + 2;
      operations.push(createOperation({ type: "pivot", round, pivotIndices: [rootIndex], message: `${stageLabel}: พิจารณา root ตำแหน่ง ${rootIndex + 1}`, phase: "heap-sort", displayArray: cloneArray(arr) }));
      if (left < heapSize) {
        operations.push(createOperation({ type: "compare", round, indices: [largest, left], message: `${stageLabel}: เปรียบเทียบ root ${getDisplayValue(arr[largest])} กับลูกซ้าย ${getDisplayValue(arr[left])}`, phase: "heap-sort", displayArray: cloneArray(arr) }));
        if (getNumericValue(arr[left]) > getNumericValue(arr[largest])) largest = left;
      }
      if (right < heapSize) {
        operations.push(createOperation({ type: "compare", round, indices: [largest, right], message: `${stageLabel}: เปรียบเทียบค่ามากสุดชั่วคราว ${getDisplayValue(arr[largest])} กับลูกขวา ${getDisplayValue(arr[right])}`, phase: "heap-sort", displayArray: cloneArray(arr) }));
        if (getNumericValue(arr[right]) > getNumericValue(arr[largest])) largest = right;
      }
      if (largest !== rootIndex) {
        const rootSwapIndex = rootIndex;
        const childSwapIndex = largest;
        const rootValue = arr[rootIndex];
        const childValue = arr[largest];
        [arr[rootIndex], arr[largest]] = [arr[largest], arr[rootIndex]];
        operations.push(createOperation({ type: "swap", round, swapIndices: [rootSwapIndex, childSwapIndex], message: `${stageLabel}: สลับ ${getDisplayValue(rootValue)} กับ ${getDisplayValue(childValue)} เพื่อคงคุณสมบัติ max heap`, apply(target) { [target[rootSwapIndex], target[childSwapIndex]] = [target[childSwapIndex], target[rootSwapIndex]]; }, phase: "heap-sort", displayArray: cloneArray(arr) }));
        siftDown(heapSize, largest, stageLabel);
      }
    }
    operations.push(createOperation({ type: "pivot", round: 0, message: "เริ่มสร้าง Max Heap จาก heap ว่าง", phase: "build-heap", displayArray: [] }));
    source.forEach((value, index) => {
      round += 1;
      arr.push(value);
      const insertedIndex = arr.length - 1;
      operations.push(createOperation({
        type: "overwrite",
        round,
        swapIndices: [insertedIndex],
        pivotIndices: [insertedIndex],
        message: `รอบที่ ${round}: เพิ่ม ${getDisplayValue(value)} เข้า heap เป็นโหนดใหม่`,
        apply(target) { target.push(value); },
        phase: "build-heap",
        displayArray: cloneArray(arr),
      }));
      let currentIndex = insertedIndex;
      while (currentIndex > 0) {
        const parentIndex = Math.floor((currentIndex - 1) / 2);
        operations.push(createOperation({
          type: "compare",
          round,
          indices: [parentIndex, currentIndex],
          message: `รอบที่ ${round}: เปรียบเทียบพ่อ ${getDisplayValue(arr[parentIndex])} กับลูก ${getDisplayValue(arr[currentIndex])}`,
          phase: "build-heap",
          displayArray: cloneArray(arr),
        }));
        if (getNumericValue(arr[parentIndex]) >= getNumericValue(arr[currentIndex])) break;
        const parentValue = arr[parentIndex];
        const childValue = arr[currentIndex];
        [arr[parentIndex], arr[currentIndex]] = [arr[currentIndex], arr[parentIndex]];
        const swapParentIndex = parentIndex;
        const swapChildIndex = currentIndex;
        operations.push(createOperation({
          type: "swap",
          round,
          swapIndices: [swapParentIndex, swapChildIndex],
          message: `รอบที่ ${round}: สลับ ${getDisplayValue(parentValue)} กับ ${getDisplayValue(childValue)} เพื่อดันค่ามากขึ้นด้านบน`,
          apply(target) { [target[swapParentIndex], target[swapChildIndex]] = [target[swapChildIndex], target[swapParentIndex]]; },
          phase: "build-heap",
          displayArray: cloneArray(arr),
        }));
        currentIndex = parentIndex;
      }
      operations.push(createOperation({
        type: "note",
        round,
        pivotIndices: [currentIndex],
        message: `รอบที่ ${round}: ตอนนี้ ${getDisplayValue(value)} อยู่ในตำแหน่งที่เหมาะสมของ Max Heap แล้ว`,
        phase: "build-heap",
        displayArray: cloneArray(arr),
      }));
    });
    operations.push(createOperation({ type: "note", round: Math.max(round, 1), message: "สร้าง Max Heap เสร็จสมบูรณ์ พร้อมเริ่มขั้นตอน Heap Sort", phase: "build-heap", displayArray: cloneArray(arr) }));
    for (let end = arr.length - 1; end > 0; end -= 1) {
      round += 1;
      const rootIndex = 0;
      const endIndex = end;
      const rootValue = arr[0];
      const endValue = arr[end];
      [arr[0], arr[end]] = [arr[end], arr[0]];
      operations.push(createOperation({ type: "swap", round, swapIndices: [rootIndex, endIndex], message: `รอบที่ ${round}: สลับราก heap ${getDisplayValue(rootValue)} กับค่าท้ายช่วง ${getDisplayValue(endValue)}`, apply(target) { [target[rootIndex], target[endIndex]] = [target[endIndex], target[rootIndex]]; }, phase: "heap-sort", displayArray: cloneArray(arr) }));
      
      sortedSet.add(end);
      operations.push(createOperation({ type: "markSorted", round, sortedIndices: [...sortedSet], message: `รอบที่ ${round}: ค่าสูงสุดถูกย้ายไปตำแหน่งท้ายที่ ${end + 1}`, phase: "heap-sort", displayArray: cloneArray(arr) }));
      
      siftDown(end, 0, `รอบที่ ${round}: ปรับ heap ใหม่`);
    }
    sortedSet.add(0);
    operations.push(createOperation({ type: "markSorted", round, sortedIndices: [...sortedSet], message: "Heap Sort เสร็จสมบูรณ์ ข้อมูลเรียงครบแล้ว", phase: "heap-sort", displayArray: cloneArray(arr) }));
    return { operations, sortedArray: arr };
  }

  function generateOperations(array, algorithm) {
    switch (algorithm) {
      case "selection": return buildSelectionOperations(array);
      case "insertion": return buildInsertionOperations(array);
      case "bubble": return buildBubbleOperations(array);
      case "quick": return buildQuickOperations(array);
      case "merge": return buildMergeOperations(array);
      case "heap": return buildHeapOperations(array);
      default: return buildSelectionOperations(array);
    }
  }

  app.algorithms = { cloneArray, parseInput, createOperation, getTypeLabel, buildTraceRows, generateOperations, getDisplayValue, getNumericValue };
})();