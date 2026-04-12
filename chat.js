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

let currentMessageId = null;
let unsubscribe = null;
let messages = [];

function formatDate(timestamp) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

async function loginUser() {
  const email = prompt('E-Mail:');
  const password = prompt('Passwort:');
  if (!email || !password) return;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    alert('Login fehlgeschlagen: ' + error.message);
    console.error(error);
  }
}

async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error(error);
  }
}

function renderMessages() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  container.innerHTML = '';

  messages.forEach((msg) => {
    const div = document.createElement('div');
    div.className = `message ${msg.isAdmin ? 'admin' : 'guest'} ${msg.done ? 'done' : ''}`;
    div.dataset.id = msg.id;

    div.innerHTML = `
      <div class="message-header">${msg.isAdmin ? 'Team' : 'Gast'}</div>
      <div class="message-text">${msg.text}</div>
      <div class="message-time">${formatDate(msg.timestamp)}</div>
      ${!msg.isAdmin ? `
        <div class="message-actions">
          <button class="btn-done" data-action="done">✓ Erledigt</button>
          <button class="btn-delete" data-action="delete">🗑 Löschen</button>
        </div>
      ` : ''}
    `;

    if (!msg.isAdmin) {
      div.addEventListener('click', (e) => {
        if (e.target.dataset.action === 'done' || e.target.dataset.action === 'delete') return;
        currentMessageId = msg.id;
        document.querySelectorAll('.message').forEach(m => m.classList.remove('selected'));
        div.classList.add('selected');
      });
    }

    const doneBtn = div.querySelector('[data-action="done"]');
    if (doneBtn) {
      doneBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await updateDoc(doc(db, 'messages', msg.id), { done: true });
      });
    }

    const deleteBtn = div.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Nachricht wirklich löschen?')) return;
        await deleteDoc(doc(db, 'messages', msg.id));
      });
    }

    container.appendChild(div);
  });

  container.scrollTop = container.scrollHeight;
}

function startMessages() {
  if (unsubscribe) unsubscribe();

  const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
  unsubscribe = onSnapshot(q, (snapshot) => {
    messages = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    renderMessages();
  });
}

async function sendReply(text) {
  await addDoc(collection(db, 'messages'), {
    text,
    timestamp: Date.now(),
    isAdmin: true,
    done: false,
    replyTo: currentMessageId || null
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
    document.querySelectorAll('.message').forEach(m => m.classList.remove('selected'));
  } catch (error) {
    console.error(error);
    alert('Antwort konnte nicht gesendet werden.');
  }
});

onAuthStateChanged(auth, (user) => {
  const loginBtn = document.getElementById('login-btn');
  const userInfo = document.getElementById('user-info');
  const userEmail = document.getElementById('user-email');
  const chatContainer = document.getElementById('chat-container');
  const noAccess = document.getElementById('no-access');

  if (user) {
    loginBtn.style.display = 'none';
    userInfo.style.display = 'flex';
    userEmail.textContent = user.email;
    chatContainer.style.display = 'block';
    noAccess.style.display = 'none';
    startMessages();
  } else {
    loginBtn.style.display = 'inline-block';
    userInfo.style.display = 'none';
    chatContainer.style.display = 'none';
    noAccess.style.display = 'block';
    if (unsubscribe) unsubscribe();
  }
});
