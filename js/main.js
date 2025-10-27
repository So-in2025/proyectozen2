import { initializeDomReferences } from './dom.js';
import { loadPricingData, loadTasks, saveTasks } from './data.js';
import { initChat } from './chat.js';
import { getState, setTasks } from './state.js';
import { showNotification, closeNotificationModal, showCustomServiceModal, closeCustomServiceModal, showPdfOptionsModal, closePdfOptionsModal, playInfoNarration } from './modals.js';
import { resetForm, editTask, deleteTask, handleAddTask, updateSelectedItems, filterServices, toggleSelectionMode, clearAllSelections, handlePlanSelection, handleServiceSelection, removeCustomService, addCustomServiceToSelection } from './appLogic.js';
import { startPresentation, initiatePresentation, closePresentation, showSlide } from './presentation.js';
import { generatePdf } from './pdf.js';

// Wrapper functions for global access from HTML (if needed, though we prefer event listeners)
window.generatePdf = generatePdf; // Keep for now as it's used in HTML onclick

async function initializeApp() {
    // The dom object is already initialized from the DOMContentLoaded listener
    const dom = (await import('./dom.js')).dom;

    await loadPricingData();
    loadTasks();
    resetForm();
    initChat();

    // --- MAIN EVENT LISTENERS ---
    dom.serviceTypeSelect?.addEventListener('change', (e) => toggleSelectionMode(e.target.value));
    dom.clearSelectionsBtn?.addEventListener('click', clearAllSelections);
    dom.addTaskButton?.addEventListener('click', handleAddTask);
    dom.marginPercentageInput?.addEventListener('input', updateSelectedItems);
    dom.serviceSearchInput?.addEventListener('input', (e) => filterServices(e.target.value));
    document.getElementById('presentProposalBtn')?.addEventListener('click', initiatePresentation);
    document.getElementById('exportPdfBtn')?.addEventListener('click', showPdfOptionsModal);
    
    dom.clearAllTasksBtn?.addEventListener('click', () => {
        if (getState().tasks.length > 0 && confirm("¿Estás seguro de que deseas borrar TODAS las tareas?")) {
            setTasks([]);
            saveTasks();
            resetForm();
            showNotification('info', 'Tareas Borradas', 'Todas las tareas han sido eliminadas.');
        }
    });

    // --- MODAL EVENT LISTENERS ---
    // Notification Modal
    document.querySelectorAll('.close-notification-btn').forEach(btn => btn.addEventListener('click', closeNotificationModal));

    // Custom Service Modal
    document.getElementById('showCustomServiceModalBtn')?.addEventListener('click', showCustomServiceModal);
    document.getElementById('closeCustomServiceModalBtn')?.addEventListener('click', closeCustomServiceModal);
    document.getElementById('addCustomServiceBtn')?.addEventListener('click', addCustomServiceToSelection);

    // PDF Options Modal
    document.getElementById('closePdfOptionsModalBtn')?.addEventListener('click', closePdfOptionsModal);
    document.getElementById('generatePdfClientBtn')?.addEventListener('click', () => generatePdf(true));
    document.getElementById('generatePdfInternalBtn')?.addEventListener('click', () => generatePdf(false));


    // --- PRESENTATION MODAL LISTENERS ---
    document.getElementById('startPresentationBtn')?.addEventListener('click', startPresentation);
    document.getElementById('presentationCloseBtn')?.addEventListener('click', closePresentation);
    document.getElementById('prevSlideBtn')?.addEventListener('click', () => showSlide('prev'));
    document.getElementById('nextSlideBtn')?.addEventListener('click', () => showSlide('next'));
    document.addEventListener('keydown', (e) => {
        const presentationModal = document.getElementById('presentationModal');
        if (presentationModal && !presentationModal.classList.contains('hidden')) {
            if (e.key === 'ArrowRight') showSlide('next');
            else if (e.key === 'ArrowLeft') showSlide('prev');
            else if (e.key === 'Escape') closePresentation();
        }
    });

    // --- INFO MODAL LISTENERS (moved from splash screen context to general) ---
    document.getElementById('infoModalCloseBtn')?.addEventListener('click', () => {
        window.speechSynthesis.cancel();
        const infoModal = document.getElementById('infoModal');
        if (infoModal) infoModal.classList.add('hidden');
    });
    document.getElementById('playInfoNarrationBtn')?.addEventListener('click', playInfoNarration);

    // --- EVENT DELEGATION FOR DYNAMIC CONTENT ---
    dom.appContainer?.addEventListener('change', (e) => {
        const target = e.target;
        if (target.matches('input[name="selectionGroup"], input[data-type="standard"]')) {
            const monthlyPlanChecked = document.querySelector('input[name="monthlyPlanSelection"]:checked');
            if (monthlyPlanChecked) clearAllSelections(); // If a plan was selected, clear everything first
            if (target.name === 'selectionGroup') {
                document.querySelectorAll('input[data-type="standard"]').forEach(cb => cb.checked = false);
            } else {
                const selectionGroupChecked = document.querySelector('input[name="selectionGroup"]:checked');
                if (selectionGroupChecked) selectionGroupChecked.checked = false;
            }
            updateSelectedItems();
        } else if (target.matches('input[name="monthlyPlanSelection"]')) {
            const selectionGroupChecked = document.querySelector('input[name="selectionGroup"]:checked');
            if (selectionGroupChecked) selectionGroupChecked.checked = false;
            document.querySelectorAll('input[data-type="standard"]:checked').forEach(cb => cb.checked = false);
            handlePlanSelection(target.value);
            updateSelectedItems();
        } else if (target.matches('input[name^="plan-service-"]')) {
            handleServiceSelection(target, target.checked);
        }
    });

    dom.appContainer?.addEventListener('click', (e) => {
        const target = e.target;
        const card = target.closest('.item-card');
        if (card && !target.matches('input')) {
            const input = card.querySelector('input');
            if (input && !input.disabled) input.click();
        }
        const actionButton = target.closest('[data-action]');
        if (actionButton) {
            const { action, index, id } = actionButton.dataset;
            if (action === 'edit') editTask(parseInt(index));
            if (action === 'delete') deleteTask(parseInt(index));
            if (action === 'remove-custom') removeCustomService(id);
        }
    });
}

// --- SPLASH SCREEN LOGIC (ENTRY POINT) ---
document.addEventListener('DOMContentLoaded', () => {
    // CRITICAL FIX: Initialize DOM references AFTER the DOM has loaded.
    initializeDomReferences();

    // Get splash screen elements directly to ensure they are found and not null.
    const splashScreen = document.getElementById('splashScreen');
    const mainAppContainer = document.getElementById('mainAppContainer');
    const enterAppBtn = document.getElementById('enterAppBtn');
    const showInfoModelBtn = document.getElementById('showInfoModelBtn');
    const infoModal = document.getElementById('infoModal');

    if (sessionStorage.getItem('splashSeen')) {
        if (splashScreen) splashScreen.style.display = 'none';
        if (mainAppContainer) mainAppContainer.classList.remove('hidden');
        initializeApp();
    } else {
        if (enterAppBtn) {
            enterAppBtn.addEventListener('click', () => {
                if (splashScreen) {
                    splashScreen.style.opacity = '0';
                    setTimeout(() => {
                        splashScreen.style.display = 'none';
                    }, 700);
                }
                if (mainAppContainer) mainAppContainer.classList.remove('hidden');
                sessionStorage.setItem('splashSeen', 'true');
                initializeApp();
            }, { once: true });
        }

        if (showInfoModelBtn) {
            showInfoModelBtn.addEventListener('click', () => {
                if (infoModal) {
                     infoModal.classList.remove('hidden');
                }
            });
        }
    }
});