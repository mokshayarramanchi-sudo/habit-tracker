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

document.addEventListener('DOMContentLoaded', async () => {
    // Check Authentication
    const token = localStorage.getItem('habitToken');
    if (!token) {
        try {
            const response = await fetch('/api/auth/me', { credentials: 'include' });
            if (!response.ok) {
                window.location.href = '/signin';
                return;
            }
        } catch (error) {
            window.location.href = '/signin';
            return;
        }
    }

    // Display Current Date Dynamically
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateString = today.toLocaleDateString('en-US', options);
        currentDateElement.textContent = dateString ;
    }

    // Update Avatar
    const userName = localStorage.getItem('habitUserName') || 'User';
    const firstLetter = userName.charAt(0).toUpperCase();
    const customAvatar = localStorage.getItem('habitUserAvatar');
    const avatars = document.querySelectorAll('.avatar, .profile-avatar-large');
    avatars.forEach(avatar => {
        if (customAvatar) {
            avatar.src = customAvatar;
        } else if(avatar.src && avatar.src.includes('ui-avatars.com')) {
            avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstLetter)}&background=6c5ce7&color=fff${avatar.classList.contains('profile-avatar-large') ? '&size=150' : ''}`;
        }
    });

    // Theme Toggle Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        const themeIcon = themeToggleBtn.querySelector('i');
        
        // Check for saved theme or default to light
        const currentTheme = localStorage.getItem('theme') || 'light';
        if (currentTheme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            if (themeIcon) themeIcon.classList.replace('fa-moon', 'fa-sun');
        }

        themeToggleBtn.addEventListener('click', () => {
            const isDark = document.body.hasAttribute('data-theme');
            if (isDark) {
                document.body.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                if (themeIcon) themeIcon.classList.replace('fa-sun', 'fa-moon');
            } else {
                document.body.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                if (themeIcon) themeIcon.classList.replace('fa-moon', 'fa-sun');
            }
        });
    }

    // Habit Overview Logic
    const doTasksGrid = document.getElementById('doTasksGrid');
    const avoidTasksGrid = document.getElementById('avoidTasksGrid');
    const weeklyGoalsGrid = document.getElementById('weeklyGoalsGrid');
    const monthlyGoalsGrid = document.getElementById('monthlyGoalsGrid');
    
    const doTasksCount = document.getElementById('doTasksCount');
    const avoidTasksCount = document.getElementById('avoidTasksCount');
    const weeklyGoalsCount = document.getElementById('weeklyGoalsCount');
    const monthlyGoalsCount = document.getElementById('monthlyGoalsCount');

    const API_URL = '/api/tasks';

    const escapeHtml = (text) => {
        if (!text) return '';
        return String(text).replace(/[&<>"]/g, (match) => {
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
            return map[match];
        });
    };

    let currentDashboardData = null;
    let pendingProgressUpdates = {};

    const fetchTasksAndProgress = async () => {
        try {
            const token = localStorage.getItem('habitToken');
            const response = await fetch('/api/progress/dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch dashboard data');
            currentDashboardData = await response.json();

            renderDashboardTasks();
        } catch (error) {
            console.error('Error fetching data:', error);
            const errorMsg = '<p class="empty-state">Unable to load data from server.</p>';
            if(doTasksGrid) doTasksGrid.innerHTML = errorMsg;
            if(avoidTasksGrid) avoidTasksGrid.innerHTML = errorMsg;
            if(weeklyGoalsGrid) weeklyGoalsGrid.innerHTML = errorMsg;
            if(monthlyGoalsGrid) monthlyGoalsGrid.innerHTML = errorMsg;
        }
    };

    window.updateProgress = (taskId, status) => {
        pendingProgressUpdates[taskId] = status;
        renderDashboardTasks(); // Re-render to show visual button state changes
    };

    const saveProgressBtn = document.getElementById('saveProgressBtn');
    if (saveProgressBtn) {
        saveProgressBtn.addEventListener('click', async () => {
            if (Object.keys(pendingProgressUpdates).length === 0) {
                showNotification('No new progress to save.', 'info');
                return;
            }

            try {
                const token = localStorage.getItem('habitToken');
                const prevHtml = saveProgressBtn.innerHTML;
                saveProgressBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
                
                const response = await fetch(`/api/progress/bulk`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ updates: pendingProgressUpdates })
                });
                
                if (!response.ok) throw new Error('Failed to save progress');
                
                pendingProgressUpdates = {}; // Clear pending updates
                await fetchTasksAndProgress(); // Fetch fresh metrics from backend
                
                saveProgressBtn.innerHTML = prevHtml;
                showNotification('Progress saved successfully!', 'success');
            } catch (error) {
                console.error('Error saving progress:', error);
                showNotification('Failed to save progress.', 'error');
                saveProgressBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Save Today\'s Progress';
            }
        });
    }

    const showNotification = (msg, type = 'success') => {
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.padding = '15px 25px';
        toast.style.backgroundColor = type === 'success' ? '#2ecc71' : (type === 'error' ? '#e74c3c' : '#3498db');
        toast.style.color = '#fff';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
        toast.style.zIndex = '9999';
        toast.style.fontWeight = 'bold';
        toast.style.transition = 'opacity 0.3s ease';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    const renderDashboardTasks = () => {
        if (!currentDashboardData) return;
        if (!doTasksGrid || !avoidTasksGrid || !weeklyGoalsGrid || !monthlyGoalsGrid) return;

        const { metrics, categorizedTasks } = currentDashboardData;
        const { doTasks, avoidTasks, weeklyGoals, monthlyGoals } = categorizedTasks;

        doTasksCount.textContent = doTasks.length;
        avoidTasksCount.textContent = avoidTasks.length;
        weeklyGoalsCount.textContent = weeklyGoals.length;
        monthlyGoalsCount.textContent = monthlyGoals.length;

        // Update UI Metrics from Backend
        const bTotal = document.getElementById('banner-tasks-completed');
        const bPercent = document.getElementById('banner-completion-percentage');
        const bStreak = document.getElementById('banner-streak-count');
        const bBestStreak = document.getElementById('banner-best-streak');
        const sComp = document.getElementById('summary-completed');
        const sPend = document.getElementById('summary-pending');
        const sPerc = document.getElementById('summary-percentage');
        const sStr = document.getElementById('summary-streak');
        const ring = document.querySelector('.progress-ring-circle');

        if(bTotal) bTotal.innerHTML = `${metrics.dailyCompletedToday} <span class="divider">/</span> ${metrics.dailyTotalToday}`;
        if(bPercent) bPercent.textContent = `${metrics.completionPercentage}%`;
        if(bStreak) bStreak.textContent = metrics.currentStreak;
        if(bBestStreak) bBestStreak.textContent = metrics.bestStreak;
        if(sComp) sComp.textContent = `${metrics.dailyCompletedToday} daily tasks`;
        if(sPend) sPend.textContent = `${metrics.pendingToday} total`;
        if(sPerc) sPerc.textContent = `${metrics.completionPercentage}% daily`;
        if(sStr) sStr.textContent = `${metrics.currentStreak} days`;

        if (ring) {
            const radius = ring.r.baseVal.value;
            const circumference = radius * 2 * Math.PI;
            const offset = circumference - (metrics.completionPercentage / 100) * circumference;
            ring.style.strokeDasharray = `${circumference} ${circumference}`;
            ring.style.strokeDashoffset = offset;
        }

        const renderDoTask = (t) => {
            const taskId = t._id || t.id;
            const status = pendingProgressUpdates[taskId] || t.todayStatus;
            const isDone = status === 'completed';
            const isMissed = status === 'missed';
            return `
            <div class="habit-card">
                <div class="habit-card-title">${escapeHtml(t.name)}</div>
                <div class="habit-card-actions">
                    <button class="btn-action btn-done" 
                        style="opacity: ${isDone ? '1' : (status!=='pending'?'0.3':'1')}"
                        onclick="window.updateProgress('${taskId}', 'completed')">
                        ${isDone ? 'Completed' : 'Done'}
                    </button>
                    <button class="btn-action btn-missed" 
                        style="opacity: ${isMissed ? '1' : (status!=='pending'?'0.3':'1')}"
                        onclick="window.updateProgress('${taskId}', 'missed')">
                        ${isMissed ? 'Missed' : 'Miss'}
                    </button>
                </div>
            </div>`;
        };

        const renderAvoidTask = (t) => {
            const taskId = t._id || t.id;
            const status = pendingProgressUpdates[taskId] || t.todayStatus;
            const isAvoided = status === 'completed';
            const isFailed = status === 'missed';
            return `
            <div class="habit-card">
                <div class="habit-card-title">${escapeHtml(t.name)}</div>
                <div class="habit-card-actions">
                    <button class="btn-action btn-avoided" 
                        style="opacity: ${isAvoided ? '1' : (status!=='pending'?'0.3':'1')}"
                        onclick="window.updateProgress('${taskId}', 'completed')">
                        ${isAvoided ? 'Avoided' : 'Avoid'}
                    </button>
                    <button class="btn-action btn-failed" 
                        style="opacity: ${isFailed ? '1' : (status!=='pending'?'0.3':'1')}"
                        onclick="window.updateProgress('${taskId}', 'missed')">
                        ${isFailed ? 'Failed' : 'Fail'}
                    </button>
                </div>
            </div>`;
        };

        const renderGoal = (t, type) => {
            const taskId = t._id || t.id;
            const minDays = t.minDays || (type === 'Weekly' ? 3 : 10);
            const status = pendingProgressUpdates[taskId] || t.todayStatus;
            const isDone = status === 'completed';
            const isSkipped = status === 'skipped';
            
            const current = isDone ? 1 : 0; 
            const statText = isDone ? 'Completed Today' : (isSkipped ? 'Skipped' : 'In Progress');
            const statClass = isDone ? 'completed' : (isSkipped ? 'skipped' : 'in-progress');

            return `
            <div class="habit-card">
                <div class="habit-card-title">${escapeHtml(t.name)}</div>
                <div class="goal-meta">
                    <div class="goal-status-row">
                        <span class="status-badge ${statClass}">${statText}</span>
                        <span class="progress-text">${current}/${minDays} (Today)</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${(current/minDays)*100}%;"></div>
                    </div>
                </div>
                <div class="habit-card-actions">
                    <button class="btn-action btn-done" 
                        style="opacity: ${isDone ? '1' : (status!=='pending'?'0.3':'1')}"
                        onclick="window.updateProgress('${taskId}', 'completed')">
                        ${isDone ? 'Done' : 'Done'}
                    </button>
                    <button class="btn-action btn-skip" 
                        style="opacity: ${isSkipped ? '1' : (status!=='pending'?'0.3':'1')}"
                        onclick="window.updateProgress('${taskId}', 'skipped')">
                        ${isSkipped ? 'Skipped' : 'Skip'}
                    </button>
                </div>
            </div>`;
        };

        doTasksGrid.innerHTML = doTasks.length ? doTasks.map(renderDoTask).join('') : '<p class="empty-state">No Daily Tasks found.</p>';
        avoidTasksGrid.innerHTML = avoidTasks.length ? avoidTasks.map(renderAvoidTask).join('') : '<p class="empty-state">No Habits to Avoid found.</p>';
        weeklyGoalsGrid.innerHTML = weeklyGoals.length ? weeklyGoals.map(t => renderGoal(t, 'Weekly')).join('') : '<p class="empty-state">No Weekly Goals found.</p>';
        monthlyGoalsGrid.innerHTML = monthlyGoals.length ? monthlyGoals.map(t => renderGoal(t, 'Monthly')).join('') : '<p class="empty-state">No Monthly Goals found.</p>';
    };

    fetchTasksAndProgress();



// Number Counter Animation
    const counters = document.querySelectorAll('.stat-value[data-target]');
    const speed = 200; // lower is faster

    const animateCounters = () => {
        counters.forEach(counter => {
            const rawTarget = counter.getAttribute('data-target');
            if (!rawTarget) return;
            const target = +rawTarget;
            const count = +counter.innerText;
            const increment = target / speed;

            if (count < target) {
                counter.innerText = Math.ceil(count + increment);
                setTimeout(() => animateCounters(), 20);
            } else {
                counter.innerText = target;
            }
        });
    };

// Trigger animations when elements are in view
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (entry.target.classList.contains('statistics-grid')) {
                    animateCounters();
                }
                
                // Animate progress bars
                const progressBars = entry.target.querySelectorAll('.progress-bar');
                progressBars.forEach(bar => {
                    const width = bar.style.width;
                    bar.style.width = '0';
                    setTimeout(() => {
                        bar.style.width = width;
                    }, 100);
                });
            }
        });
    }, observerOptions);

    document.querySelectorAll('.glass-card').forEach(card => {
        observer.observe(card);
    });
});
