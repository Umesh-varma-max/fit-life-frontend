// ai-planner.js - Personalized AI diet planner chat

let chatHistory = [];
let isRecording = false;
let recognition = null;
let profileContext = null;

document.addEventListener('DOMContentLoaded', async () => {
  profileContext = await loadProfileContext();
  restoreChatHistory();
  initChat();
  initVoiceInput();
  updateWelcomeMessage();
});

function initChat() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  sendBtn?.addEventListener('click', () => sendMessage());

  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
}

async function sendMessage(voiceText = null) {
  const input = document.getElementById('chat-input');
  const message = voiceText || input?.value.trim();

  if (!message) return;

  addChatBubble('user', message);
  chatHistory.push({ role: 'user', content: message });
  persistChatHistory();
  if (input) input.value = '';

  showTyping(true);

  try {
    const payload = {
      message,
      voice_input: Boolean(voiceText),
      chat_history: chatHistory.slice(-8),
      profile_context: profileContext,
      fitness_goal: profileContext?.fitness_goal || null,
      bmi: profileContext?.bmi || null,
      food_habits: profileContext?.food_habits || null
    };

    const data = await aiAPI.chat(payload);
    showTyping(false);

    const reply = extractAiReply(data) || buildPlannerFallback(message, profileContext);
    addChatBubble('ai', reply, {
      provider: data?.provider || '',
      topic: data?.topic || 'general',
      suggestions: Array.isArray(data?.suggestions) ? data.suggestions : []
    });
    chatHistory.push({ role: 'ai', content: reply });
    persistChatHistory();

    if (shouldSpeakReply(data) && document.getElementById('voice-output-toggle')?.checked) {
      speakText(reply);
    }
  } catch (error) {
    showTyping(false);
    const fallbackReply = buildPlannerFallback(message, profileContext);
    addChatBubble('ai', fallbackReply, {
      provider: 'rule_fallback',
      topic: inferFallbackTopic(message),
      suggestions: buildFallbackSuggestions(message, profileContext)
    });
    chatHistory.push({ role: 'ai', content: fallbackReply });
    persistChatHistory();
    showToast('AI service had an issue, showing a personalized fallback plan', 'warning');
    console.error(error);
  }
}

function extractAiReply(data) {
  if (!data || typeof data !== 'object') return '';
  return data.reply || data.response || data.answer || data.message || '';
}

function shouldSpeakReply(data) {
  return Boolean(data?.speak ?? true);
}

function addChatBubble(type, text, meta = {}) {
  const container = document.getElementById('chat-container');
  if (!container) return;

  const time = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble chat-${type} animate-fade-in-up`;

  if (type === 'user') {
    bubble.innerHTML = `
      <div class="chat-content chat-content-user">
        <div class="chat-text">${escapeHtml(text)}</div>
        <div class="chat-time">${time}</div>
      </div>
      <div class="chat-avatar-user">${getUserInitial()}</div>
    `;
  } else {
    const providerText = meta.provider ? `<div class="chat-provider">${escapeHtml(formatProviderLabel(meta.provider))}</div>` : '';
    const suggestionMarkup = renderSuggestionChips(meta.suggestions, meta.topic);
    bubble.innerHTML = `
      <div class="chat-avatar">AI</div>
      <div class="chat-content">
        <div class="chat-text">${formatAIResponse(text)}</div>
        ${providerText}
        ${suggestionMarkup}
        <div class="chat-time">${time}</div>
      </div>
    `;
  }

  container.appendChild(bubble);
  wireSuggestionChips(bubble);
  container.scrollTop = container.scrollHeight;
}

function formatAIResponse(text) {
  let html = escapeHtml(text || '');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/^[-*]\s(.+)/gm, '<li>$1</li>');

  if (html.includes('<li>')) {
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>');
  }

  return html;
}

function showTyping(show) {
  const indicator = document.getElementById('typing-indicator');
  const container = document.getElementById('chat-container');
  if (!indicator || !container) return;

  indicator.style.display = show ? 'flex' : 'none';
  if (show) container.scrollTop = container.scrollHeight;
}

function initVoiceInput() {
  const micBtn = document.getElementById('mic-btn');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!micBtn) return;

  if (!SpeechRecognition) {
    micBtn.disabled = true;
    micBtn.setAttribute('data-tooltip', 'Voice not supported');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript || '';
    if (transcript) {
      document.getElementById('chat-input').value = transcript;
      sendMessage(transcript);
    }
    stopRecording();
  };

  recognition.onerror = (event) => {
    if (event.error !== 'no-speech') {
      showToast(`Voice input error: ${event.error}`, 'error');
    }
    stopRecording();
  };

  recognition.onend = stopRecording;

  micBtn.addEventListener('click', () => {
    if (isRecording) {
      recognition.stop();
      stopRecording();
    } else {
      startRecording();
    }
  });
}

function startRecording() {
  if (!recognition) return;
  isRecording = true;

  const micBtn = document.getElementById('mic-btn');
  micBtn.style.background = 'var(--danger)';
  micBtn.style.color = '#fff';
  micBtn.style.borderColor = 'var(--danger)';
  micBtn.setAttribute('data-tooltip', 'Stop Recording');

  recognition.start();
  showToast('Listening...', 'info');
}

function stopRecording() {
  isRecording = false;

  const micBtn = document.getElementById('mic-btn');
  if (!micBtn) return;

  micBtn.style.background = '';
  micBtn.style.color = '';
  micBtn.style.borderColor = '';
  micBtn.setAttribute('data-tooltip', 'Voice Input');
}

function speakText(text) {
  if (!('speechSynthesis' in window)) return;

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.95;
  utterance.pitch = 1;
  speechSynthesis.speak(utterance);
}

async function loadProfileContext() {
  const cached = getCachedProfile();
  if (cached) return cached;

  try {
    const data = await profileAPI.get();
    return data.profile || null;
  } catch {
    return null;
  }
}

function restoreChatHistory() {
  const container = document.getElementById('chat-container');
  if (!container) return;

  try {
    const stored = JSON.parse(localStorage.getItem(CONFIG.AI_CHAT_HISTORY_KEY) || '[]');
    if (!Array.isArray(stored) || !stored.length) return;

    chatHistory = stored;
    container.querySelectorAll('.chat-history-restored').forEach((node) => node.remove());

    stored.forEach((item) => {
      const bubble = document.createElement('div');
      bubble.className = `chat-history-restored`;
      addChatBubble(item.role === 'assistant' ? 'ai' : item.role, item.content);
    });
  } catch {
    chatHistory = [];
  }
}

function persistChatHistory() {
  localStorage.setItem(CONFIG.AI_CHAT_HISTORY_KEY, JSON.stringify(chatHistory.slice(-12)));
}

function renderSuggestionChips(suggestions, topic) {
  const validSuggestions = (Array.isArray(suggestions) ? suggestions : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 4);

  if (!validSuggestions.length) return '';

  const topicClass = `chat-suggestions-${escapeHtml((topic || 'general').toLowerCase())}`;
  return `
    <div class="chat-suggestions ${topicClass}">
      ${validSuggestions.map((item) => `
        <button type="button" class="chat-suggestion-chip" data-chat-suggestion="${escapeHtml(item)}">${escapeHtml(item)}</button>
      `).join('')}
    </div>
  `;
}

function wireSuggestionChips(scope) {
  scope.querySelectorAll('[data-chat-suggestion]').forEach((button) => {
    button.addEventListener('click', () => {
      const prompt = button.getAttribute('data-chat-suggestion');
      if (!prompt) return;

      const input = document.getElementById('chat-input');
      if (input) {
        input.value = prompt;
        input.focus();
      }
      sendMessage(prompt);
    });
  });
}

function formatProviderLabel(provider) {
  return provider.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function inferFallbackTopic(message) {
  const query = (message || '').toLowerCase();
  if (query.includes('breakfast')) return 'breakfast';
  if (query.includes('lunch')) return 'lunch';
  if (query.includes('dinner')) return 'dinner';
  if (query.includes('snack')) return 'snack';
  if (query.includes('workout')) return 'workout';
  if (query.includes('progress')) return 'progress';
  if (query.includes('water') || query.includes('hydrate')) return 'hydration';
  if (query.includes('recovery') || query.includes('sleep')) return 'recovery';
  if (query.includes('bmi') || query.includes('weight') || query.includes('body')) return 'body_metrics';
  return 'general';
}

function buildFallbackSuggestions(message, profile) {
  const topic = inferFallbackTopic(message);
  const goal = formatEnumLabel(profile?.fitness_goal || 'maintenance');

  const suggestionsByTopic = {
    breakfast: ['High protein breakfast ideas', 'Quick breakfast under 400 kcal', 'Vegetarian breakfast options'],
    lunch: ['Healthy lunch for my goal', 'Lunch with more protein', 'Simple office lunch plan'],
    dinner: ['Light dinner ideas', 'Dinner for better recovery', 'Low calorie dinner plan'],
    snack: ['Healthy snack options', 'Snacks for cravings', 'High protein snack ideas'],
    workout: ['Pre-workout meal ideas', 'Post-workout nutrition', `Meals for ${goal}`],
    progress: ['How to stay consistent', 'Weekly diet checklist', 'What to improve this week'],
    hydration: ['Daily hydration tips', 'Foods with more water', 'Water goal plan'],
    recovery: ['Sleep and recovery foods', 'Late-night meal advice', 'Recovery meal ideas'],
    body_metrics: ['Explain my BMI simply', `Nutrition for ${goal}`, 'How many calories should I eat?'],
    general: ['Create a 1-day meal plan', 'What should I eat today?', `Best diet tips for ${goal}`]
  };

  return suggestionsByTopic[topic] || suggestionsByTopic.general;
}

function updateWelcomeMessage() {
  const welcome = document.querySelector('.chat-bubble.chat-ai .chat-text');
  if (!welcome || !profileContext) return;

  const goal = formatEnumLabel(profileContext.fitness_goal || 'maintenance');
  const bmi = profileContext.bmi ? `Your current BMI is ${profileContext.bmi}.` : '';
  const habit = profileContext.food_habits ? `I will keep your ${formatEnumLabel(profileContext.food_habits)} preference in mind.` : '';
  welcome.innerHTML = escapeHtml(`Hi! I'm your AI Diet Planner. I can help build nutrition guidance around your ${goal} goal. ${bmi} ${habit}`.trim());
}

function buildPlannerFallback(message, profile) {
  const query = (message || '').toLowerCase();
  const goal = profile?.fitness_goal || 'maintenance';
  const goalLabel = formatEnumLabel(goal);
  const bmi = Number(profile?.bmi || 0);
  const calories = profile?.daily_calories || getFallbackCalories(goal, bmi);

  if (query.includes('meal') || query.includes('diet') || query.includes('food')) {
    return [
      `Here is a quick ${goalLabel.toLowerCase()} food plan for today:`,
      `- Breakfast: oats or eggs with fruit`,
      `- Lunch: lean protein, rice or roti, and vegetables`,
      `- Snack: fruit, curd, or nuts`,
      `- Dinner: lighter protein with vegetables`,
      `Aim for around ${calories} kcal and prioritize consistent protein at each meal.`
    ].join('\n');
  }

  if (query.includes('bmi') || query.includes('weight') || query.includes('lose') || query.includes('gain')) {
    const bmiLine = bmi ? `Your current BMI is ${bmi.toFixed(1)}.` : 'Your BMI is not available yet.';
    return `${bmiLine} For your ${goalLabel.toLowerCase()} goal, target about ${calories} kcal daily, focus on protein, stay hydrated, and keep meals consistent across the week.`;
  }

  return [
    `I could not reach the live AI planner, so here is a safe personalized fallback.`,
    `Goal: ${goalLabel}`,
    `Suggested daily calories: ${calories} kcal`,
    `Best next step: ask me about breakfast, lunch, snacks, dinner, or a 1-day meal plan.`
  ].join('\n');
}

function getFallbackCalories(goal, bmi) {
  if (goal === 'weight_loss') return bmi >= 25 ? 1800 : 2000;
  if (goal === 'muscle_gain') return 2500;
  return 2200;
}

function getUserInitial() {
  const user = getUser();
  return (user?.full_name || 'U').charAt(0).toUpperCase();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
