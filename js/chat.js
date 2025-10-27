// --- CHATBOT LOGIC ---
import { getState } from './state.js';

export function initChat() {
    const chatMessagesContainer = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('chat-send-btn');
    const sendIcon = document.getElementById('send-icon');
    const loadingSpinner = document.getElementById('chat-loading-spinner');
    const chatStatusIndicator = document.getElementById('chat-status-indicator');

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
                    let recommendationHtml = `<p>${jsonResponse.introduction.replace(/\n/g, '<br>')}</p>`;

                    recommendationHtml += `<h4 class="text-lg font-semibold mt-4 mb-2 text-purple-300">Servicios Recomendados:</h4><ul class="list-disc list-inside space-y-1 text-slate-200">`;
                    jsonResponse.services.forEach(svc => {
                        if (svc.is_new) {
                            recommendationHtml += `<li><strong>⭐ ${svc.name}</strong> (ID: ${svc.id}): ${svc.description} - Costo Prod: $${svc.price ? svc.price.toFixed(2) : 'N/A'}</li>`;
                        } else {
                            recommendationHtml += `<li><strong>✔️ ${svc.name}</strong> (ID: ${svc.id})</li>`;
                        }
                    });
                    recommendationHtml += `</ul>`;

                    if (jsonResponse.sales_pitch) {
                        recommendationHtml += `<h4 class="text-lg font-semibold mt-4 mb-2 text-purple-300">Argumento de Venta para tu Cliente:</h4><p class="italic text-slate-300">${jsonResponse.sales_pitch.replace(/\n/g, '<br>')}</p>`;
                    }

                    if (jsonResponse.client_questions && jsonResponse.client_questions.length > 0) {
                        recommendationHtml += `<h4 class="text-lg font-semibold mt-4 mb-2 text-purple-300">Preguntas Clave para tu Cliente:</h4><ul class="list-disc list-inside space-y-1 text-slate-200">`;
                        jsonResponse.client_questions.forEach(q => {
                            recommendationHtml += `<li>${q}</li>`;
                        });
                        recommendationHtml += `</ul>`;
                    }

                    recommendationHtml += `<p class="mt-4">${jsonResponse.closing.replace(/\n/g, '<br>')}</p>`;
                    finalHTML = recommendationHtml;
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
        sendIcon.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');
        if (chatStatusIndicator) chatStatusIndicator.classList.remove('bg-green-400', 'animate-pulse');
        if (chatStatusIndicator) chatStatusIndicator.classList.add('bg-yellow-400'); // Indicate thinking

        addMessageToChat(userMessage, 'user');
        
        // Prepare payload for the Netlify function, including pricingData
        const { allServices, monthlyPlans } = getState();
        const payload = { 
            userMessage: userMessage, 
            history: chatHistory,
            pricingData: { allServices, monthlyPlans } 
        };
        
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
            sendIcon.classList.remove('hidden');
            loadingSpinner.classList.add('hidden');
            if (chatStatusIndicator) chatStatusIndicator.classList.remove('bg-yellow-400');
            if (chatStatusIndicator) chatStatusIndicator.classList.add('bg-green-400', 'animate-pulse'); // Back to active
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