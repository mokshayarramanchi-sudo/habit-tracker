document.addEventListener("DOMContentLoaded", async () => {
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let analyticsData = null;
    let barChart = null;
    let lineChart = null;

    const calendarGrid = document.getElementById("analyticsCalendar");
    const calendarMonthYear = document.getElementById("calendarMonthYear");
    const prevMonthBtn = document.getElementById("prevMonth");
    const nextMonthBtn = document.getElementById("nextMonth");

    const fetchAnalytics = async () => {
        try {
            const token = sessionStorage.getItem('habitToken');
            if (!token) {
                window.location.href = '/signin';
                return;
            }

            const response = await fetch('/api/analytics/progress', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to fetch analytics");
            analyticsData = await response.json();
            
            updateDashboard();
        } catch (error) {
            console.error(error);
        }
    };

    const updateDashboard = () => {
        if (!analyticsData) return;
        renderCalendar();
        renderInsights();
        renderCharts();
    };

    const renderCalendar = () => {
        calendarGrid.innerHTML = '';
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        calendarMonthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        // Empty slots
        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement("div");
            emptyDiv.className = "calendar-day empty";
            calendarGrid.appendChild(emptyDiv);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const dayDiv = document.createElement("div");
            dayDiv.className = "calendar-day";
            
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const data = analyticsData.calendarData[dateStr];

            const numSpan = document.createElement("div");
            numSpan.className = "day-number";
            numSpan.textContent = i;
            dayDiv.appendChild(numSpan);

            if (data) {
                const statSpan = document.createElement("div");
                statSpan.className = "day-stats";
                statSpan.textContent = `${data.completed}/${data.total}`;
                dayDiv.appendChild(statSpan);

                if (data.percent >= 80) dayDiv.classList.add('prod-high');
                else if (data.percent >= 50) dayDiv.classList.add('prod-medium');
                else dayDiv.classList.add('prod-low');

                dayDiv.addEventListener('click', () => showDayDetails(dateStr, data));
            } else {
                dayDiv.classList.add('prod-none');
                
                const emptyStatSpan = document.createElement("div");
                emptyStatSpan.className = "day-stats";
                emptyStatSpan.textContent = `0/0`;
                dayDiv.appendChild(emptyStatSpan);

                dayDiv.addEventListener('click', () => showDayDetails(dateStr, {
                    completed: 0,
                    total: 0,
                    percent: 0,
                    isStreak: false
                }));
            }

            calendarGrid.appendChild(dayDiv);
        }
    };

    const renderInsights = () => {
        const { metrics } = analyticsData;
        
        document.getElementById("insightCurrentStreak").textContent = `${metrics.currentStreak} days`;
        document.getElementById("insightBestStreak").textContent = `${metrics.bestStreak} days`;
        document.getElementById("insightAvgProductivity").textContent = `${metrics.avgProductivity}%`;
        
        const hDay = metrics.highestDay;
        const lDay = metrics.lowestDay;
        
        document.getElementById("insightHighestDay").textContent = hDay ? `${hDay.date} (${hDay.percent}%)` : '-';
        document.getElementById("insightLowestDay").textContent = lDay ? `${lDay.date} (${lDay.percent}%)` : '-';
    };

    const renderCharts = () => {
        const { metrics, calendarData } = analyticsData;
        const labels = metrics.last7Dates;

        const completedData = [];
        const percentData = [];

        labels.forEach(date => {
            if (calendarData[date]) {
                completedData.push(calendarData[date].completed);
                percentData.push(calendarData[date].percent);
            } else {
                completedData.push(0);
                percentData.push(0);
            }
        });

        const shortLabels = labels.map(d => {
            const parts = d.split('-');
            return `${parts[1]}/${parts[2]}`;
        });

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                x: { grid: { display: false } }
            }
        };

        const barCtx = document.getElementById('barGraphCanvas').getContext('2d');
        if (barChart) barChart.destroy();
        barChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: shortLabels,
                datasets: [{
                    label: 'Completed Tasks',
                    data: completedData,
                    backgroundColor: 'rgba(108, 92, 231, 0.7)',
                    borderColor: 'rgba(108, 92, 231, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: commonOptions
        });

        const lineCtx = document.getElementById('lineGraphCanvas').getContext('2d');
        if (lineChart) lineChart.destroy();
        lineChart = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: shortLabels,
                datasets: [{
                    label: 'Productivity %',
                    data: percentData,
                    borderColor: 'rgba(46, 204, 113, 1)',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: 'rgba(46, 204, 113, 1)',
                    pointRadius: 4
                }]
            },
            options: {
                ...commonOptions,
                scales: {
                    ...commonOptions.scales,
                    y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.05)' } }
                }
            }
        });
    };

    const showDayDetails = (dateStr, data) => {
        document.getElementById("modalDateTitle").textContent = dateStr;
        document.getElementById("modalCompleted").textContent = data.completed;
        document.getElementById("modalPending").textContent = Math.max(0, data.total - data.completed);
        document.getElementById("modalTotal").textContent = data.total;
        document.getElementById("modalPercentage").textContent = `${data.percent}%`;
        document.getElementById("modalStreak").innerHTML = data.isStreak ? 
            '<span style="color:#2ecc71"><i class="fa-solid fa-check"></i> Yes</span>' : 
            '<span style="color:#e74c3c"><i class="fa-solid fa-xmark"></i> No</span>';
        
        document.getElementById("dayDetailModal").classList.add("active");
    };

    document.querySelector(".close-modal").addEventListener("click", () => {
        document.getElementById("dayDetailModal").classList.remove("active");
    });

    prevMonthBtn.addEventListener("click", () => {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        updateDashboard();
    });

    nextMonthBtn.addEventListener("click", () => {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        updateDashboard();
    });

    fetchAnalytics();
});
