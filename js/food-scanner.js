const SCAN_HISTORY_KEY = 'fitlife_scan_history';
const MAX_HISTORY_ITEMS = 12;

let currentStream = null;
let currentFile = null;
let latestAnalysis = null;

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
  { keywords: ['noodles'], food_name: 'Noodles', serving_estimate: '1 bowl', estimated_calories: 380, protein_g: 10, carbs_g: 56, fat_g: 12 }
];

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
    const analysis = normalizeApiAnalysis(response);
    latestAnalysis = analysis;
    renderAnalysis(analysis);
    persistScanHistory(analysis, document.getElementById('preview-image')?.src || '');
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

function normalizeApiAnalysis(response) {
  const analysis = response?.analysis || response?.food || response;
  const dietWarning = response?.analysis?.diet_warning || response?.food?.diet_warning || analysis?.diet_warning || null;

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
    diet_warning: normalizeDietWarning(dietWarning),
  };

  return refineAnalysisWithLibrary(normalized);
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
  const warningCard = document.getElementById('analysis-diet-warning');
  const warningLabel = document.getElementById('analysis-warning-label');
  const warningBadge = document.getElementById('analysis-warning-badge');
  const warningTitle = document.getElementById('analysis-warning-title');
  const warningMessage = document.getElementById('analysis-warning-message');
  const warningIssues = document.getElementById('analysis-warning-issues');

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

  renderDietWarning(analysis.diet_warning, {
    warningCard,
    warningLabel,
    warningBadge,
    warningTitle,
    warningMessage,
    warningIssues
  });

  resultCard?.classList.remove('hidden');
}

function hideAnalysisCard() {
  document.getElementById('analysis-result-card')?.classList.add('hidden');
  document.getElementById('analysis-diet-warning')?.classList.add('hidden');
}

function renderDietWarning(dietWarning, elements) {
  const { warningCard, warningLabel, warningBadge, warningTitle, warningMessage, warningIssues } = elements;
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

window.addEventListener('beforeunload', stopCamera);
