// Smooth scroll für interne Anker-Links
function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Active-Navigation nur auf Onepager-Abschnitte
document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
  const sections = Array.from(document.querySelectorAll('section[id]'));

  if (!navLinks.length || !sections.length) return;

  function onScroll() {
    const scrollPos = window.scrollY + 120;
    let currentId = sections[0]?.id;

    for (const sec of sections) {
      if (scrollPos >= sec.offsetTop) {
        currentId = sec.id;
      }
    }

    navLinks.forEach((a) => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + currentId);
    });
  }

  window.addEventListener('scroll', onScroll);
  onScroll();
});

// Hilfsfunktionen
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

// Chat-Popup öffnen/schließen
function toggleChatPopup() {
  const popup = document.getElementById('chat-popup');
  if (!popup) return;

  const isOpen = popup.style.display === 'flex';
  popup.style.display = isOpen ? 'none' : 'flex';

  if (!isOpen) {
    initPopupChat();
  }
}

window.toggleChatPopup = toggleChatPopup;

let popupUnsubscribe = null;
let popupInitialized = false;

function initPopupChat() {
  if (!window.db || !window.fsCollection || !window.fsAddDoc || !window.fsQuery || !window.fsOrderBy || !window.fsOnSnapshot) {
    console.error('Firestore nicht verfügbar');
    return;
  }

  const messagesContainer = document.getElementById('popup-chat-messages');
  const form = document.getElementById('popup-chat-form');
  const input = document.getElementById('popup-message-input');

  if (!messagesContainer || !form || !input) {
    console.error('Popup-Elemente fehlen');
    return;
  }

  if (popupUnsubscribe) {
    popupUnsubscribe();
    popupUnsubscribe = null;
  }

  const q = window.fsQuery(
    window.fsCollection(window.db, 'messages'),
    window.fsOrderBy('timestamp', 'asc')
  );

  popupUnsubscribe = window.fsOnSnapshot(
    q,
    (snapshot) => {
      messagesContainer.innerHTML = '';

      snapshot.forEach((docSnap) => {
        const msg = docSnap.data();

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
    },
    (error) => {
      console.error('Firestore Listener-Fehler:', error);
    }
  );

  if (!popupInitialized) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const text = input.value.trim();
      if (!text) return;

      try {
        await window.fsAddDoc(
          window.fsCollection(window.db, 'messages'),
          {
            text: text,
            timestamp: Date.now(),
            isAdmin: false,
            done: false
          }
        );
        input.value = '';
      } catch (error) {
        console.error('Senden-Fehler:', error);
        alert('Nachricht konnte nicht gesendet werden.');
      }
    });

    popupInitialized = true;
  }
}

// ESC schließt Popup
document.addEventListener('keydown', (e) => {
  const popup = document.getElementById('chat-popup');
  if (e.key === 'Escape' && popup && popup.style.display === 'flex') {
    toggleChatPopup();
  }
});

// Klick außerhalb schließt Popup
document.addEventListener('click', (e) => {
  const popup = document.getElementById('chat-popup');
  if (!popup) return;

  if (e.target === popup) {
    toggleChatPopup();
  }
});
