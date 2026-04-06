const SCAN_HISTORY_KEY = 'fitlife_scan_history';
const MAX_HISTORY_ITEMS = 12;

let currentStream = null;
let currentFile = null;
let latestAnalysis = null;

document.addEventListener('DOMContentLoaded', () => {
  wireScannerActions();
  renderScanHistory();
  applyScannerState('idle');
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

  openCameraBtn?.addEventListener('click', startCamera);
  uploadPhotoBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', handleFileSelect);
  cancelCameraBtn?.addEventListener('click', resetScanner);
  retakePhotoBtn?.addEventListener('click', clearPreview);
  capturePhotoBtn?.addEventListener('click', capturePhoto);
  analyzePhotoBtn?.addEventListener('click', analyzeCurrentPhoto);
  resetScannerBtn?.addEventListener('click', resetScanner);
  logMealBtn?.addEventListener('click', addCurrentAnalysisToMealLog);
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showToast('Camera is not supported on this device', 'warning');
    return;
  }

  stopCamera();
  clearPreview(false);

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

    applyScannerState('camera');
  } catch (error) {
    console.error('Camera start failed', error);
    showToast('Unable to access camera. Try photo upload instead.', 'error');
    applyScannerState('idle');
  }
}

function stopCamera() {
  if (!currentStream) return;
  currentStream.getTracks().forEach(track => track.stop());
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
  hideAnalysisCard();
  stopCamera();

  const previewImage = document.getElementById('preview-image');
  if (previewImage) {
    previewImage.src = URL.createObjectURL(file);
  }

  applyScannerState('preview');
}

async function analyzeCurrentPhoto() {
  if (!currentFile) {
    showToast('Upload or capture a meal photo first', 'warning');
    return;
  }

  const formData = new FormData();
  formData.append('photo', currentFile);
  formData.append('meal_time', document.getElementById('meal-time-select')?.value || 'meal');
  formData.append('food_hint', document.getElementById('manual-food-hint')?.value?.trim() || '');

  toggleAnalyzing(true);
  setLoading('analyze-photo-btn', true);

  try {
    const response = await foodAPI.analyzePhoto(formData);
    latestAnalysis = response.analysis;
    renderAnalysis(response.analysis);
    persistScanHistory(response.analysis, document.getElementById('preview-image')?.src || '');
    renderScanHistory();
    showToast('Meal analyzed successfully', 'success');
  } catch (error) {
    console.error('Analyze photo failed', error);
    showToast(error.message || 'Could not analyze that meal photo', 'error');
  } finally {
    toggleAnalyzing(false);
    setLoading('analyze-photo-btn', false);
  }
}

async function addCurrentAnalysisToMealLog() {
  if (!latestAnalysis) {
    showToast('Analyze a meal first', 'warning');
    return;
  }

  const mealTime = document.getElementById('meal-time-select')?.value || 'meal';
  const description = `${capitalize(mealTime)}: ${latestAnalysis.food_name} (${latestAnalysis.serving_estimate})`;

  setLoading('log-meal-btn', true);
  try {
    await activityAPI.log({
      log_type: 'meal',
      description,
      calories_in: Math.round(latestAnalysis.estimated_calories || 0),
      log_date: todayDate()
    });
    showToast('Added to meal log', 'success');
  } catch (error) {
    console.error('Meal log failed', error);
    showToast(error.message || 'Failed to log meal', 'error');
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

  if (foodName) foodName.textContent = analysis.food_name || 'Detected Meal';
  if (serving) serving.textContent = analysis.serving_estimate || '1 serving';
  if (confidence) confidence.textContent = analysis.confidence || 'Estimated';
  if (feedback) feedback.textContent = analysis.feedback || 'Balanced meal estimate ready.';

  if (macroGrid) {
    macroGrid.innerHTML = [
      metricCardMarkup('Calories', `${Math.round(analysis.estimated_calories || 0)} kcal`),
      metricCardMarkup('Protein', `${Number(analysis.protein_g || 0).toFixed(1)} g`),
      metricCardMarkup('Carbs', `${Number(analysis.carbs_g || 0).toFixed(1)} g`),
      metricCardMarkup('Fat', `${Number(analysis.fat_g || 0).toFixed(1)} g`)
    ].join('');
  }

  const noteItems = (analysis.notes || []).slice(0, 5);
  if (tags) {
    tags.innerHTML = noteItems.length
      ? noteItems.map(item => `<span class="badge badge-info">${escapeHtml(item)}</span>`).join('')
      : '<span class="text-muted">No additional notes.</span>';
  }

  resultCard?.classList.remove('hidden');
}

function hideAnalysisCard() {
  document.getElementById('analysis-result-card')?.classList.add('hidden');
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
        <p class="empty-state-text">Your recent photo scans will show up here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = history.map(item => `
    <article class="scan-history-card">
      <img src="${item.preview}" alt="${escapeHtml(item.food_name)}" class="scan-history-image">
      <div class="scan-history-copy">
        <div class="scan-history-title">${escapeHtml(item.food_name)}</div>
        <div class="scan-history-meta">${Math.round(item.estimated_calories || 0)} kcal · ${escapeHtml(item.serving_estimate || '1 serving')}</div>
        <div class="scan-history-meta">${escapeHtml(item.scanned_at)}</div>
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

function toggleAnalyzing(isAnalyzing) {
  document.getElementById('scanner-analyzing')?.classList.toggle('hidden', !isAnalyzing);
}

function clearPreview(resetInput = true) {
  currentFile = null;
  latestAnalysis = null;
  hideAnalysisCard();
  toggleAnalyzing(false);
  if (resetInput) {
    const fileInput = document.getElementById('food-file-input');
    if (fileInput) fileInput.value = '';
  }
  applyScannerState('idle');
}

function resetScanner() {
  stopCamera();
  clearPreview();
}

function applyScannerState(state) {
  ['idle', 'camera', 'preview'].forEach(name => {
    document.getElementById(`scanner-${name}`)?.classList.toggle('scanner-panel-active', name === state);
  });

  document.getElementById('cancel-camera-btn')?.classList.toggle('hidden', state !== 'camera');
  document.getElementById('capture-photo-btn')?.classList.toggle('hidden', state !== 'camera');
  document.getElementById('retake-photo-btn')?.classList.toggle('hidden', state !== 'preview');
  document.getElementById('analyze-photo-btn')?.classList.toggle('hidden', state !== 'preview');
}

function metricCardMarkup(label, value) {
  return `
    <div class="stat-card scanner-metric-card">
      <div class="stat-label">${label}</div>
      <div class="stat-value scanner-metric-value">${value}</div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

window.addEventListener('beforeunload', stopCamera);
