let pendingReportPromise = null;
let analyzeErrorMessage = null;

export function setPendingReport(promise) {
  pendingReportPromise = promise;
}

export function getPendingReport() {
  return pendingReportPromise;
}

export function clearPendingReport() {
  pendingReportPromise = null;
}

export function setAnalyzeError(message) {
  analyzeErrorMessage = message;
}

export function getAnalyzeError() {
  return analyzeErrorMessage;
}

export function clearAnalyzeError() {
  analyzeErrorMessage = null;
}