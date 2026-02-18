/**
 * eligibility.js - Handles the multi-step eligibility wizard and BMI calculator
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- BMI Calculator Logic ---
    const bmiBtn = document.getElementById('calc-bmi-btn');
    const weightInput = document.getElementById('bmi-weight');
    const heightInput = document.getElementById('bmi-height');
    const bmiResult = document.getElementById('bmi-result');
    const bmiValue = document.getElementById('bmi-value');
    const bmiStatus = document.getElementById('bmi-status');

    bmiBtn.addEventListener('click', () => {
        const weight = parseFloat(weightInput.value);
        const height = parseFloat(heightInput.value) / 100; // Convert to meters

        if (!weight || !height) {
            window.LifeLinkUtils.showToast('Please enter valid weight and height.', 'error');
            return;
        }

        const bmi = (weight / (height * height)).toFixed(1);
        bmiValue.textContent = bmi;
        bmiResult.classList.remove('hidden');

        // Status Logic & Gauge Color
        let statusText = '';
        let statusClass = '';
        let color = '#E0E0E0';
        let percentage = 0; // 0 to 100 for gauge

        if (bmi < 18.5) {
            statusText = 'Underweight';
            statusClass = 'block text-sm font-bold px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full inline-block mt-1';
            color = '#F39C12'; // Yellow/Orange
            percentage = Math.min((bmi / 18.5) * 25, 25);
        } else if (bmi >= 18.5 && bmi < 24.9) {
            statusText = 'Healthy Weight';
            statusClass = 'block text-sm font-bold px-3 py-1 bg-green-100 text-green-700 rounded-full inline-block mt-1';
            color = '#27AE60'; // Success Green
            percentage = 25 + ((bmi - 18.5) / (24.9 - 18.5)) * 25;
        } else if (bmi >= 25 && bmi < 29.9) {
            statusText = 'Overweight';
            statusClass = 'block text-sm font-bold px-3 py-1 bg-orange-100 text-orange-700 rounded-full inline-block mt-1';
            color = '#E67E22'; // Orange
            percentage = 50 + ((bmi - 25) / (29.9 - 25)) * 25;
        } else {
            statusText = 'Obese';
            statusClass = 'block text-sm font-bold px-3 py-1 bg-red-100 text-red-700 rounded-full inline-block mt-1';
            color = '#C0392B'; // Primary Red
            percentage = Math.min(75 + ((bmi - 30) / 10) * 25, 100);
        }
        
        bmiStatus.textContent = statusText;
        bmiStatus.className = statusClass;

        // Render SVG Gauge
        const gaugeContainer = document.getElementById('bmi-gauge-container');
        if (gaugeContainer) {
            // Half circle arc
            const radius = 80;
            const circumference = Math.PI * radius; // Half circle
            const dashOffset = circumference * (1 - (percentage / 100));
            
            gaugeContainer.innerHTML = `
                <svg viewBox="0 0 200 110" class="w-48 h-28 mx-auto">
                    <!-- Background Arc -->
                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#eee" stroke-width="15" stroke-linecap="round"/>
                    
                    <!-- Value Arc -->
                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="${color}" stroke-width="15" stroke-linecap="round" 
                          stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" 
                          class="transition-all duration-1000 ease-out" />
                    
                    <!-- Needle (Simplified) -->
                    <circle cx="100" cy="100" r="5" fill="#333"/>
                    <text x="100" y="85" text-anchor="middle" font-size="24" font-weight="bold" fill="#333">${bmi}</text>
                </svg>
            `;
            // Force reflow for animation
            setTimeout(() => {
                const path = gaugeContainer.querySelector('path:nth-child(2)');
                if(path) path.style.strokeDashoffset = dashOffset;
            }, 10);
        }
    });

    // --- Wizard Logic ---
    const wizardDivs = document.querySelectorAll('.step-content');
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    const progressBar = document.getElementById('progress-bar');
    const stepLabel = document.getElementById('step-label');
    const stepPercent = document.getElementById('step-percent');
    
    let currentStep = 1;
    const totalSteps = 3;

    // Wizard Navigation Handler
    const updateWizard = () => {
        // Show/Hide Steps
        wizardDivs.forEach(div => {
            if (div.dataset.step == currentStep) {
                div.classList.remove('hidden');
            } else {
                div.classList.add('hidden');
            }
        });

        // Update Progress
        const percent = Math.round((currentStep / totalSteps) * 100);
        progressBar.style.width = `${percent}%`;
        stepLabel.textContent = `Step ${currentStep} of ${totalSteps}`;
        stepPercent.textContent = `${percent}%`;

        // Button States
        if (currentStep === 1) {
            prevBtn.classList.add('hidden');
        } else {
            prevBtn.classList.remove('hidden');
        }

        if (currentStep === totalSteps) {
            nextBtn.innerHTML = 'Finish <i class="fas fa-check ml-2"></i>';
            nextBtn.classList.replace('bg-primary', 'bg-success');
            nextBtn.classList.replace('hover:bg-red-700', 'hover:bg-green-700');
        } else {
            nextBtn.innerHTML = 'Next <i class="fas fa-arrow-right ml-2"></i>';
            nextBtn.classList.replace('bg-success', 'bg-primary');
            nextBtn.classList.replace('hover:bg-green-700', 'hover:bg-red-700');
        }
    };
    
    // Result Handler
    const showResult = (passed) => {
        document.getElementById('wizard-nav').classList.add('hidden');
        document.querySelector('.mb-8').classList.add('hidden'); // Hide progress bar
        
        // Hide all steps
        wizardDivs.forEach(div => div.classList.add('hidden'));

        // Show result div
        const resultDiv = document.querySelector('[data-step="result"]');
        resultDiv.classList.remove('hidden');

        const icon = document.getElementById('result-icon');
        const title = document.getElementById('result-title');
        const msg = document.getElementById('result-message');
        const cta = document.getElementById('result-cta-primary');

        if (passed) {
            icon.className = 'w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl bg-green-100 text-success';
            icon.innerHTML = '<i class="fas fa-check-circle"></i>';
            title.textContent = "You're Eligible!";
            title.className = "text-3xl font-heading font-bold mb-4 text-success";
            msg.textContent = "Great news! Based on your answers, you appear to be eligible to donate blood. You can make a real difference today.";
            cta.classList.remove('hidden');
        } else {
            icon.className = 'w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl bg-red-100 text-primary';
            icon.innerHTML = '<i class="fas fa-times-circle"></i>';
            title.textContent = "Not Eligible Right Now";
            title.className = "text-3xl font-heading font-bold mb-4 text-primary";
            msg.textContent = "Based on your answers, you are currently unable to donate blood. This ensures both your safety and the safety of recipients. Please try again later or consult a doctor.";
        }
    };

    // Next Button Click
    nextBtn.addEventListener('click', () => {
        // Validate Step 1
        if (currentStep === 1) {
            const ageComp = document.querySelector('input[name="age_valid"]').checked;
            const weightComp = document.querySelector('input[name="weight_valid"]').checked;
            const intervalComp = document.querySelector('input[name="interval_valid"]').checked;

            if (!ageComp || !weightComp || !intervalComp) {
                showResult(false);
                return;
            }
        }

        // Validate Step 2 (Negative Check - if any checked, fail)
        if (currentStep === 2) {
            const healthIssues = document.querySelectorAll('input[name="health_issue"]:checked');
            if (healthIssues.length > 0) {
                showResult(false);
                return;
            }
        }

        // Validate Step 3 (Negative Check)
        if (currentStep === 3) {
            const lifestyleIssues = document.querySelectorAll('input[name="lifestyle_issue"]:checked');
            if (lifestyleIssues.length > 0) {
                lifestyleIssues.forEach(issue => reasons.push(issue.value));
                showResult(false, reasons);
                return;
            }
            // If passed wizard checks, verify with API if possible
            const donorId = localStorage.getItem('lifelink_donor_id');
            if (donorId && window.LifeLinkAPI) {
                nextBtn.innerHTML = '<div class="spinner border-2 border-white border-t-transparent rounded-full w-5 h-5 animate-spin"></div>';
                
                window.LifeLinkAPI.apiCall('/health/eligibility', { method: 'POST', body: { donor_id: donorId } })
                    .then(response => {
                        const isEligible = response.data.is_eligible;
                        const apiReasons = response.data.reason ? [response.data.reason] : [];
                        
                        // Show result from API
                        showResult(response.data.is_eligible);
                    })
                    .catch(err => {
                        console.error('Eligibility check failed', err);
                        // Fallback to client-side result (which is TRUE at this point)
                        showResult(true);
                    });
            } else {
                // No donor ID or API not available, trust client-side wizard
                showResult(true);
            }
            return;
        }

        currentStep++;
        updateWizard();
    });

    // Prev Button Click
    prevBtn.addEventListener('click', () => {
        if (currentStep > 1) {
            currentStep--;
            updateWizard();
        }
    });

    // Init
    updateWizard();
});
