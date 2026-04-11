(function () {
  const app = (window.SortingApp = window.SortingApp || {});
  app.state = {
    sourceArray: [...app.DEFAULT_SAMPLE],
    workingArray: [...app.DEFAULT_SAMPLE],
    finalArray: [],
    displaySourceArray: [...app.DEFAULT_SAMPLE],
    operations: [],
    traceRows: [],
    prepared: false,
    currentStep: 0,
    comparisons: 0,
    swaps: 0,
    roundsSeen: new Set(),
    sortedIndices: new Set(),
    currentOperation: null,
    autoplayId: null,
    running: false,
  };
})();
