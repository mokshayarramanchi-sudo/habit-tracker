document.addEventListener('DOMContentLoaded', () => {
    // Global Auth Protection
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

        link.addEventListener('click', function() {
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    const logoutLinks = document.querySelectorAll('.logout');
    logoutLinks.forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const token = localStorage.getItem('habitToken');
            if (token) {
                try {
                    await fetch('/api/users/logout', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                } catch (err) {
                    console.error('Logout error:', err);
                }
            }
            localStorage.clear();
            localStorage.clear();
            window.location.href = '/signin';
        });
    });

    // Notifications Logic
    const notificationWrapper = document.querySelector('.notification');
    if (notificationWrapper) {
        // Inject Dropdown HTML
        notificationWrapper.innerHTML = `
            <i class="fa-regular fa-bell"></i>
            <span class="badge" id="notificationBadge" style="display: none;">0</span>
            <div class="notification-dropdown" id="notificationDropdown">
                <div class="notification-header">
                    <h4>Notifications</h4>
                    <button class="mark-read-btn" id="markReadBtn">Mark all as read</button>
                </div>
                <ul class="notification-list" id="notificationList">
                </ul>
            </div>
        `;

        const dropdown = document.getElementById('notificationDropdown');
        const badge = document.getElementById('notificationBadge');
        const list = document.getElementById('notificationList');
        const markReadBtn = document.getElementById('markReadBtn');

        const fetchNotifications = async () => {
            const token = localStorage.getItem('habitToken');
            if (!token) return;
            try {
                const response = await fetch('/api/notifications', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                // Global Session Expiry Handler
                if (response.status === 401) {
                    localStorage.clear();
                    window.location.href = '/signin';
                    return;
                }

                if (response.ok) {
                    const data = await response.json();
                    
                    if (data.unreadCount > 0) {
                        badge.textContent = data.unreadCount;
                        badge.style.display = 'block';
                    } else {
                        badge.style.display = 'none';
                    }

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
                console.error("Error fetching notifications", err);
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

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!notificationWrapper.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });

        // Initial fetch
        fetchNotifications();
    }
});
