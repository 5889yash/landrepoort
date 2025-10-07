// Module: pages/lands.js
import {
  convertToAcres,
  formatLandArea,
  renderPagination,
  showErrorToast
} from '../utils/index.js';

let currentLandPage = 1;

function loadLands(search = '') {
  const url = `/api/lands?page=${currentLandPage}&search=${encodeURIComponent(search)}`;

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      renderLandsTable(data.data);
      renderPagination('landsPagination', data.page, data.total_pages, 'changeLandPage');
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Error loading land records:', error);
      showErrorToast('Error loading land records.');
    });
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

function renderLandsTable(lands) {
  const tbody = document.getElementById('landsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!lands || lands.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="text-center py-4">No land records found. Try adjusting your search criteria.</td></tr>';
    return;
  }

  lands.forEach((land) => {
    const row = document.createElement('tr');
    row.className = 'align-middle';

    const totalLandArea = formatLandArea(land.kanal, land.marle, land.sarsai);
    const cultivationArea = formatLandArea(
      land.land_owner_area_k,
      land.land_owner_area_m,
      land.land_owner_area_sarsai
    );

    const farmerDisplay =
      land.farmer_name && land.farmer_name !== 'Unknown Farmer'
        ? `<div class="farmer-name">
                <strong>${land.farmer_name}</strong>
                ${land.farmer_phone ? `<br><small class="text-muted">📞 ${land.farmer_phone}</small>` : ''}
             </div>`
        : '<span class="text-muted">Unknown Farmer</span>';

    const locationDisplay = `
            <div class="location-info">
                <strong>${land.village_name || 'N/A'}</strong><br>
                <small class="text-muted">${land.city_name || 'N/A'}, ${land.district_name || 'N/A'}</small>
            </div>
        `;

    row.innerHTML = `
            <td class="text-center">${land.sr_no || 'N/A'}</td>
            <td>${farmerDisplay}</td>
            <td>${land.owner_name || 'N/A'}</td>
            <td>${locationDisplay}</td>
            <td class="text-center">${land.khewat_no || 'N/A'}</td>
            <td class="text-center">
                <div class="land-area-display">
                    <strong>${totalLandArea.acresFormatted}</strong><br>
                    <small class="text-muted">${totalLandArea.traditionalFormatted}</small>
                </div>
            </td>
            <td class="text-center">
                <div class="land-area-display">
                    <strong>${cultivationArea.acresFormatted}</strong><br>
                    <small class="text-muted">${cultivationArea.traditionalFormatted}</small>
                </div>
            </td>
            <td class="text-center">
                <button class="btn btn-sm btn-outline-primary" onclick="viewLandDetails(${land.id})" title="View Details">
                    <i class="bi bi-eye me-1"></i>View
                </button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

function viewLandDetails(id) {
  fetch(`/api/land/${id}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Land record not found');
      }
      return response.json();
    })
    .then((land) => {
      const detailsDiv = document.getElementById('landDetails');
      if (!detailsDiv) return;

      const totalLand = `${land.kanal || 0}K/${land.marle || 0}M/${land.sarsai || 0}S`;
      const areaUnderCultivation = `${land.land_owner_area_k || 0}K/${land.land_owner_area_m || 0}M/${land.land_owner_area_sarsai || 0}S`;
      detailsDiv.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Sr.No.:</strong> ${land.survey_no || 'N/A'}</p>
                        <p><strong>District:</strong> ${land.district_name || 'N/A'}</p>
                        <p><strong>Tehsil:</strong> ${land.city_name || 'N/A'}</p>
                        <p><strong>Village:</strong> ${land.village_name || 'N/A'}</p>
                        <p><strong>Land Owner:</strong> ${land.owner_name || 'N/A'}</p>
                        <p><strong>Total Land:</strong> ${totalLand}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Type:</strong> ${land.type || 'N/A'}</p>
                        <p><strong>Land Available for Mapping:</strong> ${land.min_land || 0}</p>
                        <p><strong>Area under Cultivation:</strong> ${areaUnderCultivation}</p>
                        <p><strong>Status:</strong> ${getStatusBadge(land.status)}</p>
                        <p><strong>Created:</strong> ${land.created_at ? new Date(land.created_at).toLocaleString() : 'N/A'}</p>
                        <p><strong>Last Updated:</strong> ${land.updated_at ? new Date(land.updated_at).toLocaleString() : 'N/A'}</p>
                    </div>
                </div>
                ${land.farmer_phone ? `
                    <div class="alert alert-info mt-3">
                        <i class="bi bi-telephone me-2"></i>
                        <strong>Contact Owner:</strong> 
                        <a href="tel:${land.farmer_phone}" class="ms-2">
                            <i class="bi bi-telephone-fill me-1"></i>${land.farmer_phone}
                        </a>
                    </div>
                ` : ''}
            `;

      const modal = new bootstrap.Modal(document.getElementById('landModal'));
      modal.show();
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Error fetching land details:', error);
      showErrorToast('Error loading land record details. Please try again.');
    });
}

function editLandRecord(landId) {
  const row = document.getElementById(`land-row-${landId}`);
  if (!row) return;
  const ddl = row.querySelector(`#ddlownertype-${landId}`);
  if (ddl) ddl.disabled = false;

  const areaCell = row.cells[6];
  const areaParts = (areaCell.textContent || '').split('/');
  areaCell.innerHTML = `
        <input type="text" class="form-control" value="${areaParts[0] || ''}" size="2">
        <input type="text" class="form-control" value="${areaParts[1] || ''}" size="2">
        <input type="text" class="form-control" value="${areaParts[2] || ''}" size="2">
    `;

  const khewatCell = row.cells[4];
  const khewatValue = khewatCell.textContent;
  khewatCell.innerHTML = `<input type="text" class="form-control" value="${khewatValue}">`;

  const actionCell = row.cells[7];
  actionCell.innerHTML = `
        <button class="btn btn-sm btn-outline-success" onclick="saveLandRecord(${landId})">
            <i class="bi bi-check"></i>
        </button>
    `;
}

function saveLandRecord(landId) {
  const row = document.getElementById(`land-row-${landId}`);
  if (!row) return;
  const type = row.querySelector(`#ddlownertype-${landId}`)?.value;
  const areaInputs = row.cells[5].querySelectorAll('input');
  const land_owner_area_k = areaInputs[0]?.value;
  const land_owner_area_m = areaInputs[1]?.value;
  const land_owner_area_sarsai = areaInputs[2]?.value;
  const khewat_no = row.cells[4].querySelector('input')?.value;

  const data = {
    type,
    land_owner_area_k,
    land_owner_area_m,
    land_owner_area_sarsai,
    khewat_no
  };

  fetch(`/api/land/update/${landId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        if (row.querySelector(`#ddlownertype-${landId}`)) row.querySelector(`#ddlownertype-${landId}`).disabled = true;
        row.cells[5].innerHTML = `${land_owner_area_k}/${land_owner_area_m}/${land_owner_area_sarsai}`;
        row.cells[6].innerHTML = `
                <button class="btn btn-sm btn-outline-secondary" onclick="editLandRecord(${landId})">
                    <i class="bi bi-pencil"></i>
                </button>
            `;
        loadLands();
      } else {
        showErrorToast('Error saving land record: ' + (result.error || 'Unknown error'));
      }
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Error saving land record:', error);
      showErrorToast('An error occurred while saving. Please try again.');
    });
}

function changeLandPage(page) {
  currentLandPage = page;
  const searchTerm = document.getElementById('searchLand')?.value || '';
  loadLands(searchTerm);
}

// Expose functions globally for inline onclicks in templates
window.loadLands = loadLands;
window.changeLandPage = changeLandPage;
window.viewLandDetails = viewLandDetails;
window.editLandRecord = editLandRecord;
window.saveLandRecord = saveLandRecord;

// Auto-init on DOM ready if lands tab exists
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('landsTableBody')) {
    loadLands();
  }
});
