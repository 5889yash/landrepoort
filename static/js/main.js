document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    fetchStats();
    loadFarmers();
    loadLands();
    
    // Add event listeners for search with debounce
    let farmerSearchTimer;
    document.getElementById('searchFarmer').addEventListener('input', (e) => {
        clearTimeout(farmerSearchTimer);
        farmerSearchTimer = setTimeout(() => {
            currentFarmerPage = 1;
            loadFarmers(e.target.value);
        }, 500);
    });
    
    let landSearchTimer;
    document.getElementById('searchLand').addEventListener('input', (e) => {
        clearTimeout(landSearchTimer);
        landSearchTimer = setTimeout(() => {
            currentLandPage = 1;
            loadLands(e.target.value);
        }, 500);
    });
    
    // Handle tab changes to refresh data
    const tabEls = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabEls.forEach(tabEl => {
        tabEl.addEventListener('shown.bs.tab', function (event) {
            if (event.target.getAttribute('data-bs-target') === '#lands') {
                loadLands();
            } else if (event.target.getAttribute('data-bs-target') === '#farmers') {
                loadFarmers();
            }
        });
    });
});