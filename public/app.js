const $ = (selector) => document.querySelector(selector);
const chatForm = $('#chatForm');
const promptInput = $('#promptInput');
const messagesEl = $('#messages');
const welcome = $('#welcome');
const chatScroll = $('#chatScroll');
const sendButton = $('#sendButton');
const modeSelect = $('#modeSelect');
const historyList = $('#historyList');
const currentModeLabel = $('#currentModeLabel');
const STORAGE_KEY = 'studyspark.sessions.v1';
let sessions = loadSessions();
let currentSessionId = null;
let isSending = false;
let toastTimer;

function loadSessions() {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function saveSessions() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 30))); }
  catch { showToast('Browser storage is full. Some chat history may not be saved.'); }
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
}
function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
function scrollToBottom() { chatScroll.scrollTop = chatScroll.scrollHeight; }
function updateWelcome() { welcome.hidden = Boolean(currentSession()?.messages?.length); }
function currentSession() { return sessions.find((session) => session.id === currentSessionId); }
function newSession() {
  currentSessionId = null; messagesEl.replaceChildren(); welcome.hidden = false;
  modeSelect.value = 'Explain a topic'; setModeLabel(); renderHistory(); promptInput.focus();
}
function setModeLabel() {
  const labels = { 'Explain a topic':'AI tutor', 'Exam preparation':'Exam prep', 'Quiz me':'Practice quiz', 'Summarize notes':'Note summarizer', 'Coding help':'Coding buddy' };
  currentModeLabel.textContent = labels[modeSelect.value] || 'AI tutor';
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.mode === modeSelect.value));
}
function ensureSession(firstMessage) {
  if (!currentSession()) {
    const session = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), title: firstMessage.slice(0, 52), mode: modeSelect.value, messages: [], updatedAt: Date.now() };
    sessions.unshift(session); currentSessionId = session.id;
  }
  return currentSession();
}
function renderHistory() {
  historyList.replaceChildren();
  if (!sessions.length) { const p = document.createElement('p'); p.className = 'empty-history'; p.textContent = 'Your study sessions will appear here.'; historyList.append(p); return; }
  sessions.slice(0, 12).forEach((session) => {
    const button = document.createElement('button'); button.className = 'history-item'; button.textContent = session.title || 'Study session'; button.title = session.title || 'Study session';
    button.addEventListener('click', () => openSession(session.id)); historyList.append(button);
  });
}
function openSession(id) {
  const session = sessions.find((item) => item.id === id); if (!session) return;
  currentSessionId = id; modeSelect.value = session.mode || 'Explain a topic'; setModeLabel(); messagesEl.replaceChildren();
  session.messages.forEach((message) => addMessage(message.role, message.content, false));
  updateWelcome(); scrollToBottom(); closeSidebar();
}
function addMessage(role, content, withActions = true) {
  const article = document.createElement('article'); article.className = `message ${role}`;
  const avatar = document.createElement('div'); avatar.className = 'message-avatar'; avatar.textContent = role === 'assistant' ? '✦' : 'S';
  const body = document.createElement('div'); body.className = 'message-body';
  const name = document.createElement('div'); name.className = 'message-name'; name.textContent = role === 'assistant' ? 'StudySpark' : 'You';
  const bubble = document.createElement('div'); bubble.className = 'message-content'; bubble.textContent = content;
  body.append(name, bubble);
  if (role === 'assistant' && withActions) {
    const actions = document.createElement('div'); actions.className = 'message-actions';
    const copy = document.createElement('button'); copy.textContent = 'Copy response'; copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(content); showToast('Response copied.'); } catch { showToast('Copy was blocked by your browser.'); } });
    actions.append(copy); body.append(actions);
  }
  article.append(avatar, body); messagesEl.append(article); return article;
}
function showTyping() {
  const article = document.createElement('article'); article.className = 'message assistant'; article.id = 'typingIndicator';
  article.innerHTML = '<div class="message-avatar">✦</div><div class="message-body"><div class="message-name">StudySpark is thinking</div><div class="message-content"><div class="typing-dots"><span></span><span></span><span></span></div></div></div>';
  messagesEl.append(article); scrollToBottom();
}
function setSending(value) { isSending = value; sendButton.disabled = value; sendButton.querySelector('span').textContent = value ? 'Thinking' : 'Send'; }
async function sendMessage(text) {
  const question = text.trim(); if (!question || isSending) return;
  const session = ensureSession(question); session.mode = modeSelect.value; session.updatedAt = Date.now();
  welcome.hidden = true; addMessage('user', question); session.messages.push({ role: 'user', content: question });
  // Keep only recent context to limit request size.
  const apiMessages = session.messages.slice(-16).map(({ role, content }) => ({ role, content }));
  promptInput.value = ''; resizeInput(); setSending(true); showTyping(); scrollToBottom();
  try {
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: apiMessages, mode: modeSelect.value }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
    $('#typingIndicator')?.remove(); addMessage('assistant', data.answer);
    session.messages.push({ role: 'assistant', content: data.answer }); session.updatedAt = Date.now();
  } catch (error) {
    $('#typingIndicator')?.remove();
    const message = error instanceof TypeError ? 'Could not reach the server. Make sure you started it with npm start and open http://localhost:3000.' : error.message;
    addMessage('assistant', `Sorry — ${message}`);
    // Remove the unsent question from saved API history so retrying won't duplicate it.
    session.messages.pop();
  } finally {
    setSending(false); sessions.sort((a, b) => b.updatedAt - a.updatedAt); saveSessions(); renderHistory(); scrollToBottom(); promptInput.focus();
  }
}
function resizeInput() { promptInput.style.height = 'auto'; promptInput.style.height = `${Math.min(promptInput.scrollHeight, 180)}px`; }
function closeSidebar() { $('#sidebar').classList.remove('open'); }

chatForm.addEventListener('submit', (event) => { event.preventDefault(); sendMessage(promptInput.value); });
promptInput.addEventListener('input', resizeInput);
promptInput.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); chatForm.requestSubmit(); } });
$('#newChat').addEventListener('click', () => { newSession(); closeSidebar(); });
$('#clearHistory').addEventListener('click', () => { if (!sessions.length) return; if (confirm('Delete all saved study sessions from this browser?')) { sessions = []; saveSessions(); renderHistory(); newSession(); showToast('Study history cleared.'); } });
modeSelect.addEventListener('change', setModeLabel);
document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => { modeSelect.value = button.dataset.mode; setModeLabel(); closeSidebar(); promptInput.focus(); }));
document.querySelectorAll('.suggestion-card').forEach((button) => button.addEventListener('click', () => { promptInput.value = button.dataset.prompt; resizeInput(); promptInput.focus(); chatForm.requestSubmit(); }));
$('#themeToggle').addEventListener('click', () => { document.body.classList.toggle('light'); const light = document.body.classList.contains('light'); try { localStorage.setItem('studyspark.theme', light ? 'light' : 'dark'); } catch {} $('#themeToggle').textContent = light ? '☾' : '☼'; });
$('#openSidebar').addEventListener('click', () => $('#sidebar').classList.add('open'));
$('#closeSidebar').addEventListener('click', closeSidebar);
document.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); newSession(); } if (event.key === 'Escape') closeSidebar(); });
try { if (localStorage.getItem('studyspark.theme') === 'light') { document.body.classList.add('light'); $('#themeToggle').textContent = '☾'; } } catch {}
renderHistory(); setModeLabel(); updateWelcome();
