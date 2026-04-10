const SCAN_HISTORY_KEY = 'fitlife_scan_history';
const HIDDEN_SCAN_IDS_KEY = 'fitlife_hidden_scan_ids';
const MAX_HISTORY_ITEMS = 12;
const HISTORY_RETAIN_COUNT = 5;

const SCANNER_STATES = {
  IDLE: 'idle',
  CAMERA: 'camera',
  PREVIEW: 'preview',
  ANALYZING: 'analyzing',
  RESULT: 'result',
  ERROR: 'error'
};

let currentStream = null;
let currentFile = null;
let currentPreviewUrl = '';
let latestAnalysis = null;
let latestRawAnalysis = null;
let scannerState = SCANNER_STATES.IDLE;
let backendScanHistory = [];

const NUTRITION_LIBRARY = [
  { keywords: ['biryani'], food_name: 'Chicken Biryani', serving_estimate: '1 plate', estimated_calories: 620, protein_g: 26, carbs_g: 68, fat_g: 24 },
  { keywords: ['dosa'], food_name: 'Dosa', serving_estimate: '2 pieces', estimated_calories: 320, protein_g: 8, carbs_g: 46, fat_g: 10 },
  { keywords: ['idli'], food_name: 'Idli', serving_estimate: '3 pieces', estimated_calories: 180, protein_g: 6, carbs_g: 36, fat_g: 1 },
  { keywords: ['pizza'], food_name: 'Pizza', serving_estimate: '2 slices', estimated_calories: 520, protein_g: 20, carbs_g: 54, fat_g: 24 },
  { keywords: ['burger'], food_name: 'Burger', serving_estimate: '1 burger', estimated_calories: 540, protein_g: 24, carbs_g: 42, fat_g: 30 },
  { keywords: ['salad'], food_name: 'Salad Bowl', serving_estimate: '1 bowl', estimated_calories: 220, protein_g: 9, carbs_g: 18, fat_g: 12 },
  { keywords: ['banana'], food_name: 'Banana', serving_estimate: '1 medium', estimated_calories: 105, protein_g: 1.3, carbs_g: 27, fat_g: 0.3 },
  { keywords: ['apple'], food_name: 'Apple', serving_estimate: '1 medium', estimated_calories: 95, protein_g: 0.5, carbs_g: 25, fat_g: 0.3 },
  { keywords: ['rice'], food_name: 'Rice Meal', serving_estimate: '1 bowl', estimated_calories: 260, protein_g: 5, carbs_g: 52, fat_g: 1 },
  { keywords: ['paneer'], food_name: 'Paneer Curry', serving_estimate: '1 serving', estimated_calories: 360, protein_g: 18, carbs_g: 12, fat_g: 24 },
  { keywords: ['chicken'], food_name: 'Chicken Curry', serving_estimate: '1 serving', estimated_calories: 340, protein_g: 30, carbs_g: 10, fat_g: 18 },
  { keywords: ['noodles'], food_name: 'Noodles', serving_estimate: '1 bowl', estimated_calories: 380, protein_g: 10, carbs_g: 56, fat_g: 12 },
  { keywords: ['milkybar'], food_name: 'Milkybar', serving_estimate: '1 bar', estimated_calories: 129, protein_g: 1.8, carbs_g: 14.5, fat_g: 7.1 },
  { keywords: ['kitkat'], food_name: 'KitKat', serving_estimate: '1 bar', estimated_calories: 104, protein_g: 1.5, carbs_g: 13.2, fat_g: 5.1 },
  { keywords: ['lays', 'chips'], food_name: 'Potato Chips', serving_estimate: '1 pack', estimated_calories: 160, protein_g: 2, carbs_g: 15, fat_g: 10 },
  { keywords: ['cake', 'layerz'], food_name: 'Layer Cake', serving_estimate: '1 piece', estimated_calories: 280, protein_g: 3.8, carbs_g: 34, fat_g: 14 }
];

document.addEventListener('DOMContentLoaded', async () => {
  wireScannerActions();
  applyScannerState(SCANNER_STATES.IDLE);
  await refreshScanHistoryFromBackend();
  renderScanHistory();
});

function wireScannerActions() {
  const fileInput = document.getElementById('food-file-input');
  const openCameraBtn = document.getElementById('open-camera-btn');
  const uploadPhotoBtn = document.getElementById('upload-photo-btn');
  const cancelCameraBtn = document.getElementById('cancel-camera-btn');
  const retakePhotoBtn = document.getElementById('retake-photo-btn');
  const capturePhotoBtn = document.getElementById('capture-photo-btn');
  const analyzePhotoBtn = document.getElementById('analyze-photo-btn');
  const resetScannerBtn = document.getElementById('reset-scanner-btn');
  const logMealBtn = document.getElementById('log-meal-btn');
  const retryHintBtn = document.getElementById('retry-with-hint-btn');
  const keepLastFiveBtn = document.getElementById('keep-last-five-btn');
  const clearHistoryBtn = document.getElementById('clear-scan-history-btn');
  const historyList = document.getElementById('scan-history-list');

  openCameraBtn?.addEventListener('click', startCamera);
  uploadPhotoBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', handleFileSelect);
  cancelCameraBtn?.addEventListener('click', resetScanner);
  retakePhotoBtn?.addEventListener('click', () => applyScannerState(SCANNER_STATES.PREVIEW));
  capturePhotoBtn?.addEventListener('click', capturePhoto);
  analyzePhotoBtn?.addEventListener('click', analyzeCurrentPhoto);
  resetScannerBtn?.addEventListener('click', resetScanner);
  logMealBtn?.addEventListener('click', addCurrentAnalysisToMealLog);
  retryHintBtn?.addEventListener('click', focusHintAndReturnToPreview);
  keepLastFiveBtn?.addEventListener('click', keepLastFiveScans);
  clearHistoryBtn?.addEventListener('click', clearAllScans);
  historyList?.addEventListener('click', handleHistoryActions);
  window.addEventListener('fitlife:meal-logged', async () => {
    await refreshScanHistoryFromBackend();
    renderScanHistory();
  });
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('Camera is not supported on this device', 'warning');
    return;
  }

  stopCamera();
  clearPreview(false);
  resetResultPanels();

  try {
    currentStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });

    const video = document.getElementById('camera-video');
    if (video) {
      video.srcObject = currentStream;
      await video.play();
    }

    applyScannerState(SCANNER_STATES.CAMERA);
    scrollScannerIntoView();
  } catch (error) {
    console.error('Camera start failed', error);
    renderScanError({
      message: 'Unable to access the camera. You can still upload an image to scan your food.',
      provider_error: '',
      provider_notes: ['Try photo upload if camera permission is blocked on this device.']
    });
    applyScannerState(SCANNER_STATES.ERROR);
  }
}

function stopCamera() {
  if (!currentStream) return;
  currentStream.getTracks().forEach((track) => track.stop());
  currentStream = null;
}

function handleFileSelect(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  previewFile(file);
}

function capturePhoto() {
  const video = document.getElementById('camera-video');
  if (!video || !video.videoWidth || !video.videoHeight) {
    showToast('Wait a moment for the camera to focus', 'warning');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    showToast('Could not capture the photo. Try again.', 'error');
    return;
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => {
    if (!blob) {
      showToast('Could not capture the photo. Try again.', 'error');
      return;
    }
    previewFile(new File([blob], `meal-scan-${Date.now()}.jpg`, { type: 'image/jpeg' }));
  }, 'image/jpeg', 0.92);
}

function previewFile(file) {
  currentFile = file;
  latestAnalysis = null;
  latestRawAnalysis = null;
  resetResultPanels();
  stopCamera();
  setPreviewImage(file);
  applyScannerState(SCANNER_STATES.PREVIEW);
  scrollScannerIntoView();
}

function setPreviewImage(file) {
  revokePreviewUrl();
  currentPreviewUrl = URL.createObjectURL(file);
  const previewImage = document.getElementById('preview-image');
  if (previewImage) {
    previewImage.src = currentPreviewUrl;
  }
}

function revokePreviewUrl() {
  if (currentPreviewUrl) {
    URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = '';
  }
}

async function analyzeCurrentPhoto() {
  if (!currentFile) {
    showToast('Upload or capture a meal photo first', 'warning');
    return;
  }

  resetResultPanels();
  applyScannerState(SCANNER_STATES.ANALYZING);
  setLoading('analyze-photo-btn', true);

  try {
    const response = await foodAPI.analyzePhoto(buildAnalyzeFormData());
    const analysis = normalizeApiAnalysis(response);
    latestRawAnalysis = response;
    latestAnalysis = analysis;
    renderAnalysis(analysis);
    await persistScanHistory(analysis);
    renderScanHistory();
    applyScannerState(SCANNER_STATES.RESULT);
    showToast('Meal analyzed successfully', 'success');
  } catch (error) {
    console.error('Analyze photo failed', error);
    renderScanError({
      message: error.message || 'Could not analyze that meal photo',
      provider_error: error.payload?.provider_error || '',
      provider_notes: normalizeProviderNotes(error.payload?.provider_notes),
      status: error.status
    });
    if (error.status === 422) {
      focusHintField();
    }
    applyScannerState(SCANNER_STATES.ERROR);
  } finally {
    setLoading('analyze-photo-btn', false);
  }
}

function buildAnalyzeFormData(extraFlags = {}) {
  const formData = new FormData();
  formData.append('photo', currentFile);
  formData.append('meal_time', document.getElementById('meal-time-select')?.value || 'meal');
  formData.append('food_hint', document.getElementById('manual-food-hint')?.value?.trim() || '');
  formData.append('log_date', todayDate());

  Object.entries(extraFlags).forEach(([key, value]) => {
    formData.append(key, String(value));
  });

  return formData;
}

function normalizeApiAnalysis(response) {
  const analysis = response?.analysis || response?.food || response;
  const dietWarning = response?.analysis?.diet_warning || response?.food?.diet_warning || analysis?.diet_warning || null;
  const scanRecovery = response?.analysis?.scan_recovery || response?.food?.scan_recovery || analysis?.scan_recovery || null;

  if (!analysis || typeof analysis !== 'object') {
    throw new Error('Scanner response was empty.');
  }

  const normalized = {
    food_name: analysis.food_name || analysis.name || 'Detected Meal',
    serving_estimate: analysis.serving_estimate || analysis.serving || '1 serving',
    estimated_calories: Number(analysis.estimated_calories ?? analysis.calories ?? 0),
    protein_g: Number(analysis.protein_g ?? analysis.protein ?? analysis.protein_g_for_quantity ?? 0),
    carbs_g: Number(analysis.carbs_g ?? analysis.carbs ?? analysis.carbs_g_for_quantity ?? 0),
    fat_g: Number(analysis.fat_g ?? analysis.fats ?? analysis.fat_g_for_quantity ?? 0),
    confidence: analysis.confidence || 'Estimated',
    notes: Array.isArray(analysis.notes) ? analysis.notes : [],
    feedback: analysis.feedback || 'Balanced meal estimate ready.',
    source: analysis.source || response?.source || '',
    provider_error: analysis.provider_error || response?.provider_error || '',
    provider_notes: normalizeProviderNotes(analysis.provider_notes || response?.provider_notes),
    diet_warning: normalizeDietWarning(dietWarning),
    scan_recovery: normalizeScanRecovery(scanRecovery)
  };

  return refineAnalysisWithLibrary(normalized);
}

function normalizeProviderNotes(providerNotes) {
  if (Array.isArray(providerNotes)) return providerNotes.filter(Boolean);
  if (typeof providerNotes === 'string' && providerNotes.trim()) return [providerNotes.trim()];
  return [];
}

function normalizeDietWarning(dietWarning) {
  if (!dietWarning || typeof dietWarning !== 'object') return null;

  return {
    should_warn: Boolean(dietWarning.should_warn),
    title: dietWarning.title || (dietWarning.should_warn ? 'Diet warning' : 'Goal fit'),
    message: dietWarning.message || '',
    issues: Array.isArray(dietWarning.issues) ? dietWarning.issues.filter(Boolean) : []
  };
}

function normalizeScanRecovery(scanRecovery) {
  if (!scanRecovery || typeof scanRecovery !== 'object') return null;

  return {
    needs_user_confirmation: Boolean(scanRecovery.needs_user_confirmation),
    provider_source: scanRecovery.provider_source || 'unresolved',
    suggested_hints: Array.isArray(scanRecovery.suggested_hints) ? scanRecovery.suggested_hints.filter(Boolean) : [],
    recommended_action: scanRecovery.recommended_action || 'review_before_logging'
  };
}

async function addCurrentAnalysisToMealLog() {
  if (!latestAnalysis || !currentFile) {
    showToast('Analyze a meal first', 'warning');
    return;
  }

  const shouldReview = Boolean(latestAnalysis.scan_recovery?.needs_user_confirmation);
  const hint = document.getElementById('manual-food-hint')?.value?.trim() || '';
  if (shouldReview && !hint) {
    showToast('Add an Optional Food Hint before logging this scan.', 'warning');
    focusHintField();
    return;
  }

  setLoading('log-meal-btn', true);
  try {
    const response = await foodAPI.analyzePhoto(buildAnalyzeFormData({
      auto_log: true,
      log_meal: true,
      mark_as_eaten: true
    }));

    const analysis = normalizeApiAnalysis(response);
    latestRawAnalysis = response;
    latestAnalysis = analysis;
    renderAnalysis(analysis);
    applyScannerState(SCANNER_STATES.RESULT);

    if (response?.meal_log) {
      removeMatchingLocalScan(analysis);
      await refreshScanHistoryFromBackend();
      renderScanHistory();
      window.dispatchEvent(new CustomEvent('fitlife:meal-logged', { detail: response.meal_log }));
    }

    showToast(response?.message || 'Meal logged successfully', 'success');
  } catch (error) {
    console.error('Meal log failed', error);
    renderScanError({
      message: error.message || 'Failed to log meal from scan',
      provider_error: error.payload?.provider_error || '',
      provider_notes: normalizeProviderNotes(error.payload?.provider_notes),
      status: error.status
    });
    if (error.status === 422) {
      focusHintField();
    }
    applyScannerState(SCANNER_STATES.ERROR);
  } finally {
    setLoading('log-meal-btn', false);
  }
}

function renderAnalysis(analysis) {
  const resultCard = document.getElementById('analysis-result-card');
  const foodName = document.getElementById('analysis-food-name');
  const serving = document.getElementById('analysis-serving');
  const confidence = document.getElementById('analysis-confidence');
  const macroGrid = document.getElementById('analysis-macro-grid');
  const feedback = document.getElementById('analysis-feedback');
  const tags = document.getElementById('analysis-tags');
  const logMealBtn = document.getElementById('log-meal-btn');

  if (foodName) foodName.textContent = analysis.food_name || 'Detected Meal';
  if (serving) serving.textContent = analysis.serving_estimate || '1 serving';
  if (confidence) {
    confidence.textContent = formatConfidence(analysis.confidence);
    confidence.className = `badge ${needsReviewBadge(analysis) ? 'badge-warning' : 'badge-accent'}`;
  }
  if (feedback) feedback.textContent = analysis.feedback || 'Balanced meal estimate ready.';
  if (logMealBtn) {
    logMealBtn.textContent = analysis.scan_recovery?.needs_user_confirmation ? 'Review & Mark as Eaten' : 'Add to Meal Log';
  }

  if (macroGrid) {
    macroGrid.innerHTML = [
      metricCardMarkup('Calories', `${Math.round(analysis.estimated_calories || 0)} kcal`, 'scanner-metric-primary'),
      metricCardMarkup('Protein', `${Number(analysis.protein_g || 0).toFixed(1)} g`),
      metricCardMarkup('Carbs', `${Number(analysis.carbs_g || 0).toFixed(1)} g`),
      metricCardMarkup('Fats', `${Number(analysis.fat_g || 0).toFixed(1)} g`)
    ].join('');
  }

  const providerNotes = (analysis.provider_notes || []).slice(0, 3);
  const noteItems = (analysis.notes || []).slice(0, 4);
  if (tags) {
    const combinedNotes = [
      ...(analysis.source ? [`Source: ${analysis.source}`] : []),
      ...providerNotes,
      ...(analysis.provider_error ? [`Provider: ${analysis.provider_error}`] : []),
      ...noteItems
    ].slice(0, 6);

    tags.innerHTML = combinedNotes.length
      ? combinedNotes.map((item) => `<span class="badge badge-info">${escapeHtml(item)}</span>`).join('')
      : '<span class="text-muted">No additional scan notes.</span>';
  }

  renderScanRecovery(analysis.scan_recovery);
  renderDietWarning(analysis.diet_warning);
  hideScanError();
  resultCard?.classList.remove('hidden');
}

function renderScanRecovery(scanRecovery) {
  const recoveryCard = document.getElementById('analysis-scan-recovery');
  const recoveryLabel = document.getElementById('analysis-recovery-label');
  const recoveryBadge = document.getElementById('analysis-recovery-badge');
  const recoveryTitle = document.getElementById('analysis-recovery-title');
  const recoveryMessage = document.getElementById('analysis-recovery-message');
  const recoverySuggestions = document.getElementById('analysis-recovery-suggestions');

  if (!recoveryCard || !recoveryLabel || !recoveryBadge || !recoveryTitle || !recoveryMessage || !recoverySuggestions) return;

  if (!scanRecovery) {
    recoveryCard.classList.add('hidden');
    return;
  }

  const needsReview = Boolean(scanRecovery.needs_user_confirmation);
  recoveryCard.classList.remove('hidden', 'scanner-warning-card-neutral', 'scanner-warning-card-alert', 'scanner-warning-card-success');
  recoveryCard.classList.add(needsReview ? 'scanner-warning-card-alert' : 'scanner-warning-card-neutral');
  recoveryLabel.textContent = needsReview ? 'Review Before Logging' : 'Scan Source';
  recoveryBadge.textContent = needsReview ? 'Needs confirmation' : (scanRecovery.provider_source || 'scanner');
  recoveryBadge.className = `badge ${needsReview ? 'badge-warning' : 'badge-info'}`;
  recoveryTitle.textContent = needsReview ? 'This scan needs a quick confirmation' : 'Scan source details';
  recoveryMessage.textContent = needsReview
    ? 'Add an Optional Food Hint and scan again if this is a packaged food or the label is unclear.'
    : `Provider source: ${scanRecovery.provider_source || 'scanner'}${scanRecovery.recommended_action ? ` · ${scanRecovery.recommended_action}` : ''}`;

  if (scanRecovery.suggested_hints.length) {
    recoverySuggestions.innerHTML = scanRecovery.suggested_hints.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    recoverySuggestions.classList.remove('hidden');
  } else {
    recoverySuggestions.innerHTML = '';
    recoverySuggestions.classList.add('hidden');
  }
}

function renderDietWarning(dietWarning) {
  const warningCard = document.getElementById('analysis-diet-warning');
  const warningLabel = document.getElementById('analysis-warning-label');
  const warningBadge = document.getElementById('analysis-warning-badge');
  const warningTitle = document.getElementById('analysis-warning-title');
  const warningMessage = document.getElementById('analysis-warning-message');
  const warningIssues = document.getElementById('analysis-warning-issues');

  if (!warningCard || !warningLabel || !warningBadge || !warningTitle || !warningMessage || !warningIssues) return;

  if (!dietWarning) {
    warningCard.classList.add('hidden');
    return;
  }

  const isWarning = Boolean(dietWarning.should_warn);
  warningCard.classList.remove('hidden', 'scanner-warning-card-neutral', 'scanner-warning-card-alert', 'scanner-warning-card-success');
  warningCard.classList.add(isWarning ? 'scanner-warning-card-alert' : 'scanner-warning-card-success');
  warningLabel.textContent = isWarning ? 'Diet Warning' : 'Goal Fit';
  warningBadge.textContent = isWarning ? 'Needs attention' : 'Goal Fit';
  warningBadge.className = `badge ${isWarning ? 'badge-warning' : 'badge-success'}`;
  warningTitle.textContent = dietWarning.title || (isWarning ? 'Diet warning' : 'Goal fit');
  warningMessage.textContent = dietWarning.message || '';

  const issues = Array.isArray(dietWarning.issues) ? dietWarning.issues : [];
  if (issues.length) {
    warningIssues.innerHTML = issues.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    warningIssues.classList.remove('hidden');
  } else {
    warningIssues.innerHTML = '';
    warningIssues.classList.add('hidden');
  }
}

function renderScanError(errorInfo) {
  const errorCard = document.getElementById('analysis-error-card');
  const errorTitle = document.getElementById('analysis-error-title');
  const errorMessage = document.getElementById('analysis-error-message');
  const errorMeta = document.getElementById('analysis-error-meta');

  hideAnalysisCard();

  if (!errorCard || !errorTitle || !errorMessage || !errorMeta) return;

  errorCard.classList.remove('hidden');
  errorTitle.textContent = errorInfo.status === 422 ? 'We could not confidently identify this food' : 'Scanner needs another try';
  errorMessage.textContent = errorInfo.message || 'Please retry with a clearer image.';

  const metaItems = [
    ...(errorInfo.provider_error ? [`Provider: ${errorInfo.provider_error}`] : []),
    ...((errorInfo.provider_notes || []).slice(0, 4))
  ];

  errorMeta.innerHTML = metaItems.length
    ? metaItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>Try a clearer image, capture the package name, or add a food hint like milkybar, kitkat, layerz cake, or lays.</li>';
}

function hideScanError() {
  document.getElementById('analysis-error-card')?.classList.add('hidden');
}

function hideAnalysisCard() {
  document.getElementById('analysis-result-card')?.classList.add('hidden');
  document.getElementById('analysis-scan-recovery')?.classList.add('hidden');
  document.getElementById('analysis-diet-warning')?.classList.add('hidden');
}

function resetResultPanels() {
  hideAnalysisCard();
  hideScanError();
}

function renderScanHistory() {
  const container = document.getElementById('scan-history-list');
  const count = document.getElementById('history-count');
  const history = getScanHistory();

  if (count) count.textContent = String(history.length);
  if (!container) return;

  if (!history.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">Scan</div>
        <div class="empty-state-title">No scans yet</div>
        <p class="empty-state-text">Your recent AI food scans will show up here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = history.map((item) => `
    <article class="scanner-history-item">
      <div class="scanner-history-thumb">
        <img src="${item.preview}" alt="${escapeHtml(item.food_name)}">
      </div>
      <div class="scanner-history-copy">
        <strong>${escapeHtml(item.food_name)}</strong>
        <p>${Math.round(item.estimated_calories || 0)} kcal · ${escapeHtml(item.serving_estimate || '1 serving')}</p>
        <span>${escapeHtml(item.scanned_at)}</span>
      </div>
    </article>
  `).join('');
}

function persistScanHistory(analysis, preview) {
  const history = getScanHistory();
  history.unshift({
    ...analysis,
    preview,
    scanned_at: new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  });
  localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
}

function getScanHistory() {
  try {
    return JSON.parse(localStorage.getItem(SCAN_HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveScanHistory(history) {
  localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(history));
}

async function getPersistentPreviewData() {
  if (currentFile) {
    try {
      return await fileToDataUrl(currentFile);
    } catch (error) {
      console.warn('Failed to store scan preview as data URL', error);
    }
  }

  return document.getElementById('preview-image')?.src || '';
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });
}

function handleHistoryActions(event) {
  const deleteButton = event.target.closest('[data-delete-scan]');
  if (!deleteButton) return;

  const scanId = deleteButton.getAttribute('data-delete-scan');
  if (!scanId) return;

  const nextHistory = getScanHistory().filter((item) => item.id !== scanId);
  saveScanHistory(nextHistory);
  renderScanHistory();
  showToast('Scan deleted', 'success');
}

function keepLastFiveScans() {
  const history = getScanHistory();
  if (history.length <= HISTORY_RETAIN_COUNT) {
    showToast('Only the newest scans are already kept', 'info');
    return;
  }

  saveScanHistory(history.slice(0, HISTORY_RETAIN_COUNT));
  renderScanHistory();
  showToast('Older scans cleared. Latest 5 kept.', 'success');
}

function clearAllScans() {
  if (!getScanHistory().length) {
    showToast('No scans to clear', 'info');
    return;
  }

  saveScanHistory([]);
  renderScanHistory();
  showToast('All scans cleared', 'success');
}

async function persistScanHistory(analysis) {
  const preview = await getPersistentPreviewData();
  const history = getScanHistory();
  history.unshift({
    id: `scan-${Date.now()}`,
    ...analysis,
    preview,
    scanned_at: new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  });
  saveScanHistory(history.slice(0, MAX_HISTORY_ITEMS));
}

function renderScanHistory() {
  const container = document.getElementById('scan-history-list');
  const count = document.getElementById('history-count');
  const history = getScanHistory();

  if (count) count.textContent = String(history.length);
  if (!container) return;

  if (!history.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">Scan</div>
        <div class="empty-state-title">No scans yet</div>
        <p class="empty-state-text">Your recent AI food scans will show up here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = history.map((item) => `
    <article class="scanner-history-item" data-scan-id="${escapeHtml(item.id || '')}">
      <div class="scanner-history-thumb">
        ${item.preview
          ? `<img src="${item.preview}" alt="${escapeHtml(item.food_name)}">`
          : '<div class="scanner-history-thumb-fallback">Scan</div>'}
      </div>
      <div class="scanner-history-copy">
        <strong>${escapeHtml(item.food_name)}</strong>
        <p>${Math.round(item.estimated_calories || 0)} kcal · ${escapeHtml(item.serving_estimate || '1 serving')}</p>
        <span>${escapeHtml(item.scanned_at)}</span>
      </div>
      <div class="scanner-history-actions">
        <button class="btn btn-ghost btn-sm scanner-history-delete" type="button" data-delete-scan="${escapeHtml(item.id || '')}">Delete</button>
      </div>
    </article>
  `).join('');
}

function focusHintAndReturnToPreview() {
  if (currentFile) {
    applyScannerState(SCANNER_STATES.PREVIEW);
  }
  focusHintField();
}

function focusHintField() {
  const hintField = document.getElementById('manual-food-hint');
  hintField?.focus();
  hintField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function scrollScannerIntoView() {
  document.getElementById('scanner-stage')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

function applyScannerState(state) {
  scannerState = state;
  const stage = document.getElementById('scanner-stage');
  if (stage) {
    stage.dataset.state = state;
  }

  const previewShouldShow = [SCANNER_STATES.PREVIEW, SCANNER_STATES.ANALYZING, SCANNER_STATES.RESULT, SCANNER_STATES.ERROR].includes(state);
  ['idle', 'camera', 'preview'].forEach((name) => {
    const isActive = name === 'preview' ? previewShouldShow : name === state;
    document.getElementById(`scanner-${name}`)?.classList.toggle('scanner-panel-active', isActive);
  });

  document.getElementById('cancel-camera-btn')?.classList.toggle('hidden', state !== SCANNER_STATES.CAMERA);
  document.getElementById('capture-photo-btn')?.classList.toggle('hidden', state !== SCANNER_STATES.CAMERA);
  document.getElementById('retake-photo-btn')?.classList.toggle('hidden', !previewShouldShow);
  document.getElementById('analyze-photo-btn')?.classList.toggle('hidden', ![SCANNER_STATES.PREVIEW, SCANNER_STATES.ERROR].includes(state));

  const resetScannerBtn = document.getElementById('reset-scanner-btn');
  if (resetScannerBtn) {
    resetScannerBtn.textContent = state === SCANNER_STATES.RESULT ? 'New Scan' : 'Reset Scanner';
  }

  toggleAnalyzing(state === SCANNER_STATES.ANALYZING);
}

function toggleAnalyzing(isAnalyzing) {
  document.getElementById('scanner-analyzing')?.classList.toggle('hidden', !isAnalyzing);
}

function clearPreview(resetInput = true) {
  currentFile = null;
  latestAnalysis = null;
  latestRawAnalysis = null;
  revokePreviewUrl();
  resetResultPanels();
  if (resetInput) {
    const fileInput = document.getElementById('food-file-input');
    if (fileInput) fileInput.value = '';
  }
}

function resetScanner() {
  stopCamera();
  clearPreview();
  applyScannerState(SCANNER_STATES.IDLE);
}

function metricCardMarkup(label, value, extraClass = '') {
  return `
    <div class="stat-card scanner-stat-card ${extraClass}">
      <div class="stat-label">${label}</div>
      <div class="stat-value scanner-metric-value">${value}</div>
    </div>
  `;
}

function refineAnalysisWithLibrary(analysis) {
  const profile = getCachedProfile();
  const goal = profile?.fitness_goal || 'maintenance';
  const hint = document.getElementById('manual-food-hint')?.value?.trim().toLowerCase() || '';
  const candidate = `${analysis.food_name} ${hint}`.toLowerCase();
  const match = NUTRITION_LIBRARY.find((item) => item.keywords.some((keyword) => candidate.includes(keyword)));

  const enriched = match ? applyNutritionLibraryMatch(analysis, match) : { ...analysis };
  enriched.feedback = buildGoalAwareFeedback(enriched, goal);
  return enriched;
}

function applyNutritionLibraryMatch(analysis, match) {
  const looksGeneric = analysis.estimated_calories <= 0
    || analysis.food_name === 'Detected Meal'
    || analysis.confidence === 'Estimated';

  const merged = {
    ...analysis,
    food_name: looksGeneric ? match.food_name : analysis.food_name,
    serving_estimate: analysis.serving_estimate === '1 serving' ? match.serving_estimate : analysis.serving_estimate,
    estimated_calories: looksGeneric ? match.estimated_calories : analysis.estimated_calories,
    protein_g: looksGeneric ? match.protein_g : analysis.protein_g,
    carbs_g: looksGeneric ? match.carbs_g : analysis.carbs_g,
    fat_g: looksGeneric ? match.fat_g : analysis.fat_g,
    notes: [...(analysis.notes || []), `Nutrition refined using known food profile for ${match.food_name}.`]
  };

  if (looksGeneric) {
    merged.feedback = `Estimated using your meal hint and known nutrition data for ${match.food_name}.`;
  }

  return merged;
}

function buildGoalAwareFeedback(analysis, goal) {
  if (goal === 'weight_loss') {
    return analysis.estimated_calories > 450
      ? 'This looks calorie-dense for a fat-loss goal. Balance it with protein, vegetables, and a lighter next meal.'
      : 'This fits a fat-loss goal better when paired with steady protein and portion control.';
  }

  if (goal === 'muscle_gain') {
    return analysis.protein_g >= 20
      ? 'Good protein support for muscle gain. Pair this with hydration and a balanced carb source.'
      : 'For muscle gain, consider adding a little more protein such as eggs, paneer, chicken, or curd.';
  }

  return analysis.estimated_calories <= 350
    ? 'This looks like a lighter balanced meal. Keep variety and hydration consistent through the day.'
    : 'This meal is workable for maintenance when balanced with activity and lighter meals later in the day.';
}

function getMergedScanHistory() {
  const hiddenIds = getHiddenScanIds();
  const localHistory = getScanHistory()
    .map((item) => ({
      ...item,
      source_type: item.source_type || 'local',
      sort_value: item.sort_value || Date.now()
    }))
    .filter((item) => !hiddenIds.includes(item.id));

  const remoteHistory = backendScanHistory
    .filter((item) => !hiddenIds.includes(item.id));

  return [...remoteHistory, ...localHistory]
    .sort((a, b) => (b.sort_value || 0) - (a.sort_value || 0))
    .slice(0, MAX_HISTORY_ITEMS);
}

function getHiddenScanIds() {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_SCAN_IDS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHiddenScanIds(ids) {
  localStorage.setItem(HIDDEN_SCAN_IDS_KEY, JSON.stringify(ids));
}

function removeMatchingLocalScan(analysis) {
  const history = getScanHistory();
  const matchIndex = history.findIndex((item) =>
    item.source_type !== 'backend'
    && item.food_name === analysis.food_name
    && Math.round(item.estimated_calories || 0) === Math.round(analysis.estimated_calories || 0)
  );

  if (matchIndex === -1) return;
  history.splice(matchIndex, 1);
  saveScanHistory(history);
}

async function refreshScanHistoryFromBackend() {
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return date.toISOString().split('T')[0];
  });

  const recentLogs = await Promise.all(dates.map(async (date) => {
    try {
      const data = await activityAPI.getDay(date);
      return Array.isArray(data?.logs) ? data.logs : [];
    } catch (error) {
      if (error.status !== 404) {
        console.warn('Failed to load backend scan history', { date, error });
      }
      return [];
    }
  }));

  backendScanHistory = recentLogs
    .flat()
    .filter((log) => log.log_type === 'meal')
    .map(normalizeBackendScanLog)
    .filter(Boolean)
    .sort((a, b) => (b.sort_value || 0) - (a.sort_value || 0));
}

function normalizeBackendScanLog(log) {
  const mediaUrl = log.thumbnail_url || log.image_url || '';

  return {
    id: `remote-${log.id}`,
    backend_id: log.id,
    source_type: 'backend',
    food_name: log.description || 'Logged Meal',
    serving_estimate: log.serving_estimate || '1 serving',
    estimated_calories: Number(log.calories_in || 0),
    preview: '',
    image_url: log.has_image ? mediaUrl : '',
    has_image: Boolean(log.has_image),
    scanned_at: formatBackendScanTime(log),
    sort_value: getBackendLogSortValue(log)
  };
}

function getBackendLogSortValue(log) {
  const candidate = log.logged_at || log.created_at || log.updated_at || log.log_date || '';
  const parsed = Date.parse(candidate);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function formatBackendScanTime(log) {
  const parsed = getBackendLogSortValue(log);
  return new Date(parsed).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function hydrateScanHistoryImages(container) {
  const images = Array.from(container.querySelectorAll('[data-scan-image]'));

  await Promise.all(images.map(async (img) => {
    const source = img.getAttribute('data-scan-image');
    if (!source) {
      applyScanImageFallback(img);
      return;
    }

    if (/^(data:|blob:)/i.test(source)) {
      img.addEventListener('error', () => applyScanImageFallback(img), { once: true });
      return;
    }

    try {
      img.src = await fetchAuthorizedImageObjectUrl(source);
      img.addEventListener('error', () => applyScanImageFallback(img), { once: true });
    } catch (error) {
      console.warn('Scan history image failed to load', { source, error });
      applyScanImageFallback(img);
    }
  }));
}

function applyScanImageFallback(img) {
  const wrapper = img.closest('.scanner-history-thumb');
  if (!wrapper) return;
  wrapper.innerHTML = '<div class="scanner-history-thumb-fallback">Scan</div>';
}

function handleHistoryActions(event) {
  const deleteButton = event.target.closest('[data-delete-scan]');
  if (!deleteButton) return;

  const scanId = deleteButton.getAttribute('data-delete-scan');
  if (!scanId) return;

  if (scanId.startsWith('remote-')) {
    const hiddenIds = getHiddenScanIds();
    if (!hiddenIds.includes(scanId)) {
      hiddenIds.push(scanId);
      saveHiddenScanIds(hiddenIds);
    }
  } else {
    const nextHistory = getScanHistory().filter((item) => item.id !== scanId);
    saveScanHistory(nextHistory);
  }

  renderScanHistory();
  showToast('Scan deleted', 'success');
}

function keepLastFiveScans() {
  const merged = getMergedScanHistory();
  if (merged.length <= HISTORY_RETAIN_COUNT) {
    showToast('Only the newest scans are already kept', 'info');
    return;
  }

  const keepIds = new Set(merged.slice(0, HISTORY_RETAIN_COUNT).map((item) => item.id));
  const localHistory = getScanHistory().filter((item) => keepIds.has(item.id));
  const remoteHiddenIds = backendScanHistory
    .filter((item) => !keepIds.has(item.id))
    .map((item) => item.id);

  saveScanHistory(localHistory);
  saveHiddenScanIds(remoteHiddenIds);
  renderScanHistory();
  showToast('Older scans cleared. Latest 5 kept.', 'success');
}

function clearAllScans() {
  const merged = getMergedScanHistory();
  if (!merged.length) {
    showToast('No scans to clear', 'info');
    return;
  }

  saveScanHistory([]);
  saveHiddenScanIds(backendScanHistory.map((item) => item.id));
  renderScanHistory();
  showToast('All scans cleared', 'success');
}

function renderScanHistory() {
  const container = document.getElementById('scan-history-list');
  const count = document.getElementById('history-count');
  const history = getMergedScanHistory();

  if (count) count.textContent = String(history.length);
  if (!container) return;

  if (!history.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">Scan</div>
        <div class="empty-state-title">No scans yet</div>
        <p class="empty-state-text">Your recent AI food scans will show up here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = history.map((item) => `
    <article class="scanner-history-item" data-scan-id="${escapeHtml(item.id || '')}">
      <div class="scanner-history-thumb">
        ${(item.preview || item.image_url)
          ? `<img data-scan-image="${escapeHtml(item.preview || item.image_url)}" src="${item.preview || ''}" alt="${escapeHtml(item.food_name)}">`
          : '<div class="scanner-history-thumb-fallback">Scan</div>'}
      </div>
      <div class="scanner-history-copy">
        <strong>${escapeHtml(item.food_name)}</strong>
        <p>${Math.round(item.estimated_calories || 0)} kcal · ${escapeHtml(item.serving_estimate || '1 serving')}</p>
        <span>${escapeHtml(item.scanned_at)}</span>
      </div>
      <div class="scanner-history-actions">
        <button class="btn btn-ghost btn-sm scanner-history-delete" type="button" data-delete-scan="${escapeHtml(item.id || '')}">Delete</button>
      </div>
    </article>
  `).join('');

  hydrateScanHistoryImages(container);
}

async function persistScanHistory(analysis) {
  const preview = await getPersistentPreviewData();
  const history = getScanHistory();
  history.unshift({
    id: `scan-${Date.now()}`,
    source_type: 'local',
    sort_value: Date.now(),
    ...analysis,
    preview,
    scanned_at: new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  });
  saveScanHistory(history.slice(0, MAX_HISTORY_ITEMS));
}

function needsReviewBadge(analysis) {
  return Boolean(analysis.scan_recovery?.needs_user_confirmation)
    || ['db_fallback', 'unresolved'].includes(analysis.scan_recovery?.provider_source);
}

function formatConfidence(confidence) {
  if (typeof confidence === 'number') {
    return `${Math.round(confidence)}% confidence`;
  }
  return String(confidence || 'Estimated');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

window.addEventListener('beforeunload', () => {
  stopCamera();
  revokePreviewUrl();
});
