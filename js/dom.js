// --- DOM REFERENCES ---

// A single object to hold all references to DOM elements.
// It will be populated by the initializeDomReferences function after the DOM is ready.
export const dom = {};

/**
 * Finds all DOM elements and populates the dom object.
 * Must be called after DOMContentLoaded.
 */
export function initializeDomReferences() {
    // Main containers
    dom.appContainer = document.getElementById('appContainer');
    dom.mainAppContainer = document.getElementById('mainAppContainer');
    dom.splashScreen = document.getElementById('splashScreen');

    // Service selection
    dom.serviceTypeSelect = document.getElementById('serviceType');
    dom.servicesSelectionDiv = document.getElementById('servicesSelection');
    dom.monthlyPlansContainer = document.getElementById('monthlyPlansContainer');
    dom.monthlyServicesContainer = document.getElementById('monthlyServicesContainer');
    dom.servicesTabsDiv = document.getElementById('servicesTabs');
    dom.planPointsCounterSpan = document.getElementById('planPointsCounter');
    dom.serviceSearchInput = document.getElementById('serviceSearchInput');
    dom.noResultsMessage = document.getElementById('noResultsMessage');
    
    // Summary card
    dom.totalDevPriceSpan = document.getElementById('totalDeveloperPrice');
    dom.totalClientPriceSpan = document.getElementById('totalClientPrice');
    dom.marginPercentageInput = document.getElementById('marginPercentage');
    dom.marginFeedback = document.getElementById('marginFeedback');
    dom.marginQualityFeedback = document.getElementById('marginQualityFeedback');
    dom.addTaskButton = document.getElementById('addTask');
    dom.clearSelectionsBtn = document.getElementById('clearSelectionsBtn');
    dom.modeIndicator = document.getElementById('modeIndicator');
    dom.selectedItemsDiv = document.getElementById('selectedItems');
    
    // Dashboard
    dom.tasksDashboardDiv = document.getElementById('tasksDashboard');
    dom.grandTotalDevSpan = document.getElementById('grandTotalDeveloperPrice');
    dom.grandTotalClientSpan = document.getElementById('grandTotalClientPrice');
    dom.totalProfitSpan = document.getElementById('totalProfit');
    dom.exportPdfBtn = document.getElementById('exportPdfBtn');
    dom.clearAllTasksBtn = document.getElementById('clearAllTasksBtn');
    
    // Notifications and messages
    dom.messageContainer = document.getElementById('messageContainer');
    dom.notificationModal = document.getElementById('notificationModal');
    dom.notificationTitle = document.getElementById('notificationTitle');
    dom.notificationMessage = document.getElementById('notificationMessage');

    // Modals
    dom.customServiceModal = document.getElementById('customServiceModal');
    dom.pdfOptionsModal = document.getElementById('pdfOptionsModal');
    dom.infoModal = document.getElementById('infoModal');

    // Custom Service Modal inputs
    dom.customServiceNameInput = document.getElementById('customServiceName');
    dom.customServicePriceInput = document.getElementById('customServicePrice');

    // PDF Options Modal inputs
    dom.pdfLogoInput = document.getElementById('pdfLogoInput');
    dom.pdfResellerInfo = document.getElementById('pdfResellerInfo');
    dom.pdfClientInfo = document.getElementById('pdfClientInfo');
    dom.pdfTerms = document.getElementById('pdfTerms');

    // Splash Screen Buttons
    dom.enterAppBtn = document.getElementById('enterAppBtn');
    dom.showInfoModelBtn = document.getElementById('showInfoModelBtn');
}
