import {
  getBankIdToNameMap,
  convertToAcres,
  getTotalLandAreaInAcres,
  getTotalLandAreaTraditional,
  formatLandArea,
  showErrorToast,
} from '../utils/index.js';

// Function to populate the Source API filter dropdown
function populateSourceApiFilter(farmers) {
  const sourceApiSelect = document.getElementById('filter-source-api');
  if (!sourceApiSelect) return;

  // Clear existing options, but keep the "All" option
  sourceApiSelect.innerHTML = '<option value="">All</option>';

  const uniqueSourceApis = new Set();
  farmers.forEach((farmer) => {
    if (farmer.source_api) {
      uniqueSourceApis.add(farmer.source_api);
    }
  });

  uniqueSourceApis.forEach((api) => {
    const option = document.createElement('option');
    option.value = api;
    option.textContent = api;
    sourceApiSelect.appendChild(option);
  });
}

// Function to display farmers in the table
async function displayFarmers(farmers) {
  const farmersTableBody = document.getElementById('farmersTableBody');
  if (!farmersTableBody) return;
  farmersTableBody.innerHTML = ''; // Clear existing rows

  if (farmers.length === 0) {
    farmersTableBody.innerHTML =
      '<tr><td colspan="10" class="text-center">No farmers found.</td></tr>';
    return;
  }

  // Populate the Source API filter with unique values from the current farmers data
  populateSourceApiFilter(farmers);

  const bankIdToNameMap = await getBankIdToNameMap();

  farmers.forEach((farmer) => {
    const bankName = bankIdToNameMap[farmer.bank_detail?.bank_id] || 'Unknown Bank';
    // eslint-disable-next-line no-console
    console.log('Farmer data:', farmer);
    // eslint-disable-next-line no-console
    console.log('Bank Name:', bankName);
    const row = `
            <tr>
                <td>${farmer.id || 'N/A'}</td>
                <td>${farmer.farmer_name || 'N/A'}</td>
                <td>${farmer.father_name || 'N/A'}</td>
                <td>${farmer.grandfather_name || 'N/A'}</td>
                <td>${farmer.mobile_number || 'N/A'}</td>
                <td>${farmer.aadhar_number || 'N/A'}</td>
                <td>${farmer.total_land_records || '0'}</td>
                <td>${farmer.total_land || '0'}</td>
                <td>${farmer.area_under_cultivation || "0"}</td>
                <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-primary" onclick="viewFarmerDetails(${farmer.id})" title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                    <a href="/farmers/${farmer.id}/profile" target="_blank" class="btn btn-outline-secondary" title="Print Profile">
                        <i class="bi bi-printer"></i>
                    </a>
                </div>
            </td>
            </tr>
        `;
    farmersTableBody.innerHTML += row;
  });
}

// Load farmers with pagination and search
function loadFarmers(search = '', sourceApi = '', totalArea = '') {
  let url = `/api/farmers?page=${currentFarmerPage}&search=${encodeURIComponent(search)}`;
  if (sourceApi) {
    url += `&source_api=${encodeURIComponent(sourceApi)}`;
  }
  if (totalArea) {
    url += `&total_area=${encodeURIComponent(totalArea)}`;
  }

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      displayFarmers(data.data);
      // renderPagination('farmersPagination', data.page, data.total_pages, 'changeFarmerPage');
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Error loading farmers:', error);
      showErrorToast('Error loading farmers.');
    });
}

// Placeholder for printFarmer function
function printFarmer(farmerId) {
  window.open(`/farmers/${farmerId}/profile`, '_blank');
}

function viewFarmerDetails(id) {
  // Show loading state in modal
  updateModalHeader(null, true);

  fetch(`/api/farmer/${id}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Farmer not found');
      }
      return response.json();
    })
    .then((farmer) => {
      populateFarmerModal(farmer);
      const modal = new bootstrap.Modal(document.getElementById('farmerModal'));
      modal.show();
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error('Error fetching farmer details:', error);
      showErrorToast('Error loading farmer details. Please try again.');
    });
}

function updateModalHeader(farmer, isLoading = false) {
  if (isLoading) {
    const nameEl = document.getElementById('modalFarmerName');
    if (nameEl) nameEl.textContent = 'Loading...';
    const idEl = document.getElementById('modalFarmerId');
    if (idEl) idEl.textContent = '-';
    const recordsEl = document.getElementById('modalTotalRecords');
    if (recordsEl) recordsEl.textContent = '0';
    const areaEl = document.getElementById('modalTotalArea');
    if (areaEl) areaEl.textContent = '0';
    return;
  }

  // Update header information
  document.getElementById('modalFarmerName').textContent = farmer.farmer_name || 'Unknown Farmer';
  document.getElementById('modalFarmerId').textContent = farmer.farmer_id || farmer.id;

  // Update verification badge
  const verificationBadge = document.getElementById('modalVerificationBadge');
  if (farmer.verify_status === 1) {
    verificationBadge.className = 'badge bg-success';
    verificationBadge.textContent = 'Verified';
  } else {
    verificationBadge.className = 'badge bg-warning';
    verificationBadge.textContent = 'Pending';
  }

  // Update owner type badge
  const ownerTypeBadge = document.getElementById('modalOwnerTypeBadge');
  ownerTypeBadge.textContent = farmer.owner_type || 'Farmer';

  // Update stats with proper area conversion
  document.getElementById('modalTotalRecords').textContent = farmer.lands?.length || 0;
  const totalKanal = farmer.lands?.reduce((acc, land) => acc + (parseFloat(land.kanal) || 0), 0) || 0;
  const totalMarle = farmer.lands?.reduce((acc, land) => acc + (parseFloat(land.marle) || 0), 0) || 0;
  const totalSarsai = farmer.lands?.reduce((acc, land) => acc + (parseFloat(land.sarsai) || 0), 0) || 0;

  // Convert to acres for display
  const totalAcres = convertToAcres(totalKanal, totalMarle, totalSarsai);
  const modalTotalArea = document.getElementById('modalTotalArea');
  if (modalTotalArea) modalTotalArea.textContent = `${totalAcres.toFixed(2)} acres`;
}

function populateFarmerModal(farmer) {
  // Update modal header
  updateModalHeader(farmer);

  // Format data
  const aadharDisplay = farmer.aadhar_number
    ? farmer.aadhar_number.replace(/(\d{4})(?=\d)/g, '$1 ')
    : 'Not Available';
  const mobileDisplay = farmer.mobile_number ? `+91 ${farmer.mobile_number}` : 'Not Available';

  // Build the modern farmer details HTML
  const detailsDiv = document.getElementById('farmerDetails');
  if (!detailsDiv) return;
  detailsDiv.innerHTML = `
        <!-- Personal Information Section -->
        <div class="detail-section">
            <h5 class="section-title">
                <i class="bi bi-person me-2"></i>Personal Information
            </h5>
            <div class="row g-3">
                <div class="col-md-6">
                    <div class="detail-item">
                        <label class="detail-label">Full Name</label>
                        <span class="detail-value">${farmer.farmer_name || 'Not Available'}</span>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="detail-item">
                        <label class="detail-label">Farmer ID</label>
                        <span class="detail-value">${farmer.farmer_id || farmer.id}</span>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="detail-item">
                        <label class="detail-label">Father/Husband Name</label>
                        <span class="detail-value">${farmer.father_name || 'Not Available'}</span>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="detail-item">
                        <label class="detail-label">Grandfather Name</label>
                        <span class="detail-value">${farmer.grandfather_name || 'Not Available'}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Contact Information Section -->
        <div class="detail-section">
            <h5 class="section-title">
                <i class="bi bi-telephone me-2"></i>Contact Information
            </h5>
            <div class="row g-3">
                <div class="col-md-6">
                    <div class="detail-item">
                        <label class="detail-label">Mobile Number</label>
                        <span class="detail-value">${mobileDisplay}</span>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="detail-item">
                        <label class="detail-label">Aadhar Number</label>
                        <span class="detail-value">${aadharDisplay}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Location Information Section -->
        <div class="detail-section">
            <h5 class="section-title">
                <i class="bi bi-geo-alt me-2"></i>Location Information
            </h5>
            <div class="row g-3">
                <div class="col-md-4">
                    <div class="detail-item">
                        <label class="detail-label">Village</label>
                        <span class="detail-value">${farmer.village_name || 'Not Available'}</span>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="detail-item">
                        <label class="detail-label">City</label>
                        <span class="detail-value">${farmer.city_name || 'Not Available'}</span>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="detail-item">
                        <label class="detail-label">District</label>
                        <span class="detail-value">${farmer.district_name || 'Not Available'}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Land Ownership Summary -->
        <div class="detail-section">
            <h5 class="section-title">
                <i class="bi bi-map me-2"></i>Land Ownership Summary
            </h5>
            <div class="row g-3">
                <div class="col-md-4">
                    <div class="detail-item">
                        <label class="detail-label">Total Land Records</label>
                        <span class="detail-value">${farmer.lands?.length || 0} records</span>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="detail-item">
                        <label class="detail-label">Total Area (Acres)</label>
                        <span class="detail-value">${getTotalLandAreaInAcres(farmer.lands || [])} acres</span>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="detail-item">
                        <label class="detail-label">Traditional Units</label>
                        <span class="detail-value">${getTotalLandAreaTraditional(farmer.lands || [])}</span>
                    </div>
                </div>
            </div>
        </div>

        ${generateLandRecordsSection(farmer.lands || [])}

        <!-- System Information -->
        <div class="detail-section">
            <h5 class="section-title">
                <i class="bi bi-info-circle me-2"></i>System Information
            </h5>
            <div class="row g-3">
                <div class="col-md-4">
                    <div class="detail-item">
                        <label class="detail-label">Source API</label>
                        <span class="detail-value">${farmer.source_api || 'Manual Entry'}</span>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="detail-item">
                        <label class="detail-label">Created Date</label>
                        <span class="detail-value">${farmer.created_at ? new Date(farmer.created_at).toLocaleDateString() : 'Not Available'}</span>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="detail-item">
                        <label class="detail-label">Last Updated</label>
                        <span class="detail-value">${farmer.updated_at ? new Date(farmer.updated_at).toLocaleDateString() : 'Not Available'}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateLandRecordsSection(lands) {
  if (!lands || lands.length === 0) {
    return `
            <div class="detail-section">
                <h5 class="section-title">
                    <i class="bi bi-map me-2"></i>Land Records
                </h5>
                <div class="text-center py-4">
                    <i class="bi bi-map" style="font-size: 3rem; color: var(--gray-400);"></i>
                    <p class="text-muted mt-2">No land records found for this farmer.</p>
                </div>
            </div>
        `;
  }

  const landsTableHtml = lands
    .map((land, index) => {
      const landArea = formatLandArea(land.owner_area);
      const cultivationArea = formatLandArea(
        land.land_owner_area_k,
        land.land_owner_area_m,
        land.land_owner_area_sarsai
      );

      // Determine cultivation type badge
      let cultivationType = 'Unknown';
      let badgeClass = 'bg-secondary';
      if (land.ownertype === '1') {
        cultivationType = 'Self Cultivation';
        badgeClass = 'bg-success';
      } else if (land.ownertype === '2') {
        cultivationType = 'Lessee/Tenant';
        badgeClass = 'bg-warning';
      } else if (land.ownertype === '6') {
        cultivationType = 'Other';
        badgeClass = 'bg-info';
      }

      return `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>
                    <div class="land-location">
                        <strong>${land.village_name || 'N/A'}</strong><br>
                        <small class="text-muted">${land.city_name || 'N/A'}, ${land.district_name || 'N/A'}</small>
                    </div>
                </td>
                <td>${land.owner_name || 'N/A'}</td>
                <td class="text-center">${land.sr_no || 'N/A'}</td>
                <td class="text-center">${land.khewat_no || 'N/A'}</td>
                <td class="text-center">${land.owner_area}</td>
                <td class="text-center">
                    <span class="badge ${badgeClass}">${cultivationType}</span>
                </td>
                <td class="text-center">${cultivationArea.traditionalFormatted}</td>
                <td class="text-center">
                    <span class="badge bg-light text-dark">Record #${land.id}</span>
                </td>
            </tr>
        `;
    })
    .join('');

  return `
        <div class="detail-section">
            <h5 class="section-title">
                <i class="bi bi-map me-2"></i>Land Records 
                <span class="badge bg-primary ms-2">${lands.length} Records</span>
            </h5>
            <div class="table-responsive">
                <table class="table table-modern table-hover">
                    <thead>
                        <tr>
                            <th class="text-center">#</th>
                            <th>Location</th>
                            <th>Owner Name</th>
                            <th class="text-center">Sr. No.</th>
                            <th class="text-center">Khewat No.</th>
                            <th class="text-center">Total Land</th>
                            <th class="text-center">Type</th>
                            <th class="text-center">Cultivation Area</th>
                            <th class="text-center">Record ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${landsTableHtml}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function viewLandDetails(landId) {
  // For now, show coming soon modal since land detail modal needs to be implemented
  showErrorToast('Land Record Details coming soon');
}

// Land area conversion utilities (delegated to utils.convertToAcres)
function getTotalLandAreaInAcresLocal(lands) {
  return getTotalLandAreaInAcres(lands);
}

function getTotalLandAreaTraditionalLocal(lands) {
  return getTotalLandAreaTraditional(lands);
}

document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.getElementById('searchInput');
  const villageFilter = document.getElementById('villageFilter');
  const sourceFilter = document.getElementById('sourceFilter');
  const districtFilter = document.getElementById('districtFilter');
  const areaFilter = document.getElementById('areaFilter');
  const clearFiltersBtn = document.getElementById('clearFilters');
  const filterCount = document.getElementById('filterCount');
  const farmerCards = document.querySelectorAll('.farmer-card');

  // Collect unique values from data attributes
  const uniqueVillages = [...new Set(Array.from(farmerCards).map((card) => card.dataset.village).filter((v) => v))].sort();
  const uniqueSources = [...new Set(Array.from(farmerCards).map((card) => card.dataset.source).filter((s) => s))].sort();
  const uniqueDistricts = [...new Set(Array.from(farmerCards).map((card) => card.dataset.districts).filter((d) => d).join(' ').split(' ').filter((d) => d))].sort();

  // Populate dropdowns
  populateDropdown(villageFilter, uniqueVillages);
  populateDropdown(sourceFilter, uniqueSources);
  populateDropdown(districtFilter, uniqueDistricts);

  // Add event listeners
  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (villageFilter) villageFilter.addEventListener('change', applyFilters);
  if (sourceFilter) sourceFilter.addEventListener('change', applyFilters);
  if (districtFilter) districtFilter.addEventListener('change', applyFilters);
  if (areaFilter) areaFilter.addEventListener('change', applyFilters);
  if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearAllFilters);

  function populateDropdown(dropdown, options) {
    if (!dropdown) return;
    options.forEach((option) => {
      if (option) {
        const optionElement = document.createElement('option');
        optionElement.value = option.toLowerCase();
        optionElement.textContent = option;
        dropdown.appendChild(optionElement);
      }
    });
  }

  function applyFilters() {
    const searchTerm = (searchInput?.value || '').toLowerCase().trim();
    const selectedVillage = (villageFilter?.value || '').toLowerCase();
    const selectedSource = (sourceFilter?.value || '').toLowerCase();
    const selectedDistrict = (districtFilter?.value || '').toLowerCase();
    const selectedArea = (areaFilter?.value || '');

    let visibleCount = 0;

    farmerCards.forEach((card) => {
      let shouldShow = true;

      // Search filter
      if (searchTerm) {
        const searchText = card.dataset.searchText || '';
        shouldShow = searchText.includes(searchTerm);
      }

      // Village filter
      if (shouldShow && selectedVillage) {
        shouldShow = (card.dataset.village || '').includes(selectedVillage);
      }

      // Source filter
      if (shouldShow && selectedSource) {
        shouldShow = (card.dataset.source || '').includes(selectedSource);
      }

      // District filter
      if (shouldShow && selectedDistrict) {
        shouldShow = (card.dataset.districts || '').includes(selectedDistrict);
      }

      // Area filter
      if (shouldShow && selectedArea) {
        const area = parseFloat(card.dataset.totalArea || '0');
        switch (selectedArea) {
          case 'non-zero':
            shouldShow = area > 0;
            break;
          case '0-1':
            shouldShow = area >= 0 && area <= 1;
            break;
          case '1-5':
            shouldShow = area > 1 && area <= 5;
            break;
          case '5-10':
            shouldShow = area > 5 && area <= 10;
            break;
          case '10-25':
            shouldShow = area > 10 && area <= 25;
            break;
          case '25+':
            shouldShow = area > 25;
            break;
          default:
            break;
        }
      }

      if (shouldShow) {
        card.style.display = 'block';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    // Update filter count
    updateFilterCount(visibleCount);
  }

  function updateFilterCount(count) {
    const total = farmerCards.length;
    if (count === total) {
      filterCount.textContent = `Showing all ${total} farmers`;
    } else {
      filterCount.textContent = `Showing ${count} of ${total} farmers`;
    }
  }

  function clearAllFilters() {
    if (searchInput) searchInput.value = '';
    if (villageFilter) villageFilter.value = '';
    if (sourceFilter) sourceFilter.value = '';
    if (districtFilter) districtFilter.value = '';
    if (areaFilter) areaFilter.value = '';

    farmerCards.forEach((card) => {
      card.style.display = 'block';
    });

    updateFilterCount(farmerCards.length);
  }

  // Initial filter count
  updateFilterCount(farmerCards.length);
});
