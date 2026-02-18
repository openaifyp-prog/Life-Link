/**
 * alerts.js - Toast Notification System
 */

const Alerts = {
    // Show toast notification
    show: (message, type = 'info') => {
        // Create container if not exists
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none'; // pointer-events-none to let clicks pass through container
            document.body.appendChild(container);
        }

        // Create toast element
        const toast = document.createElement('div');
        const bgColors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500', 
            info: 'bg-blue-500'
        };
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };

        toast.className = `${bgColors[type] || 'bg-gray-800'} text-white px-4 py-3 rounded shadow-lg transform translate-x-full transition-transform duration-300 flex items-center gap-3 min-w-[300px] pointer-events-auto relative overflow-hidden`;
        toast.innerHTML = `
            <div class="text-xl">${icons[type] || ''}</div>
            <div class="font-medium flex-grow">${message}</div>
            <button class="text-white/80 hover:text-white transition-colors" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
            <div class="absolute bottom-0 left-0 h-1 bg-white/30 animate-progress" style="width: 100%"></div>
        `;

        // Add custom animation for progress bar via style if not already added
        if (!document.getElementById('toast-style')) {
            const style = document.createElement('style');
            style.id = 'toast-style';
            style.innerHTML = `
                @keyframes progress {
                    from { width: 100%; }
                    to { width: 0%; }
                }
                .animate-progress {
                    animation: progress 4s linear forwards;
                }
            `;
            document.head.appendChild(style);
        }

        container.appendChild(toast);

        // Slide in animation
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full');
        });

        // Auto remove
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                toast.remove();
                if (container.children.length === 0) container.remove();
            }, 300);
        }, 4000);
    }
};

// Export to window
window.LifeLinkAlerts = Alerts;
