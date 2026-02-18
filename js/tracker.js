/**
 * tracker.js - Handles donation history and stats logic using Hybrid (API + LocalStorage) approach
 */

document.addEventListener('DOMContentLoaded', async () => {
    // Auth Guard
    const savedDonorId = localStorage.getItem('lifelink_donor_id');
    const token = localStorage.getItem('lifelink_donor_token');

    if (!savedDonorId) {
        // If not logged in, redirect to login
        window.location.href = 'login.html';
        return;
    }

    // --- State & Selectors ---
    const STORAGE_KEY = `lifelink_donations_${savedDonorId || 'guest'}`;
    const form = document.getElementById('log-form');
    const modal = document.getElementById('log-modal');
    const modalContent = document.getElementById('log-modal-content');
    const addBtn = document.getElementById('add-donation-btn');
    const cancelBtn = document.getElementById('cancel-log-btn');
    const tableBody = document.getElementById('history-table-body');
    
    // Stats Elements
    const elNextDate = document.getElementById('next-date');
    const elDaysRemaining = document.getElementById('days-remaining');
    const elLastDate = document.getElementById('last-date');
    const elLastLoc = document.getElementById('last-location');
    const elTotalCount = document.getElementById('total-count');
    const elLivesSaved = document.getElementById('lives-saved');

    // --- Data Management ---
    const getLocalDonations = () => {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    };

    const saveLocalDonation = (donation) => {
        const donations = getLocalDonations();
        donations.push(donation);
        // Sort by date desc
        donations.sort((a, b) => new Date(b.date) - new Date(a.date));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(donations));
    };

    const fetchProfile = async () => {
        const donorId = localStorage.getItem('lifelink_donor_id');
        if (!donorId || !window.LifeLinkAPI) return null;

        try {
            // Fetch donor details (reusing the donation-history endpoint which returns donor info too, or separate endpoint)
            // Ideally we should have GET /api/donors/{id}.
            // Let's assume we can get it from donation-history response if history array is empty? 
            // The donation-history endpoint returns { donor_name, ... } in data.
            const response = await window.LifeLinkAPI.apiCall(`/donors/donation-history?donor_id=${donorId}`);
            return response.data; 
        } catch (e) {
            console.error('Failed to fetch profile', e);
            return null;
        }
    };

    const fetchDonations = async () => {
        const donorId = localStorage.getItem('lifelink_donor_id');
        
        // 1. Try API if donor is logged in
        if (donorId && window.LifeLinkAPI) {
            try {
                const response = await window.LifeLinkAPI.apiCall(`/donors/donation-history?donor_id=${donorId}`);
                if (response.data) {
                    return response.data; // This object contains { donations: [], donor_name: ... }
                }
            } catch (e) {
                console.warn('API Fetch failed, using local storage fallback', e);
            }
        }

        // 2. Fallback to LocalStorage
        return { donations: getLocalDonations() };
    };

    // --- Render Logic ---
    const renderDashboard = async () => {
        let donations = [];
        let profile = null;

        try {
            const data = await fetchDonations();
            if (data.donations) {
                donations = data.donations;
                profile = data;
            } else {
                // Fallback struct
                donations = data.donations || data; // handle array or obj
            }
        } catch (e) {
            donations = getLocalDonations();
        }

        // Welcome message update (still handled here for page-specific UI)
        if (profile && profile.donor_name) {
            const welcomeName = document.getElementById('welcome-name');
            if (welcomeName) welcomeName.textContent = profile.donor_name.split(' ')[0];
        }
        
        // 1. History Table
        tableBody.innerHTML = '';
        if (donations.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-muted">No donations logged yet. Click 'Log New Donation' to start!</td></tr>`;
        } else {
            donations.forEach(d => {
                const tr = document.createElement('tr');
                tr.className = 'border-b border-gray-50 hover:bg-gray-50 transition-colors bg-white';
                tr.innerHTML = `
                    <td class="py-4 pl-4 font-medium text-dark">${window.LifeLinkUtils.formatDate(d.date)}</td>
                    <td class="py-4 text-gray-600">${d.location}</td>
                    <td class="py-4 text-gray-600">${d.bp || '-'}</td>
                    <td class="py-4">
                        <span class="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-600 font-bold border border-blue-100">${d.type}</span>
                    </td>
                    <td class="py-4 pr-4 text-right">
                        <button class="text-gray-400 hover:text-primary transition-colors text-sm"><i class="fas fa-download"></i></button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }

        // 2. Stats
        elTotalCount.textContent = donations.length;
        elLivesSaved.textContent = donations.length * 3; // Approx 3 lives per donation

        if (donations.length > 0) {
            const last = donations[0]; // First item (sorted desc)
            elLastDate.textContent = window.LifeLinkUtils.formatDate(last.date);
            elLastLoc.textContent = last.location;

            // Calc Next Date (Assume 3 months / 90 days for Whole Blood)
            const gap = last.type === 'Whole Blood' ? 90 : 14; // 14 days for Platelets/Plasma approx
            const lastDateObj = new Date(last.date);
            const nextDateObj = new Date(lastDateObj);
            nextDateObj.setDate(lastDateObj.getDate() + gap);
            
            elNextDate.textContent = window.LifeLinkUtils.formatDate(nextDateObj.toISOString().split('T')[0]);

            // Days Remaining
            const today = new Date();
            const diffTime = nextDateObj - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
                elDaysRemaining.textContent = "You are eligible today!";
                elDaysRemaining.className = "text-sm px-2 py-1 bg-green-100 text-green-700 rounded-lg inline-block font-bold animate-pulse";
                elNextDate.classList.add('text-success');
            } else {
                elDaysRemaining.textContent = `${diffDays} days to go`;
                elDaysRemaining.className = "text-sm px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg inline-block font-medium";
                elNextDate.classList.remove('text-success');
            }

        } else {
            elLastDate.textContent = '--';
            elLastLoc.textContent = '--';
            elNextDate.textContent = 'Anytime';
            elDaysRemaining.textContent = 'Ready to donate!';
            elDaysRemaining.className = "text-sm px-2 py-1 bg-green-100 text-green-700 rounded-lg inline-block font-bold";
        }
    };

    // --- Modal Handling ---
    const showModal = () => {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        // Small delay for CSS transition
        setTimeout(() => {
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }, 10);
    };

    const hideModal = () => {
        modalContent.classList.remove('scale-100', 'opacity-100');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            form.reset();
        }, 200);
    };

    addBtn.addEventListener('click', showModal);
    cancelBtn.addEventListener('click', hideModal);

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
    });

    // --- Form Submit ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const donation = Object.fromEntries(formData.entries());
        
        // Basic validation
        if(!donation.date) return;

        // Hybrid Save Logic
        const donorId = localStorage.getItem('lifelink_donor_id');
        let savedToApi = false;

        if (donorId && window.LifeLinkAPI) {
            try {
                // Add button loading state
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';

                // Save to API
                await window.LifeLinkAPI.apiCall('/donors/donation-history', {
                    method: 'POST',
                    body: { 
                        donor_id: donorId,
                        ...donation 
                    }
                });
                
                savedToApi = true;
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;

            } catch (err) {
                console.error('Failed to save to API', err);
                // Fallback to local
            }
        }

        if (!savedToApi) {
            saveLocalDonation(donation);
        }

        window.LifeLinkUtils.showToast('Donation logged successfully!', 'success');
        hideModal();
        await renderDashboard();
    });

    // --- Initial Load ---
    await renderDashboard();
});
