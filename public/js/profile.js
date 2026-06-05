document.addEventListener('DOMContentLoaded', () => {
    // Simple tab switching logic for profile
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const targetId = btn.getAttribute('data-tab');
            if (targetId) {
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === targetId) {
                        content.classList.add('active');
                    }
                });
            }
        });
    });

    const nameDisplay = document.getElementById('profileNameDisplay');
    const bioDisplay = document.getElementById('profileBioDisplay');
    const emailDisplay = document.getElementById('profileEmailDisplay');
    const joinedDisplay = document.getElementById('profileJoinedDisplay');
    const avatarInput = document.getElementById('avatarInput');
    
    let currentAvatarBase64 = null;
    
    const nameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const bioInput = document.getElementById('bio');
    const locationInput = document.getElementById('location');
    const occupationInput = document.getElementById('occupation');
    
    const locationDisplay = document.getElementById('profileLocationDisplay');
    const occupationDisplay = document.getElementById('profileOccupationDisplay');
    const locationInfoItem = document.getElementById('locationInfoItem');
    const occupationInfoItem = document.getElementById('occupationInfoItem');

    const saveBtn = document.getElementById('saveProfileBtn');

    const updateUI = (user, stats) => {
        if (user) {
            if (nameDisplay) nameDisplay.textContent = user.fullName || '';
            if (bioDisplay) {
                bioDisplay.textContent = user.bio || '';
                bioDisplay.style.display = user.bio ? 'block' : 'none';
            }
            if (emailDisplay) emailDisplay.textContent = user.email || '';
            if (joinedDisplay) {
                const d = new Date(user._id ? new Date(parseInt(user._id.substring(0, 8), 16) * 1000) : Date.now());
                const options = { year: 'numeric', month: 'long' };
                joinedDisplay.textContent = d.toLocaleDateString('en-US', options);
            }
            
            if (nameInput) nameInput.value = user.fullName || '';
            if (emailInput) emailInput.value = user.email || '';
            if (bioInput) bioInput.value = user.bio || '';
            if (locationInput) locationInput.value = user.location || '';
            if (occupationInput) occupationInput.value = user.occupation || '';

            if (user.location && locationDisplay && locationInfoItem) {
                locationDisplay.textContent = user.location;
                locationInfoItem.style.display = 'flex';
            } else if (locationInfoItem) {
                locationInfoItem.style.display = 'none';
            }

            if (user.occupation && occupationDisplay && occupationInfoItem) {
                occupationDisplay.textContent = user.occupation;
                occupationInfoItem.style.display = 'flex';
            } else if (occupationInfoItem) {
                occupationInfoItem.style.display = 'none';
            }

            // FIX: Replaced localStorage with sessionStorage to isolate tab sessions
            sessionStorage.setItem('habitUserName', user.fullName || '');
            sessionStorage.setItem('habitUserEmail', user.email || '');

            // Dynamically update avatars
            const userName = user.fullName || 'User';
            const firstLetter = userName.charAt(0).toUpperCase();
            const avatars = document.querySelectorAll('.avatar, .profile-avatar-large');
            avatars.forEach(avatar => {
                if (user.avatarBase64) {
                    avatar.src = user.avatarBase64;
                } else if(avatar.src && avatar.src.includes('ui-avatars.com') || user.avatarBase64 === '') {
                    avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstLetter)}&background=6c5ce7&color=fff${avatar.classList.contains('profile-avatar-large') ? '&size=150' : ''}`;
                }
            });
            
            if (user.avatarBase64) {
                sessionStorage.setItem('habitUserAvatar', user.avatarBase64);
            } else {
                sessionStorage.removeItem('habitUserAvatar');
            }
        }

        if (stats) {
            const totalTasksDisplay = document.getElementById('totalTasksDisplay');
            const completedTasksDisplay = document.getElementById('completedTasksDisplay');
            const streakDaysDisplay = document.getElementById('streakDaysDisplay');

            if (totalTasksDisplay) totalTasksDisplay.textContent = stats.totalTasks || 0;
            if (completedTasksDisplay) completedTasksDisplay.textContent = stats.completedTasks || 0;
            if (streakDaysDisplay) streakDaysDisplay.textContent = stats.streak || 0;
        }
    };

    // Load initial data from sessionStorage for faster render
    updateUI({
        fullName: sessionStorage.getItem('habitUserName'),
        email: sessionStorage.getItem('habitUserEmail')
    }, null);

    const fetchProfileData = async () => {
        try {
            const token = sessionStorage.getItem('habitToken');
            if (!token) {
                window.location.href = '/signin';
                return;
            }

            const response = await fetch('/api/users/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                updateUI(data.user, data.stats);
            }
        } catch (error) {
            console.error('Error fetching profile data:', error);
        }
    };

    if (saveBtn) {
        saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Save profile button clicked');
            const token = sessionStorage.getItem('habitToken');
            if (!token) return;

            const payload = {
                fullName: nameInput ? nameInput.value.trim() : '',
                email: emailInput ? emailInput.value.trim() : '',
                bio: bioInput ? bioInput.value.trim() : '',
                location: locationInput ? locationInput.value.trim() : '',
                occupation: occupationInput ? occupationInput.value.trim() : ''
            };
            if (currentAvatarBase64) {
                payload.avatarBase64 = currentAvatarBase64;
            }

            try {
                saveBtn.textContent = 'Saving...';
                saveBtn.disabled = true;

                const response = await fetch('/api/users/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const data = await response.json();
                    updateUI(data.user, null);
                    customAlert('Profile updated successfully!', 'success');
                } else {
                    const error = await response.json();
                    customAlert(error.message || 'Failed to update profile', 'error');
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                customAlert('An error occurred while saving.', 'error');
            } finally {
                saveBtn.textContent = 'Save Changes';
                saveBtn.disabled = false;
            }
        });
    }

    if (avatarInput) {
        avatarInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 300;
                        const MAX_HEIGHT = 300;
                        let width = img.width;
                        let height = img.height;
                        
                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        currentAvatarBase64 = canvas.toDataURL('image/jpeg', 0.8);
                        
                        // Preview immediately on large avatar and header avatar
                        const largeAvatar = document.querySelector('.profile-avatar-large');
                        if (largeAvatar) {
                            largeAvatar.src = currentAvatarBase64;
                        }
                        const headerAvatar = document.querySelector('.avatar');
                        if (headerAvatar) {
                            headerAvatar.src = currentAvatarBase64;
                        }

                        // Auto-save avatar to database
                        const token = sessionStorage.getItem('habitToken');
                        if (token) {
                            const payload = {
                                fullName: nameInput ? nameInput.value.trim() : '',
                                email: emailInput ? emailInput.value.trim() : '',
                                bio: bioInput ? bioInput.value.trim() : '',
                                location: locationInput ? locationInput.value.trim() : '',
                                occupation: occupationInput ? occupationInput.value.trim() : '',
                                avatarBase64: currentAvatarBase64
                            };
                            fetch('/api/users/profile', {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify(payload)
                            }).then(response => {
                                if (response.ok) {
                                    sessionStorage.setItem('habitUserAvatar', currentAvatarBase64);
                                }
                            }).catch(err => console.error('Error saving avatar:', err));
                        }
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    const updatePasswordBtn = document.getElementById('updatePasswordBtn');
    const oldPasswordInput = document.getElementById('oldPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const updatePasswordForm = document.getElementById('security-form');

    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', async () => {
            const oldPassword = oldPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!oldPassword || !newPassword || !confirmPassword) {
                customAlert('Please fill out all password fields.', 'error');
                return;
            }

            if (newPassword !== confirmPassword) {
                customAlert('New passwords do not match.', 'error');
                return;
            }

            if (newPassword.length < 6) {
                customAlert('Password must be at least 6 characters long.', 'error');
                return;
            }

            const token = sessionStorage.getItem('habitToken');
            if (!token) return;

            try {
                updatePasswordBtn.textContent = 'Updating...';
                updatePasswordBtn.disabled = true;

                const response = await fetch('/api/users/password', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ oldPassword, newPassword })
                });

                if (response.ok) {
                    customAlert('Password updated successfully!', 'success');
                    if (updatePasswordForm) updatePasswordForm.reset();
                } else {
                    const error = await response.json();
                    customAlert(error.message || 'Failed to update password.', 'error');
                }
            } catch (error) {
                console.error('Error updating password:', error);
                customAlert('An error occurred while updating password.', 'error');
            } finally {
                updatePasswordBtn.textContent = 'Update Password';
                updatePasswordBtn.disabled = false;
            }
        });
    }

    const btnResetTasks = document.getElementById('resetTasksBtn');
    if (btnResetTasks) {
        btnResetTasks.addEventListener('click', () => {
            customConfirm('Are you sure you want to reset all tasks? This will permanently delete all tasks, habits, daily progress, and future plans. This action cannot be undone.', async (confirmed) => {
                if (!confirmed) return;

                const token = sessionStorage.getItem('habitToken');
                if (!token) return;

                const originalHtml = btnResetTasks.innerHTML;
                btnResetTasks.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resetting...';
                btnResetTasks.disabled = true;

                try {
                    const response = await fetch('/api/users/reset-tasks', {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        customAlert('All tasks have been successfully reset.', 'success');
                        fetchProfileData();
                    } else {
                        const error = await response.json();
                        customAlert(error.message || 'Failed to reset tasks.', 'error');
                    }
                } catch (error) {
                    console.error('Error resetting tasks:', error);
                    customAlert('An error occurred while resetting tasks.', 'error');
                } finally {
                    btnResetTasks.innerHTML = originalHtml;
                    btnResetTasks.disabled = false;
                }
            });
        });
    }

    const btnLogout = document.getElementById('logoutAccountBtn');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            customConfirm('Are you sure you want to log out?', async (confirmed) => {
                if (confirmed) {
                    const token = sessionStorage.getItem('habitToken');
                    if (token) {
                        try {
                            await fetch('/api/users/logout', {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                        } catch (err) {}
                    }
                    sessionStorage.removeItem('habitToken');
                    sessionStorage.removeItem('habitUserName');
                    sessionStorage.removeItem('habitUserEmail');
                    window.location.href = '/signin';
                }
            });
        });
    }

    const btnDeleteAccount = document.getElementById('deleteAccountBtn');
    if (btnDeleteAccount) {
        btnDeleteAccount.addEventListener('click', () => {
            customConfirm('Are you sure you want to permanently delete your account? This action is irreversible.', async (confirmed) => {
                if (!confirmed) return;

                const token = sessionStorage.getItem('habitToken');
                if (!token) return;

                const originalHtml = btnDeleteAccount.innerHTML;
                btnDeleteAccount.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
                btnDeleteAccount.disabled = true;

                try {
                    const response = await fetch('/api/users/me', {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        customAlert('Your account has been successfully deleted.', 'success');
                        sessionStorage.removeItem('habitToken');
                        sessionStorage.removeItem('habitUserName');
                        sessionStorage.removeItem('habitUserEmail');
                        window.location.href = '/signup';
                    } else {
                        const error = await response.json();
                        customAlert(error.message || 'Failed to delete account.', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting account:', error);
                    customAlert('An error occurred while deleting your account.', 'error');
                } finally {
                    btnDeleteAccount.innerHTML = originalHtml;
                    btnDeleteAccount.disabled = false;
                }
            });
        });
    }

    const loadSessions = async () => {
        const token = sessionStorage.getItem('habitToken');
        if (!token) return;

        const getDeviceName = (userAgent) => {
            if (!userAgent || userAgent === 'Unknown Device') return 'Unknown Device';
            let os = 'Unknown OS';
            let browser = 'Unknown Browser';

            if (userAgent.includes('Android')) os = 'Android';
            else if (userAgent.includes('like Mac')) os = 'iOS';
            else if (userAgent.includes('Win')) os = 'Windows';
            else if (userAgent.includes('Mac')) os = 'Mac OS';
            else if (userAgent.includes('Linux')) os = 'Linux';

            if (userAgent.includes('Edg')) browser = 'Edge';
            else if (userAgent.includes('OPR') || userAgent.includes('Opera')) browser = 'Opera';
            else if (userAgent.includes('Chrome')) browser = 'Chrome';
            else if (userAgent.includes('Firefox')) browser = 'Firefox';
            else if (userAgent.includes('Safari')) browser = 'Safari';

            return `${os} - ${browser}`;
        };

        try {
            const response = await fetch('/api/users/sessions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const container = document.getElementById('activeSessionsContainer');
                if (!container) return;

                container.innerHTML = '';
                
                data.sessions.forEach(session => {
                    const sessionCard = document.createElement('div');
                    sessionCard.className = 'active-session-card';
                    
                    const isCurrent = session.isCurrent;
                    const friendlyName = getDeviceName(session.device);

                    const statusHtml = isCurrent 
                        ? `<span class="status-active">Active Now</span> • Current Device`
                        : `Last active: ${new Date(session.lastActive).toLocaleDateString()}`;

                    const iconHtml = friendlyName.includes('Android') || friendlyName.includes('iOS')
                        ? `<i class="fa-solid fa-mobile-screen"></i>`
                        : `<i class="fa-solid fa-laptop"></i>`;

                    sessionCard.innerHTML = `
                        <div class="session-info">
                            <div class="session-icon">
                                ${iconHtml}
                            </div>
                            <div class="session-details">
                                <p class="session-name">${friendlyName}</p>
                                <p class="text-muted session-status">${statusHtml}</p>
                            </div>
                        </div>
                        <button type="button" class="btn-outline btn-logout-session" data-id="${session._id}">
                            ${isCurrent ? 'Current' : 'Log Out'}
                        </button>
                    `;

                    container.appendChild(sessionCard);
                });

                // Attach logout listeners
                const logoutBtns = document.querySelectorAll('.btn-logout-session');
                logoutBtns.forEach(btn => {
                    if (btn.textContent.trim() === 'Current') {
                        btn.disabled = true;
                        btn.style.opacity = '0.5';
                        btn.style.cursor = 'not-allowed';
                        return;
                    }
                    
                    btn.addEventListener('click', async () => {
                        const sessionId = btn.getAttribute('data-id');
                        try {
                            btn.textContent = 'Logging out...';
                            const res = await fetch(`/api/users/sessions/${sessionId}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            
                            if (res.ok) {
                                loadSessions();
                                customAlert('Device logged out successfully', 'success');
                            } else {
                                customAlert('Failed to log out device', 'error');
                                btn.textContent = 'Log Out';
                            }
                        } catch (err) {
                            console.error('Error logging out device:', err);
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
        }
    };

    fetchProfileData();
    loadSessions();
});
