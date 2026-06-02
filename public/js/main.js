document.addEventListener('DOMContentLoaded', function () {
  const btnSignIn = document.getElementById('btnSignIn');
  const btnSignUp = document.getElementById('btnSignUp');
  const startButtons = document.querySelectorAll('.start-btn');

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