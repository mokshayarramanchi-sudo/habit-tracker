document.addEventListener('DOMContentLoaded', async function () {
  const btnSignIn = document.getElementById('btnSignIn');
  const btnSignUp = document.getElementById('btnSignUp');
  const startButtons = document.querySelectorAll('.start-btn');

  try {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    if (response.ok) {
      window.location.href = '/home';
      return;
    }
  } catch (error) {
    console.debug('No active session detected on landing page.', error);
  }

  if (btnSignIn) {
    btnSignIn.addEventListener('click', function () {
      window.location.href = '/signin';
    });
  }

  if (btnSignUp) {
    btnSignUp.addEventListener('click', function () {
      window.location.href = '/signup';
    });
  }

  if (startButtons.length) {
    startButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        window.location.href = '/signup';
      });
    });
  }
});