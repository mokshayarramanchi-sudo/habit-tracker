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
                    alert('Profile updated successfully!');
                } else {
                    const error = await response.json();
                    alert(error.message || 'Failed to update profile');
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('An error occurred while saving.');
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

    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', async () => {
            const oldPassword = oldPasswordInput.value;
            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!oldPassword || !newPassword || !confirmPassword) {
                alert('Please fill out all password fields.');
                return;
            }

            if (newPassword !== confirmPassword) {
                alert('New passwords do not match.');
                return;
            }

            if (newPassword.length < 6) {
                alert('Password must be at least 6 characters long.');
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
                    alert('Password updated successfully!');
                    document.getElementById('security-form').reset();
                } else {
                    const error = await response.json();
                    alert(error.message || 'Failed to update password.');
                }
            } catch (error) {
                console.error('Error updating password:', error);
                alert('An error occurred while updating password.');
            } finally {
                updatePasswordBtn.textContent = 'Update Password';
                updatePasswordBtn.disabled = false;
            }
        });
    }

    const resetTasksBtn = document.getElementById('resetTasksBtn');
    if (resetTasksBtn) {
        resetTasksBtn.addEventListener('click', async () => {
            const confirmed = confirm('Are you sure you want to reset all tasks? This will permanently delete all tasks, habits, daily progress, and future plans. This action cannot be undone.');
            
            if (!confirmed) return;

            const token = sessionStorage.getItem('habitToken');
            if (!token) return;

            try {
                resetTasksBtn.textContent = 'Resetting...';
                resetTasksBtn.disabled = true;

                const response = await fetch('/api/users/reset-tasks', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    alert('All tasks have been successfully reset.');
                    // Refresh stats on profile page
                    fetchProfileData();
                } else {
                    const error = await response.json();
                    alert(error.message || 'Failed to reset tasks.');
                }
            } catch (error) {
                console.error('Error resetting tasks:', error);
                alert('An error occurred while resetting tasks.');
            } finally {
                resetTasksBtn.textContent = 'Reset All Tasks';
                resetTasksBtn.disabled = false;
            }
        });
    }

    const logoutAccountBtn = document.getElementById('logoutAccountBtn');
    if (logoutAccountBtn) {
        logoutAccountBtn.addEventListener('click', () => {
            const confirmed = confirm('Are you sure you want to log out?');
            if (confirmed) {
                sessionStorage.removeItem('habitToken');
                sessionStorage.removeItem('habitUserName');
                sessionStorage.removeItem('habitUserEmail');
                window.location.href = '/signin';
            }
        });
    }

    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            const confirmed = confirm('Are you sure you want to permanently delete your account? This action is irreversible.');
            if (!confirmed) return;

            const token = sessionStorage.getItem('habitToken');
            if (!token) return;

            try {
                deleteAccountBtn.textContent = 'Deleting...';
                deleteAccountBtn.disabled = true;

                const response = await fetch('/api/users/me', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    alert('Your account has been successfully deleted.');
                    sessionStorage.removeItem('habitToken');
                    sessionStorage.removeItem('habitUserName');
                    sessionStorage.removeItem('habitUserEmail');
                    window.location.href = '/signup';
                } else {
                    const error = await response.json();
                    alert(error.message || 'Failed to delete account.');
                }
            } catch (error) {
                console.error('Error deleting account:', error);
                alert('An error occurred while deleting your account.');
            } finally {
                deleteAccountBtn.textContent = 'Delete Account';
                deleteAccountBtn.disabled = false;
            }
        });
    }

    fetchProfileData();
});
