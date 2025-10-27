// js/presentation.js

import { getState } from './state.js';
import * as dom from './dom.js';
import { showNotification, showPdfOptionsModal, closePdfOptionsModal } from './modals.js';

let slides = [];
let currentSlideIndex = 0;

// --- HELPERS ---
function findServiceById(id) {
    const { allServices } = getState();
    for (const categoryKey in allServices) {
        const category = allServices[categoryKey];
        const service = category.items.find(item => item.id === id);
        if (service) return service;
    }
    return { name: `Servicio (ID: ${id})`, description: 'N/A' };
};

// --- CORE PRESENTATION LOGIC ---

function updateNav() {
    document.getElementById('prevSlideBtn').disabled = currentSlideIndex === 0;
    document.getElementById('nextSlideBtn').disabled = currentSlideIndex === slides.length - 1;
    document.getElementById('slideCounter').textContent = `${currentSlideIndex + 1} / ${slides.length}`;
}

function showSlide(index) {
    const slidesElements = document.querySelectorAll('.presentation-slide');
    slidesElements.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });
    currentSlideIndex = index;
    updateNav();
}

function closePresentation() {
    dom.pdfOptionsModal.classList.add('hidden');
    document.getElementById('presentationModal').classList.add('hidden');
    document.body.style.overflow = 'auto'; // Restore scroll
}

function createSlides(brandingInfo) {
    const { tasks, allServices, monthlyPlans } = getState();
    let generatedSlides = [];
    const grandTotal = tasks.reduce((sum, t) => sum + t.totalClient, 0);

    // SLIDE 1: Cover Slide
    generatedSlides.push(`
        <div class="max-w-4xl w-full">
            ${brandingInfo.logo ? `<img src="${brandingInfo.logo}" alt="Logo" class="max-h-24 mx-auto mb-8">` : ''}
            <h1 class="text-5xl font-extrabold accent-color mb-4" style="font-family: 'Orbitron', sans-serif;">Propuesta de Desarrollo Web</h1>
            <p class="text-lg text-slate-300 mt-6 max-w-2xl mx-auto">Preparado para <strong>${brandingInfo.client.split('\n')[0]}</strong> por <strong>${brandingInfo.reseller.split('\n')[0]}</strong>.</p>
        </div>
    `);

    // SLIDE 2...N: Individual Task Slides
    tasks.forEach(task => {
        let servicesHtml = '';
        if (task.package) {
            const pkg = findServiceById(task.package.id);
            servicesHtml = `
                <h3 class="text-2xl font-bold text-cyan-300 mb-2">${pkg.name}</h3>
                <p class="text-slate-300 max-w-2xl">${pkg.description}</p>
            `;
        } else if (task.plan) {
            const plan = monthlyPlans.find(p => p.id == task.plan.id);
            servicesHtml = `
                <h3 class="text-2xl font-bold text-cyan-300 mb-2">${plan.name}</h3>
                <p class="text-slate-300 mb-6 max-w-2xl">${plan.description}</p>
                <h4 class="text-xl font-semibold text-white mb-3">Servicios Incluidos:</h4>
                <ul class="list-disc list-inside text-slate-300">
                    ${task.plan.selectedServiceIds.map(id => `<li>${findServiceById(id).name}</li>`).join('')}
                </ul>
            `;
        } else {
            servicesHtml = `
                <h3 class="text-xl font-semibold text-white mb-4">Servicios Incluidos:</h3>
                <ul class="text-left max-w-md mx-auto space-y-2">
                    ${task.services.map(s => `
                        <li class="p-3 bg-slate-800 rounded-lg text-slate-200">
                            ${s.type === 'custom' ? '⭐' : '✔️'} ${s.name}
                        </li>`).join('')}
                </ul>
            `;
        }

        generatedSlides.push(`
            <div class="max-w-4xl w-full">
                <p class="text-lg text-slate-400">Propuesta para: ${task.clientName}</p>
                <h2 class="text-4xl font-bold text-white mt-1 mb-8">${task.webName}</h2>
                ${servicesHtml}
                <div class="mt-10 pt-6 border-t border-slate-700">
                    <p class="text-xl text-slate-200">Inversión Total del Proyecto:</p>
                    <p class="text-5xl font-extrabold text-green-400 mt-2">$${task.totalClient.toFixed(2)} USD</p>
                    <p class="text-sm text-slate-500 mt-1">${task.type === 'mensual' ? 'por mes' : 'pago único'}</p>
                </div>
            </div>
        `);
    });

    // Summary Slide (if multiple tasks)
    if (tasks.length > 1) {
        generatedSlides.push(`
            <div class="max-w-3xl w-full">
                <h2 class="text-4xl font-bold text-white mb-8">Resumen de Inversión</h2>
                <div class="space-y-4 w-full">
                    ${tasks.map(t => `
                        <div class="flex justify-between items-center p-4 bg-slate-800 rounded-lg text-lg">
                            <span class="text-slate-200">${t.webName}</span>
                            <span class="font-bold text-cyan-300">$${t.totalClient.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="mt-10 pt-6 border-t-2 border-green-400">
                    <p class="text-xl text-slate-200">Inversión Total Global:</p>
                    <p class="text-6xl font-extrabold text-green-400 mt-2">$${grandTotal.toFixed(2)} USD</p>
                </div>
            </div>
        `);
    }
    
    // Terms Slide
     if (brandingInfo.terms) {
        generatedSlides.push(`
            <div class="max-w-4xl w-full text-left">
                <h2 class="text-3xl font-bold text-white mb-6 text-center">Términos y Condiciones</h2>
                <div class="text-slate-300 whitespace-pre-line text-sm leading-relaxed">${brandingInfo.terms}</div>
            </div>
        `);
    }

    return generatedSlides;
}


async function startPresentation() {
    const logoFile = dom.pdfLogoInput.files[0];
    const reader = new FileReader();
    const logoPromise = new Promise((resolve) => {
        if (logoFile) {
            reader.onload = (event) => resolve(event.target.result);
            reader.readAsDataURL(logoFile);
        } else {
            resolve(null);
        }
    });

    const brandingInfo = {
        logo: await logoPromise,
        reseller: dom.pdfResellerInfo.value || 'No especificado',
        client: dom.pdfClientInfo.value || 'No especificado',
        terms: dom.pdfTerms.value || ''
    };
    
    slides = createSlides(brandingInfo);
    if (slides.length === 0) return;
    
    const contentDiv = document.getElementById('presentationContent');
    contentDiv.innerHTML = slides.map((slideHTML, index) => 
        `<div class="presentation-slide ${index === 0 ? 'active' : ''}">${slideHTML}</div>`
    ).join('');

    closePdfOptionsModal();
    document.getElementById('presentationModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scroll

    currentSlideIndex = 0;
    updateNav();
}

// --- INITIALIZATION ---
export function initiatePresentation() {
    const { tasks } = getState();
    if (tasks.length === 0) {
        return showNotification('info', 'Vacío', 'Debes guardar al menos una propuesta para poder presentarla.');
    }
    showPdfOptionsModal();
}

// Event Listeners for the modal
document.getElementById('startPresentationBtn').addEventListener('click', startPresentation);
document.getElementById('presentationCloseBtn').addEventListener('click', closePresentation);
document.getElementById('prevSlideBtn').addEventListener('click', () => {
    if (currentSlideIndex > 0) {
        showSlide(currentSlideIndex - 1);
    }
});
document.getElementById('nextSlideBtn').addEventListener('click', () => {
    if (currentSlideIndex < slides.length - 1) {
        showSlide(currentSlideIndex + 1);
    }
});

document.addEventListener('keydown', (e) => {
    if (!document.getElementById('presentationModal').classList.contains('hidden')) {
        if (e.key === 'ArrowRight' && currentSlideIndex < slides.length - 1) {
            showSlide(currentSlideIndex + 1);
        } else if (e.key === 'ArrowLeft' && currentSlideIndex > 0) {
            showSlide(currentSlideIndex - 1);
        } else if (e.key === 'Escape') {
            closePresentation();
        }
    }
});