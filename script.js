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
// Chat-Popup Funktionen
function toggleChatPopup() {
    const popup = document.getElementById('chat-popup');
    popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex';
    if (popup.style.display === 'flex') {
        initPopupChat();
    }
}

// Popup-Chat initialisieren
let popupUnsubscribe = null;
function initPopupChat() {
    if (!window.db) {
        console.error('Firestore nicht geladen');
        return;
    }
    
    const messagesContainer = document.getElementById('popup-chat-messages');
    
    // Alte Subscription entfernen
    if (popupUnsubscribe) popupUnsubscribe();
    
    const q = query(collection(window.db, 'messages'), orderBy('timestamp', 'asc'));
    popupUnsubscribe = onSnapshot(q, (snapshot) => {
        messagesContainer.innerHTML = '';
        snapshot.forEach((doc) => {
            const msg = doc.data();
            const div = document.createElement('div');
            div.className = `message ${msg.isAdmin ? 'admin' : 'guest'} ${msg.done ? 'done' : ''}`;
            div.innerHTML = `
                <div class="message-header">${msg.isAdmin ? '💬 Team' : '👤 Gast'}</div>
                <div class="message-text">${msg.text}</div>
                <div class="message-time">${formatDate(msg.timestamp)}</div>
            `;
            messagesContainer.appendChild(div);
        });
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
    
    // Form-Handler
    document.getElementById('popup-chat-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = document.getElementById('popup-message-input').value.trim();
        if (text) {
            await sendMessage(text, false);
            document.getElementById('popup-message-input').value = '';
        }
    });
}

// ESC-Taste zum Schließen
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('chat-popup').style.display === 'flex') {
        toggleChatPopup();
    }
});

// Popup schließen bei Klick außen
document.getElementById('chat-popup')?.addEventListener('click', (e) => {
    if (e.target.id === 'chat-popup') {
        toggleChatPopup();
    }
});
// Chat-Popup Funktionen (AM ENDE von script.js einfügen)
function toggleChatPopup() {
  const popup = document.getElementById('chat-popup');
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

  if (popupUnsubscribe) popupUnsubscribe();

  const q = query(collection(window.db, 'messages'), orderBy('timestamp', 'asc'));
  popupUnsubscribe = onSnapshot(q, (snapshot) => {
    messagesContainer.innerHTML = '';
    snapshot.forEach((doc) => {
      const msg = doc.data();
      const div = document.createElement('div');
      div.className = `message ${msg.isAdmin ? 'admin' : 'guest'} ${msg.done ? 'done' : ''}`;
      div.innerHTML = `
        <div class="message-header">${msg.isAdmin ? '💬 Team' : '👤 Gast'}</div>
        <div class="message-text">${msg.text}</div>
        <div class="message-time">${formatDate(msg.timestamp)}</div>
      `;
      messagesContainer.appendChild(div);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  });

  const form = document.getElementById('popup-chat-form');
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

// ESC zum Schließen
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.getElementById('chat-popup')?.style.display === 'flex') {
    toggleChatPopup();
  }
});
