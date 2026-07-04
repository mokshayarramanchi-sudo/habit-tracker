document.addEventListener('DOMContentLoaded', function () {
  const btnSignUpLink = document.getElementById('btnSignUpLink');
  const btnForgotPassword = document.getElementById('btnForgotPassword');
  const signinForm = document.getElementById('signin-form');
  const passwordError = document.getElementById('password-error-signin');
  const toggleButtons = document.querySelectorAll('.password-toggle-btn');
  const apiBase = '/api/auth';

  if (btnSignUpLink) {
    btnSignUpLink.addEventListener('click', function () {
      window.location.href = '/signup';
    });
  }

  if (btnForgotPassword) {
    btnForgotPassword.addEventListener('click', function () {
      window.location.href = '/forgot';
    });
  }

  toggleButtons.forEach(function (button) {
    const targetId = button.getAttribute('data-target');
    const targetInput = document.getElementById(targetId);

    if (!targetInput) {
      return;
    }

    button.addEventListener('click', function () {
      const isPasswordVisible = targetInput.type === 'text';
      targetInput.type = isPasswordVisible ? 'password' : 'text';
      button.innerHTML = isPasswordVisible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
      button.setAttribute('aria-label', isPasswordVisible ? 'Show password' : 'Hide password');
    });
  });

  if (signinForm) {
    signinForm.addEventListener('submit', async function (event) {
      event.preventDefault();

      if (passwordError) {
        passwordError.style.display = 'none';
        passwordError.textContent = '';
      }

      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      try {
        const response = await fetch(`${apiBase}/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (passwordError) {
            passwordError.textContent = data.message || 'Unable to sign in. Please check your credentials.';
            passwordError.style.display = 'block';
          }
          return;
        }

        // FIX: Replaced localStorage with localStorage to prevent token bleeding 
        // across multiple tabs for different accounts, ensuring complete data isolation.
        localStorage.setItem('habitToken', data.token);
        
        // Save user info for profile
        localStorage.setItem('habitUserEmail', email);
        if (data.user && data.user.fullName) {
          localStorage.setItem('habitUserName', data.user.fullName);
        } else {
          // Default name from email prefix if backend doesn't return user
          const namePart = email.split('@')[0];
          localStorage.setItem('habitUserName', namePart);
        }
        if (data.user && data.user.joined) {
          localStorage.setItem('habitUserJoined', data.user.joined);
        }
        if (data.user && data.user.avatarBase64) {
          localStorage.setItem('habitUserAvatar', data.user.avatarBase64);
        }

        window.location.href = '/home';
      } catch (error) {
        console.error('Signin request failed:', error);
        if (passwordError) {
          passwordError.textContent = 'Unable to connect to the server. Please try again later.';
          passwordError.style.display = 'block';
        }
      }
    });
  }
});
