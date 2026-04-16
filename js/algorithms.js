//Guy
(function () {
  // โมดูลนี้รวม utility และตัวสร้าง operation ของอัลกอริทึมทุกชนิด
  // แนวคิดหลักของระบบคือไม่ sort แบบแสดงผลทันที แต่จะ "บันทึกเหตุการณ์เป็น operations"
  // แล้วให้ controller/renderer เล่น operations เหล่านั้นอีกทีเพื่อทำ animation และอธิบายแต่ละ step
  const app = (window.SortingApp = window.SortingApp || {});

  // clone แบบตื้นสำหรับอาร์เรย์ ใช้บ่อยเวลาอยากคัดลอกสถานะปัจจุบันไปทำงานต่อ
  const cloneArray = (array) => array.slice();

  // ใช้ตรวจว่าผู้ใช้กรอกตัวอักษรเดี่ยว a-z หรือไม่
  const LETTER_PATTERN = /^[a-z]$/i;

  // ข้อมูลบางตัวถูกเก็บเป็น object { value, label } เพื่อแยก "ค่าที่ใช้เปรียบเทียบ" กับ "ข้อความที่แสดง"
  const isValueItem = (value) => typeof value === "object" && value !== null && "value" in value;

  // คืนค่าตัวเลขจริงสำหรับใช้เปรียบเทียบในอัลกอริทึม
  const getNumericValue = (value) => (isValueItem(value) ? value.value : value);
  const getDisplayValue = (value) => {

    // null ใช้เป็นค่าพิเศษในบางภาพแสดงผล จึงส่ง null กลับไปตรง ๆ
    if (value === null) return null;
    
    // ถ้าเป็น object ให้ใช้ label เพื่อให้แสดง a, b, c หรือข้อความเดิมที่ผู้ใช้กรอก
    return isValueItem(value) ? value.label : String(value);
  };

  function parseToken(part) {
    // แปลงข้อมูลแต่ละช่องจาก input ให้กลายเป็นรูปแบบมาตรฐานของระบบ
    if (LETTER_PATTERN.test(part)) {
      const normalized = part.toLowerCase();// ถ้าเป็นตัวอักษร a-z ให้แปลงเป็นตัวเลข 1-26 เพื่อให้เปรียบเทียบได้ง่าย แต่ยังเก็บ label เดิมไว้แสดงผล
      return { value: normalized.charCodeAt(0) - 96, label: normalized };// ตัวอย่าง: "a" จะกลายเป็น { value: 1, label: "a" }, "b" เป็น { value: 2, label: "b" } และต่อไปเรื่อย ๆ
    }
    const numericValue = Number(part);// ถ้าเป็นตัวเลขปกติ ให้แปลงเป็น Number และใช้ทั้ง value และ label เป็นตัวเลขนั้น
    return { value: numericValue, label: part };// ตัวอย่าง: "5" จะกลายเป็น { value: 5, label: "5" }
  }

  function parseInput(inputText) {
    // ตรวจสอบและแปลงข้อความจาก input ให้พร้อมใช้งานจริง
    // ถ้าพบปัญหา จะคืน error message ที่พร้อมแสดงบนหน้าเว็บทันที
    const raw = inputText.trim();// ลบช่องว่างส่วนเกินรอบ ๆ ข้อความก่อนตรวจสอบ เพื่อให้ผู้ใช้กรอกข้อมูลได้ยืดหยุ่นขึ้น เช่น " 5, 3, 9 " ก็ยังถือว่า valid ได้
    if (!raw) return { error: "กรุณากรอกข้อมูลอย่างน้อย 1 ค่า" };// ถ้าไม่มีข้อมูลเลย ให้แจ้งให้ผู้ใช้กรอกข้อมูลก่อน
    const parts = raw.split(",").map((part) => part.trim());// แยกข้อมูลด้วยเครื่องหมายจุลภาคและลบช่องว่างรอบ ๆ แต่ละส่วน เพื่อให้ผู้ใช้กรอกข้อมูลได้ยืดหยุ่นขึ้น เช่น "5 , 3,9" ก็ยังถือว่า valid ได้
    if (parts.some((part) => part === "")) return { error: "พบค่าที่ว่างอยู่ กรุณากรอกข้อมูลให้ครบทุกตำแหน่ง" };// ถ้ามีส่วนไหนที่ว่างเปล่า แปลว่าผู้ใช้กรอกข้อมูลไม่ครบ เช่น "5, , 9" จะถือว่าไม่ถูกต้อง
    const values = parts.map(parseToken);// แปลงแต่ละส่วนให้กลายเป็นรูปแบบ { value, label } ที่ระบบใช้ได้
    if (values.some((value) => Number.isNaN(getNumericValue(value)))) return { error: "ข้อมูลต้องเป็นตัวเลขหรือ a-z เท่านั้น และต้องคั่นด้วยเครื่องหมายจุลภาค" };// ถ้ามีส่วนไหนที่ไม่สามารถแปลงเป็นตัวเลขหรือ a-z ได้ เช่น "5, x, 9" จะถือว่าไม่ถูกต้อง
    if (values.length > 20) return { error: "เพื่อให้ดู animation ชัดเจน กรุณากรอกไม่เกิน 20 ค่า" };// ถ้าผู้ใช้กรอกข้อมูลมากเกินไป จะทำให้ animation ดูยากและช้า จึงจำกัดจำนวนข้อมูลที่ 20 ค่า
    return { values };
  }

  function createOperation({ type, message, round = null, indices = [], swapIndices = [], sortedIndices = [], pivotIndices = [], apply = null, phase = "sort", displayArray = null, quick = null }) {
    // สร้าง object มาตรฐานของหนึ่ง step
    // โครงสร้างนี้ถูกใช้ร่วมกันทุกอัลกอริทึมเพื่อให้ renderer อ่านข้อมูลได้รูปแบบเดียว
    return { type, message, round, indices, swapIndices, sortedIndices, pivotIndices, apply, phase, displayArray, quick };
  }

  function getTypeLabel(type) {
    // แปลงรหัสภายในของ operation ให้เป็นข้อความสั้น ๆ สำหรับตาราง trace
    return { compare: "Compare", swap: "Swap", overwrite: "Overwrite", pivot: "Focus", markSorted: "Sorted", note: "Note" }[type] ?? type;
  }

  function buildTraceRows(sourceArray, operations) {
    // จำลองการทำงานของ operations เพื่อสร้างข้อมูลพร้อมใช้สำหรับตาราง steps
    // ตารางนี้ต้องการข้อความ array ของแต่ละช่วงเวลา จึงต้อง replay เหตุการณ์ตั้งแต่ต้น
    const rows = [];// ถ้ามีการสร้าง heap แยกจากการ sort จะใช้ array แยกสำหรับแสดงผลในตาราง trace เพื่อให้เห็นความแตกต่างระหว่างช่วง build heap กับ heap sort ได้ชัดเจน
    // ถ้าไม่มีการสร้าง heap แยก จะใช้การ clone array ปกติที่คอยจำลองสถานะปัจจุบันของข้อมูลระหว่างการ sort ไปเรื่อย ๆ ตามแต่ละ operation
    const isHeapBuild = operations.some((operation) => operation.phase === "build-heap");
    // ถ้าเป็น heap sort และมีการแยก build heap กับ heap sort ชัดเจน จะใช้ array แยกสำหรับแสดงผลในตาราง trace เพื่อให้เห็นความแตกต่างระหว่างช่วง build heap กับ heap sort ได้ชัดเจน
    const tempArray = isHeapBuild ? [] : cloneArray(sourceArray);
    // ถ้าเป็น heap sort และมีการแยก build heap กับ heap sort ชัดเจน จะใช้ array แยกสำหรับแสดงผลในตาราง trace เพื่อให้เห็นความแตกต่างระหว่างช่วง build heap กับ heap sort ได้ชัดเจน
    operations.forEach((operation, index) => {
      if (typeof operation.apply === "function") operation.apply(tempArray);
      const visibleArray = operation.displayArray ?? tempArray;
      // ถ้า operation นี้มี displayArray แสดงว่าอยากให้ใช้ array นี้ในการแสดงผลในตาราง trace แทน tempArray ที่จำลองการทำงานอยู่ 
      // ซึ่งเหมาะกับกรณีที่ต้องการแสดง array ในรูปแบบพิเศษ เช่น แยก build heap กับ heap sort หรือแสดงสถานะ pointer ของ quick sort ได้ชัดเจนขึ้น
      rows.push({
        step: index + 1,
        round: operation.round ?? "-",// ถ้า operation นี้มีข้อมูลรอบ (round) ให้แสดง ถ้าไม่มีให้แสดง "-"
        type: getTypeLabel(operation.type),// แปลงรหัสภายในของ operation ให้เป็นข้อความสั้น ๆ สำหรับตาราง trace
        message: operation.message,// ข้อความอธิบายเหตุการณ์ของ operation นี้
        arrayText: `[${visibleArray.map((value) => (value === null ? "_" : getDisplayValue(value))).join(", ")}]`,// แปลง array ปัจจุบันให้เป็นข้อความสำหรับแสดงในตาราง trace
      });
    });
    return rows;
  }

  function buildSelectionOperations(source) {
    // Selection Sort:
    // แต่ละรอบหา "ค่าน้อยที่สุด" ในช่วงที่ยังไม่เรียง แล้วสลับมาไว้ด้านหน้า
    const arr = cloneArray(source);
    const operations = [];
    const sortedSet = new Set();
    for (let i = 0; i < arr.length; i += 1) {
      let minIndex = i;
      for (let j = i + 1; j < arr.length; j += 1) {
        const currentMin = minIndex;
        // บันทึก operation การเปรียบเทียบแต่ละคู่ เพื่อให้ renderer แสดงภาพการค้นหาค่าน้อยที่สุดในแต่ละรอบได้ชัดเจน
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
  //Eton
  // Insertion Sort:
  // เลื่อนค่าที่กำลังพิจารณาไปทางซ้ายจนกว่าจะเจอตำแหน่งที่เหมาะสม
  // เวอร์ชันนี้ใช้ swap ต่อเนื่องแทน overwrite เพื่อให้ animation การเลื่อนกล่องลื่นและดูง่าย
  function buildInsertionOperations(source) {
    const arr = cloneArray(source);
    const operations = [];
    
    for (let i = 1; i < arr.length; i += 1) {
      const round = i;
      let j = i;
      // บันทึก operation การพิจารณาค่าที่กำลังจะเลื่อน เพื่อให้ renderer แสดงภาพการเลือกค่าที่จะเลื่อนในแต่ละรอบได้ชัดเจน
      operations.push(createOperation({
        type: "pivot", round, pivotIndices: [i],
        message: `รอบที่ ${round}: พิจารณาแทรก ${getDisplayValue(arr[i])}`
      }));

      let shifted = false;
      // ใช้ loop เดียวในการเลื่อนค่าที่กำลังพิจารณาไปทางซ้ายจนกว่าจะเจอตำแหน่งที่เหมาะสม
      while (j > 0) {
        operations.push(createOperation({
          type: "compare", round, indices: [j - 1], pivotIndices: [j],
          message: `รอบที่ ${round}: เปรียบเทียบ ${getDisplayValue(arr[j])} กับ ${getDisplayValue(arr[j-1])}`
        }));
        // ถ้าค่าที่อยู่ติดกันทางซ้ายมากกว่าค่าที่กำลังพิจารณา ให้สลับตำแหน่งกันแล้วเลื่อน pointer ไปทางซ้ายต่อ
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
  //
  function buildBubbleOperations(source) {
    // Bubble Sort:
    // เปรียบเทียบค่าที่อยู่ติดกันและสลับเมื่อเรียงผิดลำดับ
    // เวอร์ชันนี้ไล่จากด้านหลังขึ้นด้านหน้าเพื่อให้ค่าน้อยค่อย ๆ ลอยมาทางซ้าย
    const arr = cloneArray(source);
    const operations = [];
    const sortedSet = new Set();// ใช้เก็บตำแหน่งที่เรียงเสร็จแล้วเพื่อให้ renderer แสดงภาพการจัดเรียงที่ค่อย ๆ เพิ่มขึ้นในแต่ละรอบได้ชัดเจน
    let lastRound = 0;
    for (let start = 0, round = 1; start < arr.length - 1; start += 1, round += 1) {
      lastRound = round;
      let swapped = false;
      // ใช้ loop เดียวในการเปรียบเทียบค่าที่อยู่ติดกันและสลับเมื่อเรียงผิดลำดับ โดยไล่จากด้านหลังขึ้นด้านหน้าเพื่อให้ค่าน้อยค่อย ๆ ลอยมาทางซ้าย
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

  //Ball
  function buildQuickOperations(source) {
    // Quick Sort:
    // ใช้แนวคิด divide and conquer โดยเลือก pivot แล้ว partition ช่วงข้อมูล
    // ไฟล์นี้ยังบันทึกข้อมูล pointer L/R และ pivot เพิ่มเข้าไป เพื่อให้ renderer วาดภาพอธิบายได้ละเอียด
    const arr = cloneArray(source);
    const operations = [];
    const sortedSet = new Set();
    let round = 0;
    function quickSort(low, high) {
      // กรณีช่วงว่าง ไม่มีอะไรต้องทำ
      if (low > high) return;
      if (low === high) {
        // ถ้าเหลือสมาชิกเดียว ให้ถือว่าเรียงแล้วทันที
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
        // สแกนจากฝั่งซ้ายเพื่อหาค่าที่ "มากกว่า pivot"
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
        // สแกนจากฝั่งขวาเพื่อหาค่าที่ "น้อยกว่าหรือเท่ากับ pivot"
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
        // เมื่อ L และ R พบค่าที่อยู่ผิดฝั่ง จะสลับกัน
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
      // เมื่อ pointer ไขว้กันแล้ว ตำแหน่งของ L คือจุดที่ pivot ควรถูกวางลง
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

      // เรียกซ้ำกับฝั่งซ้ายและขวาของ pivot
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

  //Ice
  // Merge Sort:
  // แนวคิดดั้งเดิมคือแบ่งครึ่งแล้ว merge กลับเข้าด้วยกัน
  // เวอร์ชันนี้ทำการแทรกแบบสลับทีละช่องในอาร์เรย์เดิม เพื่อให้ภาพ animation ต่อเนื่องและไม่มีกล่องหายวูบ
  function buildMergeOperations(source) {
    const arr = cloneArray(source);
    const operations = [];
    let round = 0;

    function merge(left, mid, right) {
      let start = left;
      let start2 = mid + 1;
      // บันทึก operation การรวมช่วงซ้ายและขวา เพื่อให้ renderer แสดงภาพการรวมช่วงย่อยในแต่ละรอบได้ชัดเจน
      operations.push(createOperation({
          type: "pivot", round,
          pivotIndices: Array.from({ length: right - left + 1 }, (_, offset) => left + offset),
          message: `รอบที่ ${round}: รวมช่วงซ้ายและขวา`
      }));

      // ถ้าช่วงทั้งสองเรียงต่อกันอยู่แล้ว ไม่ต้อง merge เพิ่ม
      if (getNumericValue(arr[mid]) <= getNumericValue(arr[start2])) {
          return;
      }
      // ใช้ loop เดียวในการแทรกค่าจากฝั่งขวาไปยังตำแหน่งที่ถูกต้องในฝั่งซ้ายทีละช่อง โดยไล่จากซ้ายไปขวาเพื่อให้ภาพการเคลื่อนที่ชัดเจน
      while (start <= mid && start2 <= right) {
          operations.push(createOperation({
              type: "compare", round,
              indices: [start], pivotIndices: [start2],
              message: `รอบที่ ${round}: เปรียบเทียบ ${getDisplayValue(arr[start])} กับ ${getDisplayValue(arr[start2])}`
          }));
          // ถ้าค่าที่ฝั่งซ้ายไม่มากกว่าค่าที่ฝั่งขวา แปลว่าตำแหน่งนี้ถูกต้องแล้ว ให้ขยับ pointer ฝั่งซ้ายไปต่อ
          if (getNumericValue(arr[start]) <= getNumericValue(arr[start2])) {
              start++;
          } else {
              let index = start2;

              // เลื่อนสมาชิกจากฝั่งขวามาแทรกในตำแหน่งที่ถูกต้อง
              // ทำผ่านการ swap ย้อนทีละช่อง เพื่อให้ภาพการเคลื่อนที่ชัดเจนบนหน้าเว็บ
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
      // เรียกแบ่งครึ่งซ้ำจนย่อยที่สุด แล้วค่อย merge กลับขึ้นมา
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
  //Prem
  function buildHeapOperations(source) {
    // Heap Sort:
    // ขั้นแรกสร้าง Max Heap จากข้อมูลทั้งหมด
    // ขั้นถัดไปสลับราก heap ไปไว้ท้ายช่วง แล้วปรับ heap ที่เหลือซ้ำ
    const arr = [];
    const operations = [];
    const sortedSet = new Set();
    let round = 0;
    function siftDown(heapSize, rootIndex, stageLabel) {
      // siftDown ใช้คืนคุณสมบัติ max heap หลังจาก root ถูกสลับออกไป
      let largest = rootIndex;
      const left = rootIndex * 2 + 1;// ในโครงสร้าง heap ที่เก็บในอาร์เรย์ ลูกซ้ายของโหนดที่ตำแหน่ง i จะอยู่ที่ตำแหน่ง 2*i + 1
      const right = rootIndex * 2 + 2;// ลูกขวาของโหนดที่ตำแหน่ง i จะอยู่ที่ตำแหน่ง 2*i + 2
      // บันทึก operation การพิจารณา root และลูกซ้ายขวา เพื่อให้ renderer แสดงภาพการตรวจสอบคุณสมบัติ max heap ในแต่ละรอบได้ชัดเจน
      operations.push(createOperation({ type: "pivot", round, pivotIndices: [rootIndex], message: `${stageLabel}: พิจารณา root ตำแหน่ง ${rootIndex + 1}`, phase: "heap-sort", displayArray: cloneArray(arr) }));
      if (left < heapSize) {
        operations.push(createOperation({ type: "compare", round, indices: [largest, left], message: `${stageLabel}: เปรียบเทียบ root ${getDisplayValue(arr[largest])} กับลูกซ้าย ${getDisplayValue(arr[left])}`, phase: "heap-sort", displayArray: cloneArray(arr) }));
        if (getNumericValue(arr[left]) > getNumericValue(arr[largest])) largest = left;
      }
      if (right < heapSize) {
        operations.push(createOperation({ type: "compare", round, indices: [largest, right], message: `${stageLabel}: เปรียบเทียบค่ามากสุดชั่วคราว ${getDisplayValue(arr[largest])} กับลูกขวา ${getDisplayValue(arr[right])}`, phase: "heap-sort", displayArray: cloneArray(arr) }));
        if (getNumericValue(arr[right]) > getNumericValue(arr[largest])) largest = right;
      }
      // ถ้าลูกซ้ายหรือขวามีค่ามากกว่า root ให้สลับกับลูกที่มีค่ามากที่สุดแล้ว siftDown ต่อไปเรื่อย ๆ จนกว่าจะคงคุณสมบัติ max heap ได้
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

    // เริ่มจาก heap ว่าง แล้วค่อย insert สมาชิกเข้าไปทีละตัว
    operations.push(createOperation({ type: "pivot", round: 0, message: "เริ่มสร้าง Max Heap จาก heap ว่าง", phase: "build-heap", displayArray: [] }));
    // การ insert สมาชิกใหม่เข้าไปใน heap จะเหมือนกับการเพิ่มโหนดใหม่เข้าไปในต้นไม้ไบนารีที่สมบูรณ์ แล้วค่อย ๆ ดันค่ามากขึ้นด้านบนจนกว่าจะอยู่ถูกตำแหน่ง
    source.forEach((value, index) => {
      round += 1;
      arr.push(value);
      const insertedIndex = arr.length - 1;// โหนดใหม่ที่ถูกเพิ่มเข้าไปจะอยู่ตำแหน่งสุดท้ายของอาร์เรย์ ซึ่งเป็นตำแหน่งที่เหมาะสมสำหรับโหนดใหม่ในต้นไม้ไบนารีที่สมบูรณ์  
      // บันทึก operation การเพิ่มโหนดใหม่เข้าไปใน heap เพื่อให้ renderer แสดงภาพการเพิ่มโหนดใหม่ในแต่ละรอบได้ชัดเจน
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
        // เปรียบเทียบกับ parent และดันค่ามากขึ้นด้านบนจนกว่าจะอยู่ถูกตำแหน่ง
        const parentIndex = Math.floor((currentIndex - 1) / 2);// ในโครงสร้าง heap ที่เก็บในอาร์เรย์ โหนดที่ตำแหน่ง i จะมี parent อยู่ที่ตำแหน่ง Math.floor((i - 1) / 2)
        operations.push(createOperation({
          type: "compare",
          round,
          indices: [parentIndex, currentIndex],
          message: `รอบที่ ${round}: เปรียบเทียบพ่อ ${getDisplayValue(arr[parentIndex])} กับลูก ${getDisplayValue(arr[currentIndex])}`,
          phase: "build-heap",
          displayArray: cloneArray(arr),
        }));
        // ถ้าพ่อมีค่ามากกว่าหรือเท่ากับลูก แปลว่าค่าที่เพิ่มเข้ามาอยู่ในตำแหน่งที่ถูกต้องแล้ว ไม่ต้องดันขึ้นไปอีก
        if (getNumericValue(arr[parentIndex]) >= getNumericValue(arr[currentIndex])) break;
        const parentValue = arr[parentIndex];
        const childValue = arr[currentIndex];
        [arr[parentIndex], arr[currentIndex]] = [arr[currentIndex], arr[parentIndex]];
        const swapParentIndex = parentIndex;
        const swapChildIndex = currentIndex;
        // บันทึก operation การสลับกับ parent เพื่อให้ renderer แสดงภาพการดันค่ามากขึ้นด้านบนในแต่ละรอบได้ชัดเจน
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

    // เมื่อสร้าง heap เสร็จแล้ว จะนำค่าสูงสุดที่ root ไปวางท้ายช่วงทีละรอบ
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
  //Ice
  function generateOperations(array, algorithm) {
    // dispatcher กลางสำหรับเลือกตัวสร้าง operations ให้ตรงกับอัลกอริทึมที่ผู้ใช้เลือก
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

  // export ฟังก์ชันที่ไฟล์อื่นต้องใช้ผ่าน namespace กลาง
  app.algorithms = { cloneArray, parseInput, createOperation, getTypeLabel, buildTraceRows, generateOperations, getDisplayValue, getNumericValue };
})();
