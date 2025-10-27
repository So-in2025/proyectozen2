// /js/chat-frontend.js
/**
 * Lógica de frontend para Zen Assistant.
 * VERSIÓN MEJORADA CON TEXT-TO-SPEECH (TTS) Y CORRECCIÓN DE REPRODUCCIÓN.
 */

import { getState } from './state.js';
import { showNotification } from './modals.js';
import { updateSelectedItems, clearAllSelections, toggleSelectionMode } from './app.js';
import { handlePlanSelection } from './points.js';

// --- INICIO: BLOQUE TTS MODIFICADO ---

// Hacemos la función manejadora accesible globalmente para el 'onclick'
window.handleTTSButtonClick = (buttonElement) => {
    const text = buttonElement.dataset.text;
    const isCurrentlyPlayingThis = ttsManager.isPlaying && buttonElement.classList.contains('playing');

    // Siempre detenemos cualquier audio en curso. Esto simplifica el estado.
    ttsManager.stop();
    
    // Si no estábamos reproduciendo ESTE audio específico, lo iniciamos.
    if (!isCurrentlyPlayingThis) {
        ttsManager.speak(text, buttonElement);
    }
};

let voices = [];
let selectedVoiceURI = localStorage.getItem('zenAssistantVoiceURI');
let shouldAutoplay = localStorage.getItem('zenTtsAutoplay') === 'true';

const ttsManager = {
    isPlaying: false,
    
    stop: function() {
        window.speechSynthesis.cancel();
        this.isPlaying = false;
        // Reinicia el estilo de TODOS los botones de reproducción
        document.querySelectorAll('.tts-btn.playing').forEach(btn => {
            btn.innerHTML = '▶️ Escuchar';
            btn.classList.remove('playing');
        });
    },

    speak: function(text, buttonElement) {
        // Si por alguna razón ya se está reproduciendo algo, no hagas nada.
        if (this.isPlaying) return;

        const utterance = new SpeechSynthesisUtterance(text);
        const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        } else {
            const fallbackVoice = voices.find(v => v.lang.startsWith('es-'));
            if (fallbackVoice) utterance.voice = fallbackVoice;
        }

        utterance.lang = 'es-ES';
        utterance.rate = 1.05;
        utterance.pitch = 1;

        utterance.onstart = () => {
            this.isPlaying = true;
            if (buttonElement) {
                buttonElement.innerHTML = '⏹️ Detener';
                buttonElement.classList.add('playing');
            }
        };

        utterance.onend = () => {
            this.isPlaying = false;
            if (buttonElement) {
                buttonElement.innerHTML = '▶️ Escuchar';
                buttonElement.classList.remove('playing');
            }
        };
        
        window.speechSynthesis.speak(utterance);
    }
};

// --- FIN: BLOQUE TTS MODIFICADO ---

document.addEventListener('DOMContentLoaded', () => {
    const chatMessagesContainer = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendChatBtn = document.getElementById('chat-send-btn');
    const summaryCard = document.getElementById('summaryCard');

    if (!chatMessagesContainer || !chatInput || !sendChatBtn) {
        console.error("Elementos esenciales del chat no encontrados.");
        return;
    }

    let chatHistory = [];
    let isSending = false;
    
    function populateVoiceList() {
        voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('es-'));
        const voiceSelect = document.getElementById('voice-selector');
        if (!voiceSelect || voices.length === 0) {
            document.getElementById('voice-selector-container')?.remove();
            return;
        };

        voiceSelect.innerHTML = '';
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name.replace('Google', '').trim()} (${voice.lang})`;
            option.value = voice.voiceURI;
            voiceSelect.appendChild(option);
        });

        const savedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
        if (savedVoice) {
            voiceSelect.value = savedVoice.voiceURI;
        } else {
            const googleVoice = voices.find(v => v.name.includes('Google') && v.name.includes('español')) || voices[0];
            if (googleVoice) {
                 voiceSelect.value = googleVoice.voiceURI;
                 selectedVoiceURI = googleVoice.voiceURI;
                 localStorage.setItem('zenAssistantVoiceURI', selectedVoiceURI);
            }
        }
    }
    
    function createVoiceSelector() {
        const selectorContainer = document.createElement('div');
        selectorContainer.id = 'voice-selector-container';
        selectorContainer.className = 'mb-2 p-2 bg-slate-800 rounded-md flex items-center flex-wrap gap-2';
        selectorContainer.innerHTML = `
            <div class="flex items-center gap-2 flex-grow">
              <label for="voice-selector" class="text-sm font-bold text-slate-300">Voz:</label>
              <select id="voice-selector" class="w-full styled-input text-sm text-cyan-300"></select>
            </div>
            <div class="flex items-center gap-2">
                <label for="autoplay-toggle" class="text-sm font-bold text-slate-300">Autoplay Voz:</label>
                <input type="checkbox" id="autoplay-toggle" class="custom-checkbox">
            </div>
        `;
        chatMessagesContainer.parentNode.insertBefore(selectorContainer, chatMessagesContainer);

        const voiceSelect = document.getElementById('voice-selector');
        voiceSelect.addEventListener('change', (e) => {
            selectedVoiceURI = e.target.value;
            localStorage.setItem('zenAssistantVoiceURI', selectedVoiceURI);
            ttsManager.stop();
        });

        const autoplayToggle = document.getElementById('autoplay-toggle');
        autoplayToggle.checked = shouldAutoplay;
        autoplayToggle.addEventListener('change', (e) => {
            shouldAutoplay = e.target.checked;
            localStorage.setItem('zenTtsAutoplay', shouldAutoplay);
            if (!shouldAutoplay) ttsManager.stop();
        });
    }

    if (typeof speechSynthesis !== 'undefined') {
        createVoiceSelector();
        populateVoiceList();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoiceList;
        }
    }
    
    window.addEventListener('beforeunload', () => ttsManager.stop());

    // --- NUEVA FUNCIÓN PARA AÑADIR SERVICIOS DINÁMICAMENTE ---
    function dynamicallyAddServiceToUI(service) {
        // Busca un contenedor adecuado para servicios estándar (no exclusivos)
        const container = document.querySelector('#servicesSelection .p-4:not(:has(input[name="selectionGroup"])) .grid');
        if (!container) {
            console.error("No se encontró un contenedor para añadir el servicio dinámico.");
            return false;
        }

        // Evita duplicados si el chat recomienda el mismo servicio nuevo varias veces
        if (document.getElementById(`standard-${service.id}`)) return true;

        const serviceHTML = `
            <div class="item-card tooltip-container flex items-center justify-between p-3 bg-purple-900/50 rounded-lg transition duration-150 cursor-pointer border border-purple-500">
                <label class="flex-grow cursor-pointer text-sm pr-2">${service.name} (Sugerido)</label>
                <div class="flex items-center gap-3">
                    <span class="font-bold text-red-400">$${service.price.toFixed(2)} USD</span>
                    <input type="checkbox" name="item-${service.id}" class="custom-checkbox ml-4"
                        id="standard-${service.id}" value="${service.id}" data-price="${service.price}" data-name="${service.name}" data-type="standard">
                </div>
                <div class="tooltip-content">${service.description || 'Sugerencia de la IA.'}</div>
            </div>`;
        
        container.insertAdjacentHTML('beforeend', serviceHTML);
        showNotification('info', 'Nuevo Servicio Sugerido', `Zen Assistant ha añadido "${service.name}" a tu catálogo para este presupuesto.`);
        return true;
    }

    const findServiceById = (id) => {
        const state = getState();
        // Primero busca en planes mensuales, ya que sus IDs pueden ser numéricos
        const plan = state.monthlyPlans.find(p => p.id == id);
        if (plan) return { type: 'plan', item: plan };

        // Luego busca en todos los demás servicios
        const allStandardServices = Object.values(state.allServices).flatMap(category => category.items);
        const service = allStandardServices.find(s => s.id === id);
        
        if (service) {
            const isPackage = Object.values(state.allServices).some(cat => cat.isExclusive && cat.items.some(i => i.id === id));
            const serviceType = isPackage ? 'package' : (service.pointCost ? 'plan-service' : 'standard');
            return { type: serviceType, item: service };
        }
        return null;
    };

    function createServiceButtonHTML(serviceId, serviceType, serviceName) {
        return `<button 
            data-action="add-service" 
            data-service-id="${serviceId}" 
            data-service-type="${serviceType}" 
            class="add-service-btn bg-slate-900 text-cyan-300 font-bold py-2 px-4 rounded-lg hover:bg-cyan-800 hover:text-white transition duration-200 mt-2 mr-2">
            Añadir ${serviceName}
        </button>`;
    }

    function addMessageToChat(message, role) {
        const sender = role === 'user' ? 'user' : 'ai';
        const wrapper = document.createElement('div');
        wrapper.className = 'chat-message flex flex-col my-2';

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble p-3 rounded-lg max-w-[85%] relative';
        
        let finalHTML = message.replace(/\n/g, '<br>');
        let textToSpeak = message;

        if (sender === 'ai') {
            try {
                const jsonResponse = JSON.parse(message);
                if (jsonResponse.introduction && Array.isArray(jsonResponse.services)) {
                    
                    let cleanText = `${jsonResponse.introduction}\n\n${jsonResponse.closing}\n\n`;
                    if (jsonResponse.sales_pitch) {
                        cleanText += `Aquí tienes un argumento de venta para tu cliente: ${jsonResponse.sales_pitch}\n\n`;
                    }
                    if (jsonResponse.client_questions) {
                        cleanText += `Para definir mejor el proyecto, puedes preguntarle a tu cliente: ${jsonResponse.client_questions.join(' ')}`;
                    }
                    textToSpeak = cleanText;
                    
                    let messageText = `${jsonResponse.introduction.replace(/\n/g, '<br>')}`;
                    let serviceButtonsHTML = '';
                    
                    jsonResponse.services.forEach(serviceObject => {
                        if (serviceObject.is_new) {
                            if (dynamicallyAddServiceToUI(serviceObject)) {
                                const serviceInfo = { type: 'standard', item: serviceObject };
                                serviceButtonsHTML += createServiceButtonHTML(serviceInfo.item.id, serviceInfo.type, serviceInfo.item.name);
                            }
                        } else {
                            const serviceInfo = findServiceById(serviceObject.id);
                            if (serviceInfo) {
                                serviceButtonsHTML += createServiceButtonHTML(serviceInfo.item.id, serviceInfo.type, serviceInfo.item.name);
                            } else {
                                console.warn(`Servicio recomendado no encontrado: ID=${serviceObject.id}, Nombre=${serviceObject.name}`);
                                serviceButtonsHTML += `<button class="add-service-btn bg-red-900 text-white font-bold py-2 px-4 rounded-lg mt-2 mr-2 cursor-not-allowed" disabled>Error: "${serviceObject.name}" no encontrado</button>`;
                            }
                        }
                    });
                    
                    if (jsonResponse.closing) messageText += `<br><br>${jsonResponse.closing.replace(/\n/g, '<br>')}`;
                    finalHTML = messageText;
                    
                    if (serviceButtonsHTML) {
                        // AÑADIR BOTÓN PARA APLICAR TODA LA PROPUESTA
                        const applyAllButton = `<button 
                            data-action="apply-proposal" 
                            data-services='${JSON.stringify(jsonResponse.services)}'
                            class="apply-proposal-btn bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition duration-200 mt-2 w-full sm:w-auto">
                            ✔️ Aplicar Propuesta Sugerida
                        </button>`;
                        
                        finalHTML += `<div class="mt-3 pt-3 border-t border-slate-600">
                            <p class="text-sm font-bold text-purple-300 mb-2">Acciones Rápidas:</p>
                            <div class="flex flex-wrap gap-2">${applyAllButton}${serviceButtonsHTML}</div>
                        </div>`;
                    }

                    if (Array.isArray(jsonResponse.client_questions) && jsonResponse.client_questions.length > 0) {
                        let questionButtonsHTML = '';
                        jsonResponse.client_questions.forEach(question => {
                            const escapedQuestion = question.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                            questionButtonsHTML += `<button onclick='document.getElementById("chat-input").value = "Mi cliente respondió a \\'${escapedQuestion}\\', y dijo que..."; document.getElementById("chat-input").focus();' 
                                class="suggested-question-btn text-left text-sm bg-slate-800 text-slate-300 py-2 px-3 rounded-lg hover:bg-slate-600 transition duration-200 mt-2 w-full">
                                ❔ ${question}
                            </button>`;
                        });

                        finalHTML += `<div class="mt-3 pt-3 border-t border-slate-600">
                            <p class="text-sm font-bold text-yellow-300 mb-2">Pregúntale a tu Cliente:</p>
                            <div class="flex flex-col items-start gap-2">${questionButtonsHTML}</div>
                        </div>`;
                    }
                    
                    if (jsonResponse.sales_pitch) {
                        const pitchId = `pitch-${Date.now()}`;
                        finalHTML += `<div class="mt-3 pt-3 border-t border-slate-600">
                            <p class="text-sm font-bold text-green-300 mb-2">Argumento de Venta (Para tu Cliente):</p>
                            <div class="p-3 bg-slate-800 rounded-lg border border-slate-600 relative">
                                <p id="${pitchId}" class="text-slate-200 text-sm">${jsonResponse.sales_pitch.replace(/\n/g, '<br>')}</p>
                                <button onclick="navigator.clipboard.writeText(document.getElementById('${pitchId}').innerText); this.innerText='¡Copiado!';"
                                    class="absolute top-2 right-2 text-xs bg-slate-900 text-cyan-300 font-bold py-1 px-2 rounded hover:bg-cyan-800 transition">
                                    Copiar
                                </button>
                            </div>
                        </div>`;
                    }
                }
            } catch (e) { /* No es JSON, es texto plano */ }

            const escapedTextToSpeak = textToSpeak.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
            const ttsButtonHTML = `
                <button onclick='window.handleTTSButtonClick(this)' 
                        data-text='${escapedTextToSpeak}'
                        class="tts-btn absolute bottom-2 right-2 text-xs bg-slate-900 text-cyan-300 font-bold py-1 px-2 rounded hover:bg-cyan-800 transition">
                    ▶️ Escuchar
                </button>
            `;
            finalHTML = `<div class="pr-20 pb-2">${finalHTML}</div>${ttsButtonHTML}`;
        }

        if (sender === 'user') {
            wrapper.classList.add('items-end');
            bubble.classList.add('bg-cyan-500', 'text-slate-900', 'rounded-br-none');
            bubble.innerHTML = finalHTML;
        } else {
            wrapper.classList.add('items-start');
            bubble.classList.add('bg-slate-700', 'text-slate-50', 'rounded-bl-none');
            bubble.innerHTML = finalHTML;
            
            if (shouldAutoplay) {
                setTimeout(() => {
                    const lastButton = bubble.querySelector('.tts-btn');
                    if (lastButton) ttsManager.speak(lastButton.dataset.text, lastButton);
                }, 300);
            }
        }

        wrapper.appendChild(bubble);
        chatMessagesContainer.appendChild(wrapper);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    async function sendMessage() {
        ttsManager.stop();
        const userMessage = chatInput.value.trim();
        if (!userMessage || isSending) return;

        isSending = true;
        sendChatBtn.disabled = true;
        addMessageToChat(userMessage, 'user');
        
        const payload = { userMessage: userMessage, history: chatHistory };
        chatHistory.push({ role: 'user', parts: [{ text: userMessage }] }); 
        chatInput.value = '';
        chatInput.focus();
        toggleTypingIndicator(true);

        try {
            const response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Error de servidor. Revisa el log de la función en Netlify.' }));
                throw new Error(errorData.message || `Error de red: ${response.status}`);
            }

            const data = await response.json();
            chatHistory = data.history; 
            const aiResponseText = data.response; 
            addMessageToChat(aiResponseText, 'model');

        } catch (error) {
            console.error("Error detallado al enviar mensaje:", error);
            addMessageToChat(`Lo siento, hubo un error de conexión con el asistente. Error: ${error.message}`, 'model');
        } finally {
            isSending = false;
            sendChatBtn.disabled = false;
            toggleTypingIndicator(false);
        }
    }

    function toggleTypingIndicator(show) {
        let indicator = document.getElementById('typing-indicator');
        if (show) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'typing-indicator';
                indicator.className = 'chat-message flex items-start my-2';
                indicator.innerHTML = `<div class="chat-bubble bg-slate-700 rounded-bl-none p-3 flex items-center space-x-1">
                    <span class="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span class="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.2s;"></span>
                    <span class="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.4s;"></span>
                </div>`;
                chatMessagesContainer.appendChild(indicator);
            }
        } else {
            if (indicator) indicator.remove();
        }
    }
    
    // --- NUEVA FUNCIÓN PARA APLICAR LA PROPUESTA DE LA IA ---
    function applyAiProposal(servicesToApply) {
        clearAllSelections();

        const packageService = servicesToApply.find(s => findServiceById(s.id)?.type === 'package');
        const planService = servicesToApply.find(s => findServiceById(s.id)?.type === 'plan');

        if (packageService) {
            toggleSelectionMode('puntual');
            const packageElement = document.getElementById(`package-${packageService.id}`);
            if (packageElement) packageElement.click();
        
        } else if (planService) {
            toggleSelectionMode('mensual');
            const planElement = document.getElementById(`plan-${planService.id}`);
            if (planElement) {
                planElement.click(); // Esto activa handlePlanSelection
                // Espera un momento para que se renderice el DOM de los servicios del plan
                setTimeout(() => {
                    servicesToApply.forEach(service => {
                        if (service.id !== planService.id) {
                            const serviceCheckbox = document.getElementById(`plan-service-${service.id}`);
                            if (serviceCheckbox && !serviceCheckbox.disabled) {
                                serviceCheckbox.click();
                            }
                        }
                    });
                }, 100);
            }
        } else { // Items individuales
            toggleSelectionMode('puntual');
            servicesToApply.forEach(service => {
                const serviceElement = document.getElementById(`standard-${service.id}`);
                if (serviceElement) serviceElement.click();
            });
        }
        
        // La llamada a updateSelectedItems se hace dentro de los .click()
        showNotification('success', 'Propuesta Aplicada', 'Los servicios sugeridos por la IA han sido seleccionados.');
        summaryCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function initChat() {
        chatMessagesContainer.innerHTML = '';
        chatHistory = [];
        const welcomeMessage = '¡Hola! Soy Zen Assistant. Describe el proyecto de tu cliente y te ayudaré a seleccionar los servicios.';
        addMessageToChat(welcomeMessage, 'model');
        chatHistory.push({ role: 'model', parts: [{ text: welcomeMessage }] });

        sendChatBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') { event.preventDefault(); sendMessage(); }
        });

        chatMessagesContainer.addEventListener('click', (event) => {
            const target = event.target.closest('[data-action]');
            if (!target || target.disabled) return;
            
            const { action } = target.dataset;

            if (action === 'add-service') {
                const { serviceId, serviceType } = target.dataset;
                const elementId = serviceType === 'plan' ? `plan-${serviceId}` : `${serviceType}-${serviceId}`;
                const serviceElement = document.getElementById(elementId);
                if (serviceElement) {
                    serviceElement.click();
                    if(summaryCard) summaryCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    target.classList.remove('bg-slate-900', 'text-cyan-300', 'hover:bg-cyan-800');
                    target.classList.add('bg-green-700', 'text-white', 'cursor-default');
                    target.textContent = `Añadido ✔️`;
                    target.disabled = true;
                } else {
                    console.error(`Elemento del DOM no encontrado: #${elementId}`);
                    target.textContent = `Error: No encontrado`;
                    target.disabled = true;
                }
            } else if (action === 'apply-proposal') {
                const servicesData = target.dataset.services;
                if(servicesData) {
                    applyAiProposal(JSON.parse(servicesData));
                }
            }
        });
    }

    initChat();
});