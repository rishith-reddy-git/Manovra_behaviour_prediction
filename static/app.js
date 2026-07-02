document.addEventListener('DOMContentLoaded', () => {
    // API endpoints (Academy Portal)
    const API_STUDENTS_LIST = '/api/v1/student/list';
    const API_STUDENT_PROFILE = '/api/v1/student/profile';
    const API_STUDENT_EMBEDDINGS = '/api/v1/student/embeddings';
    const API_STUDENT_COHORT = '/api/v1/student/cohort/compare';
    
    // API endpoints (Universal ML Sandbox)
    const API_SANDBOX_PRESET = '/api/v1/student/preset';
    const API_SANDBOX_UPLOAD = '/api/v1/student/upload';
    const API_SANDBOX_TRAIN = '/api/v1/student/train';
    const API_SANDBOX_PREDICT = '/api/v1/student/predict';

    // Chart.js Instances
    let embeddingsScatterChartInstance = null;
    let behaviorRadarChartInstance = null;
    let trajectoryLineChartInstance = null;
    let sandboxLossChartInstance = null;
    let sandboxImportanceChartInstance = null;

    // Current State Variables
    let activeStudentTwin = "101";
    let currentSandboxDataset = null;
    let sandboxSelectedFeatures = [];
    let sandboxSelectedTarget = "";
    let trainedSandboxModelType = "";

    // DOM Elements
    const studentTwinSelect = document.getElementById('student-twin-select');
    const globalStudentRow = document.getElementById('global-student-selector-row');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // -------------------------------------------------------------
    // TAB MANAGER
    // -------------------------------------------------------------
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');

            // Hide global student selector on Universal Predictor tab
            if (tabId === 'tab-universal-predictor') {
                globalStudentRow.classList.add('hide');
            } else {
                globalStudentRow.classList.remove('hide');
            }

            // Refresh tab-specific layouts
            if (tabId === 'tab-classroom') {
                loadClassroomDashboard();
            } else if (tabId === 'tab-digital-twin') {
                loadStudentTwinDashboard();
            }
        });
    });

    // Global selector trigger
    studentTwinSelect.addEventListener('change', (e) => {
        activeStudentTwin = e.target.value;
        const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
        if (activeTab === 'tab-digital-twin') {
            loadStudentTwinDashboard();
        } else if (activeTab === 'tab-coach') {
            resetCoachChat();
        }
    });

    // -------------------------------------------------------------
    // TAB 1: CLASSROOM HUB CONTROLLER
    // -------------------------------------------------------------
    async function loadClassroomDashboard() {
        try {
            // 1. Fetch Students lists
            const res = await fetch(API_STUDENTS_LIST);
            if (!res.ok) throw new Error();
            const students = await res.json();

            const highList = document.getElementById('list-high-achievers');
            const steadyList = document.getElementById('list-average-steady');
            const riskList = document.getElementById('list-vulnerable-burnout');

            highList.innerHTML = "";
            steadyList.innerHTML = "";
            riskList.innerHTML = "";

            students.forEach(s => {
                const li = document.createElement('li');
                li.textContent = `${s.name} (${s.cgpa})`;
                li.addEventListener('click', () => {
                    activeStudentTwin = s.user_id;
                    studentTwinSelect.value = s.user_id;
                    // Switch to profile tab
                    document.querySelector('.tab-btn[data-tab="tab-digital-twin"]').click();
                });

                if (s.cgpa >= 8.8) {
                    highList.appendChild(li);
                } else if (s.cgpa < 7.3) {
                    riskList.appendChild(li);
                } else {
                    steadyList.appendChild(li);
                }
            });

            // Populate Alerts Feed
            const alertsFeed = document.getElementById('alerts-list-feed');
            alertsFeed.innerHTML = "";
            students.forEach(s => {
                let alertItem = document.createElement('li');
                if (s.burnout_risk === 'High') {
                    alertItem.className = 'alert-feed-item critical';
                    alertItem.innerHTML = `
                        <div class="alert-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
                        <div class="alert-info">
                            <h4>Critical Burnout Alert</h4>
                            <p>${s.name} exhibits severe attention drop with stress levels at ${s.stress_probability}%.</p>
                        </div>
                    `;
                    alertsFeed.appendChild(alertItem);
                } else if (s.burnout_risk === 'Medium') {
                    alertItem.className = 'alert-feed-item warning';
                    alertItem.innerHTML = `
                        <div class="alert-icon"><i class="fa-solid fa-circle-exclamation"></i></div>
                        <div class="alert-info">
                            <h4>Moderate Fatigue Warning</h4>
                            <p>${s.name}'s study consistency fluctuated this week. Risk is rising.</p>
                        </div>
                    `;
                    alertsFeed.appendChild(alertItem);
                }
            });

            // 2. Fetch Embeddings Scatter plot
            const embRes = await fetch(API_STUDENT_EMBEDDINGS);
            if (embRes.ok) {
                const embData = await embRes.json();
                renderScatterPlot(embData);
            }

            // 3. Fetch Department Cohort compare
            const cohortRes = await fetch(API_STUDENT_COHORT);
            if (cohortRes.ok) {
                const cohortData = await cohortRes.json();
                populateCohortTable(cohortData.departmental);
            }

        } catch (err) {
            console.error("Classroom loading failed", err);
        }
    }

    function renderScatterPlot(data) {
        const datasets = data.clusters.map(c => {
            return {
                label: c.name,
                data: data.points.filter(p => p.cluster === c.id).map(p => {
                    return { x: p.x, y: p.y, sid: p.user_id, name: p.name, cgpa: p.cgpa, risk: p.burnout_risk };
                }),
                backgroundColor: c.color,
                borderColor: 'rgba(15,23,42,0.1)',
                borderWidth: 1,
                pointRadius: 6,
                pointHoverRadius: 8
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
                    legend: { labels: { color: '#475569', font: { family: 'Plus Jakarta Sans', size: 9 } } },
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
                    x: { grid: { color: 'rgba(15,23,42,0.04)' }, ticks: { color: '#64748b', font: { size: 8 } }, title: { display: true, text: 'Academic Engagement Dimension', color: '#64748b' } },
                    y: { grid: { color: 'rgba(15,23,42,0.04)' }, ticks: { color: '#64748b', font: { size: 8 } }, title: { display: true, text: 'Cognitive Stress Burnout', color: '#64748b' } }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const datasetIndex = elements[0].datasetIndex;
                        const index = elements[0].index;
                        const pt = embeddingsScatterChartInstance.data.datasets[datasetIndex].data[index];
                        
                        activeStudentTwin = pt.sid;
                        studentTwinSelect.value = pt.sid;
                        document.querySelector('.tab-btn[data-tab="tab-digital-twin"]').click();
                    }
                }
            }
        });
    }

    function populateCohortTable(rows) {
        const tbody = document.getElementById('cohort-tbody');
        tbody.innerHTML = rows.map(r => {
            const riskClass = r.burnout_risk_avg === 'High' ? 'text-red' : (r.burnout_risk_avg === 'Medium' ? 'text-orange' : 'text-green');
            return `
                <tr>
                    <td><strong>${r.group}</strong></td>
                    <td>${r.avg_cgpa}</td>
                    <td><span class="${riskClass}" style="font-weight: 700;">${r.burnout_risk_avg}</span></td>
                    <td>${r.participation}%</td>
                </tr>
            `;
        }).join('');
    }

    // Load Classroom on startup
    loadClassroomDashboard();

    // -------------------------------------------------------------
    // TAB 2: DIGITAL TWIN & SIMULATOR
    // -------------------------------------------------------------
    async function loadStudentTwinDashboard() {
        try {
            const res = await fetch(`${API_STUDENT_PROFILE}/${activeStudentTwin}`);
            if (!res.ok) throw new Error();
            const profile = await res.json();

            // Populate text profiles
            document.getElementById('profile-name').textContent = profile.name;
            document.getElementById('profile-id').textContent = `ID: ${profile.user_id} | style: ${profile.learning_style}`;
            document.getElementById('val-focus').textContent = profile.attention_trend;
            document.getElementById('val-motivation').textContent = profile.motivation + '%';
            document.getElementById('val-cgpa').textContent = profile.cgpa;

            // Render personality bars
            const barsContainer = document.getElementById('profile-personality-bars');
            barsContainer.innerHTML = Object.entries(profile.personality_traits).map(([trait, val]) => {
                return `
                    <div class="trait-bar-item">
                        <div class="trait-meta">
                            <span>${trait}</span>
                            <strong>${val}%</strong>
                        </div>
                        <div class="trait-track">
                            <div class="trait-fill" style="width: ${val}%;"></div>
                        </div>
                    </div>
                `;
            }).join('');

            // Render Gamification XP / Badges
            document.getElementById('profile-game-level').textContent = profile.gamification.level;
            document.getElementById('profile-game-streak').textContent = profile.gamification.learning_streak + 'd';
            document.getElementById('profile-game-xp').textContent = profile.gamification.xp_points;

            const badgeFlex = document.getElementById('profile-game-badges');
            badgeFlex.innerHTML = profile.gamification.badges.map(b => `<span class="badge-item"><i class="fa-solid fa-medal"></i> ${b}</span>`).join('');

            // Render spider and trajectory line charts
            renderRadarFootprint(profile.personality_traits);
            renderTrajectoryForecast(profile.trajectory_history);

            // Reset sliders to 0
            document.getElementById('sim-slider-attendance').value = 0;
            document.getElementById('sim-slider-assignment').value = 0;
            document.getElementById('sim-slider-engagement').value = 0;
            updateSliderValuesUI();

            // Fetch default intervention
            const activeAction = document.getElementById('intervention-select').value;
            fetchInterventionRecommendations(activeAction);

            // Fetch GenAI insights
            fetchGenAIInsights();

        } catch (err) {
            console.error("Twin loading failed", err);
        }
    }

    function renderRadarFootprint(traits) {
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
                    data: data,
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    borderColor: 'rgba(99, 102, 241, 0.85)',
                    borderWidth: 1.5,
                    pointBackgroundColor: '#6366f1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        grid: { color: 'rgba(15, 23, 42, 0.05)' },
                        angleLines: { color: 'rgba(15, 23, 42, 0.05)' },
                        pointLabels: { color: '#475569', font: { family: 'Plus Jakarta Sans', size: 9 } },
                        ticks: { display: false },
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    }

    function renderTrajectoryForecast(history) {
        const labels = history.map(h => `Day ${h.day}`);
        const focus = history.map(h => h.focus);
        const stress = history.map(h => h.stress);
        const consistency = history.map(h => h.consistency);

        if (trajectoryLineChartInstance) {
            trajectoryLineChartInstance.destroy();
        }

        const ctx = document.getElementById('trajectoryLineChart').getContext('2d');
        trajectoryLineChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Attention Focus', data: focus, borderColor: '#6366f1', fill: false, borderWidth: 1.5, pointRadius: 0 },
                    { label: 'Stress Levels', data: stress, borderColor: '#ef4444', fill: false, borderWidth: 1.5, pointRadius: 0 },
                    { label: 'Study Consistency', data: consistency, borderColor: '#10b981', fill: false, borderWidth: 1.5, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#475569', font: { family: 'Plus Jakarta Sans', size: 8 } } }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 8 } } },
                    y: { grid: { color: 'rgba(15,23,42,0.04)' }, ticks: { color: '#64748b', font: { size: 8 } }, min: 0, max: 100 }
                }
            }
        });
    }

    // -------------------------------------------------------------
    // FUTURE SIMULATOR SCENARIO CONTROLLER
    // -------------------------------------------------------------
    const simAtt = document.getElementById('sim-slider-attendance');
    const simAsg = document.getElementById('sim-slider-assignment');
    const simEng = document.getElementById('sim-slider-engagement');

    function updateSliderValuesUI() {
        document.getElementById('sim-val-attendance').textContent = (simAtt.value > 0 ? '+' : '') + simAtt.value + '%';
        document.getElementById('sim-val-assignment').textContent = (simAsg.value > 0 ? '+' : '') + simAsg.value + '%';
        document.getElementById('sim-val-engagement').textContent = (simEng.value > 0 ? '+' : '') + simEng.value + '%';
    }

    async function executeSimulationQuery() {
        updateSliderValuesUI();
        try {
            const res = await fetch(`${API_STUDENT_PROFILE}/${activeStudentTwin}/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attendance_change: parseFloat(simAtt.value),
                    assignment_change: parseFloat(simAsg.value),
                    engagement_change: parseFloat(simEng.value)
                })
            });
            if (!res.ok) throw new Error();
            const data = await res.json();

            // Populate forecast outputs
            document.getElementById('sim-out-cgpa').textContent = data.simulated_cgpa;
            document.getElementById('sim-out-dropout').textContent = data.dropout_risk_pct + '%';
            document.getElementById('sim-out-recovery').textContent = data.recovery_chance_pct + '%';

        } catch (err) {
            console.error("Simulation failed", err);
        }
    }

    [simAtt, simAsg, simEng].forEach(slider => {
        slider.addEventListener('input', executeSimulationQuery);
    });

    // -------------------------------------------------------------
    // INTERVENTIONS AND INSIGHTS
    // -------------------------------------------------------------
    const interSelect = document.getElementById('intervention-select');
    interSelect.addEventListener('change', (e) => {
        fetchInterventionRecommendations(e.target.value);
    });

    async function fetchInterventionRecommendations(action) {
        try {
            const res = await fetch(`${API_STUDENT_PROFILE}/${activeStudentTwin}/intervention`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: action })
            });
            if (!res.ok) throw new Error();
            const data = await res.json();

            document.getElementById('rec-title').textContent = data.title;
            document.getElementById('rec-chance').textContent = data.recovery_chance + '%';
            document.getElementById('rec-cgpa').textContent = data.cgpa_impact;
            document.getElementById('rec-stress').textContent = data.stress_impact;
            document.getElementById('rec-reason').textContent = data.reason;

        } catch (err) {
            console.error("Failed to fetch interventions", err);
        }
    }

    async function fetchGenAIInsights() {
        const insightsBox = document.getElementById('genai-insights-box');
        insightsBox.textContent = "Analyzing behavior profiles...";
        try {
            const res = await fetch(`${API_STUDENT_PROFILE}/${activeStudentTwin}/insights`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            insightsBox.textContent = data.insight;
        } catch (err) {
            insightsBox.textContent = "Failed to load explanation models.";
        }
    }

    // -------------------------------------------------------------
    // TAB 3: MULTI-AGENT COACH CHATROOM
    // -------------------------------------------------------------
    const chatInput = document.getElementById('chat-user-input');
    const chatBtn = document.getElementById('btn-send-message');
    const chatMessages = document.getElementById('chat-messages-container');

    function resetCoachChat() {
        chatMessages.innerHTML = `
            <div class="chat-message bot">
                <div class="chat-avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="chat-text">Hi, I'm the classroom behavior coach. Let's look into your twin profile logs together. How can I assist you?</div>
            </div>
        `;
    }
    resetCoachChat();

    chatBtn.addEventListener('click', sendMessageToCoach);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessageToCoach();
    });

    async function sendMessageToCoach() {
        const msgText = chatInput.value.trim();
        if (!msgText) return;

        // User message bubble
        appendChatBubble(msgText, 'user');
        chatInput.value = "";

        // Simulated loader
        const loadingBubble = appendChatBubble('<i class="fa-solid fa-spinner fa-spin"></i> Reasoning...', 'bot');

        try {
            const res = await fetch(`${API_STUDENT_PROFILE}/${activeStudentTwin}/coach`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msgText })
            });
            if (!res.ok) throw new Error();
            const data = await res.json();

            // Remove loading bubble
            loadingBubble.remove();

            // Bot response bubble
            appendChatBubble(data.chatbot_response, 'bot');

            // Trigger Agent trace sequentially
            runAgentTraceSequential(data.agents);

        } catch (err) {
            loadingBubble.remove();
            appendChatBubble("Error communicating with Multi-Agent Pipeline.", 'bot');
        }
    }

    function appendChatBubble(text, sender) {
        const div = document.createElement('div');
        div.className = `chat-message ${sender}`;
        const icon = sender === 'bot' ? 'fa-robot' : 'fa-user';
        div.innerHTML = `
            <div class="chat-avatar"><i class="fa-solid ${icon}"></i></div>
            <div class="chat-text">${text}</div>
        `;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return div;
    }

    function runAgentTraceSequential(agents) {
        const agentKeys = ['analyst', 'predictor', 'alert', 'explainer', 'mentor'];
        
        // Hide all logs first
        document.querySelectorAll('.agent-thought-card').forEach(card => card.classList.add('hide'));
        document.querySelectorAll('.agent-node').forEach(node => node.classList.remove('active'));

        agentKeys.forEach((ag, i) => {
            setTimeout(() => {
                // Highlight Node
                document.querySelectorAll('.agent-node').forEach(node => node.classList.remove('active'));
                const activeNode = document.querySelector(`.agent-node[data-agent="${ag}"]`);
                if (activeNode) activeNode.classList.add('active');

                // Print text in card log
                document.getElementById(`thought-val-${ag}`).textContent = agents[ag] || "Completed evaluation.";

                // Reveal thought card
                const thoughtCard = document.getElementById(`agent-thought-${ag}`);
                thoughtCard.classList.remove('hide');
                thoughtCard.classList.add('highlight');
                setTimeout(() => thoughtCard.classList.remove('highlight'), 800);
            }, i * 600);
        });
    }

    // Node click handlers
    document.querySelectorAll('.agent-node').forEach(node => {
        node.addEventListener('click', () => {
            const ag = node.getAttribute('data-agent');
            document.querySelectorAll('.agent-thought-card').forEach(c => c.classList.add('hide'));
            document.getElementById(`agent-thought-${ag}`).classList.remove('hide');
        });
    });

    // -------------------------------------------------------------
    // TAB 4: UNIVERSAL PREDICTOR CONTROLLER
    // -------------------------------------------------------------
    const sDatasetSelect = document.getElementById('sandbox-dataset-select');
    const sUploadGroup = document.getElementById('sandbox-upload-group');
    const sFileInput = document.getElementById('sandbox-dataset-file');
    const sStatsSummary = document.getElementById('sandbox-stats-summary');
    const sTotalRows = document.getElementById('sandbox-total-rows');
    const sColsCount = document.getElementById('sandbox-cols-count');
    const sPreviewEmpty = document.getElementById('sandbox-preview-empty');
    const sPreviewTable = document.getElementById('sandbox-preview-table');
    const sPreviewThead = document.getElementById('sandbox-preview-thead');
    const sPreviewTbody = document.getElementById('sandbox-preview-tbody');

    const sEpochs = document.getElementById('sandbox-epochs');
    const sLr = document.getElementById('sandbox-lr');
    const sTargetSelect = document.getElementById('sandbox-target-select');
    const sFeaturesCheckboxes = document.getElementById('sandbox-features-checkboxes');
    const sTrainForm = document.getElementById('sandbox-config-form');
    const btnSandboxTrain = document.getElementById('btn-sandbox-train');
    const sTelemetryConsole = document.getElementById('sandbox-telemetry-console');

    const sInferenceLocked = document.getElementById('sandbox-inference-locked-msg');
    const sInferenceFormContainer = document.getElementById('sandbox-inference-form-container');
    const sInferenceForm = document.getElementById('sandbox-inference-form');
    const sDynamicFields = document.getElementById('sandbox-dynamic-fields');
    const sPredictResults = document.getElementById('sandbox-predict-results');
    const sPredictBars = document.getElementById('sandbox-predict-bars');
    const btnSandboxPredict = document.getElementById('btn-sandbox-predict');

    // Slider display listeners
    sEpochs.addEventListener('input', (e) => {
        document.getElementById('sandbox-epochs-val').textContent = e.target.value;
    });
    sLr.addEventListener('input', (e) => {
        const val = (parseFloat(e.target.value) / 10000).toFixed(4);
        document.getElementById('sandbox-lr-val').textContent = val;
    });

    // Preset data preview tables
    const presetDataPreview = {
        students: {
            headers: ["StudentID", "Tenure_Months", "Usage_Frequency", "Support_Tickets", "Monthly_Charge", "Churn_Risk"],
            rows: [
                { CustomerID: "CUST-101", Tenure_Months: 18, Usage_Frequency: 45, Support_Tickets: 1, Monthly_Charge: 64.5, Churn_Risk: "Low" },
                { CustomerID: "CUST-102", Tenure_Months: 3, Usage_Frequency: 8, Support_Tickets: 6, Monthly_Charge: 89.9, Churn_Risk: "High" },
                { CustomerID: "CUST-103", Tenure_Months: 24, Usage_Frequency: 82, Support_Tickets: 2, Monthly_Charge: 99.5, Churn_Risk: "Medium" }
            ]
        }
    };

    function renderSandboxPreview(headers, rows) {
        sPreviewEmpty.classList.add('hide');
        sPreviewTable.classList.remove('hide');
        sPreviewThead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
        sPreviewTbody.innerHTML = rows.map(r => `<tr>${headers.map(h => `<td>${r[h] ?? '--'}</td>`).join('')}</tr>`).join('');
    }

    function setupSandboxSelectors(headers) {
        sTargetSelect.innerHTML = "";
        headers.forEach((h, idx) => {
            const opt = document.createElement('option');
            opt.value = h;
            opt.textContent = h;
            if (idx === headers.length - 1) {
                opt.selected = true;
                sandboxSelectedTarget = h;
            }
            sTargetSelect.appendChild(opt);
        });

        updateSandboxFeaturesList(headers);
    }

    function updateSandboxFeaturesList(headers) {
        sFeaturesCheckboxes.innerHTML = "";
        sandboxSelectedFeatures = [];

        headers.forEach(h => {
            if (h === sandboxSelectedTarget) return;

            const div = document.createElement('div');
            div.className = "checkbox-item";
            div.innerHTML = `
                <input type="checkbox" id="sandfeat-${h}" value="${h}" checked>
                <label for="sandfeat-${h}">${h}</label>
            `;
            sFeaturesCheckboxes.appendChild(div);
            sandboxSelectedFeatures.push(h);

            div.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    sandboxSelectedFeatures.push(e.target.value);
                } else {
                    sandboxSelectedFeatures = sandboxSelectedFeatures.filter(f => f !== e.target.value);
                }
            });
        });
    }

    sTargetSelect.addEventListener('change', (e) => {
        sandboxSelectedTarget = e.target.value;
        if (currentSandboxDataset) {
            updateSandboxFeaturesList(currentSandboxDataset.headers);
        }
    });

    async function loadPresetSandboxDataset() {
        try {
            const res = await fetch(API_SANDBOX_PRESET);
            if (!res.ok) throw new Error();
            const data = await res.json();

            currentSandboxDataset = data;
            sStatsSummary.style.display = "grid";
            sTotalRows.textContent = data.rows_count;
            sColsCount.textContent = data.headers.length;

            renderSandboxPreview(data.headers, data.rows);
            setupSandboxSelectors(data.headers);

            sTelemetryConsole.textContent = "Preset churn dataset ingested successfully. Sandbox target set to '" + sandboxSelectedTarget + "'.";
        } catch (err) {
            sTelemetryConsole.textContent = "Error loading presets dataset.";
        }
    }

    loadPresetSandboxDataset();

    sDatasetSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'custom') {
            sUploadGroup.classList.remove('hide');
            sPreviewEmpty.classList.remove('hide');
            sPreviewTable.classList.add('hide');
            sStatsSummary.style.display = "none";
        } else {
            sUploadGroup.classList.add('hide');
            loadPresetSandboxDataset();
        }
    });

    sFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(evt) {
            try {
                const content = evt.target.result;
                let parsed = [];
                if (file.name.endsWith('.json')) {
                    parsed = JSON.parse(content);
                } else {
                    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
                    const headers = lines[0].split(',').map(h => h.trim());
                    parsed = lines.slice(1).map(l => {
                        const vals = l.split(',').map(v => v.trim());
                        const obj = {};
                        headers.forEach((h, i) => {
                            const val = vals[i];
                            obj[h] = isNaN(val) || val === "" ? val : parseFloat(val);
                        });
                        return obj;
                    });
                }

                sTelemetryConsole.textContent = "Sending custom file elements to API validate engine...";
                const res = await fetch(API_SANDBOX_UPLOAD, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parsed)
                });
                if (!res.ok) throw new Error();
                const data = await res.json();

                currentSandboxDataset = data;
                sStatsSummary.style.display = "grid";
                sTotalRows.textContent = data.rows_count;
                sColsCount.textContent = data.headers.length;

                renderSandboxPreview(data.headers, data.rows);
                setupSandboxSelectors(data.headers);

                sTelemetryConsole.textContent = `File '${file.name}' parsed. Total Rows: ${data.rows_count}. Target set to: ${sandboxSelectedTarget}`;

            } catch (err) {
                sTelemetryConsole.textContent = "Error: Invalid CSV or JSON schema upload rejected.";
            }
        };
        reader.readAsText(file);
    });

    // Train trigger
    sTrainForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (sandboxSelectedFeatures.length === 0) {
            alert("Select at least one feature column (X variable).");
            return;
        }

        const model = document.getElementById('sandbox-model-select').value;
        const optimizer = document.getElementById('sandbox-optimizer-select').value;
        const epochs = parseInt(sEpochs.value);
        const lr = parseFloat(document.getElementById('sandbox-lr-val').textContent);

        btnSandboxTrain.disabled = true;
        btnSandboxTrain.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fitting Parameters...';
        sTelemetryConsole.textContent = `Model initialization:\nAlgorithm: ${model}\nOptimizer: ${optimizer}\nTarget (Y): ${sandboxSelectedTarget}\nFeatures: ${sandboxSelectedFeatures.join(', ')}\n`;

        let ep = 1;
        const loop = setInterval(() => {
            if (ep <= epochs) {
                const lossVal = (0.68 * Math.pow(0.88, ep) + Math.random() * 0.04).toFixed(4);
                sTelemetryConsole.textContent += `Epoch ${ep}/${epochs} - loss: ${lossVal}\n`;
                sTelemetryConsole.scrollTop = sTelemetryConsole.scrollHeight;
                ep++;
            } else {
                clearInterval(loop);
            }
        }, 120);

        try {
            const res = await fetch(API_SANDBOX_TRAIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model_type: model,
                    epochs: epochs,
                    learning_rate: lr,
                    batch_size: 32,
                    optimizer: optimizer,
                    target_column: sandboxSelectedTarget,
                    features: sandboxSelectedFeatures
                })
            });
            if (!res.ok) throw new Error();
            const data = await res.json();

            setTimeout(() => {
                document.getElementById('sandbox-acc').textContent = data.metrics.accuracy + '%';
                document.getElementById('sandbox-f1').textContent = data.metrics.f1_score + '%';
                document.getElementById('sandbox-prec').textContent = data.metrics.precision + '%';
                document.getElementById('sandbox-rec').textContent = data.metrics.recall + '%';

                sTelemetryConsole.textContent += `\nFitting Complete in ${data.metrics.training_time_seconds}s.\nAccuracy: ${data.metrics.accuracy}% | F1: ${data.metrics.f1_score}%`;
                sTelemetryConsole.scrollTop = sTelemetryConsole.scrollHeight;

                renderSandboxLossChart(data.loss_history);
                renderSandboxImportanceChart(data.feature_importance);

                trainedSandboxModelType = model;
                unlockSandboxInference();
            }, epochs * 120 + 200);

        } catch (err) {
            sTelemetryConsole.textContent += "\nError: Fitting pipeline aborted.";
        } finally {
            setTimeout(() => {
                btnSandboxTrain.disabled = false;
                btnSandboxTrain.innerHTML = '<i class="fa-solid fa-dumbbell"></i> Run Sandbox Model';
            }, epochs * 120 + 250);
        }
    });

    function renderSandboxLossChart(history) {
        const labels = history.map(h => `Epoch ${h.epoch}`);
        const loss = history.map(h => h.loss);

        if (sandboxLossChartInstance) {
            sandboxLossChartInstance.destroy();
        }

        const ctx = document.getElementById('sandboxLossChart').getContext('2d');
        sandboxLossChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: loss,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.04)',
                    borderWidth: 1.5,
                    fill: true,
                    pointRadius: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 8 } } },
                    y: { grid: { color: 'rgba(15,23,42,0.05)' }, ticks: { color: '#64748b', font: { size: 8 } } }
                }
            }
        });
    }

    function renderSandboxImportanceChart(importance) {
        const labels = importance.map(i => i.feature);
        const values = importance.map(i => i.importance);

        if (sandboxImportanceChartInstance) {
            sandboxImportanceChartInstance.destroy();
        }

        const ctx = document.getElementById('importanceChart').getContext('2d');
        sandboxImportanceChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: 'rgba(99, 102, 241, 0.85)',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#64748b', font: { size: 8 } }, max: 100 },
                    y: { ticks: { color: '#6366f1', font: { size: 8, weight: '700' } } }
                }
            }
        });
    }

    function unlockSandboxInference() {
        sInferenceLocked.classList.add('hide');
        sInferenceFormContainer.classList.remove('hide');
        sPredictResults.classList.add('hide');

        sDynamicFields.innerHTML = "";
        sandboxSelectedFeatures.forEach(feat => {
            const colSchema = currentSandboxDataset.columns.find(c => c.name === feat) || { type: "numerical", min: 0, max: 100 };
            const wrapper = document.createElement('div');
            wrapper.className = "form-group";

            if (colSchema.type === 'numerical') {
                const min = colSchema.min ?? 0;
                const max = colSchema.max ?? 100;
                const mean = colSchema.mean ?? 50;
                wrapper.innerHTML = `
                    <label>${feat}</label>
                    <input type="number" step="any" min="${min}" max="${max}" value="${mean}" name="${feat}" required>
                `;
            } else {
                wrapper.innerHTML = `
                    <label>${feat}</label>
                    <select name="${feat}">
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                    </select>
                `;
            }
            sDynamicFields.appendChild(wrapper);
        });
    }

    sInferenceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputs = {};
        const fd = new FormData(sInferenceForm);
        for (let [k, v] of fd.entries()) {
            inputs[k] = isNaN(v) ? v : parseFloat(v);
        }

        btnSandboxPredict.disabled = true;
        btnSandboxPredict.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Evaluating...';

        try {
            const res = await fetch(API_SANDBOX_PREDICT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model_type: trainedSandboxModelType || 'LSTM',
                    features: inputs
                })
            });
            if (!res.ok) throw new Error();
            const data = await res.json();

            sPredictResults.classList.remove('hide');
            sPredictBars.innerHTML = data.predictions.map((p, idx) => {
                const colors = ['bg-green', 'bg-orange', 'bg-red'];
                const color = colors[idx % colors.length];
                const pct = Math.round(p.probability * 100);
                return `
                    <div class="proj-bar-row">
                        <div class="bar-lbl" style="display:flex; justify-content:space-between; margin-bottom: 0.15rem;">
                            <span>${p.class}</span>
                            <strong>${pct}%</strong>
                        </div>
                        <div class="bar-track">
                            <div class="bar-fill ${color}" style="width: ${pct}%;"></div>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (err) {
            alert("Inference calculation failed.");
        } finally {
            btnSandboxPredict.disabled = false;
            btnSandboxPredict.innerHTML = '<i class="fa-solid fa-bolt"></i> Generate Target Forecast';
        }
    });

});
