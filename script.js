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
