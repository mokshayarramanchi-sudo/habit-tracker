if (!window.migrateAuthStorage) {
    window.migrateAuthStorage = () => {
        const legacyToken = sessionStorage.getItem('habitToken');
        const currentToken = localStorage.getItem('habitToken');
        if (legacyToken && !currentToken) {
            localStorage.setItem('habitToken', legacyToken);
        }

        const legacyUserName = sessionStorage.getItem('habitUserName');
        const currentUserName = localStorage.getItem('habitUserName');
        if (legacyUserName && !currentUserName) {
            localStorage.setItem('habitUserName', legacyUserName);
        }

        const legacyUserEmail = sessionStorage.getItem('habitUserEmail');
        const currentUserEmail = localStorage.getItem('habitUserEmail');
        if (legacyUserEmail && !currentUserEmail) {
            localStorage.setItem('habitUserEmail', legacyUserEmail);
        }

        const legacyUserAvatar = sessionStorage.getItem('habitUserAvatar');
        const currentUserAvatar = localStorage.getItem('habitUserAvatar');
        if (legacyUserAvatar && !currentUserAvatar) {
            localStorage.setItem('habitUserAvatar', legacyUserAvatar);
        }
    };
}

window.migrateAuthStorage();

const initializeSidebar = () => {
    const globalToken = localStorage.getItem('habitToken');
    if (!globalToken) {
        window.location.href = '/signin';
        return;
    }

    const navLinks = document.querySelectorAll('.nav-links li');
    const currentFile = window.location.pathname.split('/').pop() || '/home';

    navLinks.forEach(link => {
        const anchor = link.querySelector('a');
        if (!anchor) return;

        const href = anchor.getAttribute('href');
        if (href === currentFile || (href === '/home' && currentFile === '')) {
            link.classList.add('active');
        }

        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            document.body.style.transition = 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
            document.body.style.opacity = '0';
            document.body.style.transform = 'translateY(8px)';
            
            setTimeout(() => {
                window.location.href = href;
            }, 200);
        });
    });

    const logoutLinks = document.querySelectorAll('.logout');
    logoutLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const token = localStorage.getItem('habitToken');
            if (token) {
                fetch('/api/users/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    credentials: 'include'
                }).catch(err => console.error('Logout error:', err));
            }

            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/signin';
        });
    });

    const notificationWrapper = document.querySelector('.notification');
    if (notificationWrapper) {
        notificationWrapper.innerHTML = `
            <i class="fa-regular fa-bell"></i>
            <span class="badge" id="notificationBadge" style="display: none;">0</span>
            <div class="notification-dropdown" id="notificationDropdown">
                <div class="notification-header" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);">
                    <h4 style="margin: 0;">Notifications</h4>
                    <div style="display: flex; gap: 8px;">
                        <button class="test-push-btn" id="testPushBtn" style="background: none; border: 1px solid var(--primary); color: var(--primary); border-radius: 4px; padding: 4px 8px; font-size: 0.8rem; cursor: pointer;">Test Push</button>
                        <button class="mark-read-btn" id="markReadBtn" style="background: none; border: none; color: var(--text-muted); font-size: 0.85rem; cursor: pointer; text-decoration: underline;">Mark read</button>
                    </div>
                </div>
                <ul class="notification-list" id="notificationList">
                </ul>
            </div>
        `;

        const dropdown = document.getElementById('notificationDropdown');
        const badge = document.getElementById('notificationBadge');
        const list = document.getElementById('notificationList');
        const markReadBtn = document.getElementById('markReadBtn');

        let lastUnreadCount = parseInt(sessionStorage.getItem('habitLastUnreadCount')) || 0;

        // Web Push Subscriptions
        const subscribeToPush = async () => {
            if ('serviceWorker' in navigator && 'PushManager' in window) {
                try {
                    const registration = await navigator.serviceWorker.register('/sw.js');
                    console.log('Service Worker registered');
                    
                    if (Notification.permission === 'granted') {
                        const token = localStorage.getItem('habitToken');
                        const res = await fetch('/api/notifications/vapid-public-key', {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        const { publicKey } = await res.json();

                        const urlBase64ToUint8Array = (base64String) => {
                            const padding = '='.repeat((4 - base64String.length % 4) % 4);
                            const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
                            const rawData = window.atob(base64);
                            const outputArray = new Uint8Array(rawData.length);
                            for (let i = 0; i < rawData.length; ++i) {
                                outputArray[i] = rawData.charCodeAt(i);
                            }
                            return outputArray;
                        };

                        const subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: urlBase64ToUint8Array(publicKey)
                        });

                        await fetch('/api/notifications/subscribe', {
                            method: 'POST',
                            body: JSON.stringify(subscription),
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        });
                    }
                } catch (error) {
                    console.error('Service Worker Error', error);
                }
            }
        };

        // Request system notification permission
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    subscribeToPush();
                }
            });
        } else if ("Notification" in window && Notification.permission === "granted") {
            subscribeToPush();
        }

        const playNotificationSound = () => {
            try {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                const playTone = (freq, startTime) => {
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(freq, startTime);
                    gainNode.gain.setValueAtTime(0, startTime);
                    gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    oscillator.start(startTime);
                    oscillator.stop(startTime + 0.5);
                };
                const now = audioCtx.currentTime;
                playTone(880, now); // A5
                playTone(1108.73, now + 0.15); // C#6
            } catch (err) {
                console.log('Audio playback failed', err);
            }
        };

        const fetchNotifications = async () => {
            const token = localStorage.getItem('habitToken');
            if (!token) return;

            try {
                const response = await fetch('/api/notifications', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.status === 401) {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '/signin';
                    return;
                }

                if (response.ok) {
                    const data = await response.json();

                    if (data.unreadCount > 0) {
                        badge.textContent = data.unreadCount;
                        badge.style.display = 'block';
                        
                        if (data.unreadCount > lastUnreadCount) {
                            playNotificationSound();
                            // Note: We no longer trigger `new Notification()` here 
                            // because the Service Worker background push will handle it.
                        }
                    } else {
                        badge.style.display = 'none';
                    }

                    lastUnreadCount = data.unreadCount;
                    sessionStorage.setItem('habitLastUnreadCount', lastUnreadCount);

                    if (data.notifications.length === 0) {
                        list.innerHTML = '';
                    } else {
                        list.innerHTML = '';
                        data.notifications.forEach(n => {
                            let icon = 'fa-bell';
                            if (n.type === 'reminder') icon = 'fa-clock';
                            if (n.type === 'habit') icon = 'fa-bullseye';
                            if (n.type === 'task') icon = 'fa-list-check';

                            const timeAgo = Math.round((new Date() - new Date(n.createdAt)) / 60000);
                            let timeStr = 'just now';
                            if (timeAgo > 0 && timeAgo < 60) timeStr = `${timeAgo}m ago`;
                            else if (timeAgo >= 60 && timeAgo < 1440) timeStr = `${Math.round(timeAgo/60)}h ago`;
                            else if (timeAgo >= 1440) timeStr = `${Math.round(timeAgo/1440)}d ago`;

                            list.innerHTML += `
                                <li class="notification-item ${n.isRead ? '' : 'unread'}">
                                    <div class="notification-icon ${n.type}">
                                        <i class="fa-solid ${icon}"></i>
                                    </div>
                                    <div class="notification-content">
                                        ${n.title ? `<p style="font-weight: 600; color: var(--text-dark, #1a202c); margin-bottom: 2px;">${n.title}</p>` : ''}
                                        <p>${n.message}</p>
                                        <span>${timeStr}</span>
                                    </div>
                                </li>
                            `;
                        });
                    }
                }
            } catch (err) {
                console.error('Error fetching notifications', err);
            }
        };

        notificationWrapper.addEventListener('click', (e) => {
            if (e.target.id === 'markReadBtn') return;
            dropdown.classList.toggle('show');
            if (dropdown.classList.contains('show')) {
                fetchNotifications();
            }
        });

        markReadBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const token = localStorage.getItem('habitToken');
            if (!token) return;
            try {
                const res = await fetch('/api/notifications/mark-read', {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    badge.style.display = 'none';
                    fetchNotifications();
                }
            } catch (err) {}
        });

        const testPushBtn = document.getElementById('testPushBtn');
        if (testPushBtn) {
            testPushBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const token = localStorage.getItem('habitToken');
                if (!token) return;
                
                // Also request permission again just in case it was dismissed
                if ("Notification" in window && Notification.permission !== "granted") {
                    await Notification.requestPermission();
                }
                
                try {
                    const res = await fetch('/api/notifications/test-push', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        console.log('Test push sent to backend successfully');
                    }
                } catch (err) {
                    console.error('Error sending test push:', err);
                }
            });
        }

        document.addEventListener('click', (e) => {
            if (!notificationWrapper.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });

        fetchNotifications();
        // Check for new notifications every minute
        setInterval(fetchNotifications, 60000);
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSidebar);
} else {
    initializeSidebar();
}
