/**
 * LifeLink Shared Utilities
 */

const Utils = {
    // Format date as "DD MMM YYYY"
    formatDate: (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    },

    // Mask phone number (0300-XXXXXX -> 0300-******)
    maskPhone: (phone) => {
        if (!phone) return '****-*******';
        const parts = phone.split('-');
        if (parts.length > 1) {
            return `${parts[0]}-******`; 
        }
        return phone.slice(0, 4) + '-******';
    },

    // Show toast notification (Delegate to Alerts module if available, else fallback)
    showToast: (message, type = 'info') => {
        if (window.LifeLinkAlerts) {
            window.LifeLinkAlerts.show(message, type);
        } else {
             console.warn('Alerts module not loaded. Message:', message);
             alert(message); // Fallback
        }
    },

    // Show Confirm Modal
    showConfirm: (title, message, onConfirm) => {
        // Create modal container
        const modalId = 'lifelink-confirm-modal';
        let modal = document.getElementById(modalId);
        
        if (modal) modal.remove(); // Remove existing if any

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in';
        
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 scale-95 opacity-0 animate-scale-in">
                <h3 class="text-xl font-bold text-dark mb-2">${title}</h3>
                <p class="text-gray-600 mb-6">${message}</p>
                <div class="flex justify-end gap-3">
                    <button class="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-colors" id="btn-cancel">Cancel</button>
                    <button class="px-4 py-2 rounded-lg bg-primary text-white hover:bg-red-700 font-medium transition-colors shadow-lg shadow-red-500/30" id="btn-confirm">Confirm</button>
                </div>
            </div>
        `;

        // Animation styles if not present
        if (!document.getElementById('modal-styles')) {
            const style = document.createElement('style');
            style.id = 'modal-styles';
            style.textContent = `
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
                .animate-scale-in { animation: scaleIn 0.3s ease-out 0.1s forwards; }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(modal);

        // Event Listeners
        const btnCancel = modal.querySelector('#btn-cancel');
        const btnConfirm = modal.querySelector('#btn-confirm');

        const closeModal = () => {
            modal.classList.add('opacity-0'); // Fade out
            setTimeout(() => modal.remove(), 200);
        };

        btnCancel.addEventListener('click', closeModal);
        btnConfirm.addEventListener('click', () => {
            if (onConfirm) onConfirm();
            closeModal();
        });

        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    },

    // Get color class for urgency
    getUrgencyColor: (level) => {
        switch(level.toLowerCase()) {
            case 'critical': return 'text-red-700 bg-red-100 border-red-200';
            case 'urgent': return 'text-orange-700 bg-orange-100 border-orange-200';
            case 'moderate': return 'text-blue-700 bg-blue-100 border-blue-200';
            default: return 'text-gray-700 bg-gray-100 border-gray-200';
        }
    },
    
    // Get Asset URL (Handling local file protocol)
    getAssetUrl: (path) => {
        if (window.location.protocol === 'file:') {
            return `http://localhost:3000/${path}`;
        }
        return path;
    }
};

// Export to window for global access (simple module pattern)
window.LifeLinkUtils = Utils;
