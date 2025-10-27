import { setAllServices, setMonthlyPlans, setTasks, getState } from './state.js';
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
        return true; // Indicate success
    } catch (err) {
        console.error('Error Crítico al cargar pricing.json:', err.message);
        showNotification(
            'error', 
            'Error Crítico de Carga', 
            'La aplicación no pudo cargar el catálogo de servicios (pricing.json). Algunas funciones estarán deshabilitadas. Por favor, asegúrate de que el archivo exista y sea válido.'
        );
        // Initialize with empty data to prevent other parts from crashing
        setAllServices({});
        setMonthlyPlans([]);
        return false; // Indicate failure
    }
}

/**
 * Loads saved tasks from LocalStorage into the state.
 * Does NOT render the UI.
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
}

/**
 * Saves the current tasks list from the state to LocalStorage.
 * Does NOT render the UI.
 */
export function saveTasks() {
    try {
        localStorage.setItem('webBudgetTasks', JSON.stringify(getState().tasks));
    } catch (e) {
        console.error("Error al guardar tareas:", e);
        showNotification('error', 'Error al Guardar', 'No se pudieron guardar las tareas en el almacenamiento local.');
    }
}