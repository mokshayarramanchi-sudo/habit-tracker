document.addEventListener('DOMContentLoaded', () => {
    // Inject the AI Chat HTML structure into the body
    const chatHTML = `
        <div id="ai-chat-widget">
            <button id="ai-chat-toggle" aria-label="Toggle AI Coach">
                <i class="fa-solid fa-robot"></i>
                <i class="fa-solid fa-times"></i>
            </button>
            
            <div id="ai-chat-container">
                <div id="ai-chat-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-brain"></i>
                        <div>
                            <h3>AI Coach</h3>
                            <p>Ask for advice or analyze your progress</p>
                        </div>
                    </div>
                    <a href="/ai-coach" aria-label="Open full screen" style="color: white; text-decoration: none; font-size: 1.2rem; transition: transform 0.2s;">
                        <i class="fa-solid fa-expand"></i>
                    </a>
                </div>
                
                <div id="ai-chat-messages">
                    <div class="typing-indicator" id="ai-typing">
                        <span></span><span></span><span></span>
                    </div>
                </div>
                
                <div class="full-input-container">
                    <div id="ai-chat-input-area">
                        <input type="text" id="ai-chat-input" placeholder="Ask your coach something..." autocomplete="off">
                        <button id="ai-chat-send" aria-label="Send message">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatHTML);

    const widget = document.getElementById('ai-chat-widget');
    const toggleBtn = document.getElementById('ai-chat-toggle');
    const sendBtn = document.getElementById('ai-chat-send');
    const inputField = document.getElementById('ai-chat-input');
    const messagesContainer = document.getElementById('ai-chat-messages');
    const typingIndicator = document.getElementById('ai-typing');

    // Toggle Chat
    toggleBtn.addEventListener('click', () => {
        widget.classList.toggle('open');
        if (widget.classList.contains('open')) {
            inputField.focus();
        }
    });

    // Close chat if clicked outside
    document.addEventListener('click', (e) => {
        if (widget.classList.contains('open') && !widget.contains(e.target)) {
            widget.classList.remove('open');
        }
    });

    // Keep track of conversation history in sessionStorage for the current day only
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
        const existing = document.getElementById('inline-widget-suggestions');
        if (existing) existing.remove();
        
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.id = 'inline-widget-suggestions';
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

    // Handle Sending Messages
    const sendMessage = async () => {
        const text = inputField.value.trim();
        if (!text) return;

        const inlineSuggestions = document.getElementById('inline-widget-suggestions');
        if (inlineSuggestions) inlineSuggestions.remove();

        // Add user message
        appendMessage('user', text);
        chatHistory.push({ sender: 'user', text: text });
        saveHistory();
        inputField.value = '';
        
        // Show typing indicator
        typingIndicator.classList.add('active');
        messagesContainer.appendChild(typingIndicator); // move to bottom
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
        
        // Insert before typing indicator
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
