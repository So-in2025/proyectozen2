// --- CHATBOT LOGIC ---

export function initChat() {
    const chatMessagesContainer = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('chat-send-btn');
    let chatHistory = [];
    let isSending = false;

    function addMessageToChat(message, role) {
        const sender = role === 'user' ? 'user' : 'ai';
        const wrapper = document.createElement('div');
        wrapper.className = 'chat-message flex flex-col my-2';
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble p-3 rounded-lg max-w-[85%] relative';
        let finalHTML = message.replace(/\n/g, '<br>');

        if (sender === 'ai') {
             try {
                // Attempt to parse AI response as JSON for structured content
                const jsonResponse = JSON.parse(message);
                if (jsonResponse.introduction && Array.isArray(jsonResponse.services)) {
                    let messageText = `${jsonResponse.introduction.replace(/\n/g, '<br>')}`;
                     if (jsonResponse.closing) messageText += `<br><br>${jsonResponse.closing.replace(/\n/g, '<br>')}`;
                    finalHTML = messageText;
                }
            } catch (e) { /* Not a JSON response, render as plain text */ }
        }

        if (sender === 'user') {
            wrapper.classList.add('items-end');
            bubble.classList.add('bg-cyan-500', 'text-slate-900', 'rounded-br-none');
        } else {
            wrapper.classList.add('items-start');
            bubble.classList.add('bg-slate-700', 'text-slate-50', 'rounded-bl-none');
        }
        bubble.innerHTML = finalHTML;
        wrapper.appendChild(bubble);
        chatMessagesContainer.appendChild(wrapper);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    async function sendMessage() {
        const userMessage = chatInput.value.trim();
        if (!userMessage || isSending) return;
        
        isSending = true;
        sendChatBtn.disabled = true;
        addMessageToChat(userMessage, 'user');
        
        // Prepare payload for the Netlify function
        const payload = { userMessage: userMessage, history: chatHistory };
        
        // Optimistically update local history for the UI
        chatHistory.push({ role: 'user', parts: [{ text: userMessage }] }); 
        
        chatInput.value = '';
        chatInput.focus();
        
        try {
            const response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error de red: ${response.status}`);
            }

            const data = await response.json();
            
            // Update history with the full exchange from the server
            chatHistory = data.history; 
            
            addMessageToChat(data.response, 'model');

        } catch (error) {
            console.error("Error al enviar mensaje:", error);
            addMessageToChat(`Lo siento, hubo un error de conexión con el asistente: ${error.message}`, 'model');
            // Rollback the last user message if the API call fails
            chatHistory.pop();
        } finally {
            isSending = false;
            sendChatBtn.disabled = false;
        }
    }
    
    const welcomeMessage = '¡Hola! Soy Zen Assistant. Describe el proyecto de tu cliente y te ayudaré a seleccionar los servicios.';
    addMessageToChat(welcomeMessage, 'model');
    // Start the chat history with the welcome message from the model
    chatHistory.push({ role: 'model', parts: [{ text: welcomeMessage }] });

    sendChatBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { 
            event.preventDefault(); 
            sendMessage(); 
        }
    });
}
