document.addEventListener('DOMContentLoaded', function () {
  const btnSignInLink = document.getElementById('btnSignInLink');
  const signupForm = document.getElementById('signup-form');
  const passwordError = document.getElementById('password-error-signup');
  const toggleButtons = document.querySelectorAll('.password-toggle-btn');
  const apiBase = '/api/auth';

  if (btnSignInLink) {
    btnSignInLink.addEventListener('click', function () {
      window.location.href = '/signin';
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

  if (signupForm) {
    signupForm.addEventListener('submit', async function (event) {
      event.preventDefault();

      if (passwordError) {
        passwordError.style.display = 'none';
        passwordError.textContent = '';
      }

      const fullName = document.getElementById('fullname').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirm-password').value;

      if (password !== confirmPassword) {
        if (passwordError) {
          passwordError.textContent = 'Passwords do not match.';
          passwordError.style.display = 'block';
        }
        return;
      }

      try {
        const response = await fetch(`${apiBase}/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fullName, email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (passwordError) {
            passwordError.textContent = data.message || 'Unable to create account. Please try again.';
            passwordError.style.display = 'block';
          }
          return;
        }

        // Save user info for profile
        // FIX: Replaced localStorage with sessionStorage to prevent user data bleeding
        // across multiple tabs for different accounts, ensuring complete data isolation.
        sessionStorage.setItem('habitUserEmail', email);
        sessionStorage.setItem('habitUserName', fullName);
        if (data.user && data.user.joined) {
          sessionStorage.setItem('habitUserJoined', data.user.joined);
        }
        if (data.user && data.user.avatarBase64) {
          sessionStorage.setItem('habitUserAvatar', data.user.avatarBase64);
        }

        window.location.href = '/home';
      } catch (error) {
        console.error('Signup request failed:', error);
        if (passwordError) {
          passwordError.textContent = 'Unable to connect to the server. Please try again later.';
          passwordError.style.display = 'block';
        }
      }
    });
  }
});
