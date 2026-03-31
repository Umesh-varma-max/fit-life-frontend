// ──────────────────────────────────────────────────
// doctors.js — Doctor Listings + Specialization Filter
// ──────────────────────────────────────────────────

let currentSpec = '';

document.addEventListener('DOMContentLoaded', () => {
  initSpecTabs();
  loadDoctors('');
});

function initSpecTabs() {
  const tabs = document.querySelectorAll('#spec-tabs .tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentSpec = tab.dataset.spec;
      loadDoctors(currentSpec);
    });
  });
}

async function loadDoctors(spec) {
  const container = document.getElementById('doctors-container');
  container.innerHTML = '<div class="empty-state" style="padding: 40px;"><div class="spinner"></div><p class="text-muted mt-2">Loading doctors...</p></div>';

  try {
    const data = await doctorAPI.list(spec);
    renderDoctors(data.doctors || []);
  } catch (err) {
    showToast('Failed to load doctors', 'error');
    container.innerHTML = `
      <div class="empty-state" style="padding: 60px 24px;">
        <div class="empty-state-icon">😞</div>
        <div class="empty-state-title">Failed to load</div>
        <p class="empty-state-text">Could not fetch doctor listings</p>
      </div>`;
  }
}

function renderDoctors(doctors) {
  const container = document.getElementById('doctors-container');

  if (doctors.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 60px 24px;">
        <div class="empty-state-icon">🩺</div>
        <div class="empty-state-title">No doctors found</div>
        <p class="empty-state-text">Try a different specialization</p>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="card-grid card-grid-3">${doctors.map((d, i) => `
    <div class="card hover-lift animate-fade-in-up" style="animation-delay: ${i * 0.06}s;">
      <div class="card-body" style="padding: 24px;">
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
          <div class="avatar avatar-lg" style="background: linear-gradient(135deg, #7c5cfc, #00b4d8);">${(d.name || 'D').charAt(0).toUpperCase()}</div>
          <div>
            <div style="font-weight: 600; color: var(--text); font-size: 1.05rem;">Dr. ${escapeHtml(d.name)}</div>
            <span class="badge badge-info">${escapeHtml(d.specialization || 'General')}</span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
          ${d.hospital ? `<div style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text-muted);"><span>🏥</span> ${escapeHtml(d.hospital)}</div>` : ''}
          ${d.available_slots ? `<div style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text-muted);"><span>📅</span> ${escapeHtml(d.available_slots)}</div>` : ''}
          ${d.rating ? `<div style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: var(--text-muted);"><span>⭐</span> ${d.rating} / 5</div>` : ''}
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${d.contact_email ? `<a href="mailto:${d.contact_email}" class="btn btn-outline btn-sm">📧 Email</a>` : ''}
          ${d.contact_phone ? `<a href="tel:${d.contact_phone}" class="btn btn-primary btn-sm">📞 Call</a>` : ''}
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
