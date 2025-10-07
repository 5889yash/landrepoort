// Global variables
let currentFarmerPage = 1;
let currentLandPage = 1;
const itemsPerPage = 10;

// Fetch statistics
function fetchStats() {
    fetch('/api/stats')
        .then(response => response.json())
        .then(data => {
            // Update main stats cards
            document.getElementById('totalFarmers').textContent = data.total_farmers.toLocaleString();
            document.getElementById('totalLands').textContent = data.total_lands.toLocaleString();
            document.getElementById('totalArea').textContent = data.total_area.toLocaleString(undefined, {maximumFractionDigits: 2});
            
            // Update tab badges
            const farmersCount = document.getElementById('farmersCount');
            const landsCount = document.getElementById('landsCount');
            if (farmersCount) farmersCount.textContent = data.total_farmers;
            if (landsCount) landsCount.textContent = data.total_lands;
            
            // Update verified records (mock calculation)
            const verifiedRecords = document.getElementById('verifiedRecords');
            if (verifiedRecords) {
                verifiedRecords.textContent = Math.floor(data.total_farmers * 0.75).toLocaleString();
            }
            
            // Hide loading rows if they exist
            const loadingRows = document.querySelectorAll('.loading-row');
            loadingRows.forEach(row => row.style.display = 'none');
        })
        .catch(error => {
            console.error('Error fetching stats:', error);
            showErrorToast('Failed to load statistics');
        });
}

// Enhanced toast function for better error handling
function showErrorToast(message) {
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    
    const toastHtml = `
        <div class="toast align-items-center text-white bg-danger border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = toastContainer.lastElementChild;
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
    
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
}

// Handle pagination
function changeFarmerPage(page) {
    currentFarmerPage = page;
    const searchTerm = document.getElementById('searchFarmer').value;
    loadFarmers(searchTerm);
}

function changeLandPage(page) {
    currentLandPage = page;
    const searchTerm = document.getElementById('searchLand').value;
    loadLands(searchTerm);
}

// Render pagination controls
function renderPagination(elementId, currentPage, totalPages, pageChangeHandler) {
    const pagination = document.getElementById(elementId);
    if (!pagination) return;
    
    pagination.innerHTML = '';
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <a class="page-link" href="#" aria-label="Previous" onclick="event.preventDefault(); ${pageChangeHandler}(${currentPage - 1})">
            <span aria-hidden="true">&laquo;</span>
        </a>`;
    pagination.appendChild(prevLi);
    
    // Page numbers
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = startPage + maxPages - 1;
    
    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageLi.innerHTML = `<a class="page-link" href="#" onclick="event.preventDefault(); ${pageChangeHandler}(${i})">${i}</a>`;
        pagination.appendChild(pageLi);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage >= totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <a class="page-link" href="#" aria-label="Next" onclick="event.preventDefault(); ${pageChangeHandler}(${currentPage + 1})">
            <span aria-hidden="true">&raquo;</span>
        </a>`;
    pagination.appendChild(nextLi);
}

function getStatusBadge(status) {
    let statusText = 'Unknown';
    let statusClass = 'dark';
    if (status === 1) {
        statusText = 'Active';
        statusClass = 'success';
    } else if (status === 0) {
        statusText = 'Inactive';
        statusClass = 'secondary';
    }
    return `<span class="badge bg-${statusClass}">${statusText}</span>`;
}

// Function to fetch bank ID to name map
async function getBankIdToNameMap() {
    try {
        const response = await fetch('/static/js/bankId.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const bankData = await response.json();
        const bankMap = {};
        bankData.forEach(bank => {
            bankMap[bank.BankId] = bank.BankName;
        });
        return bankMap;
    } catch (error) {
        console.error('Error fetching bank ID map:', error);
        showErrorToast('Failed to load bank information.');
        return {}; // Return an empty map to prevent further errors
    }
}
