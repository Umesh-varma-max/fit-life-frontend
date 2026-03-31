// ──────────────────────────────────────────────────
// trainers.js — Trainer Listings + Filter
// ──────────────────────────────────────────────────

let allTrainers = [];

document.addEventListener('DOMContentLoaded', () => {
  initTrainerSearch();
  // Load all trainers on page load
  loadTrainers('');
});

function initTrainerSearch() {
  const searchBtn = document.getElementById('search-trainers-btn');
  const specFilter = document.getElementById('trainer-spec');

  searchBtn.addEventListener('click', () => {
    const location = document.getElementById('trainer-location').value.trim();
    loadTrainers(location);
  });

  // Enter key on location input
  document.getElementById('trainer-location').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const location = e.target.value.trim();
      loadTrainers(location);
    }
  });

  // Client-side specialization filter
  specFilter.addEventListener('change', () => {
    filterAndRender();
  });
}

async function loadTrainers(location) {
  const container = document.getElementById('trainers-container');
  container.innerHTML = '<div class="empty-state" style="padding: 40px;"><div class="spinner"></div><p class="text-muted mt-2">Searching trainers...</p></div>';

  try {
    const data = await trainerAPI.list(location);
    allTrainers = data.trainers || [];
    filterAndRender();
  } catch (err) {
    showToast('Failed to load trainers', 'error');
    container.innerHTML = `
      <div class="empty-state" style="padding: 60px 24px;">
        <div class="empty-state-icon">😞</div>
        <div class="empty-state-title">Failed to load</div>
        <p class="empty-state-text">Could not fetch trainer listings</p>
      </div>`;
  }
}

function filterAndRender() {
  const spec = document.getElementById('trainer-spec').value;
  const filtered = spec ? allTrainers.filter(t => t.specialization === spec) : allTrainers;
  renderTrainers(filtered);
}

function renderTrainers(trainers) {
  const container = document.getElementById('trainers-container');

  if (trainers.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 60px 24px;">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-title">No trainers found</div>
        <p class="empty-state-text">Try a different location or specialization</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="card-grid card-grid-3">${trainers.map((t, i) => `
    <div class="card hover-lift animate-fade-in-up" style="animation-delay: ${i * 0.06}s;">
      <div class="card-body" style="padding: 24px;">
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
          <div class="avatar avatar-lg">${(t.name || 'T').charAt(0).toUpperCase()}</div>
          <div>
            <div style="font-weight: 600; color: var(--text); font-size: 1.05rem;">${escapeHtml(t.name)}</div>
            <span class="badge badge-accent">${escapeHtml(t.specialization || 'General')}</span>
          </div>
          ${t.available === false ? '<span class="badge badge-warning" style="margin-left: auto;">Unavailable</span>' : '<span class="badge badge-success" style="margin-left: auto;">Available</span>'}
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text-muted);">
            <span>📍</span> ${escapeHtml(t.location || 'Not specified')}
          </div>
          ${t.rating ? `<div style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text-muted);"><span>⭐</span> ${t.rating} / 5</div>` : ''}
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${t.contact_email ? `<a href="mailto:${t.contact_email}" class="btn btn-outline btn-sm">📧 Email</a>` : ''}
          ${t.contact_phone ? `<a href="tel:${t.contact_phone}" class="btn btn-primary btn-sm">📞 Call</a>` : ''}
        </div>
      </div>
    </div>
  `).join('')}</div>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
