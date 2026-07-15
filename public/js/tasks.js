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
    const API_URL = '/api/tasks';
    const taskForm = document.querySelector('.task-form');
    const taskList = document.getElementById('taskList');
    const taskCount = document.getElementById('taskCount');
    const taskNameInput = taskForm.querySelector('input[type="text"]');
    const taskTypeSelect = taskForm.querySelector('select[name="taskType"]');
    const frequencySelect = taskForm.querySelector('select[name="frequency"]');
    const minDaysGroup = document.getElementById('minDaysGroup');
    const minDaysLabel = document.getElementById('minDaysLabel');
    const minDaysInput = document.getElementById('minDays');
    const timeTrackingInput = document.getElementById('timeTracking');
    const timeTrackingField = document.getElementById('timeTrackingField');
    const timeValueInput = document.getElementById('timeValue');
    const submitBtn = taskForm.querySelector('.add-btn');
    const clearBtn = taskForm.querySelector('.clear-btn');

    let tasks = [];
    let editIndex = null;
    let editTaskId = null;

    const escapeHtml = (text) => {
        return String(text).replace(/[&<>\"]/g, (match) => {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;'
            };
            return map[match];
        });
    };

    const renderTasks = () => {
        taskCount.textContent = `${tasks.length} task${tasks.length === 1 ? '' : 's'}`;

        if (tasks.length === 0) {
            taskList.innerHTML = '<p class="empty-state">No tasks added yet. Add a task to start tracking.</p>';
            return;
        }

        taskList.innerHTML = tasks.map((task, index) => {
            const taskId = task._id || task.id || index;
            const timeText = task.timeTracking ? `<span class="task-badge">Estimated ${escapeHtml(task.timeValue)} min</span>` : '';
            const activeClass = task.active === false ? 'inactive' : '';
            const eyeIcon = task.active === false ? 'fa-eye-slash' : 'fa-eye';
            const minDaysText = task.minDays ? `<span class="task-badge">Min ${escapeHtml(task.minDays)} days/${task.frequency === 'Weekly' ? 'week' : 'month'}</span>` : '';
            return `
                    <article class="task-item ${activeClass}" data-id="${escapeHtml(taskId)}">
                        <div class="task-info">
                            <div class="task-title-row">
                                <h3>${escapeHtml(task.name)}</h3>
                            </div>
                            <div class="task-meta">
                                <span class="task-badge">${escapeHtml(task.type)}</span>
                                <span class="task-badge">${escapeHtml(task.frequency)}</span>
                            </div>
                            <div class="task-meta">
                                ${timeText}
                                ${minDaysText}
                            </div>
                        </div>
                        <div class="task-actions">
                            <button type="button" class="task-action toggle-btn" data-id="${escapeHtml(taskId)}" aria-label="Toggle Active">
                                <i class="fa-solid ${eyeIcon}"></i>
                            </button>
                            <button type="button" class="task-action edit-btn" data-id="${escapeHtml(taskId)}" aria-label="Edit Task">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button type="button" class="task-action delete-btn" data-id="${escapeHtml(taskId)}" aria-label="Delete Task">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </article>
                `;
        }).join('');
    };

    const resetForm = () => {
        taskForm.reset();
        editIndex = null;
        editTaskId = null;
        submitBtn.textContent = 'Add Task';
        timeTrackingField.classList.add('hidden');
        timeValueInput.required = false;
        minDaysGroup.classList.add('hidden');
        minDaysInput.required = false;
        minDaysInput.value = '';
    };

    const populateForm = (task, index) => {
        taskNameInput.value = task.name;
        taskTypeSelect.value = task.type;
        frequencySelect.value = task.frequency;
        timeTrackingInput.checked = task.timeTracking;

        if (task.frequency === 'Weekly' || task.frequency === 'Monthly') {
            minDaysGroup.classList.remove('hidden');
            minDaysLabel.textContent = task.frequency === 'Weekly' ? 'Minimum days/week' : 'Minimum days/month';
            minDaysInput.placeholder = task.frequency === 'Weekly' ? 'e.g. 3' : 'e.g. 15';
            minDaysInput.min = '1';
            minDaysInput.max = task.frequency === 'Weekly' ? '7' : '31';
            minDaysInput.value = task.minDays || '';
        } else {
            minDaysGroup.classList.add('hidden');
            minDaysInput.value = '';
        }

        if (task.timeTracking) {
            timeTrackingField.classList.remove('hidden');
            timeValueInput.value = task.timeValue;
            timeValueInput.required = true;
        } else {
            timeTrackingField.classList.add('hidden');
            timeValueInput.value = '';
            timeValueInput.required = false;
        }

        editIndex = index;
        editTaskId = task._id || task.id || null;
        submitBtn.textContent = 'Update Task';
    };

    const getAuthHeaders = (json = true) => {
        const token = localStorage.getItem('habitToken');
        const headers = { 'Authorization': `Bearer ${token}` };
        if (json) headers['Content-Type'] = 'application/json';
        return headers;
    };

    const createTask = async (payload) => {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Failed to create task');
        }

        return response.json();
    };

    const updateTask = async (id, payload) => {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Failed to update task');
        }

        return response.json();
    };

    const deleteTaskById = async (id) => {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(false)
        });

        if (!response.ok) {
            throw new Error('Failed to delete task');
        }

        return response.json();
    };

    const loadTasks = async () => {
        try {
            const response = await fetch(API_URL, {
                headers: getAuthHeaders(false)
            });
            if (!response.ok) {
                throw new Error('Failed to load tasks');
            }
            tasks = await response.json();
            renderTasks();
        } catch (error) {
            console.error(error);
            taskList.innerHTML = '<p class="empty-state">Unable to load tasks. Check backend server.</p>';
        }
    };

    const findTaskIndexById = (id) => {
        return tasks.findIndex((task) => task._id === id || task.id === id);
    };

    taskList.addEventListener('click', async (event) => {
        const toggleButton = event.target.closest('.toggle-btn');
        const editButton = event.target.closest('.edit-btn');
        const deleteButton = event.target.closest('.delete-btn');

        if (toggleButton) {
            const taskId = toggleButton.dataset.id;
            const index = findTaskIndexById(taskId);
            if (index === -1) return;

            const task = tasks[index];
            try {
                await updateTask(taskId, { active: !task.active });
                await loadTasks();
                customAlert(`Task ${!task.active ? 'activated' : 'deactivated'} successfully!`, 'success');
            } catch (error) {
                console.error(error);
                customAlert('Failed to update task status.', 'error');
            }
            return;
        }

        if (editButton) {
            const taskId = editButton.dataset.id;
            const index = findTaskIndexById(taskId);
            if (index === -1) return;
            populateForm(tasks[index], index);
            customAlert('Task loaded for editing. Make your changes above.', 'info');
            return;
        }

        if (deleteButton) {
            const taskId = deleteButton.dataset.id;
            const index = findTaskIndexById(taskId);
            if (index === -1) return;

            customConfirm("Are you sure you want to delete this task?", async (confirmed) => {
                if (!confirmed) return;
                try {
                    await deleteTaskById(taskId);
                    if (editTaskId === taskId) {
                        resetForm();
                    }
                    await loadTasks();
                    customAlert('Task deleted successfully!', 'success');
                } catch (error) {
                    console.error(error);
                    customAlert('Failed to delete task.', 'error');
                }
            });
            return;
        }
    });

    timeTrackingInput.addEventListener('change', () => {
        if (timeTrackingInput.checked) {
            timeTrackingField.classList.remove('hidden');
            timeValueInput.required = true;
        } else {
            timeTrackingField.classList.add('hidden');
            timeValueInput.required = false;
            timeValueInput.value = '';
        }
    });

    // Show minimum days when Weekly frequency selected
    frequencySelect.addEventListener('change', () => {
        if (frequencySelect.value === 'Weekly' || frequencySelect.value === 'Monthly') {
            minDaysGroup.classList.remove('hidden');
            minDaysInput.required = true;
            minDaysLabel.textContent = frequencySelect.value === 'Weekly' ? 'Minimum days/week' : 'Minimum days/month';
            minDaysInput.placeholder = frequencySelect.value === 'Weekly' ? 'e.g. 3' : 'e.g. 15';
            minDaysInput.min = '1';
            minDaysInput.max = frequencySelect.value === 'Weekly' ? '7' : '31';
        } else {
            minDaysGroup.classList.add('hidden');
            minDaysInput.required = false;
            minDaysInput.value = '';
        }
    });

    taskForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const name = taskNameInput.value.trim();
        const type = taskTypeSelect.value;
        const frequency = frequencySelect.value;
        const timeTracking = timeTrackingInput.checked;
        const timeValue = timeTracking ? timeValueInput.value.trim() : '';

        if (!name) {
            taskNameInput.focus();
            return;
        }

        const active = (editIndex !== null && tasks[editIndex] && typeof tasks[editIndex].active !== 'undefined') ? tasks[editIndex].active : true;
        const minDays = (frequency === 'Weekly' || frequency === 'Monthly') ? (minDaysInput.value.trim() || '') : '';
        const payload = { name, type, frequency, timeTracking, timeValue, minDays, active };

        try {
            if (editTaskId) {
                await updateTask(editTaskId, payload);
                customAlert('Task updated successfully!', 'success');
            } else {
                await createTask(payload);
                customAlert('Task created successfully!', 'success');
            }

            await loadTasks();
            resetForm();
        } catch (error) {
            console.error(error);
            customAlert('An error occurred while saving the task.', 'error');
        }
    });

    clearBtn.addEventListener('click', resetForm);

    loadTasks();
});
