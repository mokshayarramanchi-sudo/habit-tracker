const migrateAuthStorage = () => {
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

migrateAuthStorage();

document.addEventListener("DOMContentLoaded", async () => {
    const cardsContainer = document.getElementById("analyticsCardsContainer");
    if (!cardsContainer) return;

    let tasks = [];
    let currentFilter = 'all';
    let currentTaskSelection = 'all';

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('habitToken');
            if (!token) {
                window.location.href = '/signin';
                return;
            }

            const tasksRes = await fetch('/api/tasks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!tasksRes.ok) throw new Error("Failed to fetch tasks");
            
            tasks = await tasksRes.json();

            populateTaskDropdown();
            setupFilters();
            renderTaskAnalytics();
        } catch (error) {
            console.error("Error fetching tasks:", error);
            cardsContainer.innerHTML = `<div class="empty-state">Failed to load tasks. Please try again.</div>`;
        }
    };

    const setupFilters = () => {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                renderTaskAnalytics();
            });
        });
    };

    const populateTaskDropdown = () => {
        const dropdown = document.getElementById('taskNameFilter');
        if (!dropdown) return;
        
        tasks.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t._id;
            opt.textContent = t.name;
            dropdown.appendChild(opt);
        });

        dropdown.addEventListener('change', (e) => {
            currentTaskSelection = e.target.value;
            renderTaskAnalytics();
        });
    };

    const renderTaskAnalytics = async () => {
        cardsContainer.innerHTML = '<div class="empty-state">Loading analytics...</div>';
        
        try {
            const token = localStorage.getItem('habitToken');
            if (!token) return;

            const res = await fetch(`/api/analytics/task-progress?filter=${currentFilter}&taskId=${currentTaskSelection}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Failed to fetch task analytics");
            
            const taskData = await res.json();

            cardsContainer.innerHTML = '';

            if (taskData.length === 0) {
                cardsContainer.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; background: var(--bg-card); border-radius: 16px;">No tasks found for this filter.</div>`;
                return;
            }

            taskData.forEach(({ task, metrics }, index) => {
                const card = document.createElement('div');
                card.className = 'task-card analytics-task-container';
                card.style.marginBottom = '40px';
                card.style.width = '100%';

                // Header & Badges
                const headerDiv = document.createElement('div');
                headerDiv.style.display = 'flex';
                headerDiv.style.flexDirection = 'column';
                headerDiv.style.marginBottom = '25px';

                const title = document.createElement('h2');
                title.textContent = task.name;
                title.style.fontSize = '24px';
                title.style.color = 'var(--text-main)';
                title.style.marginBottom = '12px';

                const badgesDiv = document.createElement('div');
                badgesDiv.style.display = 'flex';
                badgesDiv.style.flexWrap = 'wrap';
                badgesDiv.style.gap = '10px';

                const createBadge = (text, extraClass = '') => {
                    const b = document.createElement('span');
                    b.className = 'status-badge ' + extraClass;
                    b.textContent = text;
                    return b;
                };

                const isDoTask = task.type && task.type.startsWith('DO');
                const typeColor = isDoTask ? 'completed' : 'in-progress';
                const badgeText = isDoTask ? 'DO' : 'NOT TO DO';
                badgesDiv.appendChild(createBadge(badgeText, typeColor));
                badgesDiv.appendChild(createBadge(task.frequency || 'Daily', 'completed'));
                badgesDiv.appendChild(createBadge(task.active !== false ? 'Active' : 'Inactive', task.active !== false ? 'completed' : 'in-progress'));
                if (task.timeTracking) {
                    badgesDiv.appendChild(createBadge(`Time: ${task.timeValue}m`, ''));
                }

                headerDiv.appendChild(title);
                headerDiv.appendChild(badgesDiv);
                card.appendChild(headerDiv);

                let weeklyProgressText = `${metrics.weekCompleted}/7`;
                if (task.frequency === 'Weekly' || task.frequency === 'Monthly') {
                    const target = task.minDays ? parseInt(task.minDays) : 1;
                    weeklyProgressText = `${metrics.weekCompleted}/${target}`;
                }

                // Insights Grid (4 cards)
                const insightsGrid = document.createElement('div');
                insightsGrid.className = 'insights-grid';
                insightsGrid.style.marginBottom = '30px';

                const createInsight = (icon, color, title, value) => {
                    const item = document.createElement('div');
                    item.className = 'insight-item';
                    item.innerHTML = `
                        <div class="insight-icon icon-${color}"><i class="${icon}"></i></div>
                        <div class="insight-text">
                            <h4>${title}</h4>
                            <p>${value}</p>
                        </div>
                    `;
                    return item;
                };

                insightsGrid.appendChild(createInsight('fa-solid fa-fire', 'orange', 'Current Streak', `${metrics.currentStreak} Days`));
                insightsGrid.appendChild(createInsight('fa-solid fa-trophy', 'purple', 'Longest Streak', `${metrics.bestStreak} Days`));
                insightsGrid.appendChild(createInsight('fa-solid fa-chart-line', 'blue', 'Avg Productivity', `${metrics.avgProductivity}%`));
                insightsGrid.appendChild(createInsight('fa-solid fa-calendar-week', 'green', 'Weekly Progress', weeklyProgressText));
                
                card.appendChild(insightsGrid);

                // Charts Section
                const chartsSection = document.createElement('div');
                chartsSection.className = 'charts-section';
                chartsSection.style.display = 'flex';
                chartsSection.style.gap = '30px';
                chartsSection.style.width = '100%';

                const barCard = document.createElement('div');
                barCard.className = 'task-card chart-card';
                barCard.style.padding = '20px';
                barCard.style.flex = '1';
                barCard.innerHTML = `
                    <div class="chart-text-header">
                        <h2>Completion History</h2>
                    </div>
                    <div class="canvas-container">
                        <canvas id="barGraph-${index}"></canvas>
                    </div>
                `;

                const pieCard = document.createElement('div');
                pieCard.className = 'task-card chart-card';
                pieCard.style.padding = '20px';
                pieCard.style.flex = '1';
                pieCard.innerHTML = `
                    <div class="chart-text-header">
                        <h2>Weekly Status Breakdown</h2>
                    </div>
                    <div class="canvas-container">
                        <canvas id="pieChart-${index}"></canvas>
                    </div>
                `;

                chartsSection.appendChild(barCard);
                chartsSection.appendChild(pieCard);
                card.appendChild(chartsSection);

                cardsContainer.appendChild(card);

                // Render Chart.js
                const shortLabels = metrics.last7Dates.map(d => {
                    const parts = d.split('-');
                    return `${parts[1]}/${parts[2]}`;
                });

                const completedData = metrics.last7Dates.map(d => metrics.successfulDates.includes(d) ? 1 : 0);

                const commonOptions = {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { grid: { display: false } }
                    }
                };

                new Chart(document.getElementById(`barGraph-${index}`).getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: shortLabels,
                        datasets: [{
                            label: 'Completed',
                            data: completedData,
                            backgroundColor: 'rgba(108, 92, 231, 0.7)',
                            borderColor: 'rgba(108, 92, 231, 1)',
                            borderWidth: 1,
                            borderRadius: 4
                        }]
                    },
                    options: {
                        ...commonOptions,
                        scales: {
                            ...commonOptions.scales,
                            y: { ...commonOptions.scales.y, max: 1, ticks: { stepSize: 1 } }
                        }
                    }
                });

                const { countCompleted, countMissed, countPending, countAvoided } = metrics.pieData;

                const pieLabels = [];
                const pieDataArr = [];
                const pieColors = [];

                if (countCompleted > 0) { pieLabels.push('Completed'); pieDataArr.push(countCompleted); pieColors.push('rgba(46, 204, 113, 0.8)'); }
                if (countAvoided > 0) { pieLabels.push('Avoided'); pieDataArr.push(countAvoided); pieColors.push('rgba(52, 152, 219, 0.8)'); }
                if (countMissed > 0) { pieLabels.push('Missed'); pieDataArr.push(countMissed); pieColors.push('rgba(231, 76, 60, 0.8)'); }
                if (countPending > 0) { pieLabels.push('Pending'); pieDataArr.push(countPending); pieColors.push('rgba(241, 196, 15, 0.8)'); }

                if (pieDataArr.length === 0) {
                    pieLabels.push('No Data'); pieDataArr.push(1); pieColors.push('rgba(189, 195, 199, 0.5)');
                }

                new Chart(document.getElementById(`pieChart-${index}`).getContext('2d'), {
                    type: 'pie',
                    data: {
                        labels: pieLabels,
                        datasets: [{
                            data: pieDataArr,
                            backgroundColor: pieColors,
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { 
                            legend: { position: 'bottom', labels: { color: '#a0a0a0', font: { size: 12 } } }
                        }
                    }
                });
            });
        } catch (error) {
            console.error("Error fetching task analytics:", error);
            cardsContainer.innerHTML = `<div class="empty-state">Failed to load analytics. Please try again.</div>`;
        }
    };

    fetchData();
});
