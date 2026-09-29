// When you hit "run the check" on the home page, the analysis request starts
// immediately and the app navigates to /report/pending. This module is the
// handoff between those two pages: home stores the in-flight promise here,
// the report page picks it up and waits for the result.

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