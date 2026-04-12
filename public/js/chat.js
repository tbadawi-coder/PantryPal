document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const messagesContainer = document.getElementById('messages');
    const sendBtn = document.getElementById('sendBtn');
    const spinner = document.getElementById('spinner');

    let conversationHistory = [];

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const message = messageInput.value.trim();
        if (!message) return;

        // Disable input while sending
        messageInput.disabled = true;
        sendBtn.disabled = true;
        spinner.style.display = 'inline-block';

        // Display user message
        displayMessage(message, 'user');
        messageInput.value = '';

        try {
            // Send message to server
            const response = await fetch('/chat/message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    conversationHistory: conversationHistory
                })
            });

            if (!response.ok) {
                const error = await response.json();
                const userMessage = error.userMessage || error.error || 'Failed to get response. Please try again.';
                displayMessage(userMessage, 'error');
                console.error('OpenAI debug:', error.error);
                throw new Error(error.error);
            }

            const data = await response.json();

            // Add to conversation history
            conversationHistory.push({
                role: 'user',
                content: message
            });
            conversationHistory.push({
                role: 'assistant',
                content: data.message
            });

            // Display AI response
            displayMessage(data.message, 'assistant');

        } catch (error) {
            console.error('Error:', error);
            displayMessage(
                'Oops! Something went wrong. Please check your API key or try again later.',
                'error'
            );
        } finally {
            // Re-enable input
            messageInput.disabled = false;
            sendBtn.disabled = false;
            spinner.style.display = 'none';
            messageInput.focus();
        }
    });

    function displayMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = text;

        messageDiv.appendChild(contentDiv);
        messagesContainer.appendChild(messageDiv);

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
});
