/**
 * api.js - Centralized API communication helper for LifeLink
 * All frontend modules use this instead of direct fetch calls.
 */

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : 'https://lifelink-backend.vercel.app/api'; // Update this with your actual Vercel Backend URL after deployment

/**
 * Make an API call to the LifeLink backend.
 * @param {string} endpoint - API path (e.g., '/donors/register')
 * @param {Object} options - { method, body, auth }
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {{ status: number, message: string }} On non-2xx responses
 */
async function apiCall(endpoint, options = {}) {
    const { method = 'GET', body = null, auth = false } = options;

    const headers = { 'Content-Type': 'application/json' };

    // Attach JWT token for authenticated admin routes
    if (auth) {
        const session = JSON.parse(localStorage.getItem('lifelink_admin_session') || '{}');
        if (session.token) {
            headers['Authorization'] = `Bearer ${session.token}`;
        }
    }

    const config = { method, headers };
    if (body && method !== 'GET') {
        config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.message || `API Error (${response.status})`);
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

/**
 * Build URL query string from an object (skips empty/null values).
 * @param {Object} params - Key-value pairs
 * @returns {string} Query string like '?key=val&key2=val2'
 */
function buildQuery(params) {
    const filtered = Object.entries(params)
        .filter(([_, v]) => v !== '' && v !== null && v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    return filtered.length ? `?${filtered.join('&')}` : '';
}

/**
 * Clear donor session and redirect to homepage.
 */
function logout() {
    console.log('[LifeLink] Logging out...');
    localStorage.removeItem('lifelink_donor_token');
    localStorage.removeItem('lifelink_donor_id');
    localStorage.removeItem('lifelink_donor_name');
    localStorage.removeItem('lifelink_admin_session');
    
    // Smart redirect to home based on directory
    const isInAdmin = window.location.pathname.includes('/admin/');
    window.location.href = isInAdmin ? '../index.html' : 'index.html';
}

// Expose globally — logout must be defined BEFORE this line
window.LifeLinkAPI = { apiCall, buildQuery, API_BASE, logout };

/**
 * Updates navbar links based on login status.
 */
function updateAuthUI(isLoggedIn, name = '', role = 'donor') {
    console.log('[LifeLink] updateAuthUI called. isLoggedIn:', isLoggedIn, 'name:', name, 'role:', role);

    const isInAdmin = window.location.pathname.includes('/admin/');

    // --- 1. Login/Logout Handling ---
    document.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href') || '';
        const isLoginLink = href.includes('login.html') || link.id === 'mobile-login-link';
        const isLogoutLink = link.id === 'mobile-logout-link';

        if (isLoginLink) {
            if (isLoggedIn) {
                // Completely hide the top login link on desktop if logged in
                // (Since we use the Profile dropdown now)
                link.style.setProperty('display', 'none', 'important');
            } else {
                link.style.display = 'block';
                link.innerHTML = 'Login';
                link.setAttribute('href', isInAdmin ? '../login.html' : 'login.html');
                link.onclick = null;
                link.classList.remove('text-red-600', 'font-semibold');
            }
        }

        if (isLogoutLink) {
            link.style.display = isLoggedIn ? 'block' : 'none';
            link.onclick = (e) => {
                e.preventDefault();
                logout();
            };
        }
    });

    // --- 2. Admin Link Visibility ---
    document.querySelectorAll('a').forEach(link => {
        const isAdminTarget = link.textContent.trim() === 'Admin' || 
                             link.textContent.trim() === 'Admin Dashboard' ||
                             link.getAttribute('href')?.includes('admin/index.html');
        
        if (isAdminTarget) {
            if (isLoggedIn && role === 'admin') {
                link.style.display = 'block';
            } else {
                link.style.display = 'none';
            }
        }
    });

    // --- 3. Register → Profile / Dashboard ---
    document.querySelectorAll('a').forEach(btn => {
        const href = btn.getAttribute('href') || '';
        const isRegisterLink = href.includes('register-donor.html') || btn.id === 'mobile-register-link';
        const isTrackerLink = href.includes('tracker.html');
        const isProfileIcon = btn.querySelector('.fa-user-circle');
        const isTrackerIcon = btn.querySelector('.fa-chart-line');

        if (isLoggedIn) {
            if (isRegisterLink || isProfileIcon) {
                // If it's the mobile register link in the menu, we usually hide it when logged in
                // unless we want it to become "Profile"
                if (btn.id === 'mobile-register-link') {
                    btn.style.display = 'none';
                    return;
                }

                const span = btn.querySelector('span');
                if (span && (span.textContent === 'Profile' || span.textContent === 'Register Now')) {
                    if (role === 'admin') {
                        span.textContent = 'Dashboard';
                    } else {
                        span.textContent = name ? name.split(' ')[0] : 'Profile';
                    }
                } else if (!isProfileIcon) {
                    btn.innerHTML = `<i class="fas fa-user-circle mr-1"></i> ${name || 'Profile'}`;
                }

                const targetPath = role === 'donor' ? 'tracker.html' : 'admin/index.html';
                const finalPath = isInAdmin ? (role === 'donor' ? '../tracker.html' : 'index.html') : targetPath;
                btn.setAttribute('href', finalPath);
            }

                if (role === 'admin' && (isTrackerLink || isTrackerIcon)) {
                    // Only hide the parent if it's NOT the main desktop nav AND NOT the bottom nav
                    const isDesktopNav = btn.parentElement?.classList.contains('md:flex');
                    const isBottomNav = btn.parentElement?.classList.contains('fixed') && btn.parentElement?.classList.contains('bottom-0');
                    
                    if (!isDesktopNav && !isBottomNav) {
                        btn.parentElement?.classList.add('hidden');
                    } else if (isDesktopNav) {
                        btn.style.display = 'none'; // Hide just the link on desktop
                    }
                } else if (isTrackerLink || isTrackerIcon) {
                    btn.style.display = ''; // Ensure it's visible (let CSS handle flex/block)
                }
            } else {
                if (isRegisterLink) {
                    btn.style.display = '';
                    const span = btn.querySelector('span');
                    if (span) span.textContent = 'Register Now';
                    else btn.textContent = 'Register as Donor';
                    btn.setAttribute('href', isInAdmin ? '../register-donor.html' : 'register-donor.html');
                }
                
                if (isTrackerLink || isTrackerIcon) {
                    btn.style.display = ''; // Let CSS handle layout
                }
            }
    });

    const authButtons = document.getElementById('auth-buttons');
    const profileContainer = document.getElementById('nav-profile-container');
    const dropdown = document.getElementById('nav-dropdown');
    const logoutBtn = document.getElementById('nav-logout-btn');
    const registerLink = document.getElementById('top-register-link');

    if (isLoggedIn) {
        if (authButtons) {
            authButtons.classList.remove('hidden');
            authButtons.style.display = 'flex'; // Enforce visibility and layout
        }
        if (registerLink) registerLink.style.display = 'none';

        // Update Profile Name & Initials
        const nameElem = document.getElementById('nav-profile-name');
        const initialElem = document.getElementById('nav-profile-initials');
        
        if (nameElem) nameElem.textContent = name || 'User';
        if (initialElem && name) {
            initialElem.textContent = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        }

        // Add Dropdown Toggle logic if not already present
        if (profileContainer && dropdown) {
            // Remove existing listener to prevent clones (if initNavigationState is recalled)
            const newContainer = profileContainer.cloneNode(true);
            profileContainer.parentNode.replaceChild(newContainer, profileContainer);
            
            // Re-select the dropdown inside the NEW container
            const newDropdown = newContainer.querySelector('#nav-dropdown');

            newContainer.addEventListener('click', (e) => {
                e.stopPropagation();
                // Use newDropdown instead of the stale 'dropdown' variable
                const isHidden = newDropdown.classList.contains('hidden');
                
                if (isHidden) {
                    newDropdown.classList.remove('hidden');
                    newDropdown.offsetHeight; // force reflow
                    newDropdown.classList.remove('opacity-0', 'scale-95');
                    newDropdown.classList.add('opacity-100', 'scale-100');
                } else {
                    newDropdown.classList.add('opacity-0', 'scale-95');
                    newDropdown.classList.remove('opacity-100', 'scale-100');
                    setTimeout(() => newDropdown.classList.add('hidden'), 200);
                }
            });

            // Universal Logout button in dropdown
            const actualLogoutBtn = newContainer.querySelector('#nav-logout-btn');
            if (actualLogoutBtn) {
                actualLogoutBtn.onclick = (e) => {
                    e.preventDefault();
                    logout();
                };
            }

            // Close dropdown when clicking elsewhere
            document.addEventListener('click', () => {
                if (newDropdown && !newDropdown.classList.contains('hidden')) {
                    newDropdown.classList.add('opacity-0', 'scale-95');
                    newDropdown.classList.remove('opacity-100', 'scale-100');
                    setTimeout(() => newDropdown.classList.add('hidden'), 200);
                }
            });
        }
    } else {
        if (authButtons) {
            authButtons.classList.add('hidden');
            authButtons.style.display = 'none'; // Enforce hidden state overriding md:flex
        }
        if (registerLink) {
            // Restore register link (using inline-flex to match original styling)
            registerLink.style.display = 'inline-flex';
        }
    }
}

/**
 * Checks localStorage and triggers UI update.
 */
function initNavigationState() {
    const token = localStorage.getItem('lifelink_donor_token');
    const donorName = localStorage.getItem('lifelink_donor_name') || 'Dashboard';
    
    // Check for admin session to determine role
    let role = 'donor';
    try {
        const adminSession = JSON.parse(localStorage.getItem('lifelink_admin_session') || '{}');
        if (adminSession.authenticated && adminSession.token) {
            role = adminSession.admin.role;
        }
    } catch (e) {}

    console.log('[LifeLink] initNavigationState. Token present:', !!token, 'Role:', role);
    updateAuthUI(!!token, donorName, role);
}

// Run when DOM is ready — handles both deferred and inline script scenarios
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigationState);
} else {
    // DOM already parsed (script loaded with defer or at bottom of body)
    initNavigationState();
}
