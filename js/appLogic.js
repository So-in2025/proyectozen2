import { dom } from './dom.js';
import { COMBO_DISCOUNT, getState, setCustomServices, setEditingIndex, setSelectedPlanId, setSelectedPlanServices, setSelectedServices, setTasks, setTotalPlanPoints, setUsedPlanPoints } from './state.js';
import { renderTasksDashboard } from './ui.js';
import { saveTasks } from './data.js';
import { showNotification, closeCustomServiceModal, showCustomServiceModal, showPdfOptionsModal, closePdfOptionsModal } from './modals.js';
import { startPresentation, initiatePresentation, closePresentation, showSlide } from './presentation.js';
import { generatePdf } from './pdf.js';

/**
 * Initializes all event listeners for the main application.
 * This function is called after the splash screen is dismissed.
 */
export function initializeAppListeners() {
    // --- MAIN EVENT LISTENERS ---
    dom.serviceTypeSelect?.addEventListener('change', (e) => toggleSelectionMode(e.target.value));
    dom.clearSelectionsBtn?.addEventListener('click', clearAllSelections);
    dom.addTaskButton?.addEventListener('click', handleAddTask);
    dom.marginPercentageInput?.addEventListener('input', updateSelectedItems);
    dom.serviceSearchInput?.addEventListener('input', (e) => filterServices(e.target.value));
    dom.exportPdfBtn?.addEventListener('click', showPdfOptionsModal);
    
    dom.clearAllTasksBtn?.addEventListener('click', () => {
        if (getState().tasks.length > 0 && confirm("¿Estás seguro de que deseas borrar TODAS las tareas?")) {
            setTasks([]);
            saveTasks();
            renderTasksDashboard(); // Update UI
            resetForm();
            showNotification('info', 'Tareas Borradas', 'Todas las tareas han sido eliminadas.');
        }
    });

    // --- MODAL EVENT LISTENERS ---
    // FIX: Correctly assign event listener for close notification buttons
    document.querySelectorAll('.close-notification-btn').forEach(btn => btn.addEventListener('click', () => dom.notificationModal.classList.add('hidden')));
    dom.customServiceModal.querySelector('#closeCustomServiceModalBtn')?.addEventListener('click', closeCustomServiceModal);
    dom.customServiceModal.querySelector('#addCustomServiceBtn')?.addEventListener('click', addCustomServiceToSelection);
    document.getElementById('showCustomServiceModalBtn')?.addEventListener('click', showCustomServiceModal);

    dom.pdfOptionsModal.querySelector('#closePdfOptionsModalBtn')?.addEventListener('click', closePdfOptionsModal);
    dom.pdfOptionsModal.querySelector('#generatePdfClientBtn')?.addEventListener('click', () => generatePdf(true));
    dom.pdfOptionsModal.querySelector('#generatePdfInternalBtn')?.addEventListener('click', () => generatePdf(false));
    dom.pdfOptionsModal.querySelector('#startPresentationBtn')?.addEventListener('click', startPresentation);
    document.getElementById('presentProposalBtn')?.addEventListener('click', initiatePresentation);

    // --- PRESENTATION MODAL LISTENERS ---
    const presentationModal = document.getElementById('presentationModal');
    presentationModal.querySelector('#presentationCloseBtn')?.addEventListener('click', closePresentation);
    presentationModal.querySelector('#prevSlideBtn')?.addEventListener('click', () => showSlide('prev'));
    presentationModal.querySelector('#nextSlideBtn')?.addEventListener('click', () => showSlide('next'));
    document.addEventListener('keydown', (e) => {
        if (!presentationModal.classList.contains('hidden')) {
            if (e.key === 'ArrowRight') showSlide('next');
            else if (e.key === 'ArrowLeft') showSlide('prev');
            else if (e.key === 'Escape') closePresentation();
        }
    });

    // --- EVENT DELEGATION FOR DYNAMIC CONTENT ---
    dom.appContainer?.addEventListener('change', (e) => {
        const target = e.target;
        if (target.matches('input[name="selectionGroup"], input[data-type="standard"]')) {
            if (document.querySelector('input[name="monthlyPlanSelection"]:checked')) clearAllSelections();
            if (target.name === 'selectionGroup') document.querySelectorAll('input[data-type="standard"]').forEach(cb => cb.checked = false);
            else if (document.querySelector('input[name="selectionGroup"]:checked')) document.querySelector('input[name="selectionGroup"]:checked').checked = false;
            updateSelectedItems();
        } else if (target.matches('input[name="monthlyPlanSelection"]')) {
            if (document.querySelector('input[name="selectionGroup"]:checked')) document.querySelector('input[name="selectionGroup"]:checked').checked = false;
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
            else if (action === 'delete') deleteTask(parseInt(index));
            else if (action === 'remove-custom') removeCustomService(id);
        }
    });
}


/**
 * Updates the summary card with the calculated prices and margins.
 */
export function updateSummary() {
    let totalDevCost = 0;
    const { selectedServices } = getState();
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
    if (dom.totalDevPriceSpan) dom.totalDevPriceSpan.textContent = totalDevCost.toFixed(2);
    if (dom.totalClientPriceSpan) dom.totalClientPriceSpan.textContent = totalClientPrice.toFixed(2);
    if (dom.marginFeedback) dom.marginFeedback.textContent = feedback;
    if (dom.addTaskButton) dom.addTaskButton.textContent = getState().editingIndex !== -1 ? 'Guardar Cambios' : 'Guardar Propuesta';

    const marginQualityFeedback = dom.marginQualityFeedback;
    if (marginQualityFeedback) {
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
}

/**
 * Updates the list of selected items in the summary and toggles UI states.
 */
export function updateSelectedItems() {
    const { customServices } = getState();
    let currentSelected = [];

    const packageChecked = document.querySelector('input[name="selectionGroup"]:checked');
    const planChecked = document.querySelector('input[name="monthlyPlanSelection"]:checked');

    if (packageChecked) {
        currentSelected.push({ name: packageChecked.dataset.name, price: parseFloat(packageChecked.dataset.price), id: packageChecked.value, type: 'package' });
    } else if (planChecked) {
        const { selectedPlanServices } = getState();
        currentSelected.push({ name: planChecked.dataset.name, price: parseFloat(planChecked.dataset.price), id: planChecked.value, type: 'plan' });
        currentSelected.push(...selectedPlanServices);
    } else {
        document.querySelectorAll('input[data-type="standard"]:checked').forEach(el => {
            currentSelected.push({ name: el.dataset.name, price: parseFloat(el.dataset.price), id: el.value, type: 'standard' });
        });
    }
    currentSelected.push(...customServices);
    setSelectedServices(currentSelected);

    const exclusiveSelection = currentSelected.find(s => s.type === 'package' || s.type === 'plan');
    document.querySelectorAll('.item-card:has([data-type="standard"])').forEach(card => card.classList.toggle('item-disabled', !!exclusiveSelection));
    
    const customServiceBtn = document.getElementById('showCustomServiceModalBtn');
    if (customServiceBtn) customServiceBtn.disabled = !!exclusiveSelection;

    if (dom.clearSelectionsBtn) dom.clearSelectionsBtn.classList.toggle('hidden', currentSelected.length === 0);

    if (dom.modeIndicator) {
        if (exclusiveSelection) {
            dom.modeIndicator.className = 'mb-4 p-3 rounded-lg border border-green-500 bg-green-900/20 text-green-300 font-bold text-center';
            dom.modeIndicator.textContent = `Modo Activo: ${exclusiveSelection.type === 'package' ? 'Paquete' : 'Plan Mensual'} (Exclusivo)`;
        } else {
            dom.modeIndicator.className = 'mb-4 p-3 rounded-lg border border-yellow-500 bg-yellow-900/20 text-yellow-300 font-bold text-center';
            dom.modeIndicator.textContent = 'Modo Activo: Individual (Selección libre)';
        }
    }

    if (dom.selectedItemsDiv) {
        dom.selectedItemsDiv.innerHTML = currentSelected.length === 0 ? '<p class="text-slate-400">Selecciona ítems, un paquete o un plan.</p>' : currentSelected.map(item => {
            const prefix = item.type === 'package' ? '📦 ' : item.type === 'plan' ? '📅 ' : item.type === 'custom' ? '⭐ ' : '• ';
            const color = (item.type === 'package' || item.type === 'plan' || item.type === 'custom') ? 'text-cyan-300 font-bold' : 'text-slate-200';
            const removeButton = item.type === 'custom' ? `<button data-action="remove-custom" data-id="${item.id}" class="text-red-500 hover:text-red-400 ml-2 font-mono">[x]</button>` : '';
            const pointText = item.pointCost ? ` (${item.pointCost} Pts)` : '';
            return `<div class="${color} flex justify-between items-center">${prefix}${item.name}${pointText}${removeButton}</div>`;
        }).join('');
    }
    updateSummary();
}

/**
 * Updates the point system UI for monthly plans.
 */
function updatePointSystemUI() {
    const { usedPlanPoints, totalPlanPoints } = getState();
    if (!dom.planPointsCounterSpan || !dom.monthlyServicesContainer) return;

    dom.planPointsCounterSpan.textContent = `${usedPlanPoints} / ${totalPlanPoints}`;
    const remainingPoints = totalPlanPoints - usedPlanPoints;

    const allServiceCheckboxes = dom.monthlyServicesContainer.querySelectorAll('input[type="checkbox"]');
    allServiceCheckboxes.forEach(cb => {
        const servicePointCost = parseInt(cb.dataset.pointCost);
        cb.disabled = !cb.checked && servicePointCost > remainingPoints;
        cb.closest('.item-card').classList.toggle('item-disabled', !cb.checked && servicePointCost > remainingPoints);
    });
}

/**
 * Handles the selection of a monthly plan.
 * @param {string} planId - The ID of the selected plan.
 * @param {string[]} preSelectedIds - An array of service IDs to pre-select.
 */
export function handlePlanSelection(planId, preSelectedIds = []) {
    const { monthlyPlans, allServices } = getState();
    const plan = monthlyPlans.find(p => p.id == planId);
    if (!plan || !dom.servicesTabsDiv) return;

    setSelectedPlanId(planId);
    setTotalPlanPoints(plan.points);

    let initialUsedPoints = 0;
    let initialSelectedServices = [];

    dom.servicesTabsDiv.innerHTML = Object.keys(allServices).filter(k => !allServices[k].isExclusive).map(key => {
        const category = allServices[key];
        const itemsHTML = category.items.map((svc) => createServiceItemHTML(svc, 'plan-service', `plan-service-${key}`, false, key)).join('');
        return `
            <div class="p-4 bg-slate-900 rounded-xl shadow-inner">
                <h3 class="text-xl font-semibold mb-3 text-cyan-500">${category.name}</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${itemsHTML}</div>
            </div>`;
    }).join('');

    preSelectedIds.forEach(serviceId => {
        const checkbox = document.getElementById(`plan-service-${serviceId}`);
        if (checkbox) {
            checkbox.checked = true;
            const pointCost = parseInt(checkbox.dataset.pointCost);
            initialUsedPoints += pointCost;
            initialSelectedServices.push({ id: checkbox.value, name: checkbox.dataset.name, type: 'plan-service', price: 0, pointCost: pointCost });
        }
    });

    setUsedPlanPoints(initialUsedPoints);
    setSelectedPlanServices(initialSelectedServices);
    updatePointSystemUI();
}

/**
 * Handles the selection of an individual service within a monthly plan.
 * @param {HTMLInputElement} checkbox - The checkbox element.
 * @param {boolean} isChecked - The checked state of the checkbox.
 */
export function handleServiceSelection(checkbox, isChecked) {
    let { usedPlanPoints, selectedPlanServices } = getState();
    const pointCost = parseInt(checkbox.dataset.pointCost);
    const serviceId = checkbox.value;
    const serviceName = checkbox.dataset.name;

    if (isChecked) {
        usedPlanPoints += pointCost;
        selectedPlanServices.push({ id: serviceId, name: serviceName, type: 'plan-service', price: 0, pointCost: pointCost });
    } else {
        usedPlanPoints -= pointCost;
        selectedPlanServices = selectedPlanServices.filter(s => s.id !== serviceId);
    }

    setUsedPlanPoints(usedPlanPoints);
    setSelectedPlanServices(selectedPlanServices);
    updatePointSystemUI();
    updateSelectedItems();
}

/**
 * Clears all current selections in the form.
 */
export function clearAllSelections() {
    document.querySelectorAll('input[type="radio"]:checked, input[type="checkbox"]:checked').forEach(el => el.checked = false);
    setCustomServices([]);
    setSelectedPlanId(null);
    setSelectedPlanServices([]);
    setTotalPlanPoints(0);
    setUsedPlanPoints(0);
    updatePointSystemUI();
    updateSelectedItems();
}

/**
 * Toggles the UI between 'puntual' and 'mensual' service types.
 * @param {string} mode - The selected mode ('puntual' or 'mensual').
 */
export function toggleSelectionMode(mode) {
    const isMonthly = mode === 'mensual';
    if (dom.serviceTypeSelect) dom.serviceTypeSelect.value = mode;
    if (dom.monthlyPlansContainer) dom.monthlyPlansContainer.classList.toggle('hidden', !isMonthly);
    if (dom.servicesSelectionDiv) dom.servicesSelectionDiv.classList.toggle('hidden', isMonthly);
    if (dom.monthlyServicesContainer) dom.monthlyServicesContainer.classList.toggle('hidden', !isMonthly);

    if (document.querySelector('input:checked')) {
        clearAllSelections();
    }
}

/**
 * Handles adding or updating a task (proposal).
 */
export function handleAddTask() {
    const { selectedServices, editingIndex, selectedPlanId, selectedPlanServices, usedPlanPoints, totalPlanPoints } = getState();
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

    let { tasks } = getState();
    if (editingIndex !== -1) {
        tasks[editingIndex] = newTask;
    } else {
        tasks.push(newTask);
    }
    setTasks(tasks);
    showNotification('success', 'Propuesta Guardada', `La propuesta para ${newTask.webName} ha sido guardada.`);
    resetForm();
    saveTasks();
    renderTasksDashboard(); // Update UI
}

/**
 * Resets the main form to its initial state.
 */
export function resetForm() {
    setEditingIndex(-1);
    const clientNameInput = document.getElementById('clientName');
    const webNameInput = document.getElementById('webName');
    if (clientNameInput) clientNameInput.value = '';
    if (webNameInput) webNameInput.value = '';
    if (dom.serviceTypeSelect) dom.serviceTypeSelect.value = 'puntual';
    if (dom.marginPercentageInput) dom.marginPercentageInput.value = '60';
    toggleSelectionMode('puntual');
    clearAllSelections();
}

/**
 * Populates the form with data from a task to edit it.
 * @param {number} index - The index of the task to edit.
 */
export function editTask(index) {
    const { tasks } = getState();
    const task = tasks[index];
    setEditingIndex(index);

    const clientNameInput = document.getElementById('clientName');
    const webNameInput = document.getElementById('webName');
    if (clientNameInput) clientNameInput.value = task.clientName;
    if (webNameInput) webNameInput.value = task.webName;
    if (dom.marginPercentageInput) dom.marginPercentageInput.value = (task.margin * 100).toFixed(0);

    const selectionType = task.plan ? 'mensual' : 'puntual';
    if (dom.serviceTypeSelect) dom.serviceTypeSelect.value = selectionType;
    toggleSelectionMode(selectionType);

    setTimeout(() => {
        clearAllSelections();
        if (task.package) {
            const pkgRadio = document.getElementById(`package-${task.package.id}`);
            if (pkgRadio) pkgRadio.checked = true;
        } else if (task.plan) {
            const planRadio = document.getElementById(`plan-${task.plan.id}`);
            if (planRadio) planRadio.checked = true;
            handlePlanSelection(task.plan.id, task.plan.selectedServiceIds);
        } else {
            setCustomServices(task.services.filter((s) => s.type === 'custom'));
            task.services.filter((s) => s.type === 'standard').forEach((svc) => {
                const el = document.getElementById(`standard-${svc.id}`);
                if (el) el.checked = true;
            });
        }
        updateSelectedItems();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
}

/**
 * Deletes a task from the dashboard.
 * @param {number} index - The index of the task to delete.
 */
export function deleteTask(index) {
    let { tasks, editingIndex } = getState();
    tasks.splice(index, 1);
    setTasks(tasks);
    saveTasks();
    renderTasksDashboard(); // Update UI
    showNotification('info', 'Propuesta Eliminada', `La propuesta ha sido eliminada.`);
    if (index === editingIndex) resetForm();
}

/**
 * Adds a new custom service to the current selection.
 */
export function addCustomServiceToSelection() {
    const name = dom.customServiceNameInput.value;
    const price = parseFloat(dom.customServicePriceInput.value);
    if (!name || isNaN(price) || price <= 0) {
        return showNotification('error', 'Datos incompletos', 'Por favor, introduce un nombre y un costo válido.');
    }
    const { customServices } = getState();
    const newCustomServices = [...customServices, { id: `custom-${Date.now()}`, name, price, type: 'custom', description: 'Servicio personalizado.' }];
    setCustomServices(newCustomServices);
    updateSelectedItems();
    closeCustomServiceModal();
}

/**
 * Removes a custom service from the current selection.
 * @param {string} id - The ID of the custom service to remove.
 */
export function removeCustomService(id) {
    const { customServices } = getState();
    const newCustomServices = customServices.filter(s => s.id !== id);
    setCustomServices(newCustomServices);
    updateSelectedItems();
}

/**
 * Filters the displayed services based on a search term.
 * @param {string} searchTerm - The term to filter by.
 */
export function filterServices(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    let hasResults = false;
    document.querySelectorAll('.service-category-container').forEach(categoryEl => {
        const category = categoryEl;
        let categoryHasVisibleItems = false;
        category.querySelectorAll('.item-card').forEach(itemEl => {
            const item = itemEl;
            const name = item.querySelector('label').textContent.toLowerCase();
            const description = (item.querySelector('.tooltip-content')?.textContent || '').toLowerCase();
            const isMatch = name.includes(term) || description.includes(term);
            if (isMatch) {
                item.style.display = 'flex';
                categoryHasVisibleItems = true;
                hasResults = true;
            } else {
                item.style.display = 'none';
            }
        });
        category.style.display = categoryHasVisibleItems ? 'block' : 'none';
    });
    if (dom.noResultsMessage) dom.noResultsMessage.style.display = hasResults ? 'none' : 'block';
}