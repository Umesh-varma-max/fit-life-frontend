// ──────────────────────────────────────────────────
// progress.js — Charts + Trends + PDF Export
// ──────────────────────────────────────────────────

let weightChart = null;
let calorieChart = null;
let workoutChart = null;
let bmiChart = null;
let currentPeriod = 'weekly';

document.addEventListener('DOMContentLoaded', () => {
  initPeriodToggle();
  initPDFExport();
  loadProgress('weekly');
});

// ─── Period Toggle ───────────────────────────────
function initPeriodToggle() {
  const btns = document.querySelectorAll('.tab-btn[data-period]');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = btn.dataset.period;
      loadProgress(currentPeriod);
    });
  });
}

// ─── Load Progress ───────────────────────────────
async function loadProgress(period) {
  try {
    const data = await progressAPI.get(period);
    renderSummaryStats(data);
    renderWeightChart(data.weight_history);
    renderCalorieChart(data);
    renderWorkoutChart(data.workout_days);
    renderBMIChart(data.bmi_trend);
  } catch (err) {
    if (err.status === 404) {
      showToast('No progress data yet — start logging activities!', 'info');
      return;
    }
    showToast('Failed to load progress data', 'error');
    console.error(err);
  }
}

// ─── Summary Stats ───────────────────────────────
function renderSummaryStats(data) {
  const avgIn = document.getElementById('avg-cal-in');
  const avgOut = document.getElementById('avg-cal-out');
  const wkDays = document.getElementById('workout-days');
  const bmiTrend = document.getElementById('bmi-trend');
  const bmiDir = document.getElementById('bmi-trend-dir');

  if (avgIn) avgIn.textContent = formatNumber(data.avg_calories_in || 0);
  if (avgOut) avgOut.textContent = formatNumber(data.avg_calories_out || 0);
  if (wkDays) wkDays.textContent = data.workout_days || 0;

  // BMI trend
  if (bmiTrend && data.bmi_trend) {
    const trend = data.bmi_trend;
    if (Array.isArray(trend) && trend.length > 0) {
      const latest = trend[trend.length - 1];
      const val = typeof latest === 'object' ? latest.bmi : latest;
      bmiTrend.textContent = parseFloat(val).toFixed(1);

      if (trend.length >= 2) {
        const prev = typeof trend[trend.length - 2] === 'object' ? trend[trend.length - 2].bmi : trend[trend.length - 2];
        const diff = val - prev;
        if (bmiDir) bmiDir.textContent = diff > 0 ? '↑ increasing' : diff < 0 ? '↓ decreasing' : '→ stable';
      }
    }
  }
}

// ─── Weight Chart (Line) ─────────────────────────
function renderWeightChart(history) {
  const ctx = document.getElementById('weight-chart');
  if (!ctx) return;
  if (weightChart) weightChart.destroy();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const labels = history ? history.map(h => h.date ? formatDate(h.date) : h.label || '') : [];
  const values = history ? history.map(h => h.weight || h.value || 0) : [];

  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Weight (kg)',
        data: values,
        borderColor: CONFIG.CHART_COLORS.primary,
        backgroundColor: 'rgba(0, 212, 170, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: CONFIG.CHART_COLORS.primary,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: isDark ? '#8888aa' : '#6b7280' } },
        y: { grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, color: isDark ? '#8888aa' : '#6b7280' } },
      },
    },
  });
}

// ─── Calorie Chart (Bar) ─────────────────────────
function renderCalorieChart(data) {
  const ctx = document.getElementById('calorie-chart');
  if (!ctx) return;
  if (calorieChart) calorieChart.destroy();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  // Expect weight_history to have date labels, or fallback
  const labels = data.weight_history ? data.weight_history.map(h => h.date ? formatDate(h.date) : '') : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  calorieChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Calories In',
          data: data.calories_in_daily || [],
          backgroundColor: CONFIG.CHART_COLORS.primary,
          borderRadius: 6,
          barPercentage: 0.6,
        },
        {
          label: 'Calories Out',
          data: data.calories_out_daily || [],
          backgroundColor: CONFIG.CHART_COLORS.secondary,
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12, family: "'Sora', sans-serif" }, color: isDark ? '#e8eaf6' : '#1a1a2e' },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: isDark ? '#8888aa' : '#6b7280' } },
        y: { grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }, beginAtZero: true, ticks: { font: { size: 11 }, color: isDark ? '#8888aa' : '#6b7280' } },
      },
    },
  });
}

// ─── Workout Frequency (Doughnut) ────────────────
function renderWorkoutChart(days) {
  const ctx = document.getElementById('workout-chart');
  if (!ctx) return;
  if (workoutChart) workoutChart.destroy();

  const totalDays = currentPeriod === 'weekly' ? 7 : 30;
  const active = days || 0;
  const rest = Math.max(totalDays - active, 0);

  workoutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Active Days', 'Rest Days'],
      datasets: [{
        data: [active, rest],
        backgroundColor: [CONFIG.CHART_COLORS.primary, 'rgba(160,160,176,0.15)'],
        borderWidth: 0,
        borderRadius: 6,
      }],
    },
    options: {
      cutout: '70%',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, font: { size: 12, family: "'Sora', sans-serif" } },
        },
      },
    },
  });
}

// ─── BMI History (Line) ──────────────────────────
function renderBMIChart(trend) {
  const ctx = document.getElementById('bmi-chart');
  if (!ctx) return;
  if (bmiChart) bmiChart.destroy();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

  if (!trend || !Array.isArray(trend) || trend.length === 0) {
    // No data
    return;
  }

  const labels = trend.map((t, i) => t.date ? formatDate(t.date) : `Week ${i + 1}`);
  const values = trend.map(t => typeof t === 'object' ? t.bmi : t);

  bmiChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'BMI',
        data: values,
        borderColor: CONFIG.CHART_COLORS.purple,
        backgroundColor: 'rgba(124, 92, 252, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: CONFIG.CHART_COLORS.purple,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: isDark ? '#8888aa' : '#6b7280' } },
        y: { grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 }, color: isDark ? '#8888aa' : '#6b7280' } },
      },
    },
  });
}

// ─── PDF Export ───────────────────────────────────
function initPDFExport() {
  const btn = document.getElementById('export-pdf-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    // Try backend PDF first
    setLoading('export-pdf-btn', true);
    try {
      const response = await exportAPI.pdf();
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FitLife_Health_Report_${todayDate()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Health report downloaded! 📄', 'success');
        return;
      }
    } catch (_) {
      // Backend PDF not available — fall back to client-side
    }

    // Client-side PDF
    try {
      const content = document.getElementById('progress-content');
      const canvas = await html2canvas(content, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.setFontSize(18);
      pdf.text('FitLife Health Report', 14, 20);
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
      pdf.addImage(imgData, 'PNG', 10, 35, pdfWidth - 20, pdfHeight - 20);
      pdf.save(`FitLife_Health_Report_${todayDate()}.pdf`);
      showToast('Health report exported! 📄', 'success');
    } catch (err) {
      showToast('PDF export failed', 'error');
      console.error(err);
    } finally {
      setLoading('export-pdf-btn', false);
    }
  });
}
