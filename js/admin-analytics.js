document.addEventListener('DOMContentLoaded', () => {
    // Check initial auth
    const sessionRaw = localStorage.getItem('lifelink_admin_session');
    if (!sessionRaw) {
        window.location.href = '../login.html';
        return;
    }

    // Initialize
    fetchData();

    // Setup Sidebar Toggle (Mobile)
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.remove('-translate-x-full');
            overlay.classList.remove('hidden');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
            overlay.classList.add('hidden');
        });
    }
});

async function fetchData() {
    try {
        // Fetch all donors and requests
        const [donorsRes, requestsRes] = await Promise.all([
            // Use apiCall directly: GET /admin/donors?limit=1000
            window.LifeLinkAPI.apiCall(`/admin/donors?limit=1000`, { auth: true }),
            // Use apiCall directly: GET /admin/requests?limit=1000
            window.LifeLinkAPI.apiCall(`/admin/requests?limit=1000`, { auth: true })
        ]);

        if (donorsRes.success && requestsRes.success) {
            renderCharts(donorsRes.data.donors, requestsRes.data.requests);
        } else {
            console.error('Failed to fetch analytics data');
        }

    } catch (error) {
        console.error('Error fetching analytics data:', error);
    }
}

function renderCharts(donors, requests) {
    renderRegistrationTrend(donors);
    renderBloodGroupDistribution(donors);
    renderRequestStatus(requests);
    renderUrgencyBreakdown(requests);
}

// 1. Donor Registration Trends (Last 30 Days)
function renderRegistrationTrend(donors) {
    const ctx = document.getElementById('registrationChart').getContext('2d');
    
    // Process data: Group by date (last 30 days)
    const last30Days = [...Array(30)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
    });

    const dataMap = donors.reduce((acc, donor) => {
        const date = new Date(donor.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {});

    const counts = last30Days.map(date => dataMap[date] || 0);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: last30Days.map(d => d.slice(5)), // MM-DD
            datasets: [{
                label: 'New Registrations',
                data: counts,
                borderColor: '#C0392B',
                backgroundColor: 'rgba(192, 57, 43, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
                x: { grid: { display: false } }
            }
        }
    });
}

// 2. Blood Group Distribution
function renderBloodGroupDistribution(donors) {
    const ctx = document.getElementById('bloodGroupChart').getContext('2d');
    
    const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const counts = groups.map(g => donors.filter(d => d.blood_group === g).length);

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: groups,
            datasets: [{
                data: counts,
                backgroundColor: [
                    '#FF6B6B', '#FF8787', // A
                    '#4ECDC4', '#7ED6DF', // B
                    '#FFE66D', '#FFD93D', // AB
                    '#1A535C', '#2C3E50'  // O
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            },
            cutout: '70%'
        }
    });
}

// 3. Request Status Overview
function renderRequestStatus(requests) {
    const ctx = document.getElementById('requestStatusChart').getContext('2d');

    const open = requests.filter(r => r.status === 'open').length;
    const inProgress = requests.filter(r => r.status === 'in_progress').length;
    const fulfilled = requests.filter(r => r.status === 'fulfilled').length;
    const cancelled = requests.filter(r => r.status === 'cancelled').length;

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Open', 'In Progress', 'Fulfilled', 'Cancelled'],
            datasets: [{
                data: [open, inProgress, fulfilled, cancelled],
                backgroundColor: ['#F1C40F', '#3498DB', '#27AE60', '#95A5A6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// 4. Request Urgency Breakdown
function renderUrgencyBreakdown(requests) {
    const ctx = document.getElementById('urgencyChart').getContext('2d');

    const levels = ['routine', 'urgent', 'critical']; // 'low' is not in constants.js, using routine/urgent/critical
    // Map 'low' to 'routine' if needed, but constants say routine/urgent/critical
    // Data check: requests.json uses 'urgency_level'
    const counts = levels.map(l => requests.filter(r => r.urgency_level === l).length);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Routine', 'Urgent', 'Critical'],
            datasets: [{
                label: 'Requests',
                data: counts,
                backgroundColor: [
                    '#2ECC71', // Routine
                    '#F39C12', // Urgent
                    '#E74C3C'  // Critical
                ],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
                x: { grid: { display: false } }
            }
        }
    });
}
