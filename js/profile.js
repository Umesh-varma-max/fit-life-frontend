let currentStep = 1;
const totalSteps = 6;
let heightUnit = 'cm';
let hasSavedProfile = false;

document.addEventListener('DOMContentLoaded', () => {
  setupStepNavigation();
  setupNumericControls();
  setupHeightUnitToggle();
  setupProfileModeControls();
  loadExistingProfile();
  syncAllDisplays();
});

function setupStepNavigation() {
  document.querySelectorAll('[data-next-step]').forEach((button) => {
    button.addEventListener('click', () => {
      if (validateStep(currentStep)) goToStep(currentStep + 1);
    });
  });

  document.querySelectorAll('[data-prev-step]').forEach((button) => {
    button.addEventListener('click', () => goToStep(currentStep - 1));
  });

  const prevTop = document.getElementById('prev-btn');
  prevTop?.addEventListener('click', () => {
    if (currentStep === 1) {
      window.location.href = 'dashboard.html';
      return;
    }
    goToStep(currentStep - 1);
  });

  document.getElementById('next-btn')?.addEventListener('click', () => {
    if (validateStep(currentStep)) goToStep(currentStep + 1);
  });

  document.getElementById('profile-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateStep(currentStep)) return;
    await saveProfile();
  });
}

function setupProfileModeControls() {
  document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
    showProfileEditor();
  });

  document.getElementById('back-dashboard-btn')?.addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });

  document.getElementById('profile-mode-btn')?.addEventListener('click', () => {
    if (hasSavedProfile && !isEditorVisible()) {
      showProfileEditor();
      return;
    }
    if (hasSavedProfile) {
      showProfileSummary();
    }
  });
}

function goToStep(step) {
  if (step < 1 || step > totalSteps) return;

  document.getElementById(`step-${currentStep}`)?.classList.remove('active');
  currentStep = step;
  document.getElementById(`step-${currentStep}`)?.classList.add('active');

  const label = document.getElementById('screen-label');
  if (label) {
    label.textContent = document.getElementById(`step-${currentStep}`)?.dataset.label || 'Profile Setup';
  }

  const prevTop = document.getElementById('prev-btn');
  if (prevTop) {
    prevTop.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
  }
}

function isEditorVisible() {
  return !document.getElementById('profile-form')?.classList.contains('onboarding-hidden');
}

function showProfileSummary() {
  document.getElementById('profile-summary')?.classList.remove('onboarding-hidden');
  document.getElementById('profile-form')?.classList.add('onboarding-hidden');
  document.getElementById('screen-label').textContent = 'Health Profile';
  document.getElementById('prev-btn').style.visibility = 'hidden';
  const modeBtn = document.getElementById('profile-mode-btn');
  if (modeBtn) {
    modeBtn.classList.remove('onboarding-hidden');
    modeBtn.textContent = 'Edit';
  }
}

function showProfileEditor() {
  document.getElementById('profile-summary')?.classList.add('onboarding-hidden');
  document.getElementById('profile-form')?.classList.remove('onboarding-hidden');
  document.getElementById('screen-label').textContent = document.getElementById(`step-${currentStep}`)?.dataset.label || 'Profile Setup';
  document.getElementById('prev-btn').style.visibility = currentStep === 1 ? 'hidden' : 'visible';
  const modeBtn = document.getElementById('profile-mode-btn');
  if (modeBtn) {
    modeBtn.classList.remove('onboarding-hidden');
    modeBtn.textContent = 'Done';
  }
}

function validateStep(step) {
  let valid = true;

  if (step === 1) {
    const gender = document.querySelector('input[name="gender"]:checked');
    if (!gender) {
      showFieldError('gender', 'Please select your gender');
      valid = false;
    } else {
      clearFieldError('gender');
    }
  }

  if (step === 2) {
    const age = Number(document.getElementById('age')?.value);
    if (!age || age < 10 || age > 120) {
      showFieldError('age', 'Enter a valid age between 10 and 120');
      valid = false;
    } else {
      clearFieldError('age');
    }
  }

  if (step === 3) {
    const weight = Number(document.getElementById('weight')?.value);
    if (!weight || weight < 30 || weight > 200) {
      showFieldError('weight', 'Enter a valid weight between 30 and 200 kg');
      valid = false;
    } else {
      clearFieldError('weight');
    }
  }

  if (step === 4) {
    const height = Number(document.getElementById('height')?.value);
    if (!height || height < 50 || height > 280) {
      showFieldError('height', 'Enter a valid height between 50 and 280 cm');
      valid = false;
    } else {
      clearFieldError('height');
    }
  }

  if (step === 5) {
    const activity = document.querySelector('input[name="activity_level"]:checked');
    if (!activity) {
      showFieldError('activity', 'Please select your activity level');
      valid = false;
    } else {
      clearFieldError('activity');
    }
  }

  if (step === 6) {
    const goal = document.querySelector('input[name="fitness_goal"]:checked');
    if (!goal) {
      showFieldError('goal', 'Please choose a goal');
      valid = false;
    } else {
      clearFieldError('goal');
    }
  }

  return valid;
}

function setupNumericControls() {
  document.querySelectorAll('[data-adjust]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.adjust;
      const delta = Number(button.dataset.delta || 0);
      if (!target || !delta) return;

      const input = document.getElementById(target);
      if (!input) return;

      const min = Number(input.min || 0);
      const max = Number(input.max || 999);
      const current = Number(input.value || min || 0);
      let nextValue = current;

      if (target === 'height' && heightUnit === 'ft') {
        nextValue = current + (delta * 2.54);
      } else {
        nextValue = current + delta;
      }

      nextValue = Math.min(max, Math.max(min, Math.round(nextValue)));
      input.value = nextValue;
      syncAllDisplays();
    });
  });
}

function setupHeightUnitToggle() {
  document.querySelectorAll('[data-height-unit]').forEach((button) => {
    button.addEventListener('click', () => {
      heightUnit = button.dataset.heightUnit === 'ft' ? 'ft' : 'cm';
      document.querySelectorAll('[data-height-unit]').forEach((toggle) => {
        toggle.classList.toggle('active', toggle === button);
      });
      syncHeightDisplay();
    });
  });
}

function syncAllDisplays() {
  syncAgeDisplay();
  syncWeightDisplay();
  syncHeightDisplay();
}

function syncAgeDisplay() {
  const age = Number(document.getElementById('age')?.value || 31);
  setText('age-preview-prev', Math.max(10, age - 1));
  setText('age-preview-current', age);
  setText('age-preview-next', Math.min(120, age + 1));
  setText('age-stepper-display', age);
}

function syncWeightDisplay() {
  const weight = Number(document.getElementById('weight')?.value || 65);
  setText('weight-display', weight);
}

function syncHeightDisplay() {
  const heightCm = Number(document.getElementById('height')?.value || 170);
  const primary = document.getElementById('height-display');
  const secondary = document.getElementById('height-stepper-display');
  const unitLabel = document.getElementById('height-unit-label');
  const stepperUnit = document.getElementById('height-stepper-unit');

  if (heightUnit === 'ft') {
    const totalInches = heightCm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    const formatted = `${feet}.${inches}`;
    if (primary) primary.textContent = formatted;
    if (secondary) secondary.textContent = formatted;
    if (unitLabel) unitLabel.textContent = 'ft';
    if (stepperUnit) stepperUnit.textContent = 'ft';
  } else {
    if (primary) primary.textContent = String(Math.round(heightCm));
    if (secondary) secondary.textContent = String(Math.round(heightCm));
    if (unitLabel) unitLabel.textContent = 'cm';
    if (stepperUnit) stepperUnit.textContent = 'cm';
  }
}

async function loadExistingProfile() {
  try {
    const data = await profileAPI.get();
    const profile = enrichProfileMetrics({
      ...data.profile,
      bmi: data.profile.bmi ?? data.bmi,
      body_fat_percentage: data.profile.body_fat_percentage ?? data.body_fat_percentage,
      body_fat_category: data.profile.body_fat_category ?? data.body_fat_category,
      bfp_case: data.profile.body_fat_category ?? data.body_fat_category,
      daily_calories: data.profile.daily_calories ?? data.daily_calories
    });
    hasSavedProfile = true;

    cacheProfile(profile);

    if (profile.age) document.getElementById('age').value = profile.age;
    if (profile.height_cm) document.getElementById('height').value = Math.round(profile.height_cm);
    if (profile.weight_kg) document.getElementById('weight').value = Math.round(profile.weight_kg);
    if (profile.sleep_hours != null) document.getElementById('sleep').value = profile.sleep_hours;

    const genderMap = { male: 'gender-male', female: 'gender-female' };
    const genderRadio = document.getElementById(genderMap[profile.gender] || '');
    if (genderRadio) genderRadio.checked = true;

    const activityMap = {
      sedentary: 'activity-beginner',
      light: 'activity-beginner',
      moderate: 'activity-intermediate',
      active: 'activity-advanced',
      very_active: 'activity-advanced'
    };
    const activityRadio = document.getElementById(activityMap[profile.activity_level] || '');
    if (activityRadio) activityRadio.checked = true;

    const goalMap = {
      weight_loss: 'goal-loss',
      muscle_gain: 'goal-gain',
      maintenance: 'goal-fitter'
    };
    const goalRadio = document.getElementById(goalMap[profile.fitness_goal] || '');
    if (goalRadio) goalRadio.checked = true;

    syncAllDisplays();
    renderProfileSummary(profile);
    showProfileSummary();
  } catch (error) {
    if (error.status !== 404) {
      console.error('Failed to load profile:', error);
    }
    showProfileEditor();
  }
}

async function saveProfile() {
  const body = {
    age: parseInt(document.getElementById('age').value, 10),
    gender: document.querySelector('input[name="gender"]:checked')?.value,
    height_cm: parseFloat(document.getElementById('height').value),
    weight_kg: parseFloat(document.getElementById('weight').value),
    activity_level: document.querySelector('input[name="activity_level"]:checked')?.value,
    sleep_hours: parseFloat(document.getElementById('sleep').value || '7'),
    food_habits: document.querySelector('input[name="food_habits"]')?.value || 'non-veg',
    fitness_goal: document.querySelector('input[name="fitness_goal"]:checked')?.value,
  };

  setLoading('save-btn', true);
  try {
    const data = await profileAPI.save(body);
    const enrichedProfile = enrichProfileMetrics({
      ...body,
      bmi: data.bmi,
      body_fat_percentage: data.body_fat_percentage,
      body_fat_category: data.body_fat_category,
      bfp_case: data.body_fat_category,
      daily_calories: data.daily_calories
    });
    cacheProfile(enrichedProfile);
    hasSavedProfile = true;
    renderProfileSummary(enrichedProfile);
    try {
      await workoutAPI.getPlan();
    } catch (workoutError) {
      console.error('Failed to refresh workout plan after profile save:', workoutError);
    }
    showToast(`Profile saved! BMI: ${data.bmi} · Daily Calories: ${data.daily_calories} kcal`, 'success', 4000);
    setTimeout(() => {
      showProfileSummary();
    }, 500);
  } catch (error) {
    if (error.errors) {
      Object.entries(error.errors).forEach(([field, messages]) => {
        const fieldMap = {
          activity_level: 'activity',
          fitness_goal: 'goal'
        };
        showFieldError(fieldMap[field] || field, messages[0]);
      });
    }
    showToast(error.message || 'Failed to save profile', 'error');
  } finally {
    setLoading('save-btn', false);
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value);
}

function renderProfileSummary(profile) {
  setText('summary-bmi', profile.bmi ? Number(profile.bmi).toFixed(1) : '--');
  setText('summary-bmi-label', profile.bmi ? getBMICategory(profile.bmi).label : 'BMI');
  setText('summary-goal', profile.goal_label || formatEnumLabel(profile.fitness_goal || 'maintenance'));
  setText('summary-bfp', profile.body_fat_percentage ? `${Number(profile.body_fat_percentage).toFixed(1)}%` : '--');
  setText('summary-gender', formatEnumLabel(profile.gender || '--'));
  setText('summary-age', profile.age ? `${profile.age} years` : '--');
  setText('summary-weight', profile.weight_kg ? `${Math.round(profile.weight_kg)} kg` : '--');
  setText('summary-height', profile.height_cm ? `${Math.round(profile.height_cm)} cm` : '--');
  setText('summary-calories', profile.daily_calories ? `${formatNumber(Number(profile.daily_calories))} kcal` : '--');

  const goalCopy = document.getElementById('summary-goal-copy');
  if (goalCopy) {
    const copyMap = {
      weight_loss: 'Lean meals and steady movement plans are tuned for fat loss.',
      muscle_gain: 'Protein-first meals and strength routines are tuned for muscle gain.',
      maintenance: 'Balanced workouts and recovery guidance are tuned for everyday fitness.'
    };
    goalCopy.textContent = copyMap[profile.fitness_goal] || copyMap.maintenance;
  }

  const bfpCopy = document.getElementById('summary-bfp-copy');
  if (bfpCopy) {
    const bodyFatCategory = profile.body_fat_category || profile.bfp_case;
    bfpCopy.textContent = bodyFatCategory
      ? `Current body-fat category: ${bodyFatCategory}. This helps adapt your workout volume and pacing.`
      : 'Calculated from your current profile to fine-tune workout intensity.';
  }
}

function enrichProfileMetrics(profile) {
  const enriched = { ...profile };
  const bmi = Number(enriched.bmi || calculateBMI(enriched.height_cm, enriched.weight_kg) || 0);
  if (bmi) enriched.bmi = Number(bmi).toFixed(1);

  const bfp = calculateBodyFatPercentage({
    bmi,
    age: Number(enriched.age || 0),
    gender: enriched.gender
  });

  if (bfp != null) {
    enriched.body_fat_percentage = Number(bfp).toFixed(1);
    enriched.body_fat_category = enriched.body_fat_category || getBfpCase(Number(bfp), enriched.gender);
    enriched.bfp_case = enriched.body_fat_category;
  }

  return enriched;
}

function calculateBodyFatPercentage({ bmi, age, gender }) {
  if (!bmi || !age || !gender) return null;
  const genderValue = gender === 'male' ? 1 : 0;
  return (1.2 * bmi) + (0.23 * age) - (10.8 * genderValue) - 5.4;
}

function getBfpCase(bfp, gender) {
  if (!bfp || !gender) return null;
  const bands = gender === 'male'
    ? [
        ['Essential', 5],
        ['Athlete', 13],
        ['Fitness', 17],
        ['Average', 24],
        ['Obese', Infinity]
      ]
    : [
        ['Essential', 13],
        ['Athlete', 20],
        ['Fitness', 24],
        ['Average', 31],
        ['Obese', Infinity]
      ];

  return bands.find(([, max]) => bfp <= max)?.[0] || 'Average';
}
