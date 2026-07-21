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
        const token = localStorage.getItem('habitToken');
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
                    originalDate: entry.date,
                    moodIcon: entry.moodIcon || '📝',
                    title: entry.title || 'Untitled Entry',
                    preview: entry.content
                }));
                renderRecentEntries(userEntries);
                updateTotalEntries();
                renderCalendar();
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

        const lastEntryEl = document.getElementById('last-entry-date');
        if (lastEntryEl) {
            if (userEntries.length > 0) {
                // Sort by date descending
                const latestEntry = userEntries.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0];
                const entryD = new Date(latestEntry.date);
                entryD.setHours(0, 0, 0, 0);
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const diffTime = Math.abs(today - entryD);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) {
                    lastEntryEl.textContent = 'Today';
                } else if (diffDays === 1) {
                    lastEntryEl.textContent = 'Yesterday';
                } else if (diffDays < 7) {
                    lastEntryEl.textContent = `${diffDays} days ago`;
                } else {
                    lastEntryEl.textContent = entryD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }
            } else {
                lastEntryEl.textContent = 'None';
            }
        }

        const entriesMonthEl = document.getElementById('entries-this-month');
        if (entriesMonthEl) {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthEntries = userEntries.filter(e => {
                const d = new Date(e.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
            entriesMonthEl.textContent = monthEntries.length;
        }
    }

    // --- 3.5 Calendar View Initialization ---
    let currentDateObj = new Date();
    let currentMonth = currentDateObj.getMonth();
    let currentYear = currentDateObj.getFullYear();

    // Initial Fetch
    await fetchEntries();
    
    function renderCalendar() {
        const monthYearHeader = document.getElementById('calendar-month-year');
        const calendarGrid = document.getElementById('calendar-grid');
        if (!monthYearHeader || !calendarGrid) return;
        
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        monthYearHeader.textContent = `${monthNames[currentMonth]} ${currentYear}`;
        
        calendarGrid.innerHTML = '';
        
        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // Add empty slots
        for (let i = 0; i < firstDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'calendar-day empty';
            calendarGrid.appendChild(emptyDiv);
        }
        
        const entriesByDate = {};
        userEntries.forEach(e => {
            const d = new Date(e.originalDate || e.date);
            const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            if (!entriesByDate[dateStr]) entriesByDate[dateStr] = [];
            entriesByDate[dateStr].push(e);
        });
        
        const today = new Date();
        const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            
            const numSpan = document.createElement('div');
            numSpan.className = 'day-number';
            numSpan.textContent = day;
            dayDiv.appendChild(numSpan);
            
            const dateStr = `${currentYear}-${currentMonth}-${day}`;
            const dayEntries = entriesByDate[dateStr] || [];
            
            const statSpan = document.createElement('div');
            statSpan.className = 'day-stats';
            
            if (dayEntries.length > 0) {
                if (dayEntries.length >= 2) {
                    dayDiv.classList.add('prod-high');
                } else {
                    dayDiv.classList.add('prod-medium');
                }
                statSpan.textContent = `${dayEntries.length}`;
            } else {
                dayDiv.classList.add('prod-none');
                statSpan.textContent = '0';
            }
            dayDiv.appendChild(statSpan);
            
            if (isCurrentMonth && day === today.getDate()) {
                dayDiv.style.border = '2px solid var(--primary)';
            }
            
            dayDiv.addEventListener('click', () => {
                showDayDetails(currentYear, currentMonth, day, dayEntries);
                filterEntriesByDate(currentYear, currentMonth, day);
            });
            
            calendarGrid.appendChild(dayDiv);
        }
    }
    
    document.getElementById('prev-month')?.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });
    
    document.getElementById('next-month')?.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });
    
    function filterEntriesByDate(year, month, day) {
        const filtered = userEntries.filter(e => {
            const d = new Date(e.originalDate || e.date);
            return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        });
        
        renderRecentEntries(filtered);
        
        const sectionHeader = document.querySelector('.recent-entries-card h2');
        if (sectionHeader) {
            sectionHeader.innerHTML = `Entries for ${new Date(year, month, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            
            let viewAllBtn = document.getElementById('view-all-entries-btn');
            if (!viewAllBtn) {
                viewAllBtn = document.createElement('button');
                viewAllBtn.id = 'view-all-entries-btn';
                viewAllBtn.className = 'btn-secondary';
                viewAllBtn.style = 'margin-left: 12px; font-size: 0.8rem; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-color); cursor: pointer; background: var(--bg-main); color: var(--text-main);';
                viewAllBtn.textContent = 'View All';
                viewAllBtn.addEventListener('click', () => {
                    renderRecentEntries(userEntries);
                    sectionHeader.innerHTML = 'Recent Entries';
                    viewAllBtn.remove();
                });
                sectionHeader.appendChild(viewAllBtn);
            }
        }
    }

    function showDayDetails(year, month, day, dayEntries) {
        const dateStr = new Date(year, month, day).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
        document.getElementById("modalDateTitle").textContent = dateStr;
        
        const modalBody = document.getElementById("modalDiaryEntries");
        modalBody.innerHTML = '';
        
        if (dayEntries.length === 0) {
            modalBody.innerHTML = '<p style="text-align: center; color: var(--text-muted); border: none;">No entries for this date.</p>';
        } else {
            const entriesList = document.createElement('div');
            entriesList.style.display = 'flex';
            entriesList.style.flexDirection = 'column';
            entriesList.style.gap = '10px';
            
            dayEntries.forEach(entry => {
                const entryDiv = document.createElement('div');
                entryDiv.style.padding = '12px';
                entryDiv.style.background = 'var(--bg-main)';
                entryDiv.style.borderRadius = '8px';
                entryDiv.style.border = '1px solid var(--border-color)';
                
                entryDiv.innerHTML = `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong style="color: var(--text-main); font-size: 1.1rem;">${entry.title}</strong>
                        <span style="font-size: 1.2rem;">${entry.moodIcon}</span>
                    </div>
                    <p style="color: var(--text-muted); font-size: 0.95rem; margin: 0; border: none; padding: 0; line-height: 1.4;">${entry.preview}</p>
                    <div style="margin-top: 10px; display: flex; gap: 8px;">
                        <button class="btn-edit-modal" data-id="${entry.id}" style="padding: 4px 8px; background: none; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; color: #555;"><i class="fa-solid fa-pen"></i> Edit</button>
                        <button class="btn-delete-modal" data-id="${entry.id}" style="padding: 4px 8px; background: none; border: 1px solid #ff6b6b; border-radius: 4px; cursor: pointer; color: #ff6b6b;"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                `;
                entriesList.appendChild(entryDiv);
            });
            modalBody.appendChild(entriesList);

            modalBody.querySelectorAll('.btn-edit-modal').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.getElementById("dayDetailModal").classList.remove("active");
                    handleEditEntry(e);
                });
            });

            modalBody.querySelectorAll('.btn-delete-modal').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.getElementById("dayDetailModal").classList.remove("active");
                    handleDeleteEntry(e);
                });
            });
        }
        
        document.getElementById("dayDetailModal").classList.add("active");
    }
    
    document.querySelector(".close-modal")?.addEventListener("click", () => {
        document.getElementById("dayDetailModal").classList.remove("active");
    });

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
