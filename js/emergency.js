/**
 * emergency.js - Handles fetching and posting emergency requests
 * Integrated with GET /api/requests/search and POST /api/requests/create
 */

document.addEventListener('DOMContentLoaded', () => {
    const feedContainer = document.getElementById('emergency-feed');
    const form = document.getElementById('emergency-form');
    let requests = [];

    // Load Requests from API
    async function loadRequests() {
        // Show Skeleton
        feedContainer.innerHTML = Array(3).fill(0).map(() => `
            <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div class="space-y-2">
                             <div class="h-4 w-24 bg-gray-200 rounded"></div>
                             <div class="h-3 w-16 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                    <div class="w-12 h-5 bg-gray-200 rounded-full"></div>
                </div>
                <div class="space-y-2 mb-4">
                    <div class="h-4 w-3/4 bg-gray-200 rounded"></div>
                    <div class="h-3 w-full bg-gray-200 rounded"></div>
                </div>
                <div class="flex justify-between mt-auto">
                    <div class="h-3 w-16 bg-gray-200 rounded"></div>
                    <div class="h-8 w-24 bg-gray-200 rounded-lg"></div>
                </div>
            </div>
        `).join('');

        try {
            const result = await window.LifeLinkAPI.apiCall('/requests/search?status=open&limit=20');

            // Normalize API response to match renderer fields
            requests = result.data.requests.map(r => ({
                id: r.request_id,
                bloodGroup: r.blood_group_needed,
                hospital: r.hospital_name || 'Hospital Not Specified',
                city: r.city,
                urgency: r.urgency_level.charAt(0).toUpperCase() + r.urgency_level.slice(1),
                patientName: r.requester_name,
                units: r.units_needed,
                notes: `${r.units_needed} unit(s) needed • ${r.status}`,
                contact: 'Contact via platform',
                postedTime: r.created_at,
            }));

            renderFeed(requests);
        } catch (error) {
            console.error('Error loading emergencies:', error);
            feedContainer.innerHTML = '<p class="text-center text-red-500">Failed to load requests.</p>';
        }
    }

    // Render Feed
    function renderFeed(data) {
        feedContainer.innerHTML = '';
        
        if (data.length === 0) {
            feedContainer.innerHTML = '<p class="text-center text-gray-500 py-8">No active requests. Good news!</p>';
            return;
        }

        data.forEach(req => {
            const timeAgo = getTimeAgo(new Date(req.postedTime));
            const urgencyClass = window.LifeLinkUtils.getUrgencyColor(req.urgency);
            const isCritical = req.urgency === 'Critical';
            
            const card = document.createElement('div');
            const borderClass = isCritical ? 'border-red-200 animate-pulse-border' : 'border-gray-100';
            
            card.className = `bg-white rounded-xl p-5 shadow-sm border ${borderClass} relative transition-all hover:shadow-md`;
            
            card.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-2">
                        <span class="blood-badge badge-${req.bloodGroup.replace('+','_pos').replace('-','_neg')} text-xs w-8 h-8">${req.bloodGroup}</span>
                        <div>
                             <h3 class="font-bold text-dark text-sm leading-tight">${req.hospital}</h3>
                             <p class="text-xs text-gray-500 flex items-center gap-1">
                                <i class="fas fa-map-marker-alt text-[10px]"></i> ${req.city}
                             </p>
                        </div>
                    </div>
                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${urgencyClass}">
                        ${req.urgency}
                    </span>
                </div>
                
                <div class="mb-4">
                    <p class="text-gray-700 text-sm font-medium mb-1">Requester: ${req.patientName} (${req.units} Units)</p>
                    <p class="text-xs text-gray-500 line-clamp-2">${req.notes}</p>
                </div>

                <div class="flex items-center justify-between mt-auto">
                    <span class="text-xs text-muted flex items-center gap-1">
                        <i class="far fa-clock"></i> ${timeAgo}
                    </span>
                    <button class="bg-dark hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2" onclick="showContact('${req.contact}')">
                        <i class="fas fa-hand-holding-heart"></i> I Can Help
                    </button>
                </div>
            `;
            feedContainer.appendChild(card);
        });
    }

    // Helper: Time Ago
    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 3600;
        if (interval > 24) return Math.floor(interval / 24) + " days ago";
        if (interval > 1) return Math.floor(interval) + " hrs ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " mins ago";
        return "Just now";
    }

    // Handle Post Request → POST /api/requests/create
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        
        try {
            const formData = new FormData(form);
            const raw = Object.fromEntries(formData.entries());

            // Map form fields to API schema
            const payload = {
                requester_name: raw.patientName || 'Anonymous',
                requester_phone: raw.contact,
                requester_email: `emergency_${Date.now()}@lifelink.temp`,
                blood_group_needed: raw.bloodGroup,
                units_needed: parseInt(raw.units) || 1,
                urgency_level: (raw.urgency || 'urgent').toLowerCase(),
                city: raw.city,
                hospital_name: raw.hospital || '',
                patient_name: raw.patientName || '',
                reason_for_need: raw.notes || '',
            };

            const result = await window.LifeLinkAPI.apiCall('/requests/create', {
                method: 'POST',
                body: payload
            });

            window.LifeLinkUtils.showToast(
                `Emergency request created! ${result.data.matched_donors_count || 0} donor(s) matched.`, 
                'success'
            );
            form.reset();
            
            // Reload the feed to show new request
            await loadRequests();
            feedContainer.scrollTop = 0;

        } catch (error) {
            console.error('Error submitting request:', error);
            window.LifeLinkUtils.showToast(error.message || 'Failed to submit request.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request';
        }
    });

    // Contact Modal Logic
    const contactModal = document.getElementById('contact-modal');
    const contactModalInner = document.getElementById('contact-modal-inner');
    const contactNumberEl = document.getElementById('contact-number');
    const callLink = document.getElementById('call-contact-link');
    const copyBtn = document.getElementById('copy-contact-btn');

    window.showContact = (contact) => {
        if (!contactModal) return;
        contactNumberEl.textContent = contact;
        callLink.href = `tel:${contact}`;
        
        contactModal.classList.remove('hidden');
        void contactModal.offsetWidth;
        contactModal.classList.remove('opacity-0');
        contactModalInner.classList.remove('scale-95');
        contactModalInner.classList.add('scale-100');
    };

    window.closeContactModal = () => {
        if (!contactModal) return;
        contactModal.classList.add('opacity-0');
        contactModalInner.classList.remove('scale-100');
        contactModalInner.classList.add('scale-95');
        setTimeout(() => contactModal.classList.add('hidden'), 300);
    };

    if (contactModal) {
        contactModal.addEventListener('click', (e) => {
            if (e.target === contactModal) closeContactModal();
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const number = contactNumberEl.textContent;
            navigator.clipboard.writeText(number).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check mr-1"></i>Copied!';
                copyBtn.classList.add('text-success', 'border-green-300');
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy mr-1"></i>Copy';
                    copyBtn.classList.remove('text-success', 'border-green-300');
                }, 2000);
            }).catch(() => {
                window.LifeLinkUtils.showToast('Failed to copy. Please copy manually.', 'error');
            });
        });
    }

    // Filter Logic
    document.getElementById('feed-filter').addEventListener('change', (e) => {
        const type = e.target.value;
        if (type === 'all') {
            renderFeed(requests);
        } else {
            renderFeed(requests.filter(r => r.bloodGroup === type));
        }
    });

    // Initial Load
    loadRequests();
});
