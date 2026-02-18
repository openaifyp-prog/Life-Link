/**
 * charts.js — Real-time analytics for LifeLink
 *
 * Powers 3 charts + a live Pakistan map on heatmap.html:
 *  1. Registered Donors by Blood Group (Doughnut)
 *  2. Weekly Activity Trends — donors registered per week (Bar)
 *  3. Critical Request Timeline — last 7 days (Stacked Bar)
 *  4. Pakistan Live Activity Map — SVG markers from real lat/lng
 *
 * Auto-refreshes every 30 seconds.
 *
 * Pakistan bounding box used for map projection:
 *   Lat: 23.5 (south) → 37.1 (north)
 *   Lng: 60.5 (west)  → 77.8 (east)
 *   SVG viewBox: 0 0 800 520
 */

const POLL_INTERVAL_MS = 30_000;

// Chart instances — kept so we can destroy & recreate on refresh
let bloodGroupChart = null;
let activityChart = null;
let urgencyChart = null;

// Timestamp tracking
let lastUpdated = null;
let secondsCounter = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initial load
    loadAllCharts();

    // Auto-refresh every 30 seconds
    setInterval(loadAllCharts, POLL_INTERVAL_MS);

    // Tick the "last updated" counter every second
    setInterval(tickCounter, 1000);
});

/**
 * Fetches both APIs in parallel and renders all charts.
 */
async function loadAllCharts() {
    try {
        const [heatmapResult, trendsResult] = await Promise.all([
            window.LifeLinkAPI.apiCall('/heatmap/demand'),
            window.LifeLinkAPI.apiCall('/analytics/trends'),
        ]);

        const heatmapData = heatmapResult.data;
        const trendsData = trendsResult.data;

        // Update header stats
        updateHeaderStats(heatmapData.summary);

        // Render charts
        renderBloodGroupChart(heatmapData.blood_group_summary);
        renderWeeklyActivityChart(trendsData.weekly_activity);
        renderCriticalTimelineChart(trendsData.critical_timeline);

        // Render Pakistan map markers from real city lat/lng
        renderMapMarkers(heatmapData.cities);

        // Record update time
        lastUpdated = new Date();
        updateTimestamp();

    } catch (error) {
        console.error('[LifeLink Charts] Failed to load analytics data:', error);
        showFallbackStats();
    }
}

/**
 * Updates the header stat counters.
 */
function updateHeaderStats(summary) {
    const statDonors = document.getElementById('stat-donors');
    const statRequests = document.getElementById('stat-requests');
    const statCritical = document.getElementById('stat-critical');
    const statCities = document.getElementById('stat-cities');

    if (statDonors) statDonors.textContent = summary.total_donors ?? '—';
    if (statRequests) statRequests.textContent = summary.total_active_requests ?? '—';
    if (statCritical) statCritical.textContent = summary.critical_requests ?? '—';
    if (statCities) statCities.textContent = summary.cities_covered ?? '—';
}

/**
 * Chart 1: Registered Donors by Blood Group (Doughnut)
 */
function renderBloodGroupChart(bgSummary) {
    const ctx = document.getElementById('bloodGroupChart');
    if (!ctx) return;

    const labels = Object.keys(bgSummary);
    const data = labels.map(bg => bgSummary[bg].supply);

    if (bloodGroupChart) bloodGroupChart.destroy();

    bloodGroupChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: [
                    '#C0392B', '#E74C3C', '#9B59B6', '#8E44AD',
                    '#2980B9', '#3498DB', '#1ABC9C', '#16A085'
                ],
                borderWidth: 2,
                borderColor: '#fff',
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 12,
                        font: { size: 12 },
                        usePointStyle: true,
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${ctx.parsed} donors`
                    }
                }
            }
        }
    });
}

/**
 * Chart 2: Weekly Activity Trends — new donors registered per week (Bar)
 */
function renderWeeklyActivityChart(weeklyActivity) {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    const labels = weeklyActivity.map(w => w.label);
    const donorData = weeklyActivity.map(w => w.new_donors);
    const requestData = weeklyActivity.map(w => w.new_requests);
    const donationData = weeklyActivity.map(w => w.donations);

    if (activityChart) activityChart.destroy();

    activityChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'New Donors',
                    data: donorData,
                    backgroundColor: 'rgba(39, 174, 96, 0.85)',
                    borderRadius: 5,
                    borderSkipped: false,
                },
                {
                    label: 'Blood Requests',
                    data: requestData,
                    backgroundColor: 'rgba(192, 57, 43, 0.75)',
                    borderRadius: 5,
                    borderSkipped: false,
                },
                {
                    label: 'Donations Made',
                    data: donationData,
                    backgroundColor: 'rgba(41, 128, 185, 0.75)',
                    borderRadius: 5,
                    borderSkipped: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, padding: 12, font: { size: 12 } }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, precision: 0 },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                }
            }
        }
    });
}

/**
 * Chart 3: Critical Request Timeline — last 7 days (Stacked Bar)
 */
function renderCriticalTimelineChart(criticalTimeline) {
    const ctx = document.getElementById('urgencyChart');
    if (!ctx) return;

    const labels = criticalTimeline.map(d => d.label);
    const criticalData = criticalTimeline.map(d => d.critical);
    const urgentData = criticalTimeline.map(d => d.urgent);
    const routineData = criticalTimeline.map(d => d.routine);

    if (urgencyChart) urgencyChart.destroy();

    urgencyChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Critical',
                    data: criticalData,
                    backgroundColor: 'rgba(192, 57, 43, 0.9)',
                    borderRadius: 4,
                    borderSkipped: false,
                },
                {
                    label: 'Urgent',
                    data: urgentData,
                    backgroundColor: 'rgba(230, 126, 34, 0.85)',
                    borderRadius: 4,
                    borderSkipped: false,
                },
                {
                    label: 'Routine',
                    data: routineData,
                    backgroundColor: 'rgba(39, 174, 96, 0.7)',
                    borderRadius: 4,
                    borderSkipped: false,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { usePointStyle: true, padding: 12, font: { size: 12 } }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        footer: (items) => {
                            const total = items.reduce((s, i) => s + i.parsed.y, 0);
                            return `Total: ${total} requests`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: { font: { size: 11 } }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { stepSize: 1, precision: 0 },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                }
            }
        }
    });
}

/**
 * Map: renders SVG city markers on the Pakistan map.
 *
 * Coordinate conversion (Pakistan bounding box → SVG 800×520):
 *   x = (lng - 60.5) / 17.3 * 800
 *   y = (37.1 - lat) / 13.6 * 520
 *
 * Marker colour:
 *   Red   (#C0392B) — city has critical requests
 *   Orange (#E67E22) — city has active requests but none critical
 *   Green  (#27AE60) — no active requests
 *
 * @param {Object} cities — keyed by city name, each with { lat, lng, donors, active_requests, critical_requests }
 */
function renderMapMarkers(cities) {
    const markerGroup = document.getElementById('map-markers');
    if (!markerGroup) return;

    // Clear previous markers
    markerGroup.innerHTML = '';

    // API returns cities as an array of objects (Object.values(cityData))
    // Each city has: { city, coordinates: { lat, lng }, donor_count, active_requests, critical_requests }
    if (!cities || !Array.isArray(cities) || cities.length === 0) return;

    // Pakistan bounding box constants (matches SVG viewBox 0 0 800 600)
    const LNG_MIN = 60.5;
    const LNG_RANGE = 17.3;   // 77.8 - 60.5
    const LAT_MAX = 37.5;
    const LAT_RANGE = 14.0;   // 37.5 - 23.5
    const SVG_W = 800;
    const SVG_H = 600;

    let cityCount = 0;

    cities.forEach((data, index) => {
        // Coordinates are nested: data.coordinates.lat / data.coordinates.lng
        const coords = data.coordinates;
        const lat = coords?.lat ?? coords?.latitude;
        const lng = coords?.lng ?? coords?.longitude;
        const cityName = data.city ?? data.name ?? `City ${index + 1}`;

        // Skip cities without valid coordinates
        if (!lat || !lng) return;

        const x = ((lng - LNG_MIN) / LNG_RANGE) * SVG_W;
        const y = ((LAT_MAX - lat) / LAT_RANGE) * SVG_H;

        // Clamp to SVG bounds with a small margin
        if (x < 10 || x > SVG_W - 10 || y < 10 || y > SVG_H - 10) return;

        const critical = data.critical_requests ?? 0;
        const active = data.active_requests ?? 0;
        const donors = data.donor_count ?? data.total_donors ?? 0;

        // Colour based on urgency
        const color = critical > 0 ? '#C0392B' : active > 0 ? '#E67E22' : '#27AE60';
        const pulseDelay = (index * 0.4) % 2;

        // Dot radius scales with donor count (min 6, max 14)
        const r = Math.min(14, Math.max(6, 5 + Math.sqrt(donors)));

        // Build SVG group: pulse ring + solid dot + label
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'map-dot-group');
        g.setAttribute('style', 'cursor: pointer;');

        // Pulse ring (animated)
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('cx', x);
        ring.setAttribute('cy', y);
        ring.setAttribute('r', r);
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', color);
        ring.setAttribute('stroke-width', '2');
        ring.setAttribute('opacity', '0.6');
        ring.setAttribute('class', 'map-pulse-ring');
        ring.style.animationDelay = `${pulseDelay}s`;

        // Solid dot
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', y);
        dot.setAttribute('r', r * 0.55);
        dot.setAttribute('fill', color);
        dot.setAttribute('opacity', '0.95');

        // City name label (shown below dot)
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', y + r + 11);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '9');
        label.setAttribute('font-family', 'Inter, sans-serif');
        label.setAttribute('fill', '#1A1A2E');
        label.setAttribute('font-weight', '600');
        label.textContent = cityName;

        // Native SVG tooltip on hover
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${cityName} — ${donors} donors | ${active} requests${critical > 0 ? ` (${critical} critical)` : ''}`;

        g.appendChild(ring);
        g.appendChild(dot);
        g.appendChild(label);
        g.appendChild(title);
        markerGroup.appendChild(g);
        cityCount++;
    });

    // Update city count badge
    const badge = document.getElementById('map-city-count');
    if (badge) badge.textContent = `${cityCount} cities active`;
}

/**
 * Updates the "Last updated X seconds ago" display.
 */
function updateTimestamp() {
    const el = document.getElementById('last-updated');
    if (el && lastUpdated) {
        el.textContent = 'Just now';
    }
}

/**
 * Ticks the seconds counter every second.
 */
function tickCounter() {
    const el = document.getElementById('last-updated');
    if (!el || !lastUpdated) return;
    const secs = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (secs < 5) {
        el.textContent = 'Just now';
    } else if (secs < 60) {
        el.textContent = `${secs}s ago`;
    } else {
        el.textContent = `${Math.floor(secs / 60)}m ago`;
    }
}

/**
 * Shows zeros if the API fails.
 */
function showFallbackStats() {
    ['stat-donors', 'stat-requests', 'stat-critical', 'stat-cities'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
    });
    const el = document.getElementById('last-updated');
    if (el) el.textContent = 'Error loading data';
}
