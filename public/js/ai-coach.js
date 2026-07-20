document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('ai-chat-send');
    const inputField = document.getElementById('ai-chat-input');
    const messagesContainer = document.getElementById('ai-chat-messages');
    const typingIndicator = document.getElementById('ai-typing');

    // Load conversation history from sessionStorage (shared with dashboard widget)
    const today = new Date().toLocaleDateString('en-CA');
    let savedData = JSON.parse(sessionStorage.getItem('aiChatHistory')) || { date: today, messages: [] };
    
    // Reset if it's a new day
    if (savedData.date !== today) {
        savedData = { date: today, messages: [] };
    }

    let chatHistory = savedData.messages;

    const saveHistory = () => {
        sessionStorage.setItem('aiChatHistory', JSON.stringify({ date: today, messages: chatHistory }));
    };

    if (chatHistory.length === 0) {
        const greeting = "Hello! I'm your AI Habit Coach. I can analyze your progress and help you stay on track. How can I help you today?";
        chatHistory.push({ sender: 'ai', text: greeting });
        appendMessage('ai', greeting);
        saveHistory();
    } else {
        chatHistory.forEach(msg => appendMessage(msg.sender, msg.text));
    }

    const appendSuggestions = () => {
        // Remove existing if any
        const existing = document.getElementById('inline-chat-suggestions');
        if (existing) existing.remove();
        
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.id = 'inline-chat-suggestions';
        suggestionsDiv.className = 'chat-suggestions-inline';
        suggestionsDiv.innerHTML = `
            <button class="suggestion-btn">What should I focus on today?</button>
            <button class="suggestion-btn">Summarize my recent progress.</button>
            <button class="suggestion-btn">How can I improve my mood?</button>
            <button class="suggestion-btn">Can you review my diary entries?</button>
            <button class="suggestion-btn">Help me brainstorm a new habit.</button>
            <button class="suggestion-btn">Which habits have I neglected?</button>
        `;
        
        messagesContainer.insertBefore(suggestionsDiv, typingIndicator);
        scrollToBottom();

        suggestionsDiv.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                inputField.value = btn.textContent;
                sendMessage();
            });
        });
    };

    if (chatHistory.length <= 1) {
        appendSuggestions();
    }

    const sendMessage = async () => {
        const text = inputField.value.trim();
        if (!text) return;

        const inlineSuggestions = document.getElementById('inline-chat-suggestions');
        if (inlineSuggestions) inlineSuggestions.remove();

        appendMessage('user', text);
        chatHistory.push({ sender: 'user', text: text });
        saveHistory();
        inputField.value = '';
        
        typingIndicator.classList.add('active');
        messagesContainer.appendChild(typingIndicator);
        scrollToBottom();

        try {
            const token = localStorage.getItem('habitToken');
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    message: text,
                    chatHistory: chatHistory.slice(-11, -1) // only pass the last 10 messages to save API tokens
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Server error');
            }

            const data = await response.json();
            
            typingIndicator.classList.remove('active');
            appendMessage('ai', data.reply);
            chatHistory.push({ sender: 'ai', text: data.reply });
            saveHistory();
            
        } catch (error) {
            console.error('Error communicating with AI coach:', error);
            typingIndicator.classList.remove('active');
            appendMessage('ai', "Sorry, I'm having trouble connecting right now. " + error.message);
        }
    };

    function formatMessageText(text) {
        let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        return html;
    }

    function appendMessage(sender, text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${sender}`;
        msgDiv.innerHTML = formatMessageText(text);
        
        messagesContainer.insertBefore(msgDiv, typingIndicator);
        scrollToBottom();
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    sendBtn.addEventListener('click', sendMessage);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});
