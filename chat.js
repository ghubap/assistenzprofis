import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

const auth = window.auth;
const db = window.db;

let unsubscribe = null;
let messages = [];
let currentMessageId = null;

function formatDate(timestamp) {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

async function loginUser() {
  const email = prompt('E-Mail:');
  const password = prompt('Passwort:');

  if (!email || !password) return;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Login-Fehler:', error);
    alert('Login fehlgeschlagen: ' + error.message);
  }
}

async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout-Fehler:', error);
    alert('Logout fehlgeschlagen: ' + error.message);
  }
}

function renderMessages() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  container.innerHTML = '';

  messages.forEach((msg) => {
    const isGuest = !msg.isAdmin;
    const isReply = !!msg.replyTo;

    const item = document.createElement('div');
    item.className = [
      'message',
      isGuest ? 'guest' : 'admin',
      isReply ? 'reply' : '',
      msg.done ? 'done' : '',
      currentMessageId === msg.id ? 'selected' : ''
    ].join(' ').trim();

    item.dataset.id = msg.id;

    const headerText = isReply
      ? 'Antwort'
      : (msg.isAdmin ? 'Team' : 'Gast');

    item.innerHTML = `
      <div class="message-header">${escapeHtml(headerText)}</div>
      <div class="message-text">${escapeHtml(msg.text)}</div>
      <div class="message-time">${escapeHtml(formatDate(msg.timestamp))}</div>
      ${isGuest ? `
        <div class="message-actions">
          <button type="button" class="btn-done" data-action="done">✓ Erledigt</button>
          <button type="button" class="btn-delete" data-action="delete">🗑 Löschen</button>
        </div>
      ` : ''}
    `;

    if (isGuest) {
      item.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'done' || action === 'delete') return;

        currentMessageId = msg.id;
        renderMessages();
      });
    }

    const doneBtn = item.querySelector('[data-action="done"]');
    if (doneBtn) {
      doneBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await updateDoc(doc(db, 'messages', msg.id), { done: !msg.done });
        } catch (error) {
          console.error('Erledigt-Fehler:', error);
          alert('Status konnte nicht geändert werden.');
        }
      });
    }

    const deleteBtn = item.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ok = confirm('Nachricht wirklich löschen?');
        if (!ok) return;

        try {
          await deleteDoc(doc(db, 'messages', msg.id));
          if (currentMessageId === msg.id) {
            currentMessageId = null;
          }
        } catch (error) {
          console.error('Lösch-Fehler:', error);
          alert('Nachricht konnte nicht gelöscht werden.');
        }
      });
    }

    container.appendChild(item);
  });

  container.scrollTop = container.scrollHeight;
}

function startRealtimeMessages() {
  if (unsubscribe) unsubscribe();

  const q = query(
    collection(db, 'messages'),
    orderBy('timestamp', 'asc')
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    messages = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    renderMessages();
  }, (error) => {
    console.error('onSnapshot-Fehler:', error);
    alert('Firestore konnte nicht geladen werden: ' + error.message);
  });
}

async function sendReply(text) {
  await addDoc(collection(db, 'messages'), {
    text: text,
    timestamp: Date.now(),
    isAdmin: true,
    done: false,
    replyTo: currentMessageId
  });
}

document.getElementById('login-btn')?.addEventListener('click', loginUser);
document.getElementById('logout-btn')?.addEventListener('click', logoutUser);

document.getElementById('reply-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const input = document.getElementById('reply-input');
  const text = input.value.trim();

  if (!text) return;

  if (!currentMessageId) {
    alert('Bitte zuerst eine Gast-Nachricht anklicken.');
    return;
  }

  try {
    await sendReply(text);
    input.value = '';
    currentMessageId = null;
  } catch (error) {
    console.error('Antwort-Fehler:', error);
    alert('Antwort konnte nicht gesendet werden: ' + error.message);
  }
});

onAuthStateChanged(auth, (user) => {
  const loginBtn = document.getElementById('login-btn');
  const userInfo = document.getElementById('user-info');
  const userEmail = document.getElementById('user-email');
  const chatContainer = document.getElementById('chat-container');
  const noAccess = document.getElementById('no-access');

  if (user) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userInfo) userInfo.style.display = 'flex';
    if (userEmail) userEmail.textContent = user.email || '';
    if (chatContainer) chatContainer.style.display = 'block';
    if (noAccess) noAccess.style.display = 'none';

    startRealtimeMessages();
  } else {
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (userInfo) userInfo.style.display = 'none';
    if (chatContainer) chatContainer.style.display = 'none';
    if (noAccess) noAccess.style.display = 'block';

    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    messages = [];
    currentMessageId = null;
    renderMessages();
  }
});
