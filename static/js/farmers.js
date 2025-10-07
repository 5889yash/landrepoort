// Function to populate the Source API filter dropdown
function populateSourceApiFilter(farmers) {
    const sourceApiSelect = document.getElementById('filter-source-api');
    if (!sourceApiSelect) return;

    // Clear existing options, but keep the "All" option
    sourceApiSelect.innerHTML = '<option value="">All</option>';

    const uniqueSourceApis = new Set();
    farmers.forEach(farmer => {
        if (farmer.source_api) {
            uniqueSourceApis.add(farmer.source_api);
        }
    });

    uniqueSourceApis.forEach(api => {
        const option = document.createElement('option');
        option.value = api;
        option.textContent = api;
        sourceApiSelect.appendChild(option);
    });
}


// Function to display farmers in the table
async function displayFarmers(farmers) {
    const farmersTableBody = document.getElementById('farmersTableBody');
    farmersTableBody.innerHTML = ''; // Clear existing rows

    if (farmers.length === 0) {
        farmersTableBody.innerHTML = '<tr><td colspan="10" class="text-center">No farmers found.</td></tr>';
        return;
    }

    // Populate the Source API filter with unique values from the current farmers data
    populateSourceApiFilter(farmers);

    const bankIdToNameMap = await getBankIdToNameMap();

    farmers.forEach(farmer => {
        const bankName = bankIdToNameMap[farmer.bank_detail?.bank_id] || 'Unknown Bank';
        console.log('Farmer data:', farmer);
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
        .then(response => response.json())
        .then(data => {
            displayFarmers(data.data);
            renderPagination('farmersPagination', data.page, data.total_pages, 'changeFarmerPage');
        })
        .catch(error => console.error('Error loading farmers:', error));
}

// Placeholder for printFarmer function
function printFarmer(farmerId) {
    window.open(`/farmers/${farmerId}/profile`, '_blank');
}



function viewFarmerDetails(id) {
    // Show loading state in modal
    updateModalHeader(null, true);
    
    fetch(`/api/farmer/${id}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Farmer not found');
            }
            return response.json();
        })
        .then(farmer => {
            populateFarmerModal(farmer);
            const modal = new bootstrap.Modal(document.getElementById('farmerModal'));
            modal.show();
        })
        .catch(error => {
            console.error('Error fetching farmer details:', error);
            showErrorMessage('Error loading farmer details. Please try again.');
        });
}

function updateModalHeader(farmer, isLoading = false) {
    if (isLoading) {
        document.getElementById('modalFarmerName').textContent = 'Loading...';
        document.getElementById('modalFarmerId').textContent = '-';
        document.getElementById('modalTotalRecords').textContent = '0';
        document.getElementById('modalTotalArea').textContent = '0';
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
    document.getElementById('modalTotalArea').textContent = `${totalAcres.toFixed(2)} acres`;
}

function populateFarmerModal(farmer) {
    // Update modal header
    updateModalHeader(farmer);
    
    // Format data
    const aadharDisplay = farmer.aadhar_number ? 
        farmer.aadhar_number.replace(/(\\d{4})(?=\\d)/g, '$1 ') : 'Not Available';
    const mobileDisplay = farmer.mobile_number ? 
        `+91 ${farmer.mobile_number}` : 'Not Available';
    
    // Build the modern farmer details HTML
    const detailsDiv = document.getElementById('farmerDetails');
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

    const landsTableHtml = lands.map((land, index) => {
        const landArea = formatLandArea(land.owner_area);
        const cultivationArea = formatLandArea(land.land_owner_area_k, land.land_owner_area_m, land.land_owner_area_sarsai);
        
        // Determine cultivation type badge
        let cultivationType = 'Unknown';
        let badgeClass = 'bg-secondary';
        if (land.ownertype === "1") {
            cultivationType = 'Self Cultivation';
            badgeClass = 'bg-success';
        } else if (land.ownertype === "2") {
            cultivationType = 'Lessee/Tenant';
            badgeClass = 'bg-warning';
        } else if (land.ownertype === "6") {
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
    }).join('');

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
    showComingSoon('Land Record Details');
    
    // Future implementation would fetch land record details and show in land modal
    // fetch(`/api/land/${landId}`)
    //     .then(response => response.json())
    //     .then(land => {
    //         populateLandModal(land);
    //         const modal = new bootstrap.Modal(document.getElementById('landModal'));
    //         modal.show();
    //     });
}

// Land area conversion utilities
function convertToAcres(kanal, marle, sarsai) {
    // Convert everything to sarsai first
    const totalSarsaiUnits = (kanal * 20 * 9) + (marle * 9) + sarsai;
    // Convert sarsai to acres (1 acre = 8 kanal = 160 marle = 1440 sarsai)
    return totalSarsaiUnits / 1440;
}

function convertSarsaiToTraditionalUnits(totalSarsai) {
    const kanal = Math.floor(totalSarsai / (20 * 9));
    const remainingSarsai = totalSarsai % (20 * 9);
    const marle = Math.floor(remainingSarsai / 9);
    const sarsai = remainingSarsai % 9;
    
    return { kanal, marle, sarsai };
}

function getTotalLandAreaInAcres(lands) {
    const totalKanal = lands.reduce((acc, land) => acc + (parseFloat(land.kanal) || 0), 0);
    const totalMarle = lands.reduce((acc, land) => acc + (parseFloat(land.marle) || 0), 0);
    const totalSarsai = lands.reduce((acc, land) => acc + (parseFloat(land.sarsai) || 0), 0);
    
    return convertToAcres(totalKanal, totalMarle, totalSarsai).toFixed(2);
}

function getTotalLandAreaTraditional(lands) {
    const totalKanal = lands.reduce((acc, land) => acc + (parseFloat(land.kanal) || 0), 0);
    const totalMarle = lands.reduce((acc, land) => acc + (parseFloat(land.marle) || 0), 0);
    const totalSarsai = lands.reduce((acc, land) => acc + (parseFloat(land.sarsai) || 0), 0);
    
    return `${totalKanal}K/${totalMarle}M/${totalSarsai}S`;
}

function formatLandArea(kanal, marle, sarsai) {
    const acres = convertToAcres(kanal || 0, marle || 0, sarsai || 0);
    const traditional = `${kanal || 0}K/${marle || 0}M/${sarsai || 0}S`;
    
    return {
        acres: acres.toFixed(2),
        traditional: traditional,
        acresFormatted: `${acres.toFixed(2)} acres`,
        traditionalFormatted: traditional
    };
}

function showErrorMessage(message) {
    // Create a toast notification for better UX
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
    
    // Remove toast element after it's hidden
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

// Function to update the stats display with real data
function updateStatsDisplay() {
    // Update farmer and land counts in tab badges
    const farmersCount = document.getElementById('farmersCount');
    const landsCount = document.getElementById('landsCount');
    
    if (farmersCount) {
        fetch('/api/stats')
            .then(response => response.json())
            .then(data => {
                farmersCount.textContent = data.total_farmers;
                if (landsCount) {
                    landsCount.textContent = data.total_lands;
                }
                
                // Update verified records count if element exists
                const verifiedRecords = document.getElementById('verifiedRecords');
                if (verifiedRecords) {
                    // This would need to be added to the stats API
                    verifiedRecords.textContent = Math.floor(data.total_farmers * 0.75); // Mock 75% verification rate
                }
            })
            .catch(error => console.error('Error updating stats:', error));
    }
}

function downloadFarmerProfiles() {
    fetch('/api/farmers/export/pdf')
        .then(response => {
            if (response.ok) {
                return response.blob();
            } else {
                throw new Error('Failed to generate PDF');
            }
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'farmer_profiles.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(error => {
            console.error('Error downloading PDF:', error);
            showErrorMessage('Failed to download farmer profiles PDF.');
        });
}
