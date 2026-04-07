document.addEventListener('DOMContentLoaded', () => {
  setupAuthEntrySheet();
  setupWelcomeState();
  setupPasswordToggles();
  setupLoginForm();
  setupRegisterForm();
  setupPasswordStrength();
});

function setupWelcomeState() {
  const cta = document.getElementById('open-login');
  const logoutBtn = document.getElementById('welcome-logout');
  const hasSession = Boolean(getToken() && getUser());
  if (!cta) return;

  if (hasSession) {
    cta.textContent = 'Continue to Dashboard';
    logoutBtn?.classList.remove('onboarding-hidden');
    cta.addEventListener('click', () => {
      window.location.href = 'dashboard.html';
    });
    logoutBtn?.addEventListener('click', async () => {
      try { await authAPI.logout(); } catch (_) {}
      clearStoredSession();
      showToast('Logged out successfully', 'success');
      window.location.replace('index.html');
    });
    return;
  }

  cta.textContent = 'Get Started';
}

function setupAuthEntrySheet() {
  const shell = document.getElementById('welcome-shell');
  if (!shell) return;

  const params = new URLSearchParams(window.location.search);
  const openBtn = document.getElementById('open-login');
  const closeBtn = document.getElementById('close-login');
  const backdrop = document.getElementById('auth-sheet-backdrop');

  const setLoginMode = (open) => {
    shell.classList.toggle('auth-login-mode', open);
    if (!open) {
      shell.classList.remove('auth-force-login');
      history.replaceState({}, '', 'index.html');
    }
  };

  openBtn?.addEventListener('click', () => {
    if (getToken() && getUser()) return;
    setLoginMode(true);
    document.getElementById('login-email')?.focus();
  });

  closeBtn?.addEventListener('click', () => setLoginMode(false));
  backdrop?.addEventListener('click', () => setLoginMode(false));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setLoginMode(false);
  });

  if (params.get('login') === '1') {
    if (getToken() && getUser()) return;
    shell.classList.add('auth-force-login');
    document.getElementById('login-email')?.focus();
  }
}

function setupPasswordToggles() {
  const toggles = [
    { btn: 'toggle-login-password', input: 'login-password' },
    { btn: 'toggle-reg-password', input: 'reg-password' },
    { btn: 'toggle-reg-confirm', input: 'reg-confirm' },
  ];

  toggles.forEach(({ btn, input }) => {
    const toggle = document.getElementById(btn);
    const field = document.getElementById(input);
    if (!toggle || !field) return;

    toggle.addEventListener('click', () => {
      const isPassword = field.type === 'password';
      field.type = isPassword ? 'text' : 'password';
      toggle.innerHTML = isPassword
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  });
}

function setupPasswordStrength() {
  const pwdField = document.getElementById('reg-password');
  if (!pwdField) return;

  pwdField.addEventListener('input', () => {
    const pwd = pwdField.value;
    const strength = getPasswordStrength(pwd);
    const segments = [
      document.getElementById('str-seg-1'),
      document.getElementById('str-seg-2'),
      document.getElementById('str-seg-3'),
      document.getElementById('str-seg-4'),
    ];
    const label = document.getElementById('strength-label');

    segments.forEach((seg, i) => {
      if (!seg) return;
      seg.className = 'strength-segment';
      if (pwd.length > 0 && i < strength.score) {
        seg.classList.add(`active-${strength.class}`);
      }
    });

    if (label) {
      label.textContent = pwd.length > 0 ? strength.label : '';
      label.className = `strength-text text-${strength.class === 'vstrong' ? 'success' : strength.class === 'strong' ? 'success' : strength.class === 'fair' ? 'warning' : 'danger'}`;
    }
  });
}

function setupLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(form);

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    let valid = true;
    if (!email || !isValidEmail(email)) {
      showFieldError('login-email', 'Enter a valid email address');
      valid = false;
    }
    if (!password) {
      showFieldError('login-password', 'Password is required');
      valid = false;
    }
    if (!valid) return;

    setLoading('login-btn', true);
    try {
      const data = await authAPI.login({ email, password });
      localStorage.setItem(CONFIG.TOKEN_KEY, data.access_token);
      localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(data.user));
      showToast('Welcome back! 🎉', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } catch (err) {
      const errorMsg = document.getElementById('login-error-msg');
      if (errorMsg) {
        errorMsg.textContent = err.message || 'Login failed';
        errorMsg.classList.add('visible');
      }
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading('login-btn', false);
    }
  });
}

function setupRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(form);

    const full_name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    let valid = true;
    if (!full_name || full_name.length < 2) {
      showFieldError('reg-name', 'Name must be at least 2 characters');
      valid = false;
    }
    if (!email || !isValidEmail(email)) {
      showFieldError('reg-email', 'Enter a valid email address');
      valid = false;
    }
    if (!password || password.length < 6) {
      showFieldError('reg-password', 'Password must be at least 6 characters');
      valid = false;
    }
    if (password !== confirm) {
      showFieldError('reg-confirm', 'Passwords do not match');
      valid = false;
    }
    if (!valid) return;

    setLoading('register-btn', true);
    try {
      await authAPI.register({ full_name, email, password });
      showToast('Account created! Please sign in.', 'success');
      setTimeout(() => {
        window.location.href = 'index.html?login=1';
      }, 1000);
    } catch (err) {
      if (err.errors) {
        Object.entries(err.errors).forEach(([field, messages]) => {
          const fieldMap = { email: 'reg-email', password: 'reg-password', full_name: 'reg-name' };
          if (fieldMap[field]) {
            showFieldError(fieldMap[field], messages[0]);
          }
        });
      }
      const errorMsg = document.getElementById('register-error-msg');
      if (errorMsg) {
        errorMsg.textContent = err.message || 'Registration failed';
        errorMsg.classList.add('visible');
      }
      showToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading('register-btn', false);
    }
  });
}
