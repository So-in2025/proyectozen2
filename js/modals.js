import { dom } from './dom.js';
import { getState, setCustomServices } from './state.js';
import { updateSelectedItems } from './appLogic.js';
import { showNotification } from './modals.js';

// --- MODAL CONTROLS ---

export function showNotification(type, title, message) {
    if (!dom.notificationTitle || !dom.notificationMessage || !dom.notificationModal) return;
    dom.notificationTitle.textContent = title;
    dom.notificationMessage.innerHTML = message;
    const header = dom.notificationModal.querySelector('.modal-header');
    if (!header) return;
    header.className = 'modal-header p-4 rounded-t-xl text-white font-bold flex justify-between items-center';
    const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-cyan-600' };
    header.classList.add(colors[type] || 'bg-cyan-600');
    dom.notificationModal.classList.remove('hidden');
}

export function closeNotificationModal() {
    if (dom.notificationModal) dom.notificationModal.classList.add('hidden');
}

export function showCustomServiceModal() {
    if (document.querySelector('input[name="selectionGroup"]:checked, input[name="monthlyPlanSelection"]:checked')) {
        return showNotification('error', 'Error', 'No puedes añadir ítems personalizados cuando un paquete o plan está seleccionado.');
    }
    if (dom.customServiceNameInput) dom.customServiceNameInput.value = '';
    if (dom.customServicePriceInput) dom.customServicePriceInput.value = '';
    if (dom.customServiceModal) dom.customServiceModal.classList.remove('hidden');
}

export function closeCustomServiceModal() {
    if (dom.customServiceModal) dom.customServiceModal.classList.add('hidden');
}

export function showPdfOptionsModal() {
    const { tasks } = getState();
    if (tasks.length === 0) return showNotification('info', 'Vacío', 'No hay tareas guardadas para exportar.');
    if (dom.pdfOptionsModal) dom.pdfOptionsModal.classList.remove('hidden');
}

export function closePdfOptionsModal() {
    if (dom.pdfOptionsModal) dom.pdfOptionsModal.classList.add('hidden');
}


// --- INFO MODAL & TTS LOGIC ---

export function playInfoNarration() {
    const synth = window.speechSynthesis;
    if (synth.speaking) {
        synth.cancel();
        return;
    }

    let narrationQueue = Array.from(document.querySelectorAll('.vocal-highlight'));
    let lastHighlightedPoint = null;
    
    function processNarrationQueue() {
        if (narrationQueue.length === 0) {
            if (lastHighlightedPoint) lastHighlightedPoint.classList.add('highlighted');
            return;
        }

        const elementToSpeak = narrationQueue.shift();
        const textToSpeak = elementToSpeak.textContent || '';
        const parentPoint = elementToSpeak.closest('.business-pillar, .workflow-step');

        if (parentPoint && parentPoint !== lastHighlightedPoint) {
            if (lastHighlightedPoint) lastHighlightedPoint.classList.remove('highlighted');
            parentPoint.classList.add('highlighted');
            parentPoint.scrollIntoView({ behavior: 'smooth', block: 'center' });
            lastHighlightedPoint = parentPoint;
        }

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'es-US';
        utterance.rate = 1.1;
        utterance.onstart = () => elementToSpeak.classList.add('speaking');
        utterance.onend = () => {
            elementToSpeak.classList.remove('speaking');
            setTimeout(processNarrationQueue, 100);
        };
        utterance.onerror = (e) => {
            console.error("Error en TTS:", e);
            document.querySelectorAll('.business-pillar, .workflow-step').forEach(el => el.classList.add('highlighted'));
        };
        synth.speak(utterance);
    }
    processNarrationQueue();
}
