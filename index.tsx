//
// Consolidated Application Logic for Affiliate Proposal Generator
// This file merges the logic from all previous .js files into a single module.
//

// --- STATE MANAGEMENT ---
const COMBO_DISCOUNT = 0.10;
let state = {
    allServices: {} as any,
    monthlyPlans: [] as any[],
    selectedServices: [] as any[],
    customServices: [] as any[],
    tasks: [] as any[],
    editingIndex: -1,
    totalPlanPoints: 0,
    usedPlanPoints: 0,
    selectedPlanId: null as string | null,
    selectedPlanServices: [] as any[]
};
const getState = () => state;
const setAllServices = (services: any) => { state.allServices = services; };
const setMonthlyPlans = (plans: any[]) => { state.monthlyPlans = plans; };
const setSelectedServices = (services: any[]) => { state.selectedServices = services; };
const setCustomServices = (services: any[]) => { state.customServices = services; };
const setTasks = (tasks: any[]) => { state.tasks = tasks; };
const setEditingIndex = (index: number) => { state.editingIndex = index; };
const setTotalPlanPoints = (points: number) => { state.totalPlanPoints = points; };
const setUsedPlanPoints = (points: number) => { state.usedPlanPoints = points; };
const setSelectedPlanId = (id: string | null) => { state.selectedPlanId = id; };
const setSelectedPlanServices = (services: any[]) => { state.selectedPlanServices = services; };


// --- DOM REFERENCES ---
const dom = {
    appContainer: document.getElementById('appContainer'),
    serviceTypeSelect: document.getElementById('serviceType'),
    servicesSelectionDiv: document.getElementById('servicesSelection'),
    monthlyPlansContainer: document.getElementById('monthlyPlansContainer'),
    monthlyServicesContainer: document.getElementById('monthlyServicesContainer'),
    servicesTabsDiv: document.getElementById('servicesTabs'),
    planPointsCounterSpan: document.getElementById('planPointsCounter'),
    totalDevPriceSpan: document.getElementById('totalDeveloperPrice'),
    totalClientPriceSpan: document.getElementById('totalClientPrice'),
    marginPercentageInput: document.getElementById('marginPercentage'),
    marginFeedback: document.getElementById('marginFeedback'),
    marginQualityFeedback: document.getElementById('marginQualityFeedback'),
    addTaskButton: document.getElementById('addTask'),
    clearSelectionsBtn: document.getElementById('clearSelectionsBtn'),
    modeIndicator: document.getElementById('modeIndicator'),
    selectedItemsDiv: document.getElementById('selectedItems'),
    tasksDashboardDiv: document.getElementById('tasksDashboard'),
    grandTotalDevSpan: document.getElementById('grandTotalDeveloperPrice'),
    grandTotalClientSpan: document.getElementById('grandTotalClientPrice'),
    totalProfitSpan: document.getElementById('totalProfit'),
    messageContainer: document.getElementById('messageContainer'),
    exportPdfBtn: document.getElementById('exportPdfBtn'),
    clearAllTasksBtn: document.getElementById('clearAllTasksBtn'),
    serviceSearchInput: document.getElementById('serviceSearchInput'),
    noResultsMessage: document.getElementById('noResultsMessage'),
    notificationModal: document.getElementById('notificationModal'),
    notificationTitle: document.getElementById('notificationTitle'),
    notificationMessage: document.getElementById('notificationMessage'),
    customServiceModal: document.getElementById('customServiceModal'),
    pdfOptionsModal: document.getElementById('pdfOptionsModal'),
    customServiceNameInput: document.getElementById('customServiceName'),
    customServicePriceInput: document.getElementById('customServicePrice'),
    pdfLogoInput: document.getElementById('pdfLogoInput'),
    pdfResellerInfo: document.getElementById('pdfResellerInfo'),
    pdfClientInfo: document.getElementById('pdfClientInfo'),
    pdfTerms: document.getElementById('pdfTerms')
};


// --- MODAL CONTROLS ---
function showNotification(type: 'success' | 'error' | 'info', title: string, message: string) {
    dom.notificationTitle!.textContent = title;
    dom.notificationMessage!.innerHTML = message;
    const header = dom.notificationModal!.querySelector('.modal-header');
    header!.className = 'modal-header p-4 rounded-t-xl text-white font-bold flex justify-between items-center';
    const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-cyan-600' };
    header!.classList.add(colors[type] || 'bg-cyan-600');
    dom.notificationModal!.classList.remove('hidden');
}
function closeNotificationModal() { dom.notificationModal!.classList.add('hidden'); }
function showCustomServiceModal() {
    if (document.querySelector('input[name="selectionGroup"]:checked, input[name="monthlyPlanSelection"]:checked')) {
        return showNotification('error', 'Error', 'No puedes añadir ítems personalizados cuando un paquete o plan está seleccionado.');
    }
    (dom.customServiceNameInput as HTMLInputElement).value = '';
    (dom.customServicePriceInput as HTMLInputElement).value = '';
    dom.customServiceModal!.classList.remove('hidden');
}
function closeCustomServiceModal() { dom.customServiceModal!.classList.add('hidden'); }
function showPdfOptionsModal() {
    const { tasks } = getState();
    if (tasks.length === 0) return showNotification('info', 'Vacío', 'No hay tareas guardadas para exportar.');
    dom.pdfOptionsModal!.classList.remove('hidden');
}
function closePdfOptionsModal() { dom.pdfOptionsModal!.classList.add('hidden'); }
function addCustomServiceToSelection() {
    const name = (dom.customServiceNameInput as HTMLInputElement).value;
    const price = parseFloat((dom.customServicePriceInput as HTMLInputElement).value);
    if (!name || isNaN(price) || price <= 0) {
        return showNotification('error', 'Datos incompletos', 'Por favor, introduce un nombre y un costo válido.');
    }
    const { customServices } = getState();
    const newCustomServices = [...customServices, { id: `custom-${Date.now()}`, name, price, type: 'custom', description: 'Servicio personalizado.' }];
    setCustomServices(newCustomServices);
    updateSelectedItems();
    closeCustomServiceModal();
}
function removeCustomService(id: string) {
    const { customServices } = getState();
    const newCustomServices = customServices.filter(s => s.id !== id);
    setCustomServices(newCustomServices);
    updateSelectedItems();
}
(window as any).closeNotificationModal = closeNotificationModal;
(window as any).closeCustomServiceModal = closeCustomServiceModal;
(window as any).addCustomServiceToSelection = addCustomServiceToSelection;
(window as any).closePdfOptionsModal = closePdfOptionsModal;
(window as any).showCustomServiceModal = showCustomServiceModal;
(window as any).showPdfOptionsModal = showPdfOptionsModal;


// --- UI RENDERING ---
function createServiceItemHTML(svc: any, type: string, name: string, isExclusive: boolean, categoryKey: string | null = null) {
    const pointCostHTML = svc.pointCost ? `<span class="font-bold text-yellow-400 text-xs">${svc.pointCost} Pts</span>` : '';
    return `
        <div class="item-card tooltip-container flex items-center justify-between p-3 bg-slate-800 rounded-lg transition duration-150 cursor-pointer border border-slate-700">
            <label class="flex-grow cursor-pointer text-sm pr-2">${svc.name}</label>
            <div class="flex items-center gap-3">
                ${pointCostHTML}
                <span class="font-bold text-red-400">${svc.price > 0 ? `$${svc.price.toFixed(2)} USD` : ''}</span>
                <input type="${isExclusive ? 'radio' : 'checkbox'}" name="${name}" class="${isExclusive ? 'custom-radio' : 'custom-checkbox'} ml-4"
                    id="${type}-${svc.id}" value="${svc.id}" data-price="${svc.price}" data-name="${svc.name}" data-type="${type}"
                    data-point-cost="${svc.pointCost || 0}" data-category-key="${categoryKey || ''}">
            </div>
            <div class="tooltip-content">${svc.description || 'Sin descripción.'}</div>
        </div>`;
}
function initializeServiceCheckboxes() {
    const { allServices } = getState();
    if (!allServices || Object.keys(allServices).length === 0) {
        dom.servicesSelectionDiv!.innerHTML = '<p class="text-slate-400 text-center col-span-full">El catálogo de servicios no está disponible.</p>';
        return;
    }
    dom.servicesSelectionDiv!.innerHTML = Object.keys(allServices).map(key => {
        const category = allServices[key];
        const itemsHTML = category.items.map((svc: any) => createServiceItemHTML(svc, category.isExclusive ? 'package' : 'standard', category.isExclusive ? 'selectionGroup' : `item-${svc.id}`, category.isExclusive, key)).join('');
        return `
            <div class="service-category-container p-4 bg-slate-900 rounded-xl shadow-inner">
                <h3 class="text-xl font-semibold mb-3 text-cyan-500">${category.name}</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${itemsHTML}</div>
            </div>`;
    }).join('');
}
function initializeMonthlyPlansSelection() {
    const { monthlyPlans } = getState();
    dom.monthlyPlansContainer!.innerHTML = '';
    if (!monthlyPlans || monthlyPlans.length === 0) return;
    const plansHTML = monthlyPlans.map(plan => `
        <div class="item-card tooltip-container flex items-center justify-between p-3 bg-slate-800 rounded-lg transition duration-150 cursor-pointer border border-slate-700">
            <label class="flex-grow cursor-pointer text-sm pr-2">${plan.name}</label>
            <span class="font-bold text-red-400 ml-2">$${plan.price.toFixed(2)} USD</span>
            <input type="radio" name="monthlyPlanSelection" class="custom-radio ml-4" id="plan-${plan.id}" value="${plan.id}"
                data-price="${plan.price}" data-name="${plan.name}" data-points="${plan.points}">
            <div class="tooltip-content">${plan.description || 'Sin descripción.'}</div>
        </div>`).join('');
    dom.monthlyPlansContainer!.innerHTML = `
        <div class="p-4 bg-slate-900 rounded-xl shadow-inner">
            <h3 class="text-xl font-semibold mb-3 text-cyan-500">Planes Mensuales (Exclusivos)</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${plansHTML}</div>
        </div>`;
}
function renderTasksDashboard() {
    const { tasks, monthlyPlans } = getState();
    dom.tasksDashboardDiv!.innerHTML = tasks.length === 0
        ? '<p class="text-slate-400">No hay tareas guardadas.</p>'
        : tasks.map((task, index) => {
            let serviceList = '';
            if (task.package) {
                serviceList = `<span class="text-sm text-cyan-300 font-medium">Paquete: ${task.package.name}</span>`;
            } else if (task.plan) {
                const planInfo = monthlyPlans.find(p => p.id == task.plan.id);
                const remainingText = task.plan.remainingPoints > 0 ? `<br><span class="text-xs text-yellow-400">Sobrante: ${task.plan.remainingPoints} Pts</span>` : '';
                serviceList = `<span class="text-sm text-cyan-300 font-medium">Plan: ${planInfo?.name || 'Desconocido'}</span>${remainingText}`;
            } else {
                serviceList = `<span class="text-sm text-slate-300">${task.services.length} ítems individuales</span>`;
            }
            return `
                <div class="p-3 border border-slate-700 rounded-lg bg-slate-800 transition duration-150 hover:bg-slate-700">
                    <div class="flex justify-between items-start mb-1">
                        <h4 class="font-bold text-base text-white">${task.clientName || 'Sin Cliente'} - ${task.webName || 'Sin Web'}</h4>
                        <div class="flex gap-2">
                            <button data-action="edit" data-index="${index}" class="text-blue-400 hover:text-blue-300 text-sm action-button">Editar</button>
                            <button data-action="delete" data-index="${index}" class="text-red-400 hover:text-red-300 text-sm action-button">Eliminar</button>
                        </div>
                    </div>
                    ${serviceList}
                    <p class="text-xs text-slate-400 mt-1">Margen: ${(task.margin * 100).toFixed(0)}%</p>
                    <p class="text-xs text-red-300">Costo Dev: $${task.totalDev.toFixed(2)}</p>
                    <p class="text-sm font-bold text-green-400">Precio Cliente: $${task.totalClient.toFixed(2)}</p>
                </div>`;
        }).join('');
    (dom.exportPdfBtn as HTMLButtonElement).disabled = tasks.length === 0;
    (dom.clearAllTasksBtn as HTMLButtonElement).disabled = tasks.length === 0;
    let grandTotalDev = tasks.reduce((sum, t) => sum + t.totalDev, 0);
    let grandTotalClient = tasks.reduce((sum, t) => sum + t.totalClient, 0);
    dom.grandTotalDevSpan!.textContent = grandTotalDev.toFixed(2);
    dom.grandTotalClientSpan!.textContent = grandTotalClient.toFixed(2);
    dom.totalProfitSpan!.textContent = (grandTotalClient - grandTotalDev).toFixed(2);
}
function initializeUI() {
    initializeServiceCheckboxes();
    initializeMonthlyPlansSelection();
}
function filterServices(searchTerm: string) {
    const term = searchTerm.toLowerCase().trim();
    let hasResults = false;
    document.querySelectorAll('.service-category-container').forEach(categoryEl => {
        const category = categoryEl as HTMLElement;
        let categoryHasVisibleItems = false;
        category.querySelectorAll('.item-card').forEach(itemEl => {
            const item = itemEl as HTMLElement;
            const name = item.querySelector('label')!.textContent!.toLowerCase();
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
    (dom.noResultsMessage as HTMLElement).style.display = hasResults ? 'none' : 'block';
}


// --- CORE APP LOGIC ---
function updateSummary() {
    let totalDevCost = 0;
    const { selectedServices } = getState();
    const margin = parseFloat((dom.marginPercentageInput as HTMLInputElement).value) / 100 || 0;
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
    dom.totalDevPriceSpan!.textContent = totalDevCost.toFixed(2);
    dom.totalClientPriceSpan!.textContent = totalClientPrice.toFixed(2);
    dom.marginFeedback!.textContent = feedback;
    dom.addTaskButton!.textContent = getState().editingIndex !== -1 ? 'Guardar Cambios' : 'Guardar Propuesta';
    const marginQualityFeedback = dom.marginQualityFeedback as HTMLElement;
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
function updateSelectedItems() {
    const { customServices } = getState();
    let currentSelected: any[] = [];
    const packageChecked = document.querySelector<HTMLInputElement>('input[name="selectionGroup"]:checked');
    const planChecked = document.querySelector<HTMLInputElement>('input[name="monthlyPlanSelection"]:checked');
    if (packageChecked) {
        currentSelected.push({ name: packageChecked.dataset.name!, price: parseFloat(packageChecked.dataset.price!), id: packageChecked.value, type: 'package' });
    } else if (planChecked) {
        const { selectedPlanServices } = getState();
        currentSelected.push({ name: planChecked.dataset.name!, price: parseFloat(planChecked.dataset.price!), id: planChecked.value, type: 'plan' });
        currentSelected.push(...selectedPlanServices);
    } else {
        document.querySelectorAll<HTMLInputElement>('input[data-type="standard"]:checked').forEach(el => {
            currentSelected.push({ name: el.dataset.name!, price: parseFloat(el.dataset.price!), id: el.value, type: 'standard' });
        });
    }
    currentSelected.push(...customServices);
    setSelectedServices(currentSelected);
    const exclusiveSelection = currentSelected.find(s => s.type === 'package' || s.type === 'plan');
    document.querySelectorAll('.item-card:has([data-type="standard"])').forEach(card => card.classList.toggle('item-disabled', !!exclusiveSelection));
    (document.querySelector('button[onclick="showCustomServiceModal()"]') as HTMLButtonElement).disabled = !!exclusiveSelection;
    dom.clearSelectionsBtn!.classList.toggle('hidden', currentSelected.length === 0);
    if (exclusiveSelection) {
        dom.modeIndicator!.className = 'mb-4 p-3 rounded-lg border border-green-500 bg-green-900/20 text-green-300 font-bold text-center';
        dom.modeIndicator!.textContent = `Modo Activo: ${exclusiveSelection.type === 'package' ? 'Paquete' : 'Plan Mensual'} (Exclusivo)`;
    } else {
        dom.modeIndicator!.className = 'mb-4 p-3 rounded-lg border border-yellow-500 bg-yellow-900/20 text-yellow-300 font-bold text-center';
        dom.modeIndicator!.textContent = 'Modo Activo: Individual (Selección libre)';
    }
    dom.selectedItemsDiv!.innerHTML = currentSelected.length === 0 ? '<p class="text-slate-400">Selecciona ítems, un paquete o un plan.</p>' : currentSelected.map(item => {
        const prefix = item.type === 'package' ? '📦 ' : item.type === 'plan' ? '📅 ' : item.type === 'custom' ? '⭐ ' : '• ';
        const color = (item.type === 'package' || item.type === 'plan' || item.type === 'custom') ? 'text-cyan-300 font-bold' : 'text-slate-200';
        const removeButton = item.type === 'custom' ? `<button data-action="remove-custom" data-id="${item.id}" class="text-red-500 hover:text-red-400 ml-2 font-mono">[x]</button>` : '';
        const pointText = item.pointCost ? ` (${item.pointCost} Pts)` : '';
        return `<div class="${color} flex justify-between items-center">${prefix}${item.name}${pointText}${removeButton}</div>`;
    }).join('');
    updateSummary();
}
function updatePointSystemUI() {
    const { usedPlanPoints, totalPlanPoints } = getState();
    dom.planPointsCounterSpan!.textContent = `${usedPlanPoints} / ${totalPlanPoints}`;
    const remainingPoints = totalPlanPoints - usedPlanPoints;
    const allServiceCheckboxes = dom.monthlyServicesContainer!.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    allServiceCheckboxes.forEach(cb => {
        const servicePointCost = parseInt(cb.dataset.pointCost!);
        cb.disabled = !cb.checked && servicePointCost > remainingPoints;
        (cb.closest('.item-card') as HTMLElement).classList.toggle('item-disabled', !cb.checked && servicePointCost > remainingPoints);
    });
}
function handlePlanSelection(planId: string, preSelectedIds: string[] = []) {
    const { monthlyPlans, allServices } = getState();
    const plan = monthlyPlans.find(p => p.id == planId);
    if (!plan) return;
    setSelectedPlanId(planId);
    setTotalPlanPoints(plan.points);
    let initialUsedPoints = 0;
    let initialSelectedServices: any[] = [];
    dom.servicesTabsDiv!.innerHTML = Object.keys(allServices).filter(k => !allServices[k].isExclusive).map(key => {
        const category = allServices[key];
        const itemsHTML = category.items.map((svc: any) => createServiceItemHTML(svc, 'plan-service', `plan-service-${key}`, false, key)).join('');
        return `
            <div class="p-4 bg-slate-900 rounded-xl shadow-inner">
                <h3 class="text-xl font-semibold mb-3 text-cyan-500">${category.name}</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${itemsHTML}</div>
            </div>`;
    }).join('');
    preSelectedIds.forEach(serviceId => {
        const checkbox = document.getElementById(`plan-service-${serviceId}`) as HTMLInputElement;
        if (checkbox) {
            checkbox.checked = true;
            const pointCost = parseInt(checkbox.dataset.pointCost!);
            initialUsedPoints += pointCost;
            initialSelectedServices.push({ id: checkbox.value, name: checkbox.dataset.name!, type: 'plan-service', price: 0, pointCost: pointCost });
        }
    });
    setUsedPlanPoints(initialUsedPoints);
    setSelectedPlanServices(initialSelectedServices);
    updatePointSystemUI();
}
function handleServiceSelection(checkbox: HTMLInputElement, isChecked: boolean) {
    let { usedPlanPoints, selectedPlanServices } = getState();
    const pointCost = parseInt(checkbox.dataset.pointCost!);
    const serviceId = checkbox.value;
    const serviceName = checkbox.dataset.name!;
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
function clearAllSelections() {
    document.querySelectorAll<HTMLInputElement>('input[type="radio"]:checked, input[type="checkbox"]:checked').forEach(el => el.checked = false);
    setCustomServices([]);
    setSelectedPlanId(null);
    setSelectedPlanServices([]);
    setTotalPlanPoints(0);
    setUsedPlanPoints(0);
    updatePointSystemUI();
    updateSelectedItems();
}
function toggleSelectionMode(mode: string) {
    const isMonthly = mode === 'mensual';
    (dom.serviceTypeSelect as HTMLSelectElement).value = mode;
    dom.monthlyPlansContainer!.classList.toggle('hidden', !isMonthly);
    dom.servicesSelectionDiv!.classList.toggle('hidden', isMonthly);
    dom.monthlyServicesContainer!.classList.toggle('hidden', !isMonthly);
    if (document.querySelector('input:checked')) {
        clearAllSelections();
    }
}
function handleAddTask() {
    const { selectedServices, editingIndex, selectedPlanId, selectedPlanServices, usedPlanPoints, totalPlanPoints } = getState();
    if (selectedServices.length === 0) return showNotification('error', 'Error', 'Debes seleccionar al menos un servicio.');
    const packageSelection = selectedServices.find(s => s.type === 'package');
    const planSelection = selectedServices.find(s => s.type === 'plan');
    const individualItems = selectedServices.filter(s => s.type === 'standard' || s.type === 'custom');
    let newTask = {
        clientName: (document.getElementById('clientName') as HTMLInputElement).value || 'Sin Cliente',
        webName: (document.getElementById('webName') as HTMLInputElement).value || 'Sin Web',
        margin: parseFloat((dom.marginPercentageInput as HTMLInputElement).value) / 100 || 0,
        totalDev: parseFloat(dom.totalDevPriceSpan!.textContent!),
        totalClient: parseFloat(dom.totalClientPriceSpan!.textContent!),
        package: packageSelection || null,
        plan: planSelection ? {
            id: selectedPlanId,
            selectedServiceIds: selectedPlanServices.map(s => s.id),
            pointsUsed: usedPlanPoints,
            totalPointsInBudget: totalPlanPoints,
            remainingPoints: totalPlanPoints - usedPlanPoints
        } : null,
        services: individualItems,
        type: (dom.serviceTypeSelect as HTMLSelectElement).value,
    };
    let { tasks } = getState();
    if (editingIndex !== -1) {
        tasks[editingIndex] = newTask;
    } else {
        tasks.push(newTask);
    }
    setTasks(tasks);
    showNotification('success', 'Tarea Guardada', `El presupuesto para ${newTask.webName} ha sido guardado.`);
    resetForm();
    saveTasks();
}
function resetForm() {
    setEditingIndex(-1);
    (document.getElementById('clientName') as HTMLInputElement).value = '';
    (document.getElementById('webName') as HTMLInputElement).value = '';
    (dom.serviceTypeSelect as HTMLSelectElement).value = 'puntual';
    (dom.marginPercentageInput as HTMLInputElement).value = '60';
    toggleSelectionMode('puntual');
    clearAllSelections();
}
function editTask(index: number) {
    const { tasks } = getState();
    const task = tasks[index];
    setEditingIndex(index);
    (document.getElementById('clientName') as HTMLInputElement).value = task.clientName;
    (document.getElementById('webName') as HTMLInputElement).value = task.webName;
    (dom.marginPercentageInput as HTMLInputElement).value = (task.margin * 100).toFixed(0);
    const selectionType = task.plan ? 'mensual' : 'puntual';
    (dom.serviceTypeSelect as HTMLSelectElement).value = selectionType;
    toggleSelectionMode(selectionType);
    setTimeout(() => {
        clearAllSelections();
        if (task.package) {
            (document.getElementById(`package-${task.package.id}`) as HTMLInputElement).checked = true;
        } else if (task.plan) {
            (document.getElementById(`plan-${task.plan.id}`) as HTMLInputElement).checked = true;
            handlePlanSelection(task.plan.id, task.plan.selectedServiceIds);
        } else {
            setCustomServices(task.services.filter((s: any) => s.type === 'custom'));
            task.services.filter((s: any) => s.type === 'standard').forEach((svc: any) => {
                const el = document.getElementById(`standard-${svc.id}`) as HTMLInputElement;
                if (el) el.checked = true;
            });
        }
        updateSelectedItems();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
}
function deleteTask(index: number) {
    let { tasks, editingIndex } = getState();
    tasks.splice(index, 1);
    setTasks(tasks);
    saveTasks();
    showNotification('info', 'Tarea Eliminada', `El presupuesto ha sido eliminado.`);
    if (index === editingIndex) resetForm();
}


// --- DATA HANDLING ---
async function loadPricingData() {
    try {
        const resp = await fetch('pricing.json?v=' + new Date().getTime());
        if (!resp.ok) throw new Error('Archivo "pricing.json" no encontrado o error de red.');
        const data = await resp.json();
        setAllServices(data.allServices || {});
        setMonthlyPlans(data.monthlyPlans || []);
        if (dom.messageContainer) dom.messageContainer.innerHTML = '';
        initializeUI();
    } catch (err: any) {
        console.error('Error Crítico al cargar pricing.json:', err.message);
        // NON-DESTRUCTIVE ERROR HANDLING
        showNotification(
            'error', 
            'Error Crítico de Carga', 
            'La aplicación no pudo cargar el catálogo de servicios (pricing.json). Algunas funciones estarán deshabilitadas. Por favor, asegúrate de que el archivo exista y sea válido.'
        );
        // Initialize UI with empty data to prevent crashing
        initializeUI();
    }
}
function loadTasks() {
    try {
        const storedTasks = localStorage.getItem('webBudgetTasks');
        if (storedTasks) setTasks(JSON.parse(storedTasks));
    } catch (e) {
        console.error("Error al cargar tareas:", e);
        setTasks([]);
    }
    renderTasksDashboard();
}
function saveTasks() {
    localStorage.setItem('webBudgetTasks', JSON.stringify(getState().tasks));
    renderTasksDashboard();
}

// --- PDF GENERATION ---
async function generatePdf(isForClient: boolean) {
    const logoFile = (dom.pdfLogoInput as HTMLInputElement).files?.[0];
    const reader = new FileReader();
    const logoPromise = new Promise((resolve) => {
        if (logoFile) {
            reader.onload = (event) => resolve(event.target!.result);
            reader.readAsDataURL(logoFile);
        } else {
            resolve(null);
        }
    });
    const logoDataUrl: string | null = await logoPromise as string;
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF();
    const { tasks, allServices, monthlyPlans } = getState();
    let y = 20;
    const pageHeight = doc.internal.pageSize.height;
    const leftMargin = 15;
    const rightMargin = 195;
    const contentWidth = rightMargin - leftMargin;
    const addPageNumbers = () => {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor('#64748B');
            doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width / 2, pageHeight - 10, { align: 'center' });
        }
    };
    const checkPageBreak = (spaceNeeded = 10) => {
        if (y + spaceNeeded > pageHeight - 20) {
            doc.addPage();
            y = 20;
        }
    };
    const findServiceById = (id: string) => {
        for (const categoryKey in allServices) {
            const service = allServices[categoryKey].items.find((item: any) => item.id === id);
            if (service) return service;
        }
        return { name: `Servicio Desconocido (ID: ${id})`, description: 'No se encontró la descripción.', price: 0, pointCost: 0 };
    };
    if (isForClient) {
        if (logoDataUrl) {
            try { doc.addImage(logoDataUrl, 'PNG', leftMargin, y - 5, 30, 15); }
            catch (e) { console.error("Error al añadir logo:", e); }
        }
        doc.setFontSize(9);
        doc.setTextColor('#94A3B8');
        doc.text((dom.pdfResellerInfo as HTMLTextAreaElement).value.split('\n'), rightMargin, y, { align: 'right' });
        y += 20;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#F8FAFC');
        doc.text("Presupuesto Para:", leftMargin, y);
        doc.setFont('helvetica', 'normal');
        doc.text((dom.pdfClientInfo as HTMLTextAreaElement).value.split('\n'), leftMargin, y + 6);
        doc.setFont('helvetica', 'bold');
        doc.text("Fecha de Emisión:", rightMargin, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(new Date().toLocaleDateString('es-ES'), rightMargin, y + 6, { align: 'right' });
        y += 20;
        doc.setDrawColor('#334155');
        doc.line(leftMargin, y, rightMargin, y);
        y += 10;
        tasks.forEach((task, index) => {
            checkPageBreak(40);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor('#22D3EE');
            doc.text(`Proyecto: ${task.webName}`, leftMargin, y);
            y += 8;
            const item = task.package ? findServiceById(task.package.id) : (task.plan ? monthlyPlans.find(p => p.id == task.plan.id) : null);
            if (item) {
                doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor('#F8FAFC');
                doc.text(item.name, leftMargin, y); y += 6;
                doc.setFontSize(9); doc.setTextColor('#94A3B8');
                const descriptionLines = doc.splitTextToSize(item.description, contentWidth);
                doc.text(descriptionLines, leftMargin, y); y += descriptionLines.length * 4 + 4;
            } else {
                doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor('#F8FAFC');
                doc.text("Desglose de Servicios:", leftMargin, y); y += 7;
                doc.setFontSize(10);
                task.services.forEach((svc: any) => {
                    checkPageBreak(); doc.setTextColor('#CBD5E1');
                    doc.text(`• ${svc.name}`, leftMargin + 2, y); y += 5;
                }); y += 2;
            }
            checkPageBreak(15);
            doc.setDrawColor('#334155'); doc.line(leftMargin + 80, y, rightMargin, y); y += 6;
            doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor('#4ADE80');
            doc.text("Monto Total:", rightMargin - 40, y, { align: 'right' });
            doc.text(`$${task.totalClient.toFixed(2)} USD`, rightMargin, y, { align: 'right' }); y += 20;
            if (index < tasks.length - 1) { doc.setDrawColor('#334155'); doc.line(leftMargin, y - 5, rightMargin, y - 5); }
        });
        const terms = (dom.pdfTerms as HTMLTextAreaElement).value;
        if (terms) {
            checkPageBreak(40);
            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor('#F8FAFC');
            doc.text("Términos y Condiciones", leftMargin, y); y += 5;
            doc.setFontSize(8); doc.setTextColor('#94A3B8');
            doc.text(doc.splitTextToSize(terms, contentWidth), leftMargin, y);
        }
        addPageNumbers();
        const fileName = `Propuesta-${tasks[0]?.webName || 'Proyecto'}.pdf`;
        doc.save(fileName);
        showNotification('success', 'PDF Generado', `El documento '${fileName}' ha sido exportado.`);
        closePdfOptionsModal();
        return;
    }
    // Reporte Interno
    doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor('#22D3EE');
    doc.text("Reporte Interno de Desarrollo", doc.internal.pageSize.width / 2, y, { align: 'center' }); y += 8;
    doc.setFontSize(10); doc.setTextColor('#94A3B8');
    doc.text(`Fecha de Generación: ${new Date().toLocaleString('es-ES')}`, doc.internal.pageSize.width / 2, y, { align: 'center' }); y += 15;
    const resellerInfoText = ((dom.pdfResellerInfo as HTMLTextAreaElement).value || 'No especificado').split('\n');
    const clientInfoText = ((dom.pdfClientInfo as HTMLTextAreaElement).value || 'No especificado').split('\n');
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor('#F8FAFC');
    doc.text("Preparado por (Revendedor):", leftMargin, y); doc.setFont('helvetica', 'normal');
    doc.text(resellerInfoText, leftMargin, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.text("Para el cliente final:", rightMargin, y, { align: 'right' }); doc.setFont('helvetica', 'normal');
    doc.text(clientInfoText, rightMargin, y + 6, { align: 'right' });
    y += (Math.max(resellerInfoText.length, clientInfoText.length) * 5) + 10;
    tasks.forEach((task) => {
        checkPageBreak(50);
        doc.setDrawColor('#334155'); doc.line(leftMargin, y, rightMargin, y); y += 10;
        doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor('#F8FAFC');
        doc.text(`Proyecto: ${task.webName}`, leftMargin, y); y += 6;
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor('#FBBF24');
        doc.text(`Costo de Desarrollo: $${task.totalDev.toFixed(2)} USD`, rightMargin, y, { align: 'right' }); y += 10;
        if (task.package) {
            const pkg = findServiceById(task.package.id);
            doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor('#A5B4FC');
            doc.text('PAQUETE SELECCIONADO:', leftMargin, y); y += 7;
            doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor('#F8FAFC');
            doc.text(`• ${pkg.name}`, leftMargin + 2, y); y += 6;
            doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor('#94A3B8');
            const descLines = doc.splitTextToSize(pkg.description, contentWidth - 5);
            doc.text(descLines, leftMargin + 5, y); y += descLines.length * 4 + 5;
        } else if (task.plan) {
            const plan = monthlyPlans.find(p => p.id == task.plan.id);
            const totalUsedPoints = task.plan.selectedServiceIds.reduce((sum: number, sId: string) => sum + findServiceById(sId).pointCost, 0);
            doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor('#A5B4FC');
            doc.text('PLAN MENSUAL:', leftMargin, y); doc.setFont('helvetica', 'normal');
            doc.text(`${plan.name} (${totalUsedPoints} / ${plan.points} Pts usados)`, leftMargin + 35, y); y += 8;
            doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor('#F8FAFC');
            doc.text('Servicios solicitados en este plan:', leftMargin, y); y += 7;
            task.plan.selectedServiceIds.forEach((serviceId: string) => {
                const svc = findServiceById(serviceId);
                checkPageBreak(15 + (svc.description.length / 2));
                doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor('#CBD5E1');
                doc.text(`• ${svc.name} (${svc.pointCost} Pts)`, leftMargin + 2, y); y += 5;
                doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor('#94A3B8');
                const descLines = doc.splitTextToSize(svc.description, contentWidth - 8);
                doc.text(descLines, leftMargin + 8, y); y += descLines.length * 4 + 4;
            });
        } else {
            doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor('#A5B4FC');
            doc.text('ÍTEMS INDIVIDUALES SOLICITADOS:', leftMargin, y); y += 8;
            task.services.forEach((svc: any) => {
                const fullSvc = findServiceById(svc.id);
                checkPageBreak(15 + (fullSvc.description.length / 2));
                let serviceTitle = svc.type === 'custom' ? `⭐ ${svc.name} (Servicio Personalizado)` : `• ${svc.name}`;
                doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor('#CBD5E1');
                doc.text(serviceTitle, leftMargin + 2, y);
                doc.text(`$${svc.price.toFixed(2)}`, rightMargin, y, { align: 'right' }); y += 5;
                doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor('#94A3B8');
                const desc = svc.type === 'custom' ? '(Sin descripción para ítems personalizados)' : fullSvc.description;
                const descLines = doc.splitTextToSize(desc, contentWidth - 8);
                doc.text(descLines, leftMargin + 8, y); y += descLines.length * 4 + 4;
            });
        }
        y += 10;
    });
    checkPageBreak(30);
    doc.setDrawColor('#334155');
    doc.line(leftMargin, y, rightMargin, y); y += 10;
    const grandTotalDev = tasks.reduce((sum, t) => sum + t.totalDev, 0);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor('#4ADE80');
    doc.text("COSTO TOTAL (TODOS LOS PROYECTOS):", rightMargin, y, { align: 'right' }); y += 8;
    doc.setFontSize(20);
    doc.text(`$${grandTotalDev.toFixed(2)} USD`, rightMargin, y, { align: 'right' });
    addPageNumbers();
    const fileName = `ReporteInterno-${tasks[0]?.webName || 'Proyectos'}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
    showNotification('success', 'PDF Generado', `El reporte interno '${fileName}' ha sido exportado.`);
    closePdfOptionsModal();
}
(window as any).generatePdf = generatePdf;


// --- PRESENTATION MODE LOGIC ---
let slides: string[] = [];
let currentSlideIndex = 0;
function findServiceByIdForPresentation(id: string) {
    const { allServices } = getState();
    for (const categoryKey in allServices) {
        const service = allServices[categoryKey].items.find((item: any) => item.id === id);
        if (service) return service;
    }
    return { name: `Servicio (ID: ${id})`, description: 'N/A' };
};
function updateProgressBar() {
    const progressBar = document.getElementById('presentationProgressBar') as HTMLElement;
    const percentage = slides.length > 1 ? (currentSlideIndex / (slides.length - 1)) * 100 : 100;
    progressBar.style.width = `${percentage}%`;
}
function updateNav() {
    (document.getElementById('prevSlideBtn') as HTMLButtonElement).disabled = currentSlideIndex === 0;
    (document.getElementById('nextSlideBtn') as HTMLButtonElement).disabled = currentSlideIndex === slides.length - 1;
    document.getElementById('slideCounter')!.textContent = `${currentSlideIndex + 1} / ${slides.length}`;
    updateProgressBar();
}
function showSlide(index: number) {
    const slidesElements = document.querySelectorAll('.presentation-slide');
    slidesElements.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });
    currentSlideIndex = index;
    updateNav();
}
function closePresentation() {
    document.getElementById('presentationModal')!.classList.add('hidden');
    document.body.style.overflow = 'auto';
}
function createSlides(brandingInfo: any) {
    const { tasks, monthlyPlans } = getState();
    let generatedSlides = [];
    const grandTotal = tasks.reduce((sum, t) => sum + t.totalClient, 0);
    generatedSlides.push(`
        <div class="max-w-4xl w-full">
            ${brandingInfo.logo ? `<img src="${brandingInfo.logo}" alt="Logo" class="max-h-24 mx-auto mb-8">` : ''}
            <h1 class="text-5xl font-extrabold accent-color mb-4" style="font-family: 'Orbitron', sans-serif;">Propuesta de Desarrollo Web</h1>
            <p class="text-lg text-slate-300 mt-6 max-w-2xl mx-auto">Preparado para <strong>${brandingInfo.client.split('\n')[0]}</strong> por <strong>${brandingInfo.reseller.split('\n')[0]}</strong>.</p>
            <button id="openInfoModalBtn" class="mt-8 bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition">Conoce Nuestro Modelo de Trabajo</button>
        </div>
    `);
    tasks.forEach(task => {
        let servicesHtml = '';
        if (task.package) {
            const pkg = findServiceByIdForPresentation(task.package.id);
            servicesHtml = `<h3 class="text-2xl font-bold text-cyan-300 mb-2">${pkg.name}</h3><p class="text-slate-300 max-w-2xl">${pkg.description}</p>`;
        } else if (task.plan) {
            const plan = monthlyPlans.find(p => p.id == task.plan.id);
            servicesHtml = `<h3 class="text-2xl font-bold text-cyan-300 mb-2">${plan.name}</h3><p class="text-slate-300 mb-6 max-w-2xl">${plan.description}</p><h4 class="text-xl font-semibold text-white mb-3">Servicios Incluidos:</h4><ul class="list-disc list-inside text-slate-300">${task.plan.selectedServiceIds.map((id:string) => `<li>${findServiceByIdForPresentation(id).name}</li>`).join('')}</ul>`;
        } else {
            servicesHtml = `<h3 class="text-xl font-semibold text-white mb-4">Servicios Incluidos:</h3><ul class="text-left max-w-md mx-auto space-y-2">${task.services.map((s:any) => `<li class="p-3 bg-slate-800 rounded-lg text-slate-200">${s.type === 'custom' ? '⭐' : '✔️'} ${s.name}</li>`).join('')}</ul>`;
        }
        generatedSlides.push(`<div class="max-w-4xl w-full"><p class="text-lg text-slate-400">Propuesta para: ${task.clientName}</p><h2 class="text-4xl font-bold text-white mt-1 mb-8">${task.webName}</h2>${servicesHtml}<div class="mt-10 pt-6 border-t border-slate-700"><p class="text-xl text-slate-200">Inversión Total del Proyecto:</p><p class="text-5xl font-extrabold text-green-400 mt-2">$${task.totalClient.toFixed(2)} USD</p><p class="text-sm text-slate-500 mt-1">${task.type === 'mensual' ? 'por mes' : 'pago único'}</p></div></div>`);
    });
    if (tasks.length > 1) {
        generatedSlides.push(`<div class="max-w-3xl w-full"><h2 class="text-4xl font-bold text-white mb-8">Resumen de Inversión</h2><div class="space-y-4 w-full">${tasks.map(t => `<div class="flex justify-between items-center p-4 bg-slate-800 rounded-lg text-lg"><span class="text-slate-200">${t.webName}</span><span class="font-bold text-cyan-300">$${t.totalClient.toFixed(2)}</span></div>`).join('')}</div><div class="mt-10 pt-6 border-t-2 border-green-400"><p class="text-xl text-slate-200">Inversión Total Global:</p><p class="text-6xl font-extrabold text-green-400 mt-2">$${grandTotal.toFixed(2)} USD</p></div></div>`);
    }
    if (brandingInfo.terms) {
        generatedSlides.push(`<div class="max-w-4xl w-full text-left"><h2 class="text-3xl font-bold text-white mb-6 text-center">Términos y Condiciones</h2><div class="text-slate-300 whitespace-pre-line text-sm leading-relaxed">${brandingInfo.terms}</div></div>`);
    }
    return generatedSlides;
}
async function startPresentation() {
    const logoFile = (dom.pdfLogoInput as HTMLInputElement).files?.[0];
    const reader = new FileReader();
    const logoPromise = new Promise((resolve) => {
        if (logoFile) {
            reader.onload = (event) => resolve(event.target!.result);
            reader.readAsDataURL(logoFile);
        } else { resolve(null); }
    });
    const brandingInfo = {
        logo: await logoPromise as string | null,
        reseller: (dom.pdfResellerInfo as HTMLTextAreaElement).value || 'No especificado',
        client: (dom.pdfClientInfo as HTMLTextAreaElement).value || 'No especificado',
        terms: (dom.pdfTerms as HTMLTextAreaElement).value || ''
    };
    slides = createSlides(brandingInfo);
    if (slides.length === 0) return;
    const contentDiv = document.getElementById('presentationContent');
    contentDiv!.innerHTML = slides.map((slideHTML, index) => `<div class="presentation-slide ${index === 0 ? 'active' : ''}">${slideHTML}</div>`).join('');
    
    // Add listener for the info modal button AFTER slides are in the DOM
    document.getElementById('openInfoModalBtn')?.addEventListener('click', () => {
        document.getElementById('infoModal')!.classList.remove('hidden');
    });

    closePdfOptionsModal();
    document.getElementById('presentationModal')!.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    currentSlideIndex = 0;
    updateNav();
}
function initiatePresentation() {
    const { tasks } = getState();
    if (tasks.length === 0) return showNotification('info', 'Vacío', 'Debes guardar al menos una propuesta para poder presentarla.');
    showPdfOptionsModal();
}

// --- CHATBOT LOGIC ---
function initChat() {
    const chatMessagesContainer = document.getElementById('chat-messages') as HTMLElement;
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    const sendChatBtn = document.getElementById('chat-send-btn') as HTMLButtonElement;
    let chatHistory: any[] = [];
    let isSending = false;

    function addMessageToChat(message: string, role: 'user' | 'model') {
        const sender = role === 'user' ? 'user' : 'ai';
        const wrapper = document.createElement('div');
        wrapper.className = 'chat-message flex flex-col my-2';
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble p-3 rounded-lg max-w-[85%] relative';
        let finalHTML = message.replace(/\n/g, '<br>');

        if (sender === 'ai') {
             try {
                const jsonResponse = JSON.parse(message);
                if (jsonResponse.introduction && Array.isArray(jsonResponse.services)) {
                    let messageText = `${jsonResponse.introduction.replace(/\n/g, '<br>')}`;
                     if (jsonResponse.closing) messageText += `<br><br>${jsonResponse.closing.replace(/\n/g, '<br>')}`;
                    finalHTML = messageText;
                }
            } catch (e) { /* Not JSON */ }
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
        addMessageToChat(userMessage, 'user');
        const payload = { userMessage: userMessage, history: chatHistory };
        chatHistory.push({ role: 'user', parts: [{ text: userMessage }] }); 
        chatInput.value = '';
        chatInput.focus();
        // toggleTypingIndicator(true); // Placeholder for typing indicator

        try {
            const response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`Error de red: ${response.status}`);
            const data = await response.json();
            chatHistory = data.history; 
            addMessageToChat(data.response, 'model');
        } catch (error) {
            console.error("Error al enviar mensaje:", error);
            addMessageToChat(`Lo siento, hubo un error de conexión con el asistente.`, 'model');
        } finally {
            isSending = false;
            sendChatBtn.disabled = false;
            // toggleTypingIndicator(false);
        }
    }
    
    const welcomeMessage = '¡Hola! Soy Zen Assistant. Describe el proyecto de tu cliente y te ayudaré a seleccionar los servicios.';
    addMessageToChat(welcomeMessage, 'model');
    chatHistory.push({ role: 'model', parts: [{ text: welcomeMessage }] });

    sendChatBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { event.preventDefault(); sendMessage(); }
    });
}

// --- INFO MODAL & TTS LOGIC ---
function playInfoNarration() {
    const synth = window.speechSynthesis;
    if (synth.speaking) {
        synth.cancel();
        return;
    }

    let narrationQueue = Array.from(document.querySelectorAll('.vocal-highlight'));
    let lastHighlightedPoint: HTMLElement | null = null;
    
    function processNarrationQueue() {
        if (narrationQueue.length === 0) {
            if (lastHighlightedPoint) lastHighlightedPoint.classList.add('highlighted');
            return;
        }

        const elementToSpeak = narrationQueue.shift() as HTMLElement;
        const textToSpeak = elementToSpeak.textContent || '';
        const parentPoint = elementToSpeak.closest('.business-pillar, .workflow-step') as HTMLElement;

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


// --- APP INITIALIZATION ---
async function initializeApp() {
    await loadPricingData();
    loadTasks();
    resetForm();
    initChat();
    
    // Main Event Listeners
    (dom.serviceTypeSelect as HTMLElement).addEventListener('change', (e) => toggleSelectionMode((e.target as HTMLSelectElement).value));
    (dom.clearSelectionsBtn as HTMLElement).addEventListener('click', clearAllSelections);
    (dom.addTaskButton as HTMLElement).addEventListener('click', handleAddTask);
    (dom.marginPercentageInput as HTMLElement).addEventListener('input', updateSelectedItems);
    (dom.serviceSearchInput as HTMLElement).addEventListener('input', (e) => filterServices((e.target as HTMLInputElement).value));
    (document.getElementById('presentProposalBtn') as HTMLElement).addEventListener('click', initiatePresentation);
    (dom.clearAllTasksBtn as HTMLElement).addEventListener('click', () => {
        if (getState().tasks.length > 0 && confirm("¿Estás seguro de que deseas borrar TODAS las tareas?")) {
            setTasks([]);
            saveTasks();
            resetForm();
            showNotification('info', 'Tareas Borradas', 'Todas las tareas han sido eliminadas.');
        }
    });

    // Presentation Modal Listeners
    (document.getElementById('startPresentationBtn') as HTMLElement).addEventListener('click', startPresentation);
    (document.getElementById('presentationCloseBtn') as HTMLElement).addEventListener('click', closePresentation);
    (document.getElementById('prevSlideBtn') as HTMLElement).addEventListener('click', () => { if (currentSlideIndex > 0) showSlide(currentSlideIndex - 1); });
    (document.getElementById('nextSlideBtn') as HTMLElement).addEventListener('click', () => { if (currentSlideIndex < slides.length - 1) showSlide(currentSlideIndex + 1); });
    document.addEventListener('keydown', (e) => {
        if (!document.getElementById('presentationModal')!.classList.contains('hidden')) {
            if (e.key === 'ArrowRight' && currentSlideIndex < slides.length - 1) showSlide(currentSlideIndex + 1);
            else if (e.key === 'ArrowLeft' && currentSlideIndex > 0) showSlide(currentSlideIndex - 1);
            else if (e.key === 'Escape') closePresentation();
        }
    });

    // Info Modal Listeners
    (document.getElementById('infoModalCloseBtn') as HTMLElement).addEventListener('click', () => {
        window.speechSynthesis.cancel();
        (document.getElementById('infoModal') as HTMLElement).classList.add('hidden');
    });
    (document.getElementById('playInfoNarrationBtn') as HTMLElement).addEventListener('click', playInfoNarration);

    // Event Delegation
    (dom.appContainer as HTMLElement).addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.matches('input[name="selectionGroup"], input[data-type="standard"]')) {
            if (document.querySelector('input[name="monthlyPlanSelection"]:checked')) clearAllSelections();
            if (target.name === 'selectionGroup') document.querySelectorAll('input[data-type="standard"]').forEach(cb => (cb as HTMLInputElement).checked = false);
            else if (document.querySelector('input[name="selectionGroup"]:checked')) (document.querySelector('input[name="selectionGroup"]:checked') as HTMLInputElement).checked = false;
            updateSelectedItems();
        } else if (target.matches('input[name="monthlyPlanSelection"]')) {
            if (document.querySelector('input[name="selectionGroup"]:checked')) (document.querySelector('input[name="selectionGroup"]:checked') as HTMLInputElement).checked = false;
            document.querySelectorAll('input[data-type="standard"]:checked').forEach(cb => (cb as HTMLInputElement).checked = false);
            handlePlanSelection(target.value);
            updateSelectedItems();
        } else if (target.matches('input[name^="plan-service-"]')) {
            handleServiceSelection(target, target.checked);
        }
    });
    (dom.appContainer as HTMLElement).addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const card = target.closest('.item-card');
        if (card && !target.matches('input')) {
            const input = card.querySelector('input');
            if (input && !input.disabled) input.click();
        }
        const actionButton = target.closest('[data-action]') as HTMLElement;
        if (actionButton) {
            const { action, index, id } = actionButton.dataset;
            if (action === 'edit' && index) editTask(parseInt(index));
            if (action === 'delete' && index) deleteTask(parseInt(index));
            if (action === 'remove-custom' && id) removeCustomService(id);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const splashScreen = document.getElementById('splashScreen') as HTMLElement;
    const enterAppBtn = document.getElementById('enterAppBtn') as HTMLElement;
    const mainAppContainer = document.getElementById('mainAppContainer') as HTMLElement;

    if (sessionStorage.getItem('splashSeen')) {
        splashScreen.style.display = 'none';
        mainAppContainer.classList.remove('hidden');
        initializeApp();
    } else {
        enterAppBtn.addEventListener('click', () => {
            splashScreen.style.opacity = '0';
            splashScreen.style.pointerEvents = 'none';
            setTimeout(() => {
                splashScreen.style.display = 'none';
            }, 700);
            mainAppContainer.classList.remove('hidden');
            sessionStorage.setItem('splashSeen', 'true');
            initializeApp();
        }, { once: true });
    }
});