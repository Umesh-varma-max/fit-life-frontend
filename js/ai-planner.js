// ──────────────────────────────────────────────────
// ai-planner.js — Voice AI Chat Interface
// ──────────────────────────────────────────────────

let chatHistory = [];
let isRecording = false;
let recognition = null;

document.addEventListener('DOMContentLoaded', () => {
  initChat();
  initVoiceInput();
});

// ─── Chat Init ───────────────────────────────────
function initChat() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  sendBtn.addEventListener('click', () => sendMessage());

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

// ─── Send Message ────────────────────────────────
async function sendMessage(voiceText = null) {
  const input = document.getElementById('chat-input');
  const message = voiceText || input.value.trim();

  if (!message) return;

  // Add user message to chat
  addChatBubble('user', message);
  chatHistory.push({ role: 'user', content: message });
  input.value = '';

  // Show typing indicator
  showTyping(true);

  try {
    const data = await aiAPI.chat({
      message: message,
      voice_input: !!voiceText,
    });

    showTyping(false);

    const reply = data.reply || 'I couldn\'t generate a response. Please try again.';
    addChatBubble('ai', reply);
    chatHistory.push({ role: 'ai', content: reply });

    // Voice output
    if (data.speak && document.getElementById('voice-output-toggle').checked) {
      speakText(reply);
    }
  } catch (err) {
    showTyping(false);
    addChatBubble('ai', '⚠️ Sorry, I encountered an error. Please try again.');
    showToast('AI chat failed', 'error');
    console.error(err);
  }
}

// ─── Add Chat Bubble ─────────────────────────────
function addChatBubble(type, text) {
  const container = document.getElementById('chat-container');
  const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

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
    // Format AI response — convert markdown-like formatting
    const formattedText = formatAIResponse(text);
    bubble.innerHTML = `
      <div class="chat-avatar">🤖</div>
      <div class="chat-content">
        <div class="chat-text">${formattedText}</div>
        <div class="chat-time">${time}</div>
      </div>
    `;
  }

  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
}

// ─── Format AI Response ──────────────────────────
function formatAIResponse(text) {
  // Basic markdown-like formatting
  let html = escapeHtml(text);
  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  // Bullet points
  html = html.replace(/^[-•]\s(.+)/gm, '<li>$1</li>');
  if (html.includes('<li>')) {
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>');
  }
  return html;
}

// ─── Typing Indicator ────────────────────────────
function showTyping(show) {
  const indicator = document.getElementById('typing-indicator');
  indicator.style.display = show ? 'flex' : 'none';
  if (show) {
    const container = document.getElementById('chat-container');
    container.scrollTop = container.scrollHeight;
  }
}

// ─── Voice Input (Web Speech API) ────────────────
function initVoiceInput() {
  const micBtn = document.getElementById('mic-btn');

  // Check browser support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
    const transcript = event.results[0][0].transcript;
    document.getElementById('chat-input').value = transcript;
    sendMessage(transcript);
    stopRecording();
  };

  recognition.onerror = (event) => {
    console.error('Speech error:', event.error);
    if (event.error !== 'no-speech') {
      showToast('Voice input error: ' + event.error, 'error');
    }
    stopRecording();
  };

  recognition.onend = () => {
    stopRecording();
  };

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
  showToast('🎤 Listening...', 'info');
}

function stopRecording() {
  isRecording = false;
  const micBtn = document.getElementById('mic-btn');
  micBtn.style.background = '';
  micBtn.style.color = '';
  micBtn.style.borderColor = '';
  micBtn.setAttribute('data-tooltip', 'Voice Input');
}

// ─── Voice Output (SpeechSynthesis) ──────────────
function speakText(text) {
  if (!('speechSynthesis' in window)) return;

  // Cancel any ongoing speech
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.95;
  utterance.pitch = 1;
  speechSynthesis.speak(utterance);
}

// ─── Helpers ─────────────────────────────────────
function getUserInitial() {
  const user = getUser();
  return (user?.full_name || 'U').charAt(0).toUpperCase();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
