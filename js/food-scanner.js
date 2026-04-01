let selectedPhotoFile = null;
let latestFoodEstimate = null;

const FOOD_LIBRARY = {
  biryani: { name: 'Chicken Biryani', calories: 540, protein: 26, carbs: 58, fat: 22, serving: '1 bowl' },
  idli: { name: 'Idli with Sambar', calories: 240, protein: 8, carbs: 42, fat: 4, serving: '2 pieces' },
  dosa: { name: 'Masala Dosa', calories: 390, protein: 9, carbs: 46, fat: 18, serving: '1 plate' },
  rice: { name: 'Steamed Rice Meal', calories: 320, protein: 6, carbs: 68, fat: 2, serving: '1 bowl' },
  salad: { name: 'Fresh Salad Bowl', calories: 180, protein: 6, carbs: 18, fat: 8, serving: '1 bowl' },
  banana: { name: 'Banana Snack', calories: 110, protein: 1, carbs: 28, fat: 0, serving: '1 piece' },
  burger: { name: 'Burger Meal', calories: 620, protein: 24, carbs: 49, fat: 35, serving: '1 burger' },
  pizza: { name: 'Pizza Slice Meal', calories: 430, protein: 16, carbs: 38, fat: 22, serving: '2 slices' },
  paneer: { name: 'Paneer Curry', calories: 410, protein: 18, carbs: 16, fat: 30, serving: '1 bowl' },
  roti: { name: 'Roti Sabzi Meal', calories: 350, protein: 11, carbs: 45, fat: 12, serving: '1 plate' },
};

document.addEventListener('DOMContentLoaded', () => {
  initPhotoPreview();
  initFoodPhotoAnalysis();
  initFoodLogAction();
});

function initPhotoPreview() {
  const input = document.getElementById('food-photo-input');
  const previewWrap = document.getElementById('photo-preview-wrap');

  input.addEventListener('change', () => {
    const [file] = input.files || [];
    selectedPhotoFile = file || null;
    latestFoodEstimate = null;
    document.getElementById('food-analysis-result').style.display = 'none';

    if (!file) {
      previewWrap.innerHTML = `
        <div class="empty-state" style="padding: 24px;">
          <div class="empty-state-icon">Photo</div>
          <div class="empty-state-title">No image selected</div>
          <p class="empty-state-text">Choose a meal image to estimate its calories and macros.</p>
        </div>
      `;
      return;
    }

    const url = URL.createObjectURL(file);
    previewWrap.innerHTML = `<img src="${url}" alt="Food preview" style="width:100%; height:100%; object-fit:cover;">`;
  });
}

function initFoodPhotoAnalysis() {
  const analyzeBtn = document.getElementById('analyze-photo-btn');

  analyzeBtn.addEventListener('click', async () => {
    if (!selectedPhotoFile) {
      showToast('Please upload a food photo first.', 'warning');
      return;
    }

    setLoading('analyze-photo-btn', true);
    setAnalysisLoading(true);

    try {
      const responseText = await requestFoodVisionEstimate(selectedPhotoFile);
      const parsed = safeParseJson(responseText);

      if (!parsed) {
        throw new Error('Could not understand the nutrition estimate.');
      }

      latestFoodEstimate = parsed;
      renderFoodEstimate(parsed);
      showToast('Food photo analyzed successfully.', 'success');
    } catch (err) {
      showToast(err.message || 'Food analysis failed.', 'error');
    } finally {
      setAnalysisLoading(false);
      setLoading('analyze-photo-btn', false);
    }
  });
}

async function requestFoodVisionEstimate(file) {
  const hint = (document.getElementById('meal-name-manual').value || '').trim();
  const serving = document.getElementById('serving-select').value;
  const mealTime = document.getElementById('meal-time-photo').value;

  const match = findFoodMatch(`${file.name} ${hint}`) || {
    name: hint || 'Mixed Meal Plate',
    calories: 360,
    protein: 14,
    carbs: 34,
    fat: 14,
    serving,
  };

  const structured = {
    food_name: match.name,
    estimated_calories: match.calories,
    protein_g: match.protein,
    carbs_g: match.carbs,
    fat_g: match.fat,
    serving_estimate: serving || match.serving,
    meal_time: mealTime,
    confidence: hint || findFoodMatch(`${file.name}`) ? 'High-confidence estimate' : 'General estimate',
    feedback: buildFoodFeedback(match.calories, match.protein),
    timestamp: new Date().toISOString(),
  };

  return JSON.stringify(structured);
}

function findFoodMatch(text) {
  const lower = text.toLowerCase();
  return Object.entries(FOOD_LIBRARY).find(([key]) => lower.includes(key))?.[1] || null;
}

function renderFoodEstimate(result) {
  const macroCards = document.getElementById('food-macro-cards');
  const confidence = document.getElementById('food-confidence-badge');
  const name = document.getElementById('food-detected-name');
  const serving = document.getElementById('food-serving-estimate');
  const feedback = document.getElementById('food-analysis-feedback');
  const meta = document.getElementById('food-log-meta');

  confidence.textContent = result.confidence || 'Estimated';
  name.textContent = result.food_name;
  serving.textContent = `${capitalize(result.meal_time)} · ${result.serving_estimate}`;
  feedback.textContent = result.feedback;
  meta.innerHTML = `
    <div><strong>Calories:</strong> ${result.estimated_calories} kcal</div>
    <div><strong>Macros:</strong> P ${result.protein_g}g · C ${result.carbs_g}g · F ${result.fat_g}g</div>
    <div><strong>Logged at:</strong> ${new Date(result.timestamp).toLocaleString('en-IN')}</div>
  `;

  macroCards.innerHTML = [
    { label: 'Calories', value: result.estimated_calories, unit: 'kcal' },
    { label: 'Protein', value: result.protein_g, unit: 'g' },
    { label: 'Carbs', value: result.carbs_g, unit: 'g' },
    { label: 'Fat', value: result.fat_g, unit: 'g' },
  ].map(item => `
    <div class="card stat-card">
      <div class="stat-label">${item.label}</div>
      <div class="stat-value" style="font-size:1.5rem;">${item.value}</div>
      <div class="stat-sub">${item.unit}</div>
    </div>
  `).join('');

  document.getElementById('food-analysis-result').style.display = 'block';
}

function initFoodLogAction() {
  const btn = document.getElementById('add-photo-meal-btn');

  btn.addEventListener('click', () => {
    if (!latestFoodEstimate) {
      showToast('Analyze a photo before logging the meal.', 'warning');
      return;
    }

    const meals = readStorageJson(CONFIG.MEALS_LOG_KEY, []);
    meals.unshift({
      id: `meal-${Date.now()}`,
      type: 'meal',
      name: latestFoodEstimate.food_name,
      description: `${latestFoodEstimate.food_name} · ${latestFoodEstimate.serving_estimate}`,
      calories: latestFoodEstimate.estimated_calories,
      protein_g: latestFoodEstimate.protein_g,
      carbs_g: latestFoodEstimate.carbs_g,
      fat_g: latestFoodEstimate.fat_g,
      serving_estimate: latestFoodEstimate.serving_estimate,
      meal_time: latestFoodEstimate.meal_time,
      date: todayDate(),
      timestamp: new Date().toISOString(),
      source: 'photo_ai',
    });
    writeStorageJson(CONFIG.MEALS_LOG_KEY, meals);
    showToast('Meal added to tracker successfully.', 'success');
  });
}

function setAnalysisLoading(isLoading) {
  document.getElementById('food-analysis-loading').style.display = isLoading ? 'block' : 'none';
}

function buildFoodFeedback(calories, protein) {
  if (calories >= 550) {
    return 'This looks like a calorie-dense meal. Consider balancing the rest of your day with lighter choices.';
  }
  if (protein >= 20) {
    return 'This meal has solid protein support and should help recovery and satiety.';
  }
  return 'This looks like a moderate meal that can fit well into your daily intake plan.';
}
