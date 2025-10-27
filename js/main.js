import { initializeDomReferences } from './dom.js';
import { loadPricingData, loadTasks } from './data.js';
import { initializeAppListeners, resetForm } from './appLogic.js';
import { initChat } from './chat.js';
import { playInfoNarration } from './modals.js';
import { initializeUI, renderTasksDashboard } from './ui.js';

/**
 * Initializes the main application's core features.
 * This function is called ONLY after the user clicks "INGRESAR".
 */
async function initializeMainApp() {
    initializeDomReferences(); // Populates the global `dom` object with main app elements
    await loadPricingData();
    initializeUI(); // Now render UI after data is loaded
    loadTasks();
    renderTasksDashboard(); // And render the dashboard after tasks are loaded
    resetForm();
    initChat();
    initializeAppListeners();
}

/**
 * Primary Entry Point. Handles the splash screen logic and then bootstraps the main app.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Get splash screen elements locally, as the main `dom` object is not yet populated.
    const splashScreen = document.getElementById('splashScreen');
    const mainAppContainer = document.getElementById('mainAppContainer');
    const enterAppBtn = document.getElementById('enterAppBtn');
    const showInfoModelBtn = document.getElementById('showInfoModelBtn');
    const infoModal = document.getElementById('infoModal');
    const infoModalCloseBtn = document.getElementById('infoModalCloseBtn');
    const playInfoNarrationBtn = document.getElementById('playInfoNarrationBtn');

    // Handle case where user has already visited in the session
    if (sessionStorage.getItem('splashSeen') === 'true') {
        if (splashScreen) splashScreen.style.display = 'none';
        if (mainAppContainer) mainAppContainer.classList.remove('hidden');
        initializeMainApp();
        return;
    }

    // Attach listener for entering the main application
    if (enterAppBtn) {
        enterAppBtn.addEventListener('click', () => {
            sessionStorage.setItem('splashSeen', 'true');
            if (splashScreen) {
                splashScreen.style.opacity = '0';
                setTimeout(() => {
                    splashScreen.style.display = 'none';
                    if (mainAppContainer) {
                        mainAppContainer.classList.remove('hidden');
                    }
                    // Crucially, initialize the main application logic AFTER the user has clicked enter.
                    initializeMainApp();
                }, 700);
            }
        }, { once: true });
    } else {
        console.error("CRITICAL: 'enterAppBtn' not found!");
    }

    // Attach listeners for the info modal, which is controlled from the splash screen
    if (showInfoModelBtn) {
        showInfoModelBtn.addEventListener('click', () => {
            if (infoModal) infoModal.classList.remove('hidden');
        });
    } else {
        console.error("CRITICAL: 'showInfoModelBtn' not found!");
    }
    
    if (infoModalCloseBtn) {
        infoModalCloseBtn.addEventListener('click', () => {
            window.speechSynthesis.cancel(); // Stop TTS if it's speaking
            if (infoModal) infoModal.classList.add('hidden');
        });
    }

    if (playInfoNarrationBtn) {
        playInfoNarrationBtn.addEventListener('click', playInfoNarration);
    }
});