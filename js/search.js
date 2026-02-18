/**
 * search.js - Handles donor search with API integration
 * Fetches from GET /api/donors/search with server-side filtering
 */

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('donor-grid');
    const paginationContainer = document.getElementById('pagination');
    const resultsCount = document.getElementById('results-count');
    const bloodGroupInputs = document.querySelectorAll('input[name="bloodGroup"]');
    const cityInput = document.getElementById('city-search');
    const genderSelect = document.getElementById('gender-filter');
    const availabilityToggle = document.getElementById('availability-toggle');
    const sortSelect = document.getElementById('sort-select');
    const applyButton = document.getElementById('apply-filters');
    const resetButton = document.getElementById('reset-filters');

    let currentPage = 1;
    const ITEMS_PER_PAGE = 6;

    // Store last fetched data for client-side re-sorting
    let lastFetchedDonors = [];
    let totalResults = 0;
    let totalPages = 1;

    // Fetch Data from API
    async function loadDonors() {
        // Show Skeleton
        grid.innerHTML = Array(6).fill(0).map(() => `
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col gap-4 animate-pulse">
                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div class="space-y-2">
                            <div class="h-4 w-32 bg-gray-200 rounded"></div>
                            <div class="h-3 w-24 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                    <div class="w-10 h-10 bg-gray-200 rounded-full"></div>
                </div>
                <div class="h-16 bg-gray-50 rounded-lg"></div>
                <div class="flex justify-between items-center pt-2">
                    <div class="h-4 w-20 bg-gray-200 rounded"></div>
                    <div class="h-4 w-24 bg-gray-200 rounded"></div>
                </div>
            </div>
        `).join('');

        try {
            // Build query params from active filters
            const selectedGroups = Array.from(bloodGroupInputs)
                .filter(input => input.checked)
                .map(input => input.value);
            
            const cityQuery = cityInput.value.trim();
            
            // API requires at least one of: blood_group, city, or search
            // If no filters are selected, use a search term to fetch all
            const params = {};
            if (selectedGroups.length === 1) {
                params.blood_group = selectedGroups[0];
            }
            if (cityQuery) {
                params.city = cityQuery;
            }
            
            // If no filter params, use search with empty-ish term to get all 
            // The API requires at least one param, so pass search for a broad match
            if (!params.blood_group && !params.city) {
                params.search = 'a'; // broad search to get results
            }
            
            if (availabilityToggle.checked) {
                params.availability = 'available';
            }
            
            params.page = currentPage;
            params.limit = ITEMS_PER_PAGE;

            const queryString = window.LifeLinkAPI.buildQuery(params);
            const result = await window.LifeLinkAPI.apiCall(`/donors/search${queryString}`);

            // Normalize API response fields to match renderer expectations
            lastFetchedDonors = result.data.donors.map(d => ({
                donor_id: d.donor_id,
                name: `${d.first_name} ${d.last_name}`,
                bloodGroup: d.blood_group,
                city: d.city,
                area: d.area || '',
                gender: '', // Not returned in search API
                phone: d.phone,
                available: d.availability_status === 'available',
                lastDonation: d.last_donation_date,
                total_donations: d.total_donations,
                can_donate_now: d.can_donate_now,
            }));

            totalResults = result.data.total_count;
            totalPages = result.data.total_pages;

            // Client-side filter for multiple blood groups (API only supports one at a time)
            let displayDonors = lastFetchedDonors;
            if (selectedGroups.length > 1) {
                displayDonors = displayDonors.filter(d => selectedGroups.includes(d.bloodGroup));
            }

            // Client-side gender filter
            const gender = genderSelect.value;
            if (gender) {
                displayDonors = displayDonors.filter(d => d.gender === gender);
            }

            // Client-side sorting
            const sort = sortSelect.value;
            if (sort === 'az') {
                displayDonors.sort((a, b) => a.name.localeCompare(b.name));
            } else if (sort === 'recent') {
                displayDonors.sort((a, b) => new Date(b.lastDonation || 0) - new Date(a.lastDonation || 0));
            }

            resultsCount.textContent = totalResults;
            renderDonors(displayDonors, displayDonors.length === 0);
            renderPagination(totalPages);

        } catch (error) {
            console.error('Error loading donors:', error);
            grid.innerHTML = '<p class="text-red-500 col-span-full text-center">Failed to load donor data.</p>';
        }
    }

    // Parse URL Params (from Home Page widget)
    function applyUrlFilters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        const bgParam = urlParams.get('bloodGroup');
        if (bgParam) {
            bloodGroupInputs.forEach(input => {
                if (input.value === bgParam) input.checked = true;
            });
        }

        const cityParam = urlParams.get('city');
        if (cityParam) {
            cityInput.value = cityParam;
        }

        const availParam = urlParams.get('availability');
        if (availParam === 'available') {
            availabilityToggle.checked = true;
        }
    }

    // Render donor cards
    function renderDonors(data, isEmpty) {
        grid.innerHTML = '';

        if (isEmpty) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <img src="https://illustrations.popsy.co/gray/surr-searching.svg" class="h-48 mx-auto mb-4 opacity-50" alt="No results">
                    <h3 class="text-xl font-bold text-gray-700">No donors found</h3>
                    <p class="text-gray-500">Try adjusting your filters or search for a different city.</p>
                </div>
            `;
            return;
        }

        data.forEach(donor => {
            const badgeClass = `badge-${donor.bloodGroup.replace('+', '_pos').replace('-', '_neg')}`;
            const initials = donor.name.split(' ').map(n => n[0]).join('').substring(0, 2);

            const card = document.createElement('div');
            card.className = 'bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col gap-4 group';
            
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500 text-lg">
                            ${initials}
                        </div>
                        <div>
                            <h3 class="font-bold text-dark text-lg group-hover:text-primary transition-colors">${donor.name}</h3>
                            <div class="text-sm text-gray-500 flex items-center gap-1">
                                <i class="fas fa-map-marker-alt text-xs"></i> ${donor.city}${donor.area ? ', ' + donor.area : ''}
                            </div>
                        </div>
                    </div>
                    <span class="blood-badge ${badgeClass}">${donor.bloodGroup}</span>
                </div>

                <div class="grid grid-cols-2 gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <div>
                        <span class="block text-xs text-gray-400">Donations</span>
                        <span class="font-medium">${donor.total_donations || 0} total</span>
                    </div>
                    <div>
                        <span class="block text-xs text-gray-400">Last Donated</span>
                        <span class="font-medium">${donor.lastDonation ? window.LifeLinkUtils.formatDate(donor.lastDonation) : 'Never'}</span>
                    </div>
                </div>

                <div class="mt-auto pt-2 flex items-center justify-between">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${donor.available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                        ${donor.available ? '● Available' : '○ Unavailable'}
                    </span>
                    <button class="text-primary font-semibold text-sm hover:underline" onclick="togglePhone(this, '${donor.phone}')">
                        Contact Donor
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    // Render pagination controls
    function renderPagination(totalPagesCount) {
        if (!paginationContainer) return;
        paginationContainer.innerHTML = '';

        if (totalPagesCount <= 1) return;

        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = `px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
            currentPage === 1 
                ? 'border-gray-200 text-gray-400 cursor-not-allowed opacity-50' 
                : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
        }`;
        prevBtn.textContent = 'Previous';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                loadDonors();
                grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        paginationContainer.appendChild(prevBtn);

        // Page number buttons
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPagesCount, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            paginationContainer.appendChild(createPageBtn(1));
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'px-2 py-2 text-gray-400 text-sm';
                ellipsis.textContent = '...';
                paginationContainer.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createPageBtn(i));
        }

        if (endPage < totalPagesCount) {
            if (endPage < totalPagesCount - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'px-2 py-2 text-gray-400 text-sm';
                ellipsis.textContent = '...';
                paginationContainer.appendChild(ellipsis);
            }
            paginationContainer.appendChild(createPageBtn(totalPagesCount));
        }

        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = `px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
            currentPage === totalPagesCount 
                ? 'border-gray-200 text-gray-400 cursor-not-allowed opacity-50' 
                : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
        }`;
        nextBtn.textContent = 'Next';
        nextBtn.disabled = currentPage === totalPagesCount;
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPagesCount) {
                currentPage++;
                loadDonors();
                grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
        paginationContainer.appendChild(nextBtn);
    }

    // Helper: Create a page number button
    function createPageBtn(pageNum) {
        const btn = document.createElement('button');
        const isActive = pageNum === currentPage;
        btn.className = `px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
            isActive 
                ? 'border-primary/30 bg-primary/10 text-primary font-bold' 
                : 'border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
        }`;
        btn.textContent = pageNum;
        btn.addEventListener('click', () => {
            currentPage = pageNum;
            loadDonors();
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return btn;
    }

    // Toggle Phone Number
    window.togglePhone = (btn, fullPhone) => {
        if (btn.innerText === 'Contact Donor') {
            btn.innerText = fullPhone;
            btn.classList.add('text-dark', 'no-underline');
            btn.classList.remove('text-primary');
        }
    };

    // Event Listeners
    applyButton.addEventListener('click', () => {
        currentPage = 1;
        loadDonors();
    });

    resetButton.addEventListener('click', () => {
        cityInput.value = '';
        bloodGroupInputs.forEach(i => i.checked = false);
        genderSelect.value = '';
        availabilityToggle.checked = false;
        currentPage = 1;
        loadDonors();
    });

    sortSelect.addEventListener('change', () => {
        loadDonors();
    });

    // Initialize: apply URL filters then fetch
    applyUrlFilters();
    loadDonors();
});
