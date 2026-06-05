document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. Set Current Date ---
    const headerDate = document.getElementById('header-date');
    if (headerDate) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        headerDate.textContent = new Date().toLocaleDateString('en-US', options);
    }

    // --- 2. Mood Selector ---
    const moodBtns = document.querySelectorAll('.mood-btn');
    let selectedMood = null;

    moodBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove selected class from all
            moodBtns.forEach(b => b.classList.remove('selected'));
            // Add to clicked
            e.currentTarget.classList.add('selected');
            selectedMood = e.currentTarget.dataset.mood;
        });
    });

    // --- 3. Render Recent Entries ---
    const recentEntriesList = document.getElementById('recent-entries-list');
    
    // User entries array starts empty
    let userEntries = [];
    let editingId = null;
    
    const getHeaders = () => {
        const token = sessionStorage.getItem('habitToken');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    };

    async function fetchEntries() {
        try {
            const response = await fetch('/api/diary', { headers: getHeaders() });
            if (response.ok) {
                const data = await response.json();
                userEntries = data.map(entry => ({
                    id: entry._id,
                    date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                    moodIcon: entry.moodIcon || '📝',
                    title: entry.title || 'Untitled Entry',
                    preview: entry.content
                }));
                renderRecentEntries(userEntries);
                updateTotalEntries();
            }
        } catch (error) {
            console.error("Error fetching diary entries:", error);
        }
    }

    function renderRecentEntries(entries) {
        if (!recentEntriesList) return;
        
        recentEntriesList.innerHTML = '';
        
        if (entries.length === 0) {
            recentEntriesList.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-book-open"></i>
                    <h3>No Entries Yet</h3>
                    <p>Your diary is waiting for its first entry. Reflect on your day above!</p>
                </div>
            `;
            return;
        }

        entries.forEach(entry => {
            const card = document.createElement('div');
            card.className = 'recent-entry-card';
            card.innerHTML = `
                <div class="recent-entry-header">
                    <span class="entry-date">${entry.date}</span>
                    <span class="entry-mood">${entry.moodIcon}</span>
                </div>
                <h4 class="recent-entry-title">${entry.title}</h4>
                <p class="recent-entry-preview">${entry.preview}</p>
                <div class="recent-entry-actions" style="margin-top: 10px; display: flex; gap: 8px;">
                    <button class="btn-edit" data-id="${entry.id}" style="padding: 4px 8px; background: none; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; color: #555;"><i class="fa-solid fa-pen"></i> Edit</button>
                    <button class="btn-delete" data-id="${entry.id}" style="padding: 4px 8px; background: none; border: 1px solid #ff6b6b; border-radius: 4px; cursor: pointer; color: #ff6b6b;"><i class="fa-solid fa-trash"></i> Delete</button>
                </div>
            `;
            recentEntriesList.appendChild(card);
        });

        // Add event listeners for edit and delete buttons
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', handleEditEntry);
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', handleDeleteEntry);
        });
    }

    function handleEditEntry(e) {
        const id = e.currentTarget.getAttribute('data-id');
        const entry = userEntries.find(ent => ent.id === id);
        if (entry) {
            editingId = id;
            document.getElementById('entry-title').value = entry.title === 'Untitled Entry' ? '' : entry.title;
            document.getElementById('entry-text').value = entry.preview;
            
            // Set mood
            moodBtns.forEach(b => b.classList.remove('selected'));
            selectedMood = null;
            const moodBtn = Array.from(moodBtns).find(btn => btn.innerText === entry.moodIcon);
            if (moodBtn) {
                moodBtn.classList.add('selected');
                selectedMood = moodBtn.dataset.mood;
            }

            document.getElementById('save-entry-btn').innerHTML = '<i class="fa-solid fa-save"></i> Update Entry';
            
            // Scroll to form
            document.querySelector('.diary-main-card').scrollIntoView({ behavior: 'smooth' });
        }
    }

    function handleDeleteEntry(e) {
        const id = e.currentTarget.getAttribute('data-id');
        customConfirm("Are you sure you want to delete this diary entry?", async (confirmed) => {
            if (!confirmed) return;
            
            try {
                const response = await fetch(`/api/diary/${id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });

                if (response.ok) {
                    customAlert('Entry deleted successfully!', 'success');
                    
                    // Clear form if we were editing this exact entry
                    if (editingId === id) {
                        resetForm();
                    }
                    
                    await fetchEntries();
                } else {
                    customAlert('Failed to delete entry.', 'error');
                }
            } catch (error) {
                console.error("Error deleting entry:", error);
                customAlert('An error occurred while deleting.', 'error');
            }
        });
    }

    function resetForm() {
        editingId = null;
        document.getElementById('entry-title').value = '';
        document.getElementById('entry-text').value = '';
        moodBtns.forEach(b => b.classList.remove('selected'));
        selectedMood = null;
        document.getElementById('save-entry-btn').innerHTML = '<i class="fa-solid fa-save"></i> Save Entry';
    }

    function updateTotalEntries() {
        const totalEntriesEl = document.getElementById('total-entries');
        if (totalEntriesEl) {
            totalEntriesEl.textContent = userEntries.length;
        }

        const streakEl = document.getElementById('journal-streak');
        if (streakEl) {
            let streak = 0;
            if (userEntries.length > 0) {
                // Sort entries by date descending
                const sortedDates = [...new Set(userEntries.map(e => {
                    const d = new Date(e.date);
                    d.setHours(0, 0, 0, 0);
                    return d.getTime();
                }))].sort((a, b) => b - a);

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayTime = today.getTime();
                const yesterdayTime = todayTime - 86400000;

                let i = 0;
                let checkTime = sortedDates[0];

                // Streak starts either today or yesterday
                if (checkTime === todayTime || checkTime === yesterdayTime) {
                    while (i < sortedDates.length && sortedDates[i] === checkTime) {
                        streak++;
                        checkTime -= 86400000; // go back 1 day
                        i++;
                    }
                }
            }
            streakEl.textContent = `${streak} Day${streak !== 1 ? 's' : ''}`;
        }

        const moodEl = document.getElementById('average-mood');
        if (moodEl) {
            if (userEntries.length === 0) {
                moodEl.textContent = 'None';
            } else {
                const moodScores = {
                    '😄': 5,
                    '🙂': 4,
                    '😐': 3,
                    '😔': 2,
                    '😫': 1,
                    '📝': 3
                };
                let totalScore = 0;
                let validCount = 0;
                
                userEntries.forEach(entry => {
                    if (moodScores[entry.moodIcon]) {
                        totalScore += moodScores[entry.moodIcon];
                        validCount++;
                    }
                });

                if (validCount > 0) {
                    const avg = Math.round(totalScore / validCount);
                    const reverseMood = {
                        5: '😄',
                        4: '🙂',
                        3: '😐',
                        2: '😔',
                        1: '😫'
                    };
                    moodEl.textContent = reverseMood[avg] || '😐';
                } else {
                    moodEl.textContent = 'None';
                }
            }
        }
    }

    // Initial Fetch
    await fetchEntries();

    // --- 4. Save Entry ---
    const saveBtn = document.getElementById('save-entry-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const title = document.getElementById('entry-title').value;
            const text = document.getElementById('entry-text').value;
            
            if (!selectedMood && !text) {
                customAlert('Please select a mood or write some thoughts before saving.', 'error');
                return;
            }

            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
            saveBtn.disabled = true;
            
            let moodIcon = '📝';
            if (selectedMood) {
                const selectedBtn = document.querySelector('.mood-btn.selected');
                if (selectedBtn) moodIcon = selectedBtn.innerText;
            }

            try {
                const isUpdating = editingId !== null;
                const url = isUpdating ? `/api/diary/${editingId}` : '/api/diary';
                const method = isUpdating ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method: method,
                    headers: getHeaders(),
                    body: JSON.stringify({
                        title: title || 'Untitled Entry',
                        content: text || '...',
                        moodIcon: moodIcon
                    })
                });

                if (response.ok) {
                    customAlert(`Diary entry ${isUpdating ? 'updated' : 'saved'} successfully!`, 'success');
                    await fetchEntries(); // Reload from backend
                    resetForm();
                } else {
                    customAlert(`Failed to ${isUpdating ? 'update' : 'save'} entry.`, 'error');
                }
            } catch (error) {
                console.error("Error saving entry:", error);
                customAlert('An error occurred while saving.', 'error');
            } finally {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
            }
        });
    }
});
