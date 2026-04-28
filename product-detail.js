const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('show');
    menuToggle.innerHTML = navLinks.classList.contains('show') ? '&#10005;' : '&#9776;';
  });

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 860) {
        navLinks.classList.remove('show');
        menuToggle.innerHTML = '&#9776;';
      }
    });
  });
}

