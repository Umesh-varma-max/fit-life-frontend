// food-scanner.js - Food intake analysis with calorie estimate and feedback

let selectedFood = null;

document.addEventListener('DOMContentLoaded', () => {
  initFoodTabs();
  initSearch();
  initBarcode();
  initDetailActions();
});

function initFoodTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(item => item.classList.remove('active'));
      contents.forEach(item => item.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(`content-${tab.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });
}

function initSearch() {
  const input = document.getElementById('food-search');
  const debouncedSearch = debounce(async query => {
    if (query.length < 2) {
      document.getElementById('search-results').style.display = 'none';
      document.getElementById('food-empty').style.display = 'block';
      return;
    }

    try {
      const data = await foodAPI.search(query);
      renderSearchResults(data.results || []);
    } catch (err) {
      showToast('Search failed', 'error');
      console.error(err);
    }
  }, 400);

  input.addEventListener('input', () => {
    debouncedSearch(input.value.trim());
  });
}

function renderSearchResults(results) {
  const container = document.getElementById('search-results');
  const list = document.getElementById('results-list');
  const count = document.getElementById('results-count');
  const empty = document.getElementById('food-empty');

  if (results.length === 0) {
    container.style.display = 'block';
    empty.style.display = 'none';
    count.textContent = '0';
    list.innerHTML = `
      <div class="empty-state" style="padding: 32px;">
        <div class="empty-state-icon">0</div>
        <div class="empty-state-title">No foods found</div>
        <p class="empty-state-text">Try another food name or a different spelling.</p>
      </div>
    `;
    return;
  }

  container.style.display = 'block';
  empty.style.display = 'none';
  count.textContent = results.length;

  list.innerHTML = results.map(food => `
    <div class="food-result-item hover-lift" style="display: flex; align-items: center; gap: 16px; padding: 16px; border-bottom: 1px solid var(--border); cursor: pointer; transition: var(--transition);">
      <div style="font-size: 1.5rem;">Meal</div>
      <div style="flex: 1;">
        <div style="font-weight: 600; color: var(--text);">${escapeHtml(food.name)}</div>
        <div class="text-muted" style="font-size: 0.85rem;">
          ${food.calories_per_100g} kcal / 100g · P ${food.protein_g}g · C ${food.carbs_g}g · F ${food.fat_g}g
          ${food.fiber_g ? ` · Fiber ${food.fiber_g}g` : ''}
        </div>
      </div>
      <button class="btn btn-outline btn-sm select-food-btn" data-food='${JSON.stringify(food).replace(/'/g, '&#39;')}'>Analyze</button>
    </div>
  `).join('');

  list.querySelectorAll('.select-food-btn').forEach(btn => {
    btn.addEventListener('click', event => {
      event.stopPropagation();
      showFoodDetail(JSON.parse(btn.dataset.food));
    });
  });

  list.querySelectorAll('.food-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const btn = item.querySelector('.select-food-btn');
      if (!btn) return;
      showFoodDetail(JSON.parse(btn.dataset.food));
    });
  });
}

function initBarcode() {
  const scanBtn = document.getElementById('scan-btn');
  scanBtn.addEventListener('click', async () => {
    const barcode = document.getElementById('barcode-input').value.trim();
    if (!barcode) {
      showToast('Please enter a barcode number', 'warning');
      return;
    }

    setLoading('scan-btn', true);
    try {
      const data = await foodAPI.barcode({
        barcode,
        quantity_g: getSelectedQuantity(),
        meal_time: getSelectedMealTime(),
      });
      if (data.food) {
        showFoodDetail(data.food, true);
        showToast('Food found and analyzed', 'success');
      } else {
        showToast('No food found for this barcode', 'warning');
      }
    } catch (err) {
      showToast(err.message || 'Barcode scan failed', 'error');
    } finally {
      setLoading('scan-btn', false);
    }
  });
}

function showFoodDetail(food, fromBarcode = false) {
  const detail = document.getElementById('food-detail');
  const nameEl = document.getElementById('detail-name');
  const grid = document.getElementById('nutrition-grid');
  const summary = document.getElementById('intake-summary');

  selectedFood = normalizeFood(food, fromBarcode);
  nameEl.textContent = selectedFood.name || 'Food Item';

  summary.innerHTML = `
    <div class="card-grid card-grid-4">
      <div class="card stat-card" style="padding: 16px;">
        <div class="stat-label">Quantity</div>
        <div class="stat-value" style="font-size: 1.35rem;">${selectedFood.quantity_g}g</div>
        <div class="stat-sub">${capitalize(selectedFood.meal_time)}</div>
      </div>
      <div class="card stat-card" style="padding: 16px;">
        <div class="stat-label">Estimated Calories</div>
        <div class="stat-value" style="font-size: 1.35rem;">${selectedFood.estimated_calories}</div>
        <div class="stat-sub">for this intake</div>
      </div>
      <div class="card stat-card" style="padding: 16px;">
        <div class="stat-label">Macro Split</div>
        <div class="stat-value" style="font-size: 1.1rem;">P ${selectedFood.protein_g_for_quantity}g</div>
        <div class="stat-sub">C ${selectedFood.carbs_g_for_quantity}g · F ${selectedFood.fat_g_for_quantity}g</div>
      </div>
      <div class="card stat-card" style="padding: 16px;">
        <div class="stat-label">Detected By</div>
        <div class="stat-value" style="font-size: 1rem;">${formatMatch(selectedFood.matched_by, fromBarcode)}</div>
        <div class="stat-sub">${selectedFood.source}</div>
      </div>
    </div>
  `;

  const nutrients = [
    { label: 'Calories / 100g', value: selectedFood.calories_per_100g, unit: 'kcal', icon: 'Heat' },
    { label: 'Protein', value: selectedFood.protein_g, unit: 'g', icon: 'P' },
    { label: 'Carbs', value: selectedFood.carbs_g, unit: 'g', icon: 'C' },
    { label: 'Fat', value: selectedFood.fat_g, unit: 'g', icon: 'F' },
  ];

  if (selectedFood.fiber_g) {
    nutrients.push({ label: 'Fiber', value: selectedFood.fiber_g, unit: 'g', icon: 'Fi' });
  }

  nutrients.push({ label: 'Meal Calories', value: selectedFood.estimated_calories, unit: 'kcal', icon: 'Now' });

  grid.innerHTML = nutrients.map(item => `
    <div class="card stat-card hover-lift" style="padding: 16px;">
      <div style="font-size: 1.1rem; margin-bottom: 6px; font-weight: 700;">${item.icon}</div>
      <div class="stat-value" style="font-size: 1.3rem;">${item.value}</div>
      <div class="stat-sub">${item.unit} ${item.label}</div>
    </div>
  `).join('');

  renderFoodFeedback(selectedFood);
  detail.style.display = 'block';
  detail.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function initDetailActions() {
  const addBtn = document.getElementById('add-to-log-btn');
  const closeBtn = document.getElementById('close-detail-btn');

  addBtn.addEventListener('click', async () => {
    if (!selectedFood) return;

    setLoading('add-to-log-btn', true);
    try {
      const data = await foodAPI.barcode({
        barcode: selectedFood.barcode || '',
        food_name: selectedFood.name,
        quantity_g: getSelectedQuantity(),
        meal_time: getSelectedMealTime(),
        log_meal: true,
        log_date: todayDate(),
      });

      if (data.food) {
        selectedFood = normalizeFood(data.food, selectedFood.matched_by === 'barcode');
      }

      showToast(`${selectedFood.name} added to today's intake`, 'success');
      document.getElementById('food-detail').style.display = 'none';
      selectedFood = null;
    } catch (err) {
      showToast(err.message || 'Failed to add intake', 'error');
    } finally {
      setLoading('add-to-log-btn', false);
    }
  });

  closeBtn.addEventListener('click', () => {
    document.getElementById('food-detail').style.display = 'none';
    selectedFood = null;
  });
}

function normalizeFood(food, fromBarcode = false) {
  const quantity = Number(food.quantity_g || getSelectedQuantity());
  const calories = food.estimated_calories != null ? Number(food.estimated_calories) : scaleValue(food.calories_per_100g || 0, quantity);
  const protein = food.protein_g_for_quantity != null ? Number(food.protein_g_for_quantity) : scaleValue(food.protein_g || 0, quantity);
  const carbs = food.carbs_g_for_quantity != null ? Number(food.carbs_g_for_quantity) : scaleValue(food.carbs_g || 0, quantity);
  const fat = food.fat_g_for_quantity != null ? Number(food.fat_g_for_quantity) : scaleValue(food.fat_g || 0, quantity);
  const fiber = food.fiber_g_for_quantity != null ? Number(food.fiber_g_for_quantity) : scaleValue(food.fiber_g || 0, quantity);

  return {
    ...food,
    quantity_g: quantity,
    meal_time: food.meal_time || getSelectedMealTime(),
    estimated_calories: calories,
    protein_g_for_quantity: protein,
    carbs_g_for_quantity: carbs,
    fat_g_for_quantity: fat,
    fiber_g_for_quantity: fiber,
    matched_by: food.matched_by || (fromBarcode ? 'barcode' : 'search'),
    source: food.source || 'Food DB',
    feedback: food.feedback || buildFallbackFeedback({ calories, protein, fiber }),
  };
}

function renderFoodFeedback(food) {
  const badge = document.getElementById('food-feedback-badge');
  const title = document.getElementById('food-feedback-title');
  const text = document.getElementById('food-feedback-text');

  let level = 'Moderate';
  let badgeClass = 'badge-accent';
  let heading = 'Balanced intake';

  if (food.estimated_calories >= 500) {
    level = 'Heavy';
    badgeClass = 'badge-warning';
    heading = 'Higher calorie intake';
  } else if (food.estimated_calories <= 150) {
    level = 'Light';
    badgeClass = 'badge-success';
    heading = 'Light intake';
  }

  badge.className = `badge ${badgeClass}`;
  badge.textContent = level;
  title.textContent = heading;
  text.textContent = food.feedback;
}

function buildFallbackFeedback(data) {
  if (data.protein >= 20 && data.calories <= 400) {
    return 'Strong protein choice. This supports recovery and helps you stay full longer.';
  }
  if (data.fiber >= 5 && data.calories <= 300) {
    return 'Fiber-rich intake. This is a nice choice for satiety and steadier digestion.';
  }
  if (data.calories >= 500) {
    return 'This is a calorie-dense intake. Pair it with lighter meals later in the day if needed.';
  }
  if (data.calories <= 150) {
    return 'This is a light intake. It works well as a snack or a small add-on meal.';
  }
  return 'This is a balanced intake that fits well into regular calorie tracking.';
}

function getSelectedQuantity() {
  const value = parseInt(document.getElementById('quantity-input')?.value, 10);
  return Number.isFinite(value) && value > 0 ? value : 100;
}

function getSelectedMealTime() {
  return document.getElementById('meal-time-select')?.value || 'meal';
}

function scaleValue(per100g, quantity) {
  return Math.round((((Number(per100g) || 0) * quantity) / 100) * 10) / 10;
}

function formatMatch(matchedBy, fromBarcode) {
  if (matchedBy === 'barcode' || fromBarcode) return 'Barcode';
  if (matchedBy === 'name_exact') return 'Exact Name';
  if (matchedBy === 'name_partial') return 'Similar Match';
  return 'Food Search';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
