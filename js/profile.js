// ──────────────────────────────────────────────────
// profile.js — Profile Step Form + Live BMI
// ──────────────────────────────────────────────────

let currentStep = 1;
const totalSteps = 3;

document.addEventListener('DOMContentLoaded', () => {
  setupStepNavigation();
  setupLiveBMI();
  setupSleepSlider();
  loadExistingProfile();
});

// ─── Step Navigation ─────────────────────────────
function setupStepNavigation() {
  const nextBtn = document.getElementById('next-btn');
  const prevBtn = document.getElementById('prev-btn');
  const saveBtn = document.getElementById('save-btn');
  const form = document.getElementById('profile-form');

  nextBtn.addEventListener('click', () => {
    if (validateStep(currentStep)) {
      goToStep(currentStep + 1);
    }
  });

  prevBtn.addEventListener('click', () => {
    goToStep(currentStep - 1);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;
    await saveProfile();
  });
}

function goToStep(step) {
  if (step < 1 || step > totalSteps) return;

  // Hide current
  document.getElementById(`step-${currentStep}`).classList.remove('active');
  document.getElementById(`step-dot-${currentStep}`).classList.remove('active');

  // Mark completed
  if (step > currentStep) {
    document.getElementById(`step-dot-${currentStep}`).classList.add('done');
    document.getElementById(`step-dot-${currentStep}`).textContent = '✓';
    if (currentStep < totalSteps) {
      document.getElementById(`step-line-${currentStep}`).classList.add('done');
    }
  } else {
    // Going back
    document.getElementById(`step-dot-${currentStep}`).classList.remove('done');
    document.getElementById(`step-dot-${currentStep}`).textContent = currentStep;
    if (currentStep > 1) {
      document.getElementById(`step-line-${currentStep - 1}`).classList.remove('done');
    }
  }

  currentStep = step;

  // Show new
  document.getElementById(`step-${currentStep}`).classList.remove('active');
  document.getElementById(`step-${currentStep}`).classList.add('active');
  document.getElementById(`step-dot-${currentStep}`).classList.add('active');

  // Toggle buttons
  const nextBtn = document.getElementById('next-btn');
  const prevBtn = document.getElementById('prev-btn');
  const saveBtn = document.getElementById('save-btn');

  prevBtn.style.display = currentStep === 1 ? 'none' : '';
  nextBtn.style.display = currentStep === totalSteps ? 'none' : '';
  saveBtn.style.display = currentStep === totalSteps ? '' : 'none';
}

// ─── Validation per step ─────────────────────────
function validateStep(step) {
  let valid = true;

  if (step === 1) {
    const age = document.getElementById('age').value;
    const gender = document.querySelector('input[name="gender"]:checked');

    if (!age || age < 10 || age > 120) {
      showFieldError('age', 'Enter a valid age (10–120)');
      valid = false;
    } else {
      clearFieldError('age');
    }

    if (!gender) {
      showFieldError('gender', 'Please select your gender');
      valid = false;
    } else {
      clearFieldError('gender');
    }
  }

  if (step === 2) {
    const height = document.getElementById('height').value;
    const weight = document.getElementById('weight').value;
    const activity = document.querySelector('input[name="activity_level"]:checked');

    if (!height || height < 50 || height > 280) {
      showFieldError('height', 'Enter a valid height (50–280 cm)');
      valid = false;
    } else { clearFieldError('height'); }

    if (!weight || weight < 10 || weight > 500) {
      showFieldError('weight', 'Enter a valid weight (10–500 kg)');
      valid = false;
    } else { clearFieldError('weight'); }

    if (!activity) {
      showFieldError('activity', 'Please select your activity level');
      valid = false;
    } else { clearFieldError('activity'); }
  }

  if (step === 3) {
    const goal = document.querySelector('input[name="fitness_goal"]:checked');
    if (!goal) {
      showFieldError('goal', 'Please select your fitness goal');
      valid = false;
    } else { clearFieldError('goal'); }
  }

  return valid;
}

// ─── Live BMI Calculator ─────────────────────────
function setupLiveBMI() {
  const heightEl = document.getElementById('height');
  const weightEl = document.getElementById('weight');

  const updateBMI = () => {
    const h = parseFloat(heightEl.value);
    const w = parseFloat(weightEl.value);
    const preview = document.getElementById('bmi-preview');

    if (h > 0 && w > 0) {
      const bmi = calculateBMI(h, w);
      const cat = getBMICategory(bmi);

      document.getElementById('live-bmi').textContent = bmi;
      document.getElementById('live-bmi-label').textContent = cat.label;
      document.getElementById('live-bmi-label').className = `badge badge-${cat.class}`;
      document.getElementById('live-bmi-icon').textContent = cat.icon;
      document.getElementById('live-bmi-msg').textContent = getBMIMessage(cat.label);
      preview.style.display = '';
    } else {
      preview.style.display = 'none';
    }
  };

  heightEl.addEventListener('input', updateBMI);
  weightEl.addEventListener('input', updateBMI);
}

function getBMIMessage(category) {
  const msgs = {
    'Underweight': 'You may need to increase your calorie intake. Consult a nutritionist.',
    'Normal':      'Great! You\'re in a healthy weight range. Keep it up!',
    'Overweight':  'Consider a balanced diet with moderate exercise.',
    'Obese':       'Please consult a healthcare professional for guidance.',
  };
  return msgs[category] || '';
}

// ─── Sleep Slider ────────────────────────────────
function setupSleepSlider() {
  const slider = document.getElementById('sleep');
  const display = document.getElementById('sleep-display');
  if (slider && display) {
    slider.addEventListener('input', () => {
      display.textContent = `${parseFloat(slider.value).toFixed(1)}`;
    });
  }
}

// ─── Load Existing Profile ───────────────────────
async function loadExistingProfile() {
  try {
    const data = await profileAPI.get();
    const p = data.profile;
    cacheProfile({
      ...p,
      bmi: p.bmi ?? data.bmi,
      daily_calories: p.daily_calories ?? data.daily_calories
    });

    // Step 1
    document.getElementById('age').value = p.age || '';
    if (p.gender) {
      const gRadio = document.getElementById(`gender-${p.gender}`);
      if (gRadio) gRadio.checked = true;
    }

    // Step 2
    document.getElementById('height').value = p.height_cm || '';
    document.getElementById('weight').value = p.weight_kg || '';
    if (p.activity_level) {
      const aRadio = document.getElementById(`act-${p.activity_level}`);
      if (aRadio) aRadio.checked = true;
    }
    if (p.sleep_hours != null) {
      document.getElementById('sleep').value = p.sleep_hours;
      document.getElementById('sleep-display').textContent = parseFloat(p.sleep_hours).toFixed(1);
    }

    // Step 3
    if (p.food_habits) {
      const fMap = { 'veg': 'food-veg', 'non-veg': 'food-nonveg', 'vegan': 'food-vegan', 'keto': 'food-keto', 'paleo': 'food-paleo' };
      const fRadio = document.getElementById(fMap[p.food_habits]);
      if (fRadio) fRadio.checked = true;
    }
    if (p.fitness_goal) {
      const gMap = { 'weight_loss': 'goal-loss', 'muscle_gain': 'goal-gain', 'maintenance': 'goal-maintain' };
      const gRadio = document.getElementById(gMap[p.fitness_goal]);
      if (gRadio) gRadio.checked = true;
    }

    // Trigger live BMI
    document.getElementById('height').dispatchEvent(new Event('input'));

    showToast('Profile loaded', 'info', 2000);
  } catch (err) {
    if (err.status === 404) {
      // No profile yet, that's fine
    } else {
      console.error('Failed to load profile:', err);
    }
  }
}

// ─── Save Profile ────────────────────────────────
async function saveProfile() {
  const body = {
    age: parseInt(document.getElementById('age').value),
    gender: document.querySelector('input[name="gender"]:checked')?.value,
    height_cm: parseFloat(document.getElementById('height').value),
    weight_kg: parseFloat(document.getElementById('weight').value),
    activity_level: document.querySelector('input[name="activity_level"]:checked')?.value,
    sleep_hours: parseFloat(document.getElementById('sleep').value),
    food_habits: document.querySelector('input[name="food_habits"]:checked')?.value || 'non-veg',
    fitness_goal: document.querySelector('input[name="fitness_goal"]:checked')?.value,
  };

  setLoading('save-btn', true);
  try {
    const data = await profileAPI.save(body);
    cacheProfile({
      ...body,
      bmi: data.bmi,
      daily_calories: data.daily_calories
    });
    showToast(`Profile saved! BMI: ${data.bmi} · Daily Calories: ${data.daily_calories} kcal`, 'success', 5000);
    setTimeout(() => window.location.href = 'dashboard.html', 2000);
  } catch (err) {
    if (err.errors) {
      Object.entries(err.errors).forEach(([field, msgs]) => {
        showFieldError(field, msgs[0]);
      });
    }
    showToast(err.message || 'Failed to save profile', 'error');
  } finally {
    setLoading('save-btn', false);
  }
}
