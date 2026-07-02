document.addEventListener('DOMContentLoaded', () => {
    // API endpoints (Developer telemetry compatibility)
    const API_STATUS = '/health';
    const API_INGEST = '/api/v1/ingest';
    const API_PREDICT = '/api/v1/predict';
    const API_ADMIN_STATUS = '/api/v1/admin/status';
    const API_ADMIN_SIMULATE = '/api/v1/admin/simulate';
    const API_ADMIN_TRAIN = '/api/v1/admin/train';

    // API endpoints (Academy Portal)
    const API_STUDENTS_LIST = '/api/v1/student/list';
    const API_STUDENT_PROFILE = '/api/v1/student/profile';
    const API_STUDENT_EMBEDDINGS = '/api/v1/student/embeddings';
    const API_STUDENT_KNOWLEDGE_GRAPH = '/api/v1/student/knowledge-graph';
    const API_STUDENT_COHORT = '/api/v1/student/cohort/compare';
    const API_SANDBOX_TRAIN = '/api/v1/student/sandbox/train';

    // State Variables
    let currentDomain = 'saas';
    let activeUser = 'dev_alice';
    let activeStudentTwin = '101'; // Default Academy student ID Emma Watson
    let stopGraphAnimation = null; // Hold graph loop stopper
    
    // Chart References
    let behaviorRadarChartInstance = null;
    let trajectoryLineChartInstance = null;
    let embeddingsScatterChartInstance = null;
    let sandboxLossChartInstance = null;

    // Tab Switching Logic
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.getElementById(targetTab).classList.add('active');
            
            // Adjust layouts for Chart.js redrawing
            if (targetTab === 'tab-classroom') {
                loadClassroomDashboard();
            } else if (targetTab === 'tab-digital-twin') {
                loadStudentDigitalTwin(activeStudentTwin);
            } else if (targetTab === 'tab-future-simulator') {
                loadSimulatorSandbox();
            }
        });
    });

    // -------------------------------------------------------------
    // INTERACTIVE PARTICLE ACCENTS
    // -------------------------------------------------------------
    function initParticles() {
        const canvas = document.getElementById('particles-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const particles = [];
        for (let i = 0; i < 45; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 2 + 1,
                alpha: Math.random() * 0.5 + 0.1
            });
        }
        
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
                
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 242, 254, ${p.alpha})`;
                ctx.fill();
            });
            requestAnimationFrame(animate);
        }
        animate();
        
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }

    // -------------------------------------------------------------
    // CLASSROOM DASHBOARD CONTROLLER (TAB 1)
    // -------------------------------------------------------------
    async function loadClassroomDashboard() {
        try {
            // Fetch students list
            const res = await fetch(API_STUDENTS_LIST);
            if (!res.ok) throw new Error();
            const students = await res.json();
            
            // Populate dropdowns & lists
            populateDropdowns(students);
            
            // Populate category segments
            populateSegments(students);
            
            // Load scatter plot clusters
            loadEmbeddingsScatter();
            
            // Load comparisons
            loadCohortComparisons();
        } catch (err) {
            console.error("Failed loading classroom data", err);
        }
    }

    function populateDropdowns(students) {
        const selector = document.getElementById('twin-student-selector');
        selector.innerHTML = '';
        students.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.user_id;
            opt.textContent = `${s.name} (#${s.user_id}) - CGPA: ${s.cgpa}`;
            selector.appendChild(opt);
        });
        selector.value = activeStudentTwin;
    }

    function populateSegments(students) {
        const topList = document.getElementById('list-top-improvers');
        const silentList = document.getElementById('list-silent-learners');
        const burnoutList = document.getElementById('list-burnout-candidates');
        
        topList.innerHTML = '';
        silentList.innerHTML = '';
        burnoutList.innerHTML = '';
        
        students.forEach(s => {
            const li = document.createElement('li');
            li.textContent = `${s.name} (CGPA: ${s.cgpa})`;
            li.addEventListener('click', () => {
                selectStudent(s.user_id);
            });
            
            if (s.cgpa >= 8.5 && s.stress_probability < 50) {
                topList.appendChild(li);
            } else if (s.cgpa >= 7.0 && s.stress_probability > 70) {
                burnoutList.appendChild(li);
            } else {
                silentList.appendChild(li);
            }
        });
        
        // Set counts
        document.getElementById('class-total-students').textContent = students.length;
        const avg = students.reduce((acc, s) => acc + s.cgpa, 0) / students.length;
        document.getElementById('class-avg-cgpa').textContent = avg.toFixed(2);
        
        const avgPart = students.reduce((acc, s) => acc + s.motivation, 0) / students.length;
        document.getElementById('class-avg-participation').textContent = Math.round(avgPart) + '%';
        
        const highBurnouts = students.filter(s => s.stress_probability > 70).length;
        const burnoutPct = Math.round((highBurnouts / students.length) * 100);
        document.getElementById('class-burnout-rate').textContent = burnoutPct + '%';
    }

    function selectStudent(studentId) {
        activeStudentTwin = studentId;
        // switch tab
        tabButtons.forEach(b => {
            if (b.getAttribute('data-tab') === 'tab-digital-twin') {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
        tabPanes.forEach(p => {
            if (p.getAttribute('id') === 'tab-digital-twin') {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });
        loadStudentDigitalTwin(studentId);
    }

    async function loadEmbeddingsScatter() {
        try {
            const res = await fetch(API_STUDENT_EMBEDDINGS);
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            const datasets = data.clusters.map(c => {
                return {
                    label: c.name,
                    data: data.points.filter(p => p.cluster === c.id).map(p => {
                        return { x: p.x, y: p.y, sid: p.user_id, name: p.name, cgpa: p.cgpa, risk: p.burnout_risk };
                    }),
                    backgroundColor: c.color,
                    borderColor: 'rgba(15,23,42,0.1)',
                    borderWidth: 1,
                    pointRadius: 7,
                    pointHoverRadius: 9
                };
            });

            if (embeddingsScatterChartInstance) {
                embeddingsScatterChartInstance.destroy();
            }

            const ctx = document.getElementById('embeddingsScatterChart').getContext('2d');
            embeddingsScatterChartInstance = new Chart(ctx, {
                type: 'scatter',
                data: { datasets: datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { labels: { color: '#475569', font: { family: 'Outfit' } } },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const pt = context.raw;
                                    return `${pt.name} (#${pt.sid}) | CGPA: ${pt.cgpa} | Risk: ${pt.risk}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: { grid: { color: 'rgba(15,23,42,0.05)' }, ticks: { color: '#475569' }, title: { display: true, text: 'Academic Engagement Dimension', color: '#475569' } },
                        y: { grid: { color: 'rgba(15,23,42,0.05)' }, ticks: { color: '#475569' }, title: { display: true, text: 'Stress & Cognitive Burnout', color: '#475569' } }
                    },
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const datasetIndex = elements[0].datasetIndex;
                            const index = elements[0].index;
                            const pt = embeddingsScatterChartInstance.data.datasets[datasetIndex].data[index];
                            selectStudent(pt.sid);
                        }
                    }
                }
            });
        } catch (err) {
            console.error("Embeddings scatter chart fail", err);
        }
    }

    async function loadCohortComparisons() {
        try {
            const res = await fetch(API_STUDENT_COHORT);
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            const tbody = document.getElementById('departmental-tbody');
            tbody.innerHTML = '';
            
            data.departmental.forEach(dept => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight: 600;">${dept.group}</td>
                    <td class="table-val text-cyan">${dept.avg_cgpa.toFixed(2)}</td>
                    <td class="table-val ${dept.burnout_risk_avg === 'High' ? 'text-red' : 'text-sub'}">${dept.burnout_risk_avg}</td>
                    <td class="table-val text-green">${dept.participation}%</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error("Failed loading comparisons", err);
        }
    }

    // -------------------------------------------------------------
    // STUDENT DIGITAL TWIN CONTROLLER (TAB 2)
    // -------------------------------------------------------------
    async function loadStudentDigitalTwin(studentId) {
        if (!studentId) return;
        activeStudentTwin = studentId;
        
        try {
            // Fetch profile
            const res = await fetch(`${API_STUDENT_PROFILE}/${studentId}`);
            if (!res.ok) throw new Error();
            const profile = await res.json();
            
            // Bind stats
            document.getElementById('twin-sid-label').textContent = profile.user_id;
            document.getElementById('twin-style-label').textContent = profile.learning_style;
            document.getElementById('twin-name').textContent = profile.name;
            document.getElementById('twin-attention-label').textContent = profile.attention_trend;
            document.getElementById('twin-motivation').textContent = profile.motivation + '%';
            
            const burnoutEl = document.getElementById('twin-burnout');
            burnoutEl.textContent = profile.burnout_risk;
            burnoutEl.className = profile.burnout_risk === 'High' ? 'text-red' : (profile.burnout_risk === 'Medium' ? 'text-yellow' : 'text-green');
            
            document.getElementById('twin-stress').textContent = profile.stress_probability + '%';
            document.getElementById('twin-cgpa').textContent = profile.cgpa.toFixed(2);
            
            // Gamification
            document.getElementById('twin-game-level').textContent = profile.gamification.level;
            document.getElementById('twin-game-streak').innerHTML = `<i class="fa-solid fa-fire text-orange"></i> ${profile.gamification.learning_streak} Days`;
            document.getElementById('twin-game-xp').textContent = profile.gamification.xp_points.toLocaleString() + ' XP';
            
            const badgesList = document.getElementById('twin-badges-list');
            badgesList.innerHTML = '';
            profile.gamification.badges.forEach(b => {
                const item = document.createElement('div');
                item.className = 'badge-item';
                item.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${b}`;
                badgesList.appendChild(item);
            });

            // Attention analytics
            document.getElementById('att-peak-hours').textContent = profile.attention_analytics.peak_performance_hours;
            document.getElementById('att-asg-timing').textContent = profile.attention_analytics.assignment_timing;
            document.getElementById('att-login-freq').textContent = profile.attention_analytics.login_frequency;
            document.getElementById('att-late-night').textContent = profile.attention_analytics.late_night_usage_rate;
            
            const lateNightVal = parseInt(profile.attention_analytics.late_night_usage_rate);
            document.getElementById('att-late-night').className = lateNightVal > 50 ? 'text-red' : (lateNightVal > 25 ? 'text-yellow' : 'text-green');

            // Render personality discover bars
            const traitsContainer = document.getElementById('twin-traits-container');
            traitsContainer.innerHTML = '';
            for (const [trait, val] of Object.entries(profile.personality_traits)) {
                const item = document.createElement('div');
                item.className = 'trait-bar-item';
                item.innerHTML = `
                    <div class="trait-meta">
                        <span>${trait}</span>
                        <span>${val}%</span>
                    </div>
                    <div class="trait-track">
                        <div class="trait-fill" style="width: ${val}%"></div>
                    </div>
                `;
                traitsContainer.appendChild(item);
            }

            // Fetch GenAI insight
            const insightRes = await fetch(`${API_STUDENT_PROFILE}/${studentId}/insights`);
            if (insightRes.ok) {
                const insightData = await insightRes.json();
                // We'll append insight to profile view
                let infoBox = document.getElementById('twin-genai-insight-box');
                if (!infoBox) {
                    infoBox = document.createElement('div');
                    infoBox.id = 'twin-genai-insight-box';
                    infoBox.className = 'explanation-box';
                    // insert in profile card body
                    const profileCard = document.querySelector('.card-digital-profile .card-body');
                    profileCard.appendChild(infoBox);
                }
                infoBox.innerHTML = `<strong>GenAI Insight:</strong> ${insightData.insight}`;
            }

            // Render Radar Chart
            renderRadarChart(profile.personality_traits);
            
            // Render Trajectory Charts
            renderTrajectoryChart(profile.trajectory_history);
            
            // Render Collaboration graph
            loadKnowledgeGraph();
            
        } catch (err) {
            console.error("Failed loading twin profile", err);
        }
    }

    function renderRadarChart(traits) {
        const labels = Object.keys(traits);
        const data = Object.values(traits);

        if (behaviorRadarChartInstance) {
            behaviorRadarChartInstance.destroy();
        }

        const ctx = document.getElementById('behaviorRadarChart').getContext('2d');
        behaviorRadarChartInstance = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Behaviour Inferred Index',
                    data: data,
                    backgroundColor: 'rgba(0, 242, 254, 0.15)',
                    borderColor: 'rgba(0, 242, 254, 0.8)',
                    borderWidth: 1.5,
                    pointBackgroundColor: 'rgba(79, 172, 254, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        grid: { color: 'rgba(15, 23, 42, 0.06)' },
                        angleLines: { color: 'rgba(15, 23, 42, 0.06)' },
                        pointLabels: { color: '#475569', font: { family: 'Outfit', size: 9 } },
                        ticks: { display: false },
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    }

    function renderTrajectoryChart(history) {
        const labels = history.map(h => `Day ${h.day}`);
        const focusData = history.map(h => h.focus);
        const motivationData = history.map(h => h.motivation);
        const stressData = history.map(h => h.stress);
        const consistencyData = history.map(h => h.consistency);

        // Add 5 points of forecasting data representation
        const forecastLabels = [...labels, "Day 31 (Forecast)", "Day 32 (Forecast)", "Day 33 (Forecast)", "Day 34 (Forecast)", "Day 35 (Forecast)"];
        
        // forecast trend extrapolation based on last 5 days
        const lastFocus = focusData[focusData.length - 1];
        const lastMot = motivationData[motivationData.length - 1];
        const lastStress = stressData[stressData.length - 1];
        
        const focusSlope = (lastFocus - focusData[focusData.length - 5]) / 5;
        const motSlope = (lastMot - motivationData[motivationData.length - 5]) / 5;
        const stressSlope = (lastStress - stressData[stressData.length - 5]) / 5;
        
        const forecastFocus = [...focusData];
        const forecastMot = [...motivationData];
        const forecastStress = [...stressData];
        
        for (let i = 1; i <= 5; i++) {
            forecastFocus.push(Math.max(10, Math.min(100, Math.round(lastFocus + focusSlope * i))));
            forecastMot.push(Math.max(10, Math.min(100, Math.round(lastMot + motSlope * i))));
            forecastStress.push(Math.max(10, Math.min(100, Math.round(lastStress + stressSlope * i))));
        }

        if (trajectoryLineChartInstance) {
            trajectoryLineChartInstance.destroy();
        }

        const ctx = document.getElementById('trajectoryLineChart').getContext('2d');
        trajectoryLineChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: forecastLabels,
                datasets: [
                    {
                        label: 'Focus',
                        data: forecastFocus,
                        borderColor: '#22d3ee',
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        pointRadius: 0,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Motivation',
                        data: forecastMot,
                        borderColor: '#34d399',
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        pointRadius: 0,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Stress Risk',
                        data: forecastStress,
                        borderColor: '#f87171',
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        pointRadius: 0,
                        pointHoverRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#475569', font: { family: 'Outfit', size: 9 } } }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 8 } } },
                    y: { grid: { color: 'rgba(15, 23, 42, 0.05)' }, ticks: { color: '#475569', font: { size: 8 } }, min: 0, max: 100 }
                }
            }
        });
    }

    async function loadKnowledgeGraph() {
        if (stopGraphAnimation) {
            stopGraphAnimation();
        }
        
        try {
            const res = await fetch(API_STUDENT_KNOWLEDGE_GRAPH);
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            // Run physics drawing canvas loop
            stopGraphAnimation = drawNetworkGraph('networkGraphCanvas', data.nodes, data.links);
        } catch (err) {
            console.error("Knowledge graph rendering fail", err);
        }
    }

    // Physics force directed canvas helper
    function drawNetworkGraph(canvasId, nodesData, linksData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width || 300;
        canvas.height = 200;
        
        const width = canvas.width;
        const height = canvas.height;
        
        const graphNodes = nodesData.map((n, i) => {
            const angle = (i / nodesData.length) * Math.PI * 2;
            const radius = Math.min(width, height) * 0.35;
            return {
                ...n,
                x: width / 2 + Math.cos(angle) * radius,
                y: height / 2 + Math.sin(angle) * radius,
                vx: 0,
                vy: 0,
                r: n.id === activeStudentTwin ? 13 : 8
            };
        });
        
        const graphLinks = linksData.map(l => {
            return {
                source: graphNodes.find(n => n.id === l.source),
                target: graphNodes.find(n => n.id === l.target),
                value: l.value
            };
        }).filter(l => l.source && l.target);
        
        let hoverNode = null;
        
        function onMouseMove(e) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            hoverNode = null;
            for (let n of graphNodes) {
                const dx = n.x - mouseX;
                const dy = n.y - mouseY;
                if (dx*dx + dy*dy < (n.r + 5)*(n.r + 5)) {
                    hoverNode = n;
                    break;
                }
            }
        }
        
        function onClick() {
            if (hoverNode) {
                loadStudentDigitalTwin(hoverNode.id);
            }
        }

        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('click', onClick);
        
        let activeAnimation = true;
        
        function animateLoop() {
            if (!activeAnimation) return;
            
            // physics step
            const k = 0.06; 
            const len = 65; 
            const repel = 180;
            
            // repel
            for (let i = 0; i < graphNodes.length; i++) {
                for (let j = i + 1; j < graphNodes.length; j++) {
                    const n1 = graphNodes[i];
                    const n2 = graphNodes[j];
                    const dx = n2.x - n1.x;
                    const dy = n2.y - n1.y;
                    const distSq = dx*dx + dy*dy + 0.1;
                    const dist = Math.sqrt(distSq);
                    if (dist < 100) {
                        const force = repel / distSq;
                        const fx = (dx / dist) * force;
                        const fy = (dy / dist) * force;
                        n1.vx -= fx;
                        n1.vy -= fy;
                        n2.vx += fx;
                        n2.vy += fy;
                    }
                }
            }
            
            // pull links
            graphLinks.forEach(l => {
                const dx = l.target.x - l.source.x;
                const dy = l.target.y - l.source.y;
                const dist = Math.sqrt(dx*dx + dy*dy) + 0.1;
                const disp = dist - len;
                const fx = (dx / dist) * disp * k;
                const fy = (dy / dist) * disp * k;
                l.source.vx += fx;
                l.source.vy += fy;
                l.target.vx -= fx;
                l.target.vy -= fy;
            });
            
            // update positions
            graphNodes.forEach(n => {
                const gravityX = (width / 2 - n.x) * 0.015;
                const gravityY = (height / 2 - n.y) * 0.015;
                n.vx += gravityX;
                n.vy += gravityY;
                
                n.x += n.vx;
                n.y += n.vy;
                n.vx *= 0.8;
                n.vy *= 0.8;
                
                n.x = Math.max(n.r, Math.min(width - n.r, n.x));
                n.y = Math.max(n.r, Math.min(height - n.r, n.y));
            });
            
            // Draw
            ctx.clearRect(0, 0, width, height);
            
            // Draw links
            ctx.strokeStyle = 'rgba(15,23,42,0.08)';
            ctx.lineWidth = 1;
            graphLinks.forEach(l => {
                ctx.beginPath();
                ctx.moveTo(l.source.x, l.source.y);
                ctx.lineTo(l.target.x, l.target.y);
                ctx.stroke();
            });
            
            // Draw nodes
            graphNodes.forEach(n => {
                let color = '#5ae1f7';
                if (n.group === 0) color = '#5af3aa';
                if (n.group === 2) color = '#ff6e6e';
                
                const grad = ctx.createRadialGradient(n.x, n.y, 2, n.x, n.y, n.r);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(1, color);
                
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                
                if (n.id === activeStudentTwin || hoverNode === n) {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = color;
                }
                
                ctx.fill();
                ctx.shadowBlur = 0;
                
                ctx.fillStyle = (n.id === activeStudentTwin) ? '#0f172a' : '#475569';
                ctx.font = '8px Outfit';
                ctx.textAlign = 'center';
                ctx.fillText(n.label.split(' ')[0], n.x, n.y - n.r - 3);
            });
            
            requestAnimationFrame(animateLoop);
        }
        animateLoop();
        
        return () => {
            activeAnimation = false;
            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('click', onClick);
        };
    }

    // Dropdown change triggers reload
    document.getElementById('twin-student-selector').addEventListener('change', (e) => {
        loadStudentDigitalTwin(e.target.value);
    });

    // -------------------------------------------------------------
    // FUTURE SIMULATOR & INTERVENTIONS (TAB 3)
    // -------------------------------------------------------------
    async function loadSimulatorSandbox() {
        try {
            const res = await fetch(`${API_STUDENT_PROFILE}/${activeStudentTwin}`);
            if (!res.ok) throw new Error();
            const profile = await res.json();
            
            document.getElementById('sim-student-name').textContent = profile.name;
            document.getElementById('sim-curr-cgpa').textContent = profile.cgpa.toFixed(2);
            document.getElementById('sim-new-cgpa').textContent = profile.cgpa.toFixed(2);
            document.getElementById('sim-cgpa-diff').textContent = "0.00";
            document.getElementById('sim-cgpa-diff').className = "text-muted";
            
            // reset sliders
            document.getElementById('slider-att').value = 0;
            document.getElementById('slider-asg').value = 0;
            document.getElementById('slider-eng').value = 0;
            
            document.getElementById('val-att-change').textContent = "0%";
            document.getElementById('val-asg-change').textContent = "0%";
            document.getElementById('val-eng-change').textContent = "0%";
            
            document.getElementById('val-att-change').className = "text-green";
            document.getElementById('val-asg-change').className = "text-green";
            document.getElementById('val-eng-change').className = "text-green";
            
            // reset progress bars
            updateSimulatedUI(profile.cgpa, 0, 0, profile.stress_probability, 95);
            
            // Load default intervention outcome
            runIntervention("mentor_session");
        } catch (err) {
            console.error("Failed load simulator page", err);
        }
    }

    // Sliders event listener
    const sliders = ['slider-att', 'slider-asg', 'slider-eng'];
    sliders.forEach(id => {
        const slider = document.getElementById(id);
        slider.addEventListener('input', async (e) => {
            const val = parseInt(e.target.value);
            const valLabel = document.getElementById(`val-${id.replace('slider-', '')}-change`);
            valLabel.textContent = (val >= 0 ? '+' : '') + val + '%';
            
            valLabel.className = val > 0 ? 'text-green' : (val < 0 ? 'text-red' : 'text-muted');
            
            // POST simulation call
            await triggerSimulationCall();
        });
    });

    async function triggerSimulationCall() {
        const att = parseFloat(document.getElementById('slider-att').value);
        const asg = parseFloat(document.getElementById('slider-asg').value);
        const eng = parseFloat(document.getElementById('slider-eng').value);
        
        try {
            const res = await fetch(`${API_STUDENT_PROFILE}/${activeStudentTwin}/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attendance_change: att,
                    assignment_change: asg,
                    engagement_change: eng
                })
            });
            if (!res.ok) throw new Error();
            const out = await res.json();
            
            // Update outcomes UI
            const newCgpa = out.simulated_cgpa;
            const diff = out.cgpa_change;
            
            document.getElementById('sim-new-cgpa').textContent = newCgpa.toFixed(2);
            const diffLabel = document.getElementById('sim-cgpa-diff');
            diffLabel.textContent = (diff >= 0 ? '+' : '') + diff.toFixed(2);
            diffLabel.className = diff > 0 ? 'text-green' : (diff < 0 ? 'text-red' : 'text-muted');
            
            updateSimulatedUI(newCgpa, out.risk_increase_pct, out.dropout_risk_pct, out.recovery_chance_pct);
        } catch (err) {
            console.error("Simulation request fail", err);
        }
    }

    function updateSimulatedUI(newCgpa, risk, dropout, recovery) {
        document.getElementById('sim-risk-pct').textContent = risk + '%';
        document.getElementById('sim-risk-bar').style.width = risk + '%';
        
        document.getElementById('sim-dropout-pct').textContent = dropout + '%';
        document.getElementById('sim-dropout-bar').style.width = dropout + '%';
        
        document.getElementById('sim-recovery-pct').textContent = recovery + '%';
        document.getElementById('sim-recovery-bar').style.width = recovery + '%';
    }

    // Recommendation buttons
    const recButtons = document.querySelectorAll('.card-sim-recommendations .btn-preset');
    recButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            recButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const action = btn.getAttribute('data-action');
            runIntervention(action);
        });
    });

    async function runIntervention(actionName) {
        try {
            const res = await fetch(`${API_STUDENT_PROFILE}/${activeStudentTwin}/intervention`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: actionName })
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            document.getElementById('rec-title').textContent = data.title;
            document.getElementById('rec-recovery').textContent = data.recovery_chance + '%';
            document.getElementById('rec-cgpa-boost').textContent = data.cgpa_impact;
            document.getElementById('rec-stress-impact').textContent = data.stress_impact;
            document.getElementById('rec-reason').textContent = data.reason;
        } catch (err) {
            console.error("Intervention call fail", err);
        }
    }

    // -------------------------------------------------------------
    // AI BEHAVIOR COACH CHAT (TAB 4)
    // -------------------------------------------------------------
    const chatForm = document.getElementById('chat-composer-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages-area');

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = chatInput.value.trim();
        if (!msg) return;
        
        // Append user text
        appendChatMessage(msg, 'user');
        chatInput.value = '';
        
        // Loader bot message placeholder
        const loader = appendChatMessage('<i class="fa-solid fa-spinner fa-spin"></i> Reasoning...', 'bot');
        
        try {
            const res = await fetch(`${API_STUDENT_PROFILE}/${activeStudentTwin}/coach`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg })
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            // Remove loader and append bot response
            loader.remove();
            appendChatMessage(data.chatbot_response, 'bot');
            
            // Fill Multi-Agent traces
            document.getElementById('agent-thought-analyst').querySelector('p').textContent = data.agents.analyst;
            document.getElementById('agent-thought-predictor').querySelector('p').textContent = data.agents.predictor;
            document.getElementById('agent-thought-alert').querySelector('p').textContent = data.agents.alert;
            document.getElementById('agent-thought-explainer').querySelector('p').textContent = data.agents.explainer;
            document.getElementById('agent-thought-mentor').querySelector('p').textContent = data.agents.mentor;
            
            // Trigger trace animation sequence
            runAgentTraceAnimation();
        } catch (err) {
            loader.remove();
            appendChatMessage('Apologies, my multi-agent telemetry is temporarily offline.', 'bot');
        }
    });

    function appendChatMessage(text, sender) {
        const item = document.createElement('div');
        item.className = `chat-message ${sender}`;
        
        const avatarIcon = sender === 'bot' ? 'fa-robot' : 'fa-user';
        item.innerHTML = `
            <div class="chat-avatar"><i class="fa-solid ${avatarIcon}"></i></div>
            <div class="chat-text">${text}</div>
        `;
        chatMessages.appendChild(item);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return item;
    }

    function runAgentTraceAnimation() {
        const agents = ['analyst', 'predictor', 'alert', 'explainer', 'mentor'];
        const nodes = document.querySelectorAll('.agent-node');
        
        // clear active classes
        nodes.forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.agent-thought-card').forEach(c => c.classList.add('hide'));
        
        agents.forEach((ag, i) => {
            setTimeout(() => {
                // activate bubble node
                nodes.forEach(n => {
                    if (n.getAttribute('data-agent') === ag) n.classList.add('active');
                });
                
                // reveal thought
                const thoughtCard = document.getElementById(`agent-thought-${ag}`);
                thoughtCard.classList.remove('hide');
                thoughtCard.classList.add('highlight');
                setTimeout(() => thoughtCard.classList.remove('highlight'), 800);
            }, i * 600);
        });
    }

    // Agent node bubbles click handles
    document.querySelectorAll('.agent-node').forEach(node => {
        node.addEventListener('click', () => {
            const ag = node.getAttribute('data-agent');
            document.querySelectorAll('.agent-thought-card').forEach(c => c.classList.add('hide'));
            document.getElementById(`agent-thought-${ag}`).classList.remove('hide');
        });
    });

    // -------------------------------------------------------------
    // ML BEHAVIOR SANDBOX CONTROLLER (TAB 5)
    // -------------------------------------------------------------
    const sandboxForm = document.getElementById('sandbox-config-form');
    const epochsSlider = document.getElementById('sandbox-epochs');
    const lrSlider = document.getElementById('sandbox-lr');

    epochsSlider.addEventListener('input', (e) => {
        document.getElementById('sandbox-epochs-val').textContent = e.target.value;
    });

    lrSlider.addEventListener('input', (e) => {
        const actualLr = (parseFloat(e.target.value) / 10000).toFixed(4);
        document.getElementById('sandbox-lr-val').textContent = actualLr;
    });

    sandboxForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const model = document.getElementById('sandbox-model-select').value;
        const epochs = parseInt(epochsSlider.value);
        const lr = parseFloat(document.getElementById('sandbox-lr-val').textContent);
        
        const btn = document.getElementById('btn-sandbox-train');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fitting model...';
        
        try {
            const res = await fetch(API_SANDBOX_TRAIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model_type: model,
                    epochs: epochs,
                    learning_rate: lr
                })
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            // Populate metrics outputs
            document.getElementById('sandbox-acc').textContent = data.metrics.accuracy + '%';
            document.getElementById('sandbox-prec').textContent = data.metrics.precision + '%';
            document.getElementById('sandbox-rec').textContent = data.metrics.recall + '%';
            document.getElementById('sandbox-time').textContent = data.metrics.training_time_seconds + 's';
            
            // Plot loss curve
            renderSandboxLossChart(data.loss_history);
        } catch (err) {
            console.error("Sandbox ML training failed", err);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-dumbbell"></i> Run Algorithmic Sandbox';
        }
    });

    function renderSandboxLossChart(lossHistory) {
        const labels = lossHistory.map(h => `Epoch ${h.epoch}`);
        const loss = lossHistory.map(h => h.loss);

        if (sandboxLossChartInstance) {
            sandboxLossChartInstance.destroy();
        }

        const ctx = document.getElementById('sandboxLossChart').getContext('2d');
        sandboxLossChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Fitting Loss Metric',
                    data: loss,
                    borderColor: '#f78eb6',
                    backgroundColor: 'rgba(247, 142, 182, 0.05)',
                    borderWidth: 1.5,
                    fill: true,
                    pointRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#475569' } },
                    y: { grid: { color: 'rgba(15,23,42,0.05)' }, ticks: { color: '#475569' } }
                }
            }
        });
    }

    // -------------------------------------------------------------
    // EXECUTIVE PRINT REPORT (1-CLICK GENERATOR)
    // -------------------------------------------------------------
    document.getElementById('btn-print-report').addEventListener('click', async () => {
        try {
            const res = await fetch(`${API_STUDENT_PROFILE}/${activeStudentTwin}`);
            if (!res.ok) throw new Error();
            const profile = await res.json();
            
            const insightRes = await fetch(`${API_STUDENT_PROFILE}/${activeStudentTwin}/insights`);
            if (!insightRes.ok) throw new Error();
            const insightData = await insightRes.json();
            
            // Populate print template text fields
            document.getElementById('print-date').textContent = new Date().toLocaleDateString();
            document.getElementById('print-name').textContent = profile.name;
            document.getElementById('print-sid').textContent = profile.user_id;
            document.getElementById('print-cgpa').textContent = profile.cgpa.toFixed(2);
            document.getElementById('print-style').textContent = profile.learning_style;
            document.getElementById('print-motivation').textContent = profile.motivation + '%';
            document.getElementById('print-stress').textContent = profile.stress_probability + '%';
            document.getElementById('print-burnout').textContent = profile.burnout_risk;
            document.getElementById('print-attention').textContent = profile.attention_trend;
            
            // style mapping
            const burnoutLabel = document.getElementById('print-burnout');
            burnoutLabel.style.color = profile.burnout_risk === 'High' ? 'red' : (profile.burnout_risk === 'Medium' ? 'orange' : 'green');
            
            document.getElementById('print-insight-box').textContent = insightData.insight;
            
            // Populate lists
            const attList = document.getElementById('print-attention-list');
            attList.innerHTML = `
                <li>Peak Study Window: ${profile.attention_analytics.peak_performance_hours}</li>
                <li>Submit Lead Time: ${profile.attention_analytics.assignment_timing}</li>
                <li>Login cadence: ${profile.attention_analytics.login_frequency}</li>
                <li>Late-night activity weight: ${profile.attention_analytics.late_night_usage_rate}</li>
            `;
            
            const expList = document.getElementById('print-explain-list');
            expList.innerHTML = '';
            profile.explainable_ai.forEach(f => {
                const li = document.createElement('li');
                li.textContent = `${f.factor}: ${f.weight} contribution (${f.positive ? 'Risk Increasing' : 'Mitigating'})`;
                expList.appendChild(li);
            });
            
            // Trigger window print UI
            window.print();
        } catch (err) {
            alert("Failed aggregating print summary report metrics: " + err);
        }
    });


    // =============================================================
    // DEVELOPER telemetry backwards compatibility panel
    // =============================================================
    const DOMAINS_CONFIG = {
        saas: {
            name: "SaaS Workspace",
            prefix: "saas_user",
            users: ['dev_alice', 'admin_bob', 'guest_charlie', 'billing_david', 'dev_emily'],
            actions: [
                { id: "login", label: "login", icon: "fa-right-to-bracket", color: "text-blue" },
                { id: "view_dashboard", label: "dashboard", icon: "fa-chart-pie", color: "text-cyan" },
                { id: "create_project", label: "create proj", icon: "fa-folder-plus", color: "text-yellow" },
                { id: "invite_member", label: "invite user", icon: "fa-user-plus", color: "text-green" },
                { id: "configure_api", label: "config api", icon: "fa-sliders", color: "text-orange" },
                { id: "deploy_service", label: "deploy", icon: "fa-cloud-arrow-up", color: "text-indigo" },
                { id: "upgrade_billing", label: "upgrade", icon: "fa-credit-card", color: "text-purple" },
                { id: "view_logs", label: "view logs", icon: "fa-list-check", color: "text-red" },
                { id: "logout", label: "logout", icon: "fa-right-from-bracket", color: "text-muted" }
            ]
        },
        gaming: {
            name: "Gaming Platform",
            prefix: "gamer",
            users: ['gamer_greg', 'casual_sam', 'social_zoe', 'whale_will', 'speedrunner_sara'],
            actions: [
                { id: "login", label: "login", icon: "fa-right-to-bracket", color: "text-blue" },
                { id: "open_lobby", label: "lobby", icon: "fa-door-open", color: "text-yellow" },
                { id: "join_matchmaker", label: "matchmake", icon: "fa-spinner", color: "text-cyan" },
                { id: "start_match", label: "play match", icon: "fa-gamepad", color: "text-green" },
                { id: "complete_quest", label: "quest complete", icon: "fa-trophy", color: "text-orange" },
                { id: "purchase_item", label: "buy skin", icon: "fa-gem", color: "text-purple" },
                { id: "send_friend_request", label: "add friend", icon: "fa-user-plus", color: "text-indigo" },
                { id: "open_settings", label: "settings", icon: "fa-gears", color: "text-cyan" },
                { id: "logout", label: "logout", icon: "fa-right-from-bracket", color: "text-muted" }
            ]
        },
        media: {
            name: "Streaming Platform",
            prefix: "viewer",
            users: ['binge_watcher', 'casual_viewer', 'curator_dan', 'subscriber_sue', 'listener_leo'],
            actions: [
                { id: "login", label: "login", icon: "fa-right-to-bracket", color: "text-blue" },
                { id: "search_content", label: "search", icon: "fa-magnifying-glass", color: "text-yellow" },
                { id: "play_media", label: "play", icon: "fa-play", color: "text-green" },
                { id: "pause_media", label: "pause", icon: "fa-pause", color: "text-red" },
                { id: "add_to_favorites", label: "like", icon: "fa-heart", color: "text-orange" },
                { id: "share_media", label: "share", icon: "fa-share-nodes", color: "text-indigo" },
                { id: "rate_content", label: "rate", icon: "fa-star", color: "text-cyan" },
                { id: "subscribe_channel", label: "subscribe", icon: "fa-bell", color: "text-purple" },
                { id: "logout", label: "logout", icon: "fa-right-from-bracket", color: "text-muted" }
            ]
        },
        ecommerce: {
            name: "E-Commerce",
            prefix: "shopper",
            users: ['shopper_emma', 'browser_jack', 'support_chloe', 'buyer_ben', 'reviewer_rose'],
            actions: [
                { id: "login", label: "login", icon: "fa-right-to-bracket", color: "text-blue" },
                { id: "search_product", label: "search", icon: "fa-magnifying-glass", color: "text-yellow" },
                { id: "view_item", label: "view item", icon: "fa-eye", color: "text-cyan" },
                { id: "add_to_cart", label: "add to cart", icon: "fa-cart-plus", color: "text-green" },
                { id: "remove_from_cart", label: "remove", icon: "fa-cart-arrow-down", color: "text-red" },
                { id: "view_reviews", label: "reviews", icon: "fa-star", color: "text-orange" },
                { id: "checkout_start", label: "checkout", icon: "fa-credit-card", color: "text-purple" },
                { id: "purchase_complete", label: "purchase", icon: "fa-check-double", color: "text-indigo" },
                { id: "logout", label: "logout", icon: "fa-right-from-bracket", color: "text-muted" }
            ]
        }
    };

    const knownUsersByDomain = {
        saas: new Set(DOMAINS_CONFIG.saas.users),
        gaming: new Set(DOMAINS_CONFIG.gaming.users),
        media: new Set(DOMAINS_CONFIG.media.users),
        ecommerce: new Set(DOMAINS_CONFIG.ecommerce.users)
    };

    // DOM bindings for Developer control panel
    const apiStatusPill = document.getElementById('api-status-pill');
    const apiStatusText = document.getElementById('api-status-text');
    const modelLoadedVal = document.getElementById('model-loaded-val');
    const activeUsersVal = document.getElementById('active-users-val');
    const totalEventsVal = document.getElementById('total-events-val');
    const weightSizeVal = document.getElementById('weight-size-val');
    const cfgEmbedding = document.getElementById('cfg-embedding');
    const cfgHidden = document.getElementById('cfg-hidden');
    const cfgLayers = document.getElementById('cfg-layers');
    const cfgSeqLen = document.getElementById('cfg-seq-len');
    const cfgModified = document.getElementById('cfg-modified');
    const btnSimulate = document.getElementById('btn-simulate');
    const btnTrain = document.getElementById('btn-train');
    const consoleOutput = document.getElementById('console-output');
    const domainBtns = document.querySelectorAll('.domain-btn');
    const userSelector = document.getElementById('user-selector');
    const btnNewUser = document.getElementById('btn-new-user');
    const presetActionsGrid = document.getElementById('preset-actions-grid');
    const customEventForm = document.getElementById('custom-event-form');
    const customActionInput = document.getElementById('custom-action-input');
    const streamFeedWrapper = document.getElementById('stream-feed-wrapper');
    const emptyFeedPlaceholder = document.getElementById('empty-feed-placeholder');
    const streamFeedList = document.getElementById('stream-feed-list');
    const sequenceTimeline = document.getElementById('sequence-timeline');
    const emptyTimelinePlaceholder = document.getElementById('empty-timeline-placeholder');
    const btnForcePredict = document.getElementById('btn-force-predict');
    const predictionsWrapper = document.getElementById('predictions-wrapper');
    const emptyPredictionsPlaceholder = document.getElementById('empty-predictions-placeholder');
    const predictionsList = document.getElementById('predictions-list');

    function logToConsole(message, type = 'INFO') {
        const time = new Date().toLocaleTimeString();
        if (consoleOutput) {
            consoleOutput.textContent += `\n[${time}] ${type}: ${message}`;
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
        }
    }

    function getActionVisuals(actionId) {
        for (const domKey in DOMAINS_CONFIG) {
            const match = DOMAINS_CONFIG[domKey].actions.find(a => a.id === actionId);
            if (match) return match;
        }
        return { id: actionId, label: actionId, icon: "fa-bolt", color: "text-muted" };
    }

    function selectDomain(domainKey) {
        currentDomain = domainKey;
        const config = DOMAINS_CONFIG[domainKey];

        domainBtns.forEach(btn => {
            if (btn.getAttribute('data-domain') === domainKey) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        userSelector.innerHTML = '';
        const usersSet = knownUsersByDomain[domainKey];
        usersSet.forEach(user => {
            const opt = document.createElement('option');
            opt.value = user;
            opt.textContent = `${user} (${config.name})`;
            userSelector.appendChild(opt);
        });

        const testUser = `test_${config.prefix}_1`;
        if (!usersSet.has(testUser)) {
            usersSet.add(testUser);
            const opt = document.createElement('option');
            opt.value = testUser;
            opt.textContent = testUser;
            userSelector.appendChild(opt);
        }

        activeUser = Array.from(usersSet)[0];
        userSelector.value = activeUser;

        presetActionsGrid.innerHTML = '';
        config.actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-preset';
            btn.setAttribute('data-action', action.id);
            btn.innerHTML = `<i class="fa-solid ${action.icon} ${action.color}"></i> ${action.label}`;
            btn.addEventListener('click', () => ingestEvent(action.id));
            presetActionsGrid.appendChild(btn);
        });

        logToConsole(`Switched domain to ${config.name}. Active target profile: ${activeUser}`);
    }

    async function checkHealth() {
        try {
            const res = await fetch(API_STATUS);
            if (res.ok) {
                apiStatusPill.className = 'status-pill status-online';
                apiStatusText.textContent = 'Manovra Academy Core Online';
                return true;
            } else {
                throw new Error();
            }
        } catch (err) {
            apiStatusPill.className = 'status-pill status-offline';
            apiStatusText.textContent = 'Connection Offline';
            logToConsole('Connection to server failed. Verify server is running.', 'ERROR');
            return false;
        }
    }

    async function loadTelemetry() {
        const connected = await checkHealth();
        if (!connected) return;

        try {
            const res = await fetch(API_ADMIN_STATUS);
            if (!res.ok) throw new Error();
            const data = await res.json();

            modelLoadedVal.textContent = data.model_loaded ? 'Ready (PyTorch)' : 'Random Weights';
            modelLoadedVal.className = 'stat-value ' + (data.model_loaded ? 'text-green' : 'text-yellow');
            
            activeUsersVal.textContent = data.active_users;
            totalEventsVal.textContent = data.total_events;
            
            const sizeKB = (data.model_size_bytes / 1024).toFixed(1);
            weightSizeVal.textContent = data.model_size_bytes > 0 ? `${sizeKB} KB` : 'N/A';

            cfgEmbedding.textContent = data.settings.embedding_dim;
            cfgHidden.textContent = data.settings.hidden_dim;
            cfgLayers.textContent = data.settings.num_layers;
            cfgSeqLen.textContent = data.settings.max_seq_length;
            cfgModified.textContent = data.model_last_modified;
        } catch (err) {
            logToConsole('Failed to retrieve model telemetry status.', 'ERROR');
        }
    }

    async function fetchPredictions() {
        if (!activeUser) return;
        try {
            const res = await fetch(`${API_PREDICT}/${activeUser}`);
            if (!res.ok) {
                if (res.status === 404) {
                    renderEmptyPredictions();
                    renderEmptyTimeline();
                }
                return;
            }
            const data = await res.json();
            await renderTimeline(activeUser);
            renderPredictions(data.predictions);
        } catch (err) {
            logToConsole(`Failed fetching predictions for ${activeUser}`, 'ERROR');
        }
    }

    async function renderTimeline(userId) {
        try {
            const res = await fetch(`/api/v1/history/${userId}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            const history = data.history || [];
            
            if (history.length === 0) {
                renderEmptyTimeline();
                return;
            }

            emptyTimelinePlaceholder.style.display = 'none';
            sequenceTimeline.innerHTML = '';
            
            history.forEach((action, idx) => {
                const visuals = getActionVisuals(action);
                const node = document.createElement('div');
                node.className = `timeline-node action-${action}`;
                node.innerHTML = `<i class="fa-solid ${visuals.icon} ${visuals.color}"></i> <span>${action}</span>`;
                sequenceTimeline.appendChild(node);
                
                if (idx < history.length - 1) {
                    const arrow = document.createElement('div');
                    arrow.className = 'timeline-arrow';
                    arrow.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
                    sequenceTimeline.appendChild(arrow);
                }
            });
            sequenceTimeline.scrollLeft = sequenceTimeline.scrollWidth;
        } catch (err) {
            renderEmptyTimeline();
        }
    }

    function renderPredictions(predictions) {
        if (!predictions || predictions.length === 0) {
            renderEmptyPredictions();
            return;
        }

        emptyPredictionsPlaceholder.style.display = 'none';
        predictionsList.innerHTML = '';
        predictionsList.style.display = 'flex';

        predictions.forEach(item => {
            const probPct = (item.probability * 100).toFixed(1);
            const visuals = getActionVisuals(item.predicted_action);
            
            const predEl = document.createElement('div');
            predEl.className = 'prediction-item';
            predEl.innerHTML = `
                <div class="prediction-meta">
                    <span class="prediction-name">
                        <i class="fa-solid ${visuals.icon} ${visuals.color}"></i> ${item.predicted_action}
                    </span>
                    <span class="prediction-percent">${probPct}%</span>
                </div>
                <div class="prediction-bar-track">
                    <div class="prediction-bar-fill" style="width: 0%"></div>
                </div>
            `;
            predictionsList.appendChild(predEl);
            setTimeout(() => {
                const fill = predEl.querySelector('.prediction-bar-fill');
                if (fill) fill.style.width = `${probPct}%`;
            }, 50);
        });
    }

    function renderEmptyPredictions() {
        emptyPredictionsPlaceholder.style.display = 'flex';
        predictionsList.style.display = 'none';
        predictionsList.innerHTML = '';
    }

    function renderEmptyTimeline() {
        emptyTimelinePlaceholder.style.display = 'flex';
        sequenceTimeline.innerHTML = '';
        sequenceTimeline.appendChild(emptyTimelinePlaceholder);
    }

    btnSimulate.addEventListener('click', async () => {
        btnSimulate.disabled = true;
        btnSimulate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Simulating...';
        logToConsole(`Batch simulating mock sequences for domain '${currentDomain}'...`);
        
        try {
            const res = await fetch(`${API_ADMIN_SIMULATE}?domain=${currentDomain}`, { method: 'POST' });
            const data = await res.json();
            logToConsole(data.message, 'SUCCESS');
            
            const config = DOMAINS_CONFIG[currentDomain];
            const usersSet = knownUsersByDomain[currentDomain];
            config.users.forEach(user => usersSet.add(user));

            userSelector.innerHTML = '';
            usersSet.forEach(user => {
                const opt = document.createElement('option');
                opt.value = user;
                opt.textContent = `${user} (${config.name})`;
                userSelector.appendChild(opt);
            });

            activeUser = config.users[0];
            userSelector.value = activeUser;

            await loadTelemetry();
            await fetchPredictions();
        } catch (err) {
            logToConsole('Batch simulation pipeline execution failed.', 'ERROR');
        } finally {
            btnSimulate.disabled = false;
            btnSimulate.innerHTML = '<i class="fa-solid fa-database"></i> Batch Simulate Profiles';
        }
    });

    btnTrain.addEventListener('click', async () => {
        btnTrain.disabled = true;
        btnTrain.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Training RNN...';
        logToConsole('Training recurrent network on active sequence data...');

        try {
            const res = await fetch(API_ADMIN_TRAIN, { method: 'POST' });
            const data = await res.json();

            if (data.status === 'success') {
                logToConsole(data.message, 'SUCCESS');
                if (data.logs) {
                    consoleOutput.textContent += `\n\n=== PyTorch Training Cycles ===\n${data.logs.trim()}\n======================\n`;
                    consoleOutput.scrollTop = consoleOutput.scrollHeight;
                }
                await loadTelemetry();
                await fetchPredictions();
            } else {
                logToConsole(data.message, 'WARNING');
            }
        } catch (err) {
            logToConsole('LSTM network optimization cycle failed.', 'ERROR');
        } finally {
            btnTrain.disabled = false;
            btnTrain.innerHTML = '<i class="fa-solid fa-dumbbell"></i> Fit LSTM Model';
        }
    });

    async function ingestEvent(eventType) {
        if (!activeUser) return;
        try {
            const payload = {
                user_id: activeUser,
                event_type: eventType,
                timestamp: new Date().toISOString()
            };
            const res = await fetch(API_INGEST, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.status === 'success') {
                emptyFeedPlaceholder.style.display = 'none';
                const item = document.createElement('li');
                item.className = 'stream-item';
                const now = new Date().toLocaleTimeString();
                const visuals = getActionVisuals(eventType);

                item.innerHTML = `
                    <span>User <b class="select-all">${activeUser}</b> triggered <span class="stream-item-tag"><i class="fa-solid ${visuals.icon} ${visuals.color}"></i> ${eventType}</span></span>
                    <span class="stream-item-time">${now}</span>
                `;
                streamFeedList.appendChild(item);
                while (streamFeedList.children.length > 15) {
                    streamFeedList.removeChild(streamFeedList.firstChild);
                }
                streamFeedWrapper.scrollTop = streamFeedWrapper.scrollHeight;

                await loadTelemetry();
                await fetchPredictions();
            }
        } catch (err) {
            logToConsole(`Failed to ingest event: ${eventType}`, 'ERROR');
        }
    }

    customEventForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const action = customActionInput.value.trim().toLowerCase().replace(/\s+/g, '_');
        if (action) {
            ingestEvent(action);
            customActionInput.value = '';
        }
    });

    domainBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const domain = btn.getAttribute('data-domain');
            if (domain) {
                selectDomain(domain);
                fetchPredictions();
            }
        });
    });

    userSelector.addEventListener('change', (e) => {
        activeUser = e.target.value;
        logToConsole(`Switched focus user: ${activeUser}`);
        fetchPredictions();
    });

    btnNewUser.addEventListener('click', () => {
        const config = DOMAINS_CONFIG[currentDomain];
        const randId = `${config.prefix}_` + Math.floor(100 + Math.random() * 900);
        const usersSet = knownUsersByDomain[currentDomain];
        usersSet.add(randId);
        
        const opt = document.createElement('option');
        opt.value = randId;
        opt.textContent = `${randId} (${config.name})`;
        userSelector.appendChild(opt);
        
        userSelector.value = randId;
        activeUser = randId;
        logToConsole(`Registered new behavioral node: ${randId}`);
        fetchPredictions();
    });

    btnForcePredict.addEventListener('click', async () => {
        await fetchPredictions();
        logToConsole(`Recalculated predictions for user: ${activeUser}`);
    });


    // =============================================================
    // INITIAL SYSTEM STARTUP
    // =============================================================
    initParticles();
    
    // Load Academy Classroom view as start view
    loadClassroomDashboard();
    
    // Init backward compatible developer presets
    selectDomain('saas');
    loadTelemetry();
    fetchPredictions();
});
