// ──────────────────────────────────────────────────
// reminders.js — Reminder CRUD + Browser Notifications
// ──────────────────────────────────────────────────

let reminderPollInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  checkNotificationPermission();
  initAddReminder();
  loadReminders();
  startReminderPolling();
});

// ─── Check Notification Permission ───────────────
function checkNotificationPermission() {
  const card = document.getElementById('notif-permission-card');
  const btn = document.getElementById('enable-notif-btn');

  if (!('Notification' in window)) {
    card.style.display = 'none';
    return;
  }

  if (Notification.permission === 'default') {
    card.style.display = 'block';
    btn.addEventListener('click', async () => {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        showToast('Notifications enabled! 🔔', 'success');
        card.style.display = 'none';
      } else {
        showToast('Notifications were denied', 'warning');
      }
    });
  } else {
    card.style.display = 'none';
  }
}

// ─── Add Reminder ────────────────────────────────
function initAddReminder() {
  const btn = document.getElementById('add-reminder-btn');

  btn.addEventListener('click', async () => {
    const type = document.getElementById('rem-type').value;
    const message = document.getElementById('rem-message').value.trim();
    const time = document.getElementById('rem-time').value;
    const repeat = document.getElementById('rem-repeat').checked;

    if (!message) {
      showToast('Please enter a reminder message', 'warning');
      return;
    }
    if (!time) {
      showToast('Please set a time', 'warning');
      return;
    }

    // Build remind_at as today's date + time
    const remindAt = `${todayDate()}T${time}:00`;

    setLoading('add-reminder-btn', true);
    try {
      await reminderAPI.add({
        reminder_type: type,
        message: message,
        remind_at: remindAt,
        repeat_daily: repeat,
      });
      showToast('Reminder added! 🔔', 'success');
      document.getElementById('rem-message').value = '';
      loadReminders();
    } catch (err) {
      showToast(err.message || 'Failed to add reminder', 'error');
    } finally {
      setLoading('add-reminder-btn', false);
    }
  });
}

// ─── Load Reminders ──────────────────────────────
async function loadReminders() {
  try {
    const data = await reminderAPI.list();
    renderReminders(data.reminders || []);
  } catch (err) {
    console.error('Failed to load reminders:', err);
  }
}

// ─── Render Reminders ────────────────────────────
function renderReminders(reminders) {
  const container = document.getElementById('reminders-list');
  const count = document.getElementById('rem-count');

  if (count) count.textContent = reminders.length;

  if (reminders.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔔</div>
        <div class="empty-state-title">No reminders yet</div>
        <p class="empty-state-text">Add reminders to stay on track with your health goals</p>
      </div>`;
    return;
  }

  const typeIcons = {
    workout: '🏋️',
    meal: '🍽️',
    water: '💧',
    sleep: '😴',
    custom: '📝',
  };

  container.innerHTML = reminders.map((r, i) => {
    const icon = typeIcons[r.reminder_type] || '🔔';
    const timeStr = r.remind_at ? formatReminderTime(r.remind_at) : '--:--';

    return `
      <div class="reminder-item animate-fade-in-up" style="animation-delay: ${i * 0.05}s;">
        <div class="reminder-item-left">
          <span class="reminder-icon">${icon}</span>
          <div class="reminder-info">
            <div class="reminder-message">${escapeHtml(r.message)}</div>
            <div class="reminder-meta">
              <span class="badge badge-accent">${formatEnumLabel(r.reminder_type)}</span>
              <span class="text-muted">⏰ ${timeStr}</span>
              ${r.repeat_daily ? '<span class="tag tag-accent">🔁 Daily</span>' : '<span class="tag">Once</span>'}
              ${r.is_active === false ? '<span class="badge badge-warning">Inactive</span>' : ''}
            </div>
          </div>
        </div>
        <button class="btn btn-danger btn-sm delete-reminder-btn" data-id="${r.id}" aria-label="Delete reminder">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
  }).join('');

  // Delete handlers
  container.querySelectorAll('.delete-reminder-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      try {
        await reminderAPI.delete(id);
        showToast('Reminder deleted', 'success');
        loadReminders();
      } catch (err) {
        showToast('Failed to delete reminder', 'error');
      }
    });
  });
}

// ─── Format Reminder Time ────────────────────────
function formatReminderTime(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

// ─── Polling for Browser Notifications ───────────
function startReminderPolling() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Check every 60 seconds
  reminderPollInterval = setInterval(async () => {
    try {
      const data = await reminderAPI.list();
      const reminders = data.reminders || [];
      const now = new Date();

      reminders.forEach(r => {
        if (!r.is_active) return;
        const remindAt = new Date(r.remind_at);
        const diff = Math.abs(now - remindAt);

        // Fire notification if within 60 seconds of remind_at
        if (diff < 60000) {
          const typeIcons = { workout: '🏋️', meal: '🍽️', water: '💧', sleep: '😴', custom: '📝' };
          new Notification(`${typeIcons[r.reminder_type] || '🔔'} FitLife Reminder`, {
            body: r.message,
            icon: '🏋️',
            tag: `reminder-${r.id}`,
          });
        }
      });
    } catch (_) {
      // Silently fail polling
    }
  }, 60000);
}

// ─── Cleanup ─────────────────────────────────────
window.addEventListener('beforeunload', () => {
  if (reminderPollInterval) clearInterval(reminderPollInterval);
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
