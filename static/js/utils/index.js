/**
 * Shared utility functions for frontend modules.
 * Keep these small and focused; modules can import what they need.
 */

export async function getBankIdToNameMap() {
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
        return {};
    }
}

export function convertToAcres(kanal = 0, marle = 0, sarsai = 0) {
    const totalSarsaiUnits = (parseFloat(kanal) || 0) * 20 * 9 + (parseFloat(marle) || 0) * 9 + (parseFloat(sarsai) || 0);
    return totalSarsaiUnits / 1440;
}

export function convertSarsaiToTraditionalUnits(totalSarsai) {
    const kanal = Math.floor(totalSarsai / (20 * 9));
    const remainingSarsai = totalSarsai % (20 * 9);
    const marle = Math.floor(remainingSarsai / 9);
    const sarsai = remainingSarsai % 9;
    return { kanal, marle, sarsai };
}

export function getTotalLandAreaInAcres(lands = []) {
    const totalKanal = lands.reduce((acc, land) => acc + (parseFloat(land.kanal) || 0), 0);
    const totalMarle = lands.reduce((acc, land) => acc + (parseFloat(land.marle) || 0), 0);
    const totalSarsai = lands.reduce((acc, land) => acc + (parseFloat(land.sarsai) || 0), 0);
    return convertToAcres(totalKanal, totalMarle, totalSarsai).toFixed(2);
}

export function getTotalLandAreaTraditional(lands = []) {
    const totalKanal = lands.reduce((acc, land) => acc + (parseFloat(land.kanal) || 0), 0);
    const totalMarle = lands.reduce((acc, land) => acc + (parseFloat(land.marle) || 0), 0);
    const totalSarsai = lands.reduce((acc, land) => acc + (parseFloat(land.sarsai) || 0), 0);
    return `${totalKanal}K/${totalMarle}M/${totalSarsai}S`;
}

export function formatLandArea(kanal = 0, marle = 0, sarsai = 0) {
    const acres = convertToAcres(kanal || 0, marle || 0, sarsai || 0);
    const traditional = `${kanal || 0}K/${marle || 0}M/${sarsai || 0}S`;
    return {
        acres: acres.toFixed(2),
        traditional: traditional,
        acresFormatted: `${acres.toFixed(2)} acres`,
        traditionalFormatted: traditional
    };
}

export function renderPagination(elementId, currentPage, totalPages, pageChangeHandler) {
    const pagination = document.getElementById(elementId);
    if (!pagination) return;

    pagination.innerHTML = '';

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `
        <a class="page-link" href="#" aria-label="Previous" onclick="event.preventDefault(); ${pageChangeHandler}(${currentPage - 1})">
            <span aria-hidden="true">&laquo;</span>
        </a>`;
    pagination.appendChild(prevLi);

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

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage >= totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `
        <a class="page-link" href="#" aria-label="Next" onclick="event.preventDefault(); ${pageChangeHandler}(${currentPage + 1})">
            <span aria-hidden="true">&raquo;</span>
        </a>`;
    pagination.appendChild(nextLi);
}

export function showErrorToast(message) {
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

export function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
}
