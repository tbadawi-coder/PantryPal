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

        if (sender === 'assistant') {
            const parts = text.split(/\[\[([^\]]+)\]\]/g);
            const recipeNames = [];

            parts.forEach((part, i) => {
                if (i % 2 === 1) {
                    // Bold the recipe name in the text
                    const strong = document.createElement('strong');
                    strong.textContent = part;
                    contentDiv.appendChild(strong);
                    recipeNames.push(part);
                } else if (part) {
                    contentDiv.appendChild(document.createTextNode(part));
                }
            });

            messageDiv.appendChild(contentDiv);

            // Render recipe cards below the message bubble
            if (recipeNames.length > 0) {
                const cardsWrap = document.createElement('div');
                cardsWrap.className = 'chat-recipe-cards';
                recipeNames.forEach(name => {
                    const card = document.createElement('div');
                    card.className = 'chat-recipe-card';
                    card.innerHTML = `
                        <span class="chat-recipe-card-name">${name}</span>
                        <button class="chat-add-planner-btn">+ Planner</button>`;
                    card.querySelector('.chat-add-planner-btn').onclick = () => openChatPlannerModal(name);
                    cardsWrap.appendChild(card);
                });
                messageDiv.appendChild(cardsWrap);
            }
        } else {
            contentDiv.textContent = text;
            messageDiv.appendChild(contentDiv);
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function openChatPlannerModal(recipeName) {
        const existing = document.getElementById('chat-planner-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'chat-planner-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.5);display:flex;align-items:center;justify-content:center;z-index:1000';
        modal.innerHTML = `
            <div style="background:#fff;border-radius:14px;padding:28px;width:100%;max-width:380px;box-shadow:0 8px 30px rgba(0,0,0,0.12)">
                <h3 style="margin:0 0 6px;font-size:1.1rem">Add to Planner</h3>
                <p style="margin:0 0 16px;color:#64748b;font-size:0.9rem">${recipeName}</p>
                <div style="margin-bottom:12px">
                    <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px">Date</label>
                    <input type="date" id="chat-planner-date" style="width:100%;padding:10px;border-radius:10px;border:1px solid #e2e8f0;font-size:1rem;font-family:inherit;outline:none;box-sizing:border-box" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div style="margin-bottom:20px">
                    <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px">Meal</label>
                    <select id="chat-planner-meal" style="width:100%;padding:10px;border-radius:10px;border:1px solid #e2e8f0;font-size:1rem;font-family:inherit;outline:none">
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner" selected>Dinner</option>
                    </select>
                </div>
                <div style="display:flex;gap:10px">
                    <button id="chat-planner-save" style="flex:1;padding:10px;background:#4caf50;color:#fff;border:none;border-radius:10px;font-size:0.95rem;font-weight:600;cursor:pointer">Add</button>
                    <button id="chat-planner-cancel" style="flex:1;padding:10px;background:transparent;color:#334155;border:1px solid #e2e8f0;border-radius:10px;font-size:0.95rem;cursor:pointer">Cancel</button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        document.getElementById('chat-planner-cancel').onclick = () => modal.remove();
        document.getElementById('chat-planner-save').onclick = async () => {
            const date = document.getElementById('chat-planner-date').value;
            const meal_type = document.getElementById('chat-planner-meal').value;
            if (!date) return;

            // Try to find the recipe on TheMealDB
            let recipe_id = 0, recipe_image = '';
            try {
                const searchRes = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(recipeName)}`);
                const searchData = await searchRes.json();
                if (searchData.meals && searchData.meals.length > 0) {
                    recipe_id = searchData.meals[0].idMeal;
                    recipe_image = searchData.meals[0].strMealThumb;
                }
            } catch (e) {}

            try {
                const res = await fetch('/api/planner', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recipe_id, recipe_name: recipeName, recipe_image, date, meal_type })
                });
                const data = await res.json();
                if (data.conflict) {
                    if (confirm(`That slot already has "${data.existingName}". Replace it?`)) {
                        await fetch('/api/planner', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ recipe_id, recipe_name: recipeName, recipe_image, date, meal_type, confirmed: true })
                        });
                    } else return;
                }
                modal.remove();
                alert(`"${recipeName}" added to your planner!`);
            } catch (e) {
                alert('Could not save to planner. Make sure you are logged in.');
            }
        };
    }
});
