document.addEventListener('DOMContentLoaded', function () {
  const btnBackToSignIn = document.getElementById('btnBackToSignIn');
  const forgotForm = document.getElementById('forgotForm');
  const messageEl = document.getElementById('forgot-message');
  const emailField = document.getElementById('reset-email');

  const showMessage = (text, type = 'error') => {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.style.color = type === 'success' ? '#16a34a' : '#dc2626';
  };

  if (btnBackToSignIn) {
    btnBackToSignIn.addEventListener('click', function () {
      window.location.href = '/signin';
    });
  }

  if (forgotForm) {
    forgotForm.addEventListener('submit', async function (event) {
      event.preventDefault();

      if (!emailField || !emailField.value.trim()) {
        showMessage('Please enter your email address.');
        return;
      }

      const email = emailField.value.trim();

      try {
        const response = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
          showMessage(data.message || 'Unable to send OTP.');
          return;
        }

        showMessage(data.message || 'OTP sent. Redirecting...', 'success');
        localStorage.setItem('resetEmail', email);

        setTimeout(() => {
          window.location.href = '/verify-otp';
        }, 1000);
      } catch (error) {
        showMessage('Network error. Please try again.');
        console.error(error);
      }
    });
  }
});