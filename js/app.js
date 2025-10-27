// js/app.js

import * as dom from './dom.js';
import * as state from './state.js';
import { saveTasks } from './data.js';
import { showNotification } from './modals.js';
import { handlePlanSelection, updatePointSystemUI } from './points.js';

export function updateSummary() {
    let totalDevCost = 0;
    const { selectedServices, COMBO_DISCOUNT } = state.getState();
    const margin = parseFloat(dom.marginPercentageInput.value) / 100 || 0;
    let feedback = '';
    
    const exclusiveSelection = selectedServices.find(s => s.type === 'package' || s.type === 'plan');
    const standardItems = selectedServices.filter(s => s.type === 'standard' || s.type === 'custom');
    
    if (exclusiveSelection) {
        totalDevCost = exclusiveSelection.price;
        feedback = `Costo fijo de ${exclusiveSelection.type}: $${totalDevCost.toFixed(2)}`;
    } else {
        totalDevCost = standardItems.reduce((sum, item) => sum + item.price, 0);
        if (standardItems.filter(s => s.type === 'standard').length >= 3) {
            const discountAmount = totalDevCost * COMBO_DISCOUNT;
            totalDevCost *= (1 - COMBO_DISCOUNT);
            feedback = `Aplicado ${COMBO_DISCOUNT * 100}% Dcto. (Ahorro: $${discountAmount.toFixed(2)})`;
        } else {
            feedback = `Total de ${standardItems.length} ítems. (3+ estándar para descuento)`;
        }
    }
    
    const totalClientPrice = margin < 1 ? totalDevCost / (1 - margin) : totalDevCost * (1 + margin);
    dom.totalDevPriceSpan.textContent = totalDevCost.toFixed(2);
    dom.totalClientPriceSpan.textContent = totalClientPrice.toFixed(2);
    dom.marginFeedback.textContent = feedback;
    dom.addTaskButton.textContent = state.getState().editingIndex !== -1 ? 'Guardar Cambios' : 'Guardar Tarea';

    // Lógica de Indicadores de Rentabilidad Mejorados
    const marginQualityFeedback = dom.marginQualityFeedback;
    if (margin < 0.3) {
        marginQualityFeedback.textContent = 'Advertencia: Margen bajo.';
        marginQualityFeedback.className = 'text-xs mt-2 font-bold text-yellow-400';
    } else if (margin <= 0.7) {
        marginQualityFeedback.textContent = 'Margen saludable.';
        marginQualityFeedback.className = 'text-xs mt-2 font-bold text-green-400';
    } else {
        marginQualityFeedback.textContent = 'Margen premium.';
        marginQualityFeedback.className = 'text-xs mt-2 font-bold text-cyan-400';
    }
}

export function updateSelectedItems() {
    const { customServices } = state.getState();
    let currentSelected = [];
    const packageChecked = document.querySelector('input[name="selectionGroup"]:checked');
    const planChecked = document.querySelector('input[name="monthlyPlanSelection"]:checked');

    if (packageChecked) {
        currentSelected.push({ name: packageChecked.dataset.name, price: parseFloat(packageChecked.dataset.price), id: packageChecked.value, type: 'package' });
    } else if (planChecked) {
        const { selectedPlanServices } = state.getState();
        currentSelected.push({ name: planChecked.dataset.name, price: parseFloat(planChecked.dataset.price), id: planChecked.value, type: 'plan' });
        currentSelected.push(...selectedPlanServices);
    } else {
        document.querySelectorAll('input[data-type="standard"]:checked').forEach(el => {
            currentSelected.push({ name: el.dataset.name, price: parseFloat(el.dataset.price), id: el.value, type: 'standard' });
        });
    }
    
    currentSelected.push(...customServices);
    state.setSelectedServices(currentSelected);
    
    const exclusiveSelection = currentSelected.find(s => s.type === 'package' || s.type === 'plan');
    document.querySelectorAll('.item-card:has([data-type="standard"])').forEach(card => card.classList.toggle('item-disabled', !!exclusiveSelection));
    document.querySelector('button[onclick="showCustomServiceModal()"]').disabled = !!exclusiveSelection;

    dom.clearSelectionsBtn.classList.toggle('hidden', currentSelected.length === 0);
    
    if (exclusiveSelection) {
        dom.modeIndicator.className = 'mb-4 p-3 rounded-lg border border-green-500 bg-green-900/20 text-green-300 font-bold text-center';
        dom.modeIndicator.textContent = `Modo Activo: ${exclusiveSelection.type === 'package' ? 'Paquete' : 'Plan Mensual'} (Exclusivo)`;
    } else {
        dom.modeIndicator.className = 'mb-4 p-3 rounded-lg border border-yellow-500 bg-yellow-900/20 text-yellow-300 font-bold text-center';
        dom.modeIndicator.textContent = 'Modo Activo: Individual (Selección libre)';
    }
    
    dom.selectedItemsDiv.innerHTML = currentSelected.length === 0 ? '<p class="text-slate-400">Selecciona ítems, un paquete o un plan.</p>' : currentSelected.map(item => {
        const prefix = item.type === 'package' ? '📦 ' : item.type === 'plan' ? '📅 ' : item.type === 'custom' ? '⭐ ' : '• ';
        const color = (item.type === 'package' || item.type === 'plan' || item.type === 'custom') ? 'text-cyan-300 font-bold' : 'text-slate-200';
        const removeButton = item.type === 'custom' ? `<button data-action="remove-custom" data-id="${item.id}" class="text-red-500 hover:text-red-400 ml-2 font-mono">[x]</button>` : '';
        const pointText = item.pointCost ? ` (${item.pointCost} Pts)` : '';
        return `<div class="${color} flex justify-between items-center">${prefix}${item.name}${pointText}${removeButton}</div>`;
    }).join('');

    updateSummary();
}

export function clearAllSelections() {
    document.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked').forEach(el => el.checked = false);
    state.setCustomServices([]);
    
    state.setSelectedPlanId(null);
    state.setSelectedPlanServices([]);
    state.setTotalPlanPoints(0);
    state.setUsedPlanPoints(0);
    updatePointSystemUI();
    
    updateSelectedItems();
}

export function toggleSelectionMode(mode) {
    const isMonthly = mode === 'mensual';
    dom.serviceTypeSelect.value = mode;
    dom.monthlyPlansContainer.classList.toggle('hidden', !isMonthly);
    dom.servicesSelectionDiv.classList.toggle('hidden', isMonthly);
    dom.monthlyServicesContainer.classList.toggle('hidden', !isMonthly);
    
    if (document.querySelector('input:checked')) {
        clearAllSelections();
    }
}

export function handleAddTask() {
    const { selectedServices, editingIndex, selectedPlanId, selectedPlanServices, usedPlanPoints, totalPlanPoints } = state.getState();
    if (selectedServices.length === 0) return showNotification('error', 'Error', 'Debes seleccionar al menos un servicio.');
    
    const packageSelection = selectedServices.find(s => s.type === 'package');
    const planSelection = selectedServices.find(s => s.type === 'plan');
    const individualItems = selectedServices.filter(s => s.type === 'standard' || s.type === 'custom');

    let newTask = {
        clientName: document.getElementById('clientName').value || 'Sin Cliente',
        webName: document.getElementById('webName').value || 'Sin Web',
        margin: parseFloat(dom.marginPercentageInput.value) / 100 || 0,
        totalDev: parseFloat(dom.totalDevPriceSpan.textContent),
        totalClient: parseFloat(dom.totalClientPriceSpan.textContent),
        package: packageSelection || null,
        plan: planSelection ? { 
            id: selectedPlanId, 
            selectedServiceIds: selectedPlanServices.map(s => s.id),
            pointsUsed: usedPlanPoints,
            totalPointsInBudget: totalPlanPoints,
            remainingPoints: totalPlanPoints - usedPlanPoints
        } : null,
        services: individualItems,
        type: dom.serviceTypeSelect.value,
    };

    let { tasks } = state.getState();
    if (editingIndex !== -1) {
        tasks[editingIndex] = newTask;
    } else {
        tasks.push(newTask);
    }
    state.setTasks(tasks);
    showNotification('success', 'Tarea Guardada', `El presupuesto para ${newTask.webName} ha sido guardado.`);
    resetForm();
    saveTasks();
}

export function resetForm() {
    state.setEditingIndex(-1);
    document.getElementById('clientName').value = '';
    document.getElementById('webName').value = '';
    dom.serviceTypeSelect.value = 'puntual';
    dom.marginPercentageInput.value = '60';
    toggleSelectionMode('puntual');
    clearAllSelections();
}

export function editTask(index) {
    const { tasks } = state.getState();
    const task = tasks[index];
    state.setEditingIndex(index);
    
    document.getElementById('clientName').value = task.clientName;
    document.getElementById('webName').value = task.webName;
    dom.marginPercentageInput.value = (task.margin * 100).toFixed(0);
    
    const selectionType = task.plan ? 'mensual' : 'puntual';
    dom.serviceTypeSelect.value = selectionType;
    toggleSelectionMode(selectionType);
    
    setTimeout(() => {
        clearAllSelections();
        if (task.package) {
            document.getElementById(`package-${task.package.id}`).checked = true;
        } else if (task.plan) {
            document.getElementById(`plan-${task.plan.id}`).checked = true;
            handlePlanSelection(task.plan.id, task.plan.selectedServiceIds);
        } else {
            state.setCustomServices(task.services.filter(s => s.type === 'custom'));
            task.services.filter(s => s.type === 'standard').forEach(svc => {
                const el = document.getElementById(`standard-${svc.id}`);
                if (el) el.checked = true;
            });
        }
        updateSelectedItems();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
}

export function deleteTask(index) {
    let { tasks, editingIndex } = state.getState();
    tasks.splice(index, 1);
    state.setTasks(tasks);
    saveTasks();
    showNotification('info', 'Tarea Eliminada', `El presupuesto ha sido eliminado.`);
    if (index === editingIndex) resetForm(); 
}
