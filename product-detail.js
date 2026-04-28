const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('show');
    menuToggle.textContent = navLinks.classList.contains('show') ? 'X' : '☰';
  });

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 860) {
        navLinks.classList.remove('show');
        menuToggle.textContent = '☰';
      }
    });
  });
}
