// js/main.js

import * as dom from './dom.js';
import * as state from './state.js';
import { loadPricingData, loadTasks, saveTasks } from './data.js';
import { resetForm, handleAddTask, clearAllSelections, toggleSelectionMode, updateSelectedItems, deleteTask, editTask } from './app.js';
import { handleServiceSelection, handlePlanSelection } from './points.js';
import { removeCustomService } from './modals.js';
import { filterServices } from './ui.js';

// --- EVENT LISTENERS PRINCIPALES ---

document.addEventListener('DOMContentLoaded', () => {
    loadPricingData();
    loadTasks();
    resetForm();
});

dom.serviceTypeSelect.addEventListener('change', (e) => toggleSelectionMode(e.target.value));
dom.clearSelectionsBtn.addEventListener('click', clearAllSelections);
dom.addTaskButton.addEventListener('click', handleAddTask);
dom.marginPercentageInput.addEventListener('input', updateSelectedItems);
dom.serviceSearchInput.addEventListener('input', (e) => filterServices(e.target.value));


dom.clearAllTasksBtn.addEventListener('click', () => {
    const { tasks } = state.getState();
    if (tasks.length > 0 && confirm("¿Estás seguro de que deseas borrar TODAS las tareas?")) {
        state.setTasks([]);
        saveTasks();
        resetForm();
        showNotification('info', 'Tareas Borradas', 'Todas las tareas han sido eliminadas.');
    }
});

// Delegación de eventos para selecciones y acciones
dom.appContainer.addEventListener('change', (e) => {
    const target = e.target;
    if (target.matches('input[name="selectionGroup"], input[data-type="standard"]')) {
        if (document.querySelector('input[name="monthlyPlanSelection"]:checked')) {
            clearAllSelections();
        }
        if (target.name === 'selectionGroup') {
            document.querySelectorAll('input[data-type="standard"]').forEach(cb => cb.checked = false);
        } else {
            // Si se selecciona un ítem estándar, se deselecciona cualquier paquete.
            if (document.querySelector('input[name="selectionGroup"]:checked')) {
                document.querySelector('input[name="selectionGroup"]:checked').checked = false;
            }
        }
        // La línea `target.checked = true;` ha sido eliminada.
        // Ahora el navegador maneja el estado de selección/deselección.
        updateSelectedItems();
    } else if (target.matches('input[name="monthlyPlanSelection"]')) {
        if (document.querySelector('input[name="selectionGroup"]:checked')) {
            document.querySelector('input[name="selectionGroup"]:checked').checked = false;
        }
        document.querySelectorAll('input[data-type="standard"]:checked').forEach(cb => cb.checked = false);
        // La línea `target.checked = true;` ha sido eliminada.
        handlePlanSelection(target.value);
        updateSelectedItems();
    } else if (target.matches('input[name^="plan-service-"]')) {
        handleServiceSelection(target, target.checked);
    }
});

dom.appContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.item-card');
    if (card && !e.target.matches('input')) {
        const input = card.querySelector('input');
        if (input && !input.disabled) {
            input.click();
        }
    }

    const actionButton = e.target.closest('[data-action]');
    if (actionButton) {
        const { action, index, id } = actionButton.dataset;
        if (action === 'edit') editTask(parseInt(index));
        if (action === 'delete') deleteTask(parseInt(index));
        if (action === 'remove-custom') removeCustomService(id);
    }
});
