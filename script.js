// Smooth scroll für interne Anker-Links (nur auf index, optional auf anderen)
function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Active-Navigation nur auf index.html (Onepager)
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const sections = Array.from(document.querySelectorAll('section[id]'));

  if (!navLinks.length || !sections.length) return;

  function onScroll() {
    const scrollPos = window.scrollY + 120;
    let currentId = sections[0].id;
    for (const sec of sections) {
      if (scrollPos >= sec.offsetTop) {
        currentId = sec.id;
      }
    }
    navLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + currentId);
    });
  }

  window.addEventListener('scroll', onScroll);
});

// Firebase initialisieren (falls nicht schon in HTML)
if (typeof window.firebaseConfig !== 'undefined' && !window.db) {
  (async () => {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js');
    const { getFirestore, collection, addDoc, query, orderBy, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js');
    
    const app = initializeApp(window.firebaseConfig);
    window.db = getFirestore(app);
  })();
}

// Chat-Popup Funktionen
function toggleChatPopup() {
  const popup = document.getElementById('chat-popup');
  if (!popup) return;
  
  popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex';
  if (popup.style.display === 'flex') {
    initPopupChat();
  }
}

let popupUnsubscribe = null;
function initPopupChat() {
  if (!window.db) {
    console.error('Firestore nicht verfügbar');
    return;
  }

  const messagesContainer = document.getElementById('popup-chat-messages');
  if (!messagesContainer) return;

  if (popupUnsubscribe) {
    popupUnsubscribe();
    popupUnsubscribe = null;
  }

  const q = query(collection(window.db, 'messages'), orderBy('timestamp', 'asc'));
  popupUnsubscribe = onSnapshot(q, (snapshot) => {
    messagesContainer.innerHTML = '';
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const div = document.createElement('div');
      div.className = `message ${msg.isAdmin ? 'admin' : 'guest'} ${msg.done ? 'done' : ''}`;
      div.innerHTML = `
        <div class="message-header">${msg.isAdmin ? '💬 Team' : '👤 Gast'}</div>
        <div class="message-text">${escapeHtml(msg.text || '')}</div>
        <div class="message-time">${formatDate(msg.timestamp)}</div>
      `;
      messagesContainer.appendChild(div);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, (error) => {
    console.error('Popup-Fehler:', error);
  });

  const form = document.getElementById('popup-chat-form');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const input = document.getElementById('popup-message-input');
      const text = input.value.trim();
      if (text && window.db) {
        try {
          await addDoc(collection(window.db, 'messages'), {
            text,
            timestamp: Date.now(),
            isAdmin: false,
            done: false
          });
          input.value = '';
        } catch (error) {
          console.error('Senden-Fehler:', error);
        }
      }
    };
  }
}

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
  div.textContent = text;
  return div.innerHTML;
}

// ESC zum Schließen
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('chat-popup')?.style.display === 'flex') {
    toggleChatPopup();
  }
});

// Popup schließen bei Klick außen
document.addEventListener('click', (e) => {
  const popup = document.getElementById('chat-popup');
  if (popup && e.target === popup) {
    toggleChatPopup();
  }
});
