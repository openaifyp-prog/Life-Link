/**
 * login.js - Handle universal authentication
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorWithIcon = document.getElementById('login-error');
    const errorText = document.getElementById('error-text');
    const submitBtn = document.getElementById('submit-btn');
    const togglePassword = document.getElementById('toggle-password');

    // Toggle Password Visibility
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            togglePassword.innerHTML = `<i class="fas fa-eye${isPassword ? '-slash' : ''} text-sm"></i>`;
        });
    }

    // Clear error on input
    [emailInput, passwordInput].forEach(inp => {
        inp.addEventListener('input', () => {
            errorWithIcon.classList.add('hidden');
            inp.classList.remove('border-red-500', 'bg-red-50');
        });
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showError('Please fill in all fields');
            return;
        }

        // Loading state
        const originalBtnContent = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Authenticating...';
        submitBtn.disabled = true;

        try {
            // Unified Auth Endpoint
            const response = await window.LifeLinkAPI.apiCall('/auth/login', {
                method: 'POST',
                body: { email, password }
            });

            // On success
            const { token, user } = response.data;
            
            if (user.role === 'donor') {
                // Save Donor Session
                localStorage.setItem('lifelink_donor_token', token);
                localStorage.setItem('lifelink_donor_id', user.id);
                localStorage.setItem('lifelink_donor_name', user.name);
                
                // Redirect to Tracker
                window.location.href = 'tracker.html';
            } else {
                // Save Admin/Moderator Session
                const session = {
                    authenticated: true,
                    token: token,
                    admin: {
                        admin_id: user.id,
                        email: user.email,
                        full_name: user.name,
                        role: user.role,
                        permissions: user.permissions
                    },
                    loginTime: Date.now(),
                    expiry: Date.now() + (24 * 60 * 60 * 1000) // 24h
                };
                localStorage.setItem('lifelink_admin_session', JSON.stringify(session));
                
                // Also set donor tokens to keep navigation state consistent
                localStorage.setItem('lifelink_donor_token', token);
                localStorage.setItem('lifelink_donor_name', user.name);
                
                // Redirect to Admin Dashboard
                window.location.href = 'admin/index.html';
            }

        } catch (error) {
            console.error('Login error:', error);
            showError(error.message || 'Invalid email or password');
            submitBtn.innerHTML = originalBtnContent;
            submitBtn.disabled = false;
        }
    });

    function showError(msg) {
        errorText.textContent = msg;
        errorWithIcon.classList.remove('hidden');
        emailInput.classList.add('border-red-500', 'bg-red-50');
        passwordInput.classList.add('border-red-500', 'bg-red-50');
    }
});
