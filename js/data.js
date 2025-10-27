import { setAllServices, setMonthlyPlans, setTasks, getState } from './state.js';
import { initializeUI, renderTasksDashboard } from './ui.js';
import { showNotification } from './modals.js';

/**
 * Loads pricing data from the JSON file and initializes the UI.
 * Handles errors gracefully without crashing the application.
 */
export async function loadPricingData() {
    try {
        const resp = await fetch('pricing.json?v=' + new Date().getTime()); // Cache busting
        if (!resp.ok) {
            throw new Error('Archivo "pricing.json" no encontrado o error de red.');
        }
        const data = await resp.json();
        setAllServices(data.allServices || {});
        setMonthlyPlans(data.monthlyPlans || []);
        initializeUI();
    } catch (err) {
        console.error('Error Crítico al cargar pricing.json:', err.message);
        showNotification(
            'error', 
            'Error Crítico de Carga', 
            'La aplicación no pudo cargar el catálogo de servicios (pricing.json). Algunas funciones estarán deshabilitadas. Por favor, asegúrate de que el archivo exista y sea válido.'
        );
        // Initialize UI with empty data to prevent other parts from crashing
        setAllServices({});
        setMonthlyPlans([]);
        initializeUI();
    }
}

/**
 * Loads saved tasks from LocalStorage.
 */
export function loadTasks() {
    try {
        const storedTasks = localStorage.getItem('webBudgetTasks');
        if (storedTasks) {
            setTasks(JSON.parse(storedTasks));
        }
    } catch (e) {
        console.error("Error al cargar tareas:", e);
        setTasks([]); // Reset to empty array on error
    }
    renderTasksDashboard();
}

/**
 * Saves the current tasks list to LocalStorage.
 */
export function saveTasks() {
    try {
        localStorage.setItem('webBudgetTasks', JSON.stringify(getState().tasks));
    } catch (e) {
        console.error("Error al guardar tareas:", e);
        showNotification('error', 'Error al Guardar', 'No se pudieron guardar las tareas en el almacenamiento local.');
    }
    renderTasksDashboard();
}
