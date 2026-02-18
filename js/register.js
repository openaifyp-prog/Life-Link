/**
 * register.js - Handles donor registration form validation and submission
 * Integrated with POST /api/donors/register
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('register-form');
    const submitBtn = document.getElementById('submit-btn');
    const successOverlay = document.getElementById('success-overlay');
    const successModal = document.getElementById('success-modal');

    // Input fields to validate
    const fields = {
        fullName: { 
            element: document.getElementById('fullName'), 
            validate: (val) => val.length >= 3 
        },
        age: { 
            element: document.getElementById('age'), 
            validate: (val) => val >= 18 && val <= 65 
        },
        gender: {
            element: document.querySelector('input[name="gender"]'), 
            validate: () => document.querySelector('input[name="gender"]:checked')
        },
        bloodGroup: {
            element: document.getElementById('bloodGroup'),
            validate: (val) => val !== ''
        },
        city: {
            element: document.getElementById('city'),
            validate: (val) => val.length >= 3
        },
        phone: {
            element: document.getElementById('phone'),
            validate: (val) => /^[0-9]{10,11}$/.test(val)
        },
        password: {
            element: document.getElementById('password'),
            validate: (val) => val.length >= 6
        },
        consent: {
            element: document.getElementById('consent'),
            validate: () => document.getElementById('consent').checked
        }
    };

    // Real-time validation on blur
    Object.keys(fields).forEach(key => {
        const field = fields[key];
        if (!field.element) return;
        
        const eventType = (field.element.type === 'checkbox' || field.element.type === 'radio' || field.element.tagName === 'SELECT') ? 'change' : 'blur';

        field.element.addEventListener(eventType, () => {
            validateField(key);
        });

        field.element.addEventListener('input', () => {
            clearError(field.element);
        });
    });

    function validateField(key) {
        const field = fields[key];
        if (!field) return false;

        let isValid = false;
        if (field.element.type === 'checkbox' || field.element.tagName === 'SELECT') {
             isValid = field.validate(field.element.value);
        } else if (field.element.type === 'radio') {
             isValid = field.validate();
        } else {
             isValid = field.validate(field.element.value.trim());
        }

        if (!isValid) {
            showError(field.element);
            return false;
        } else {
            showSuccess(field.element);
            return true;
        }
    }

    function showError(element) {
        if (!element) return;
        const parent = element.closest('.space-y-2') || element.parentElement.parentElement; 
        const errorMsg = parent.querySelector('.error-msg');
        element.classList.add('border-red-500', 'focus:border-red-500', 'focus:ring-red-200');
        element.classList.remove('border-green-500', 'focus:border-green-500', 'focus:ring-green-200');
        if (errorMsg) errorMsg.classList.remove('hidden');
    }

    function showSuccess(element) {
        if (!element) return;
        const parent = element.closest('.space-y-2') || element.parentElement.parentElement;
        const errorMsg = parent.querySelector('.error-msg');
        element.classList.remove('border-red-500', 'focus:border-red-500', 'focus:ring-red-200');
        if (element.type !== 'checkbox' && element.type !== 'radio') {
             element.classList.add('border-green-500', 'focus:border-green-500', 'focus:ring-green-200');
        }
        if (errorMsg) errorMsg.classList.add('hidden');
    }

    function clearError(element) {
        if (!element) return;
        const parent = element.closest('.space-y-2') || element.parentElement.parentElement;
        const errorMsg = parent.querySelector('.error-msg');
        element.classList.remove('border-red-500', 'focus:border-red-500');
        if (errorMsg) errorMsg.classList.add('hidden');
    }

    // Form Submission → POST /api/donors/register
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let allValid = true;
        Object.keys(fields).forEach(key => {
            if (!validateField(key)) allValid = false;
        });

        if (allValid) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registering...';

            try {
                // Gather form data
                const fullName = document.getElementById('fullName').value.trim();
                const nameParts = fullName.split(' ');
                const firstName = nameParts[0] || fullName;
                const lastName = nameParts.slice(1).join(' ') || 'N/A';

                const genderEl = document.querySelector('input[name="gender"]:checked');
                const emailEl = document.getElementById('email');
                const areaEl = document.getElementById('area');
                const conditions = Array.from(document.querySelectorAll('input[name="condition"]:checked'))
                    .map(cb => cb.value)
                    .filter(v => v !== 'None');

                const payload = {
                    first_name: firstName,
                    last_name: lastName,
                    email: (emailEl && emailEl.value.trim()) || `${Date.now()}@lifelink.temp`,
                    phone: document.getElementById('phone').value.trim(),
                    blood_group: document.getElementById('bloodGroup').value,
                    city: document.getElementById('city').value.trim(),
                    area: (areaEl && areaEl.value.trim()) || '',
                    age: parseInt(document.getElementById('age').value),
                    weight: 55,
                    gender: genderEl ? genderEl.value : 'Male',
                    medical_conditions: conditions,
                    availability_status: document.querySelector('input[name="available"]')?.checked ? 'available' : 'unavailable',
                    preference_contact_for_emergencies: true,
                    password: document.getElementById('password').value,
                };

                const result = await window.LifeLinkAPI.apiCall('/donors/register', {
                    method: 'POST',
                    body: payload
                });

                // Store donor_id for future use (tracker, etc.)
                localStorage.setItem('lifelink_donor_id', result.data.donor_id);
                localStorage.setItem('lifelink_donor_blood', result.data.blood_group);

                // Show Success Overlay (existing animation)
                successOverlay.classList.remove('hidden');
                void successOverlay.offsetWidth;
                successOverlay.classList.remove('opacity-0');
                successModal.classList.remove('scale-95');
                successModal.classList.add('scale-100');

                // Reset form
                form.reset();
                Object.keys(fields).forEach(key => {
                    const el = fields[key].element;
                    if(el) el.classList.remove('border-green-500', 'focus:border-green-500', 'focus:ring-green-200');
                });

            } catch (error) {
                console.error('Registration error:', error);
                
                let errorMessage = 'Registration failed. Please try again.';
                if (error.status === 409) {
                    errorMessage = error.message || 'This phone/email is already registered.';
                } else if (error.status === 400) {
                    errorMessage = error.message || 'Please check your information and try again.';
                }
                
                window.LifeLinkUtils.showToast(errorMessage, 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Register as Donor';
            }
        } else {
            submitBtn.classList.add('animate-pulse');
            setTimeout(() => submitBtn.classList.remove('animate-pulse'), 500);
            
            const firstError = document.querySelector('.error-msg:not(.hidden)');
            if (firstError) {
                firstError.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    });
});
