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

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const plannedHabitsContainer = document.getElementById('planned-habits-container');
    const futureTasksContainer = document.getElementById('future-tasks-container');
    
    // Modals
    const modalOverlay = document.getElementById('modal-overlay');
    const habitModal = document.getElementById('habit-modal');
    const taskModal = document.getElementById('task-modal');
    
    // Buttons
    const addHabitBtn = document.getElementById('add-planned-habit-btn');
    const addTaskBtn = document.getElementById('add-future-task-btn');
    const closeHabitModal = document.getElementById('close-habit-modal');
    const closeTaskModal = document.getElementById('close-task-modal');
    
    // Forms
    const habitForm = document.getElementById('habit-form');
    const taskForm = document.getElementById('task-form');
    
    // Filters
    const searchInput = document.getElementById('search-plans');
    const categoryFilter = document.getElementById('filter-category');
    const priorityFilter = document.getElementById('filter-priority');
    const dateFilter = document.getElementById('filter-date');
    
    // Summary Cards
    const plannedHabitsCount = document.getElementById('total-planned-habits-count');
    const plannedTasksCount = document.getElementById('total-planned-tasks-count');
    const activationsMonthCount = document.getElementById('activations-month-count');
    const upcomingWeekCount = document.getElementById('upcoming-week-count');

    // Data
    let futureHabits = [];
    let futureTasks = [];
    let activationStats = { month: 0 };

    const getHeaders = () => {
        const token = localStorage.getItem('habitToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    };

    const API_URL = '/api/future-plans';

    async function fetchPlans() {
        try {
            const response = await fetch(API_URL, { headers: getHeaders() });
            if (response.ok) {
                const plans = await response.json();
                
                // Map backend to frontend schema
                const mappedPlans = plans.map(p => ({
                    id: p._id,
                    name: p.title,
                    title: p.title,
                    type: p.type,
                    category: p.category,
                    date: p.date,
                    time: p.time,
                    priority: p.priority,
                    notes: p.notes,
                    description: p.description
                }));

                futureHabits = mappedPlans.filter(p => p.type === 'habit');
                futureTasks = mappedPlans.filter(p => p.type === 'task');
                renderAll();
            }
        } catch (error) {
            console.error("Error fetching future plans:", error);
        }
    }

    async function fetchStats() {
        try {
            const response = await fetch('/api/analytics', { headers: getHeaders() });
            if (response.ok) {
                const records = await response.json();
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                const count = records.filter(r => 
                    r.action === 'plan_activated' && 
                    new Date(r.timestamp).getMonth() === currentMonth &&
                    new Date(r.timestamp).getFullYear() === currentYear
                ).length;
                
                activationStats.month = count;
                updateSummaryCards();
            }
        } catch (error) {
            console.error("Error fetching analytics stats:", error);
        }
    }

    // Event Listeners for Modals
    addHabitBtn.addEventListener('click', () => openModal(habitModal));
    addTaskBtn.addEventListener('click', () => openModal(taskModal));
    closeHabitModal.addEventListener('click', () => closeModal(habitModal));
    closeTaskModal.addEventListener('click', () => closeModal(taskModal));
    modalOverlay.addEventListener('click', () => {
        closeModal(habitModal);
        closeModal(taskModal);
    });

    function openModal(modal, isEdit = false) {
        modalOverlay.style.display = 'block';
        modal.classList.add('active');
        
        if (modal === habitModal) {
            if (!isEdit) habitForm.reset();
            document.getElementById('habit-id').value = isEdit ? document.getElementById('habit-id').value : '';
            modal.querySelector('h2').textContent = isEdit ? 'Edit Planned Habit' : 'Add Planned Habit';
            habitForm.querySelector('button[type="submit"]').textContent = isEdit ? 'Update Habit' : 'Save Habit';
        }
        if (modal === taskModal) {
            if (!isEdit) taskForm.reset();
            document.getElementById('task-id').value = isEdit ? document.getElementById('task-id').value : '';
            modal.querySelector('h2').textContent = isEdit ? 'Edit Future Task' : 'Add Future Task';
            taskForm.querySelector('button[type="submit"]').textContent = isEdit ? 'Update Task' : 'Save Task';
        }
    }

    function closeModal(modal) {
        modalOverlay.style.display = 'none';
        modal.classList.remove('active');
    }

    // Form Submissions
    habitForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = habitForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right: 5px;"></i>Saving...';

        const id = document.getElementById('habit-id').value;
        const habitData = {
            title: document.getElementById('habit-name').value,
            category: document.getElementById('habit-category').value,
            date: document.getElementById('habit-date').value,
            priority: document.getElementById('habit-priority').value,
            notes: document.getElementById('habit-notes').value,
            type: 'habit'
        };

        try {
            const url = id ? `${API_URL}/${id}` : API_URL;
            const method = id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify(habitData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to save");
            }
            
            await fetchPlans();
            customAlert(id ? 'Habit updated successfully!' : 'Habit saved successfully!', 'success');
            closeModal(habitModal);
        } catch (error) {
            console.error("Error saving habit plan:", error);
            customAlert("Error saving habit plan: " + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = taskForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right: 5px;"></i>Saving...';

        const id = document.getElementById('task-id').value;
        const taskData = {
            title: document.getElementById('task-title').value,
            date: document.getElementById('task-date').value,
            time: document.getElementById('task-time').value,
            priority: document.getElementById('task-priority').value,
            description: document.getElementById('task-desc').value,
            type: 'task'
        };

        try {
            const url = id ? `${API_URL}/${id}` : API_URL;
            const method = id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify(taskData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Failed to save");
            }
            
            await fetchPlans();
            customAlert(id ? 'Task updated successfully!' : 'Task saved successfully!', 'success');
            closeModal(taskModal);
        } catch (error) {
            console.error("Error saving task plan:", error);
            customAlert("Error saving task plan: " + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    // Filters
    searchInput.addEventListener('input', renderAll);
    categoryFilter.addEventListener('change', renderAll);
    priorityFilter.addEventListener('change', renderAll);
    dateFilter.addEventListener('change', renderAll);

    function getFilteredItems(items, type) {
        const query = searchInput.value.toLowerCase();
        const category = categoryFilter.value;
        const priority = priorityFilter.value;
        const date = dateFilter.value;

        return items.filter(item => {
            const matchName = (item.name || item.title).toLowerCase().includes(query);
            const matchCategory = category === 'all' || (type === 'habit' && item.category === category) || (type === 'task'); 
            const matchPriority = priority === 'all' || item.priority === priority;
            const matchDate = !date || item.date === date;
            return matchName && matchCategory && matchPriority && matchDate;
        });
    }

    // Render Logic
    function renderAll() {
        const filteredHabits = getFilteredItems(futureHabits, 'habit');
        const filteredTasks = getFilteredItems(futureTasks, 'task');

        // Sort tasks by date and time
        filteredTasks.sort((a, b) => {
            const dateTimeA = new Date(`${a.date || '9999-12-31'}T${a.time || '00:00'}`);
            const dateTimeB = new Date(`${b.date || '9999-12-31'}T${b.time || '00:00'}`);
            return dateTimeA - dateTimeB;
        });

        renderItems(filteredHabits, plannedHabitsContainer, renderHabitCard, 'habits');
        renderItems(filteredTasks, futureTasksContainer, renderTaskCard, 'tasks');
        updateSummaryCards();
    }

    function renderItems(items, container, renderFunc, typeName) {
        if (items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-ghost"></i>
                    <p>No planned ${typeName} found. Start planning for the future!</p>
                </div>
            `;
            return;
        }
        container.innerHTML = items.map(renderFunc).join('');
        
        // Attach event listeners to new buttons
        items.forEach(item => {
            const editBtn = document.getElementById(`edit-${item.id}`);
            const delBtn = document.getElementById(`delete-${item.id}`);
            const actBtn = document.getElementById(`activate-${item.id}`);
            
            if (editBtn) editBtn.addEventListener('click', () => editItem(item));
            if (delBtn) delBtn.addEventListener('click', () => window.deleteFuturePlan(item.id));
            if (actBtn) actBtn.addEventListener('click', () => window.activatePlan(item.id));
        });
    }

    function getBadgeColor(category) {
        const map = {
            'Health': 'badge-health',
            'Study': 'badge-study',
            'Fitness': 'badge-fitness',
            'Productivity': 'badge-productivity',
            'Other': 'badge-other'
        };
        return map[category] || 'badge-other';
    }

    function getPriorityColor(priority) {
        const map = {
            'High': 'color: var(--danger)',
            'Medium': 'color: #e1b12c',
            'Low': 'color: var(--success)'
        };
        return map[priority] || '';
    }

    function renderHabitCard(habit) {
        return `
            <div class="plan-card">
                <div class="plan-header">
                    <h3 class="plan-title">${habit.name}</h3>
                </div>
                <div class="plan-badges">
                    <span class="badge-item ${getBadgeColor(habit.category)}">${habit.category}</span>
                    <span class="badge-item" style="${getPriorityColor(habit.priority)}; background: rgba(0,0,0,0.05);">${habit.priority} Priority</span>
                    <span class="badge-item badge-planned">Planned</span>
                </div>
                <div class="plan-details">
                    <p><i class="fa-regular fa-calendar" style="margin-right: 5px;"></i> Start Date: ${habit.date ? new Date(habit.date).toLocaleDateString() : 'Not set'}</p>
                    ${habit.notes ? `<p style="margin-top: 5px;">${habit.notes}</p>` : ''}
                </div>
                <div class="plan-actions" style="display: flex; gap: 10px; margin-top: 15px;">
                    <button class="btn-activate" id="activate-${habit.id}" style="flex: 1;">Activate Habit</button>
                    <button class="btn-cement" id="edit-${habit.id}"><i class="fa-solid fa-pen" style="margin-right: 5px;"></i> Edit</button>
                    <button class="btn-cement" id="delete-${habit.id}"><i class="fa-solid fa-trash" style="margin-right: 5px;"></i> Delete</button>
                </div>
            </div>
        `;
    }

    function renderTaskCard(task) {
        return `
            <div class="plan-card">
                <div class="plan-header">
                    <h3 class="plan-title">${task.title}</h3>
                </div>
                <div class="plan-badges">
                    <span class="badge-item" style="${getPriorityColor(task.priority)}; background: rgba(0,0,0,0.05);">${task.priority} Priority</span>
                    <span class="badge-item badge-planned">Planned</span>
                </div>
                <div class="plan-details">
                    <p><i class="fa-regular fa-calendar" style="margin-right: 5px;"></i> Planned Date: ${task.date ? new Date(task.date).toLocaleDateString() : 'Not set'}</p>
                    ${task.time ? `<p><i class="fa-regular fa-clock" style="margin-right: 5px;"></i> Planned Time: ${task.time}</p>` : ''}
                    ${task.description ? `<p style="margin-top: 5px;">${task.description}</p>` : ''}
                </div>
                <div class="plan-actions" style="display: flex; gap: 10px; margin-top: 15px; justify-content: flex-end;">
                    <button class="btn-cement" id="edit-${task.id}"><i class="fa-solid fa-pen" style="margin-right: 5px;"></i> Edit</button>
                    <button class="btn-cement" id="delete-${task.id}"><i class="fa-solid fa-trash" style="margin-right: 5px;"></i> Delete</button>
                </div>
            </div>
        `;
    }

    function editItem(item) {
        if (item.type === 'habit') {
            document.getElementById('habit-id').value = item.id;
            document.getElementById('habit-name').value = item.name;
            document.getElementById('habit-category').value = item.category;
            document.getElementById('habit-date').value = item.date;
            document.getElementById('habit-priority').value = item.priority;
            document.getElementById('habit-notes').value = item.notes;
            openModal(habitModal, true);
        } else {
            document.getElementById('task-id').value = item.id;
            document.getElementById('task-title').value = item.title;
            document.getElementById('task-date').value = item.date;
            document.getElementById('task-time').value = item.time || '';
            document.getElementById('task-priority').value = item.priority;
            document.getElementById('task-desc').value = item.description;
            openModal(taskModal, true);
        }
    }

    window.deleteFuturePlan = (id) => {
        customConfirm('Are you sure you want to delete this planned item?', async (confirmed) => {
            if (confirmed) {
                try {
                    const response = await fetch(`${API_URL}/${id}`, {
                        method: 'DELETE',
                        headers: getHeaders()
                    });
                    if (response.ok) {
                        customAlert('Item deleted.', 'success');
                        await fetchPlans();
                    } else {
                        customAlert("Failed to delete item.", 'error');
                    }
                } catch (error) {
                    console.error("Error deleting item:", error);
                }
            }
        });
    };

    window.activatePlan = (id) => {
        customConfirm('Activate this item? It will be moved to your active Task Manager.', async (confirmed) => {
            if (confirmed) {
                try {
                    // Fetch all plans to find the one we want to activate
                    const res = await fetch(API_URL, { headers: getHeaders() });
                    if (!res.ok) return;
                    
                    const allPlans = await res.json();
                    const plan = allPlans.find(p => p._id === id);
                    if (!plan) return;

                    const payload = {
                        name: plan.title,
                        type: 'DO - Task to Complete',
                        frequency: 'Daily', // Required by backend
                        priority: 'Medium',
                        isFuturePlan: false,
                        active: true
                    };
                    
                    if(plan.type === 'habit') {
                        payload.goal = 'Daily';
                    } else {
                        payload.date = new Date().toISOString().split('T')[0];
                    }

                    const createRes = await fetch('/api/tasks', {
                        method: 'POST',
                        headers: getHeaders(),
                        body: JSON.stringify(payload)
                    });

                    if (createRes.ok) {
                        await fetch(`${API_URL}/${id}`, {
                            method: 'DELETE',
                            headers: getHeaders()
                        });
                        customAlert('Activated successfully!', 'success');
                        await fetchPlans();
                    } else {
                        customAlert('Failed to activate on the backend.', 'error');
                    }
                } catch (error) {
                    console.error("Error activating:", error);
                    customAlert('An error occurred during activation.', 'error');
                }
            }
        });
    };

    function updateSummaryCards() {
        plannedHabitsCount.textContent = futureHabits.length;
        plannedTasksCount.textContent = futureTasks.length;
        activationsMonthCount.textContent = activationStats.month;

        // Calculate upcoming this week
        let upcomingCount = 0;
        const now = new Date();
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(now.getDate() + 7);

        const isUpcoming = (dateStr) => {
            if (!dateStr) return false;
            const d = new Date(dateStr);
            return d >= now && d <= oneWeekFromNow;
        };

        futureHabits.forEach(h => { if(isUpcoming(h.date)) upcomingCount++; });
        futureTasks.forEach(t => { if(isUpcoming(t.date)) upcomingCount++; });

        upcomingWeekCount.textContent = upcomingCount;
    }

    // Initial Render
    fetchPlans();
    fetchStats();
});
