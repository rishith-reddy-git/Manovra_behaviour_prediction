document.addEventListener('DOMContentLoaded', () => {
    // API Route endpoints
    const API_PRESET = '/api/v1/student/preset';
    const API_UPLOAD = '/api/v1/student/upload';
    const API_TRAIN = '/api/v1/student/train';
    const API_PREDICT = '/api/v1/student/predict';

    // Chart.js instances
    let lossChartInstance = null;
    let importanceChartInstance = null;

    // Current State Variables
    let currentDataset = null;      // Schema: { headers: [], columns: [], rows_count: 0, rows: [] }
    let selectedFeatures = [];
    let selectedTarget = "";
    let trainedModelType = "";

    // DOM Elements
    const datasetSelect = document.getElementById('dataset-select');
    const uploadGroup = document.getElementById('upload-group');
    const fileInput = document.getElementById('dataset-file');
    const statsSummary = document.getElementById('dataset-stats-summary');
    const statsTotalRows = document.getElementById('stats-total-rows');
    const statsColsCount = document.getElementById('stats-cols-count');
    const previewEmpty = document.getElementById('preview-empty');
    const previewTable = document.getElementById('preview-table');
    const previewThead = document.getElementById('preview-thead');
    const previewTbody = document.getElementById('preview-tbody');

    const trainForm = document.getElementById('train-config-form');
    const modelSelect = document.getElementById('model-select');
    const optimizerSelect = document.getElementById('optimizer-select');
    const epochsSlider = document.getElementById('epochs-slider');
    const lrSlider = document.getElementById('lr-slider');
    const targetSelect = document.getElementById('target-select');
    const featuresCheckboxes = document.getElementById('features-checkboxes');
    const btnTrain = document.getElementById('btn-train-engine');

    const telemetryConsole = document.getElementById('telemetry-console');
    const inferenceCard = document.getElementById('inference-card');
    const inferenceUnlockMsg = document.getElementById('inference-unlocked-message');
    const inferenceFormContainer = document.getElementById('inference-form-container');
    const inferenceForm = document.getElementById('inference-form');
    const dynamicFields = document.getElementById('dynamic-inference-fields');
    const inferenceResults = document.getElementById('inference-results');
    const inferenceBars = document.getElementById('inference-probability-bars');

    // -------------------------------------------------------------
    // SLIDER EVENT LISTENERS
    // -------------------------------------------------------------
    epochsSlider.addEventListener('input', (e) => {
        document.getElementById('epochs-val').textContent = e.target.value;
    });

    lrSlider.addEventListener('input', (e) => {
        const lrVal = (parseFloat(e.target.value) / 10000).toFixed(4);
        document.getElementById('lr-val').textContent = lrVal;
    });

    // -------------------------------------------------------------
    // DATASET MANAGEMENT LOGIC
    // -------------------------------------------------------------
    
    // Renders the data explorer preview table
    function populatePreviewTable(headers, rows) {
        previewEmpty.classList.add('hide');
        previewTable.classList.remove('hide');
        
        // Render headers
        previewThead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
        
        // Render rows
        previewTbody.innerHTML = rows.map(r => {
            return `<tr>${headers.map(h => `<td>${r[h] ?? '--'}</td>`).join('')}</tr>`;
        }).join('');
    }

    // Populates target selection and feature checkbox selectors based on headers
    function setupSelectors(headers, columns) {
        // Clear old list items
        targetSelect.innerHTML = "";
        featuresCheckboxes.innerHTML = "";

        // Fill target selector dropdown Y
        headers.forEach((h, idx) => {
            const opt = document.createElement('option');
            opt.value = h;
            opt.textContent = h;
            // Default select the last header column as Target
            if (idx === headers.length - 1) {
                opt.selected = true;
                selectedTarget = h;
            }
            targetSelect.appendChild(opt);
        });

        // Fill feature checkbox selection list X
        updateFeaturesChecklist(headers);
    }

    function updateFeaturesChecklist(headers) {
        featuresCheckboxes.innerHTML = "";
        selectedFeatures = [];
        
        headers.forEach(h => {
            // Do not list target column as select feature
            if (h === selectedTarget) return;

            const div = document.createElement('div');
            div.className = "checkbox-item";
            div.innerHTML = `
                <input type="checkbox" id="feat-${h}" value="${h}" checked>
                <label for="feat-${h}">${h}</label>
            `;
            featuresCheckboxes.appendChild(div);
            selectedFeatures.push(h);

            // Listen for checkbox shifts
            div.querySelector('input').addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedFeatures.push(e.target.value);
                } else {
                    selectedFeatures = selectedFeatures.filter(f => f !== e.target.value);
                }
            });
        });
    }

    // Handle target variable change event
    targetSelect.addEventListener('change', (e) => {
        selectedTarget = e.target.value;
        if (currentDataset) {
            updateFeaturesChecklist(currentDataset.headers);
        }
    });

    // Ingests preset default enterprise dataset
    async function loadDatasetPreset() {
        try {
            const res = await fetch(API_PRESET);
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            currentDataset = data;
            
            // Set stats summary
            statsSummary.style.display = "grid";
            statsTotalRows.textContent = data.rows_count;
            statsColsCount.textContent = data.headers.length;

            populatePreviewTable(data.headers, data.rows);
            setupSelectors(data.headers, data.columns);
            
            telemetryConsole.textContent = "Preset Customer Churn dataset loaded successfully. Core Y Target set to '" + selectedTarget + "'.";
        } catch (err) {
            console.error("Failed to load preset dataset", err);
            telemetryConsole.textContent = "Error: Failed to fetch preset dataset from API server.";
        }
    }

    // Load preset dataset on initialization
    loadDatasetPreset();

    // Dataset Source Dropdown change handler
    datasetSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'upload') {
            uploadGroup.classList.remove('hide');
            previewEmpty.classList.remove('hide');
            previewTable.classList.add('hide');
            statsSummary.style.display = "none";
            previewEmpty.textContent = "Upload a CSV/JSON file to preview";
        } else {
            uploadGroup.classList.add('hide');
            loadDatasetPreset();
        }
    });

    // File Input change handler (Parses custom JSON or CSV)
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(evt) {
            try {
                const content = evt.target.result;
                let parsedRows = [];

                if (file.name.endsWith('.json')) {
                    const parsed = JSON.parse(content);
                    parsedRows = Array.isArray(parsed) ? parsed : (parsed.rows || parsed.data || []);
                } else {
                    // Simple robust CSV parser
                    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
                    if (lines.length === 0) throw new Error("Empty CSV");
                    
                    const headers = lines[0].split(',').map(h => h.trim());
                    parsedRows = lines.slice(1).map(l => {
                        const vals = l.split(',').map(val => val.trim());
                        const item = {};
                        headers.forEach((h, idx) => {
                            const v = vals[idx];
                            // Parse string float digits back into numbers where applicable
                            if (v !== undefined && v !== "" && !isNaN(v)) {
                                item[h] = parseFloat(v);
                            } else {
                                item[h] = v || null;
                            }
                        });
                        return item;
                    });
                }

                if (parsedRows.length === 0) throw new Error("Dataset contains no parseable rows.");

                // Upload parsed rows to API for validation and statistics profiling
                telemetryConsole.textContent = "Parsing file data frame... Sending to validation server.";
                
                const res = await fetch(API_UPLOAD, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parsedRows)
                });
                
                if (!res.ok) throw new Error("API server rejected dataset format.");
                const data = await res.json();
                
                currentDataset = data;

                // Populate UI summaries
                statsSummary.style.display = "grid";
                statsTotalRows.textContent = data.rows_count;
                statsColsCount.textContent = data.headers.length;

                populatePreviewTable(data.headers, data.rows);
                setupSelectors(data.headers, data.columns);

                telemetryConsole.textContent = `Custom file '${file.name}' ingested. Shape: (${data.rows_count} rows, ${data.headers.length} columns). Target Y variable auto-set to: ${selectedTarget}.`;
            } catch (err) {
                console.error("Custom dataset upload ingestion failed", err);
                previewEmpty.classList.remove('hide');
                previewTable.classList.add('hide');
                statsSummary.style.display = "none";
                previewEmpty.textContent = "Error parsing file. Ensure it is a valid CSV/JSON array.";
                telemetryConsole.textContent = "Upload Error: " + err.message;
            }
        };
        reader.readAsText(file);
    });

    // -------------------------------------------------------------
    // MODEL CONFIG & TRAINING ENGINE
    // -------------------------------------------------------------
    trainForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (selectedFeatures.length === 0) {
            alert("Please select at least one feature column (X variable) to train.");
            return;
        }

        const model = modelSelect.value;
        const optimizer = optimizerSelect.value;
        const epochs = parseInt(epochsSlider.value);
        const lr = parseFloat(document.getElementById('lr-val').textContent);

        btnTrain.disabled = true;
        btnTrain.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fitting Parameters...';
        telemetryConsole.textContent = `Initializing model fit pipeline:\nModel: ${model}\nOptimizer: ${optimizer}\nLearning Rate: ${lr}\nTarget Column (Y): ${selectedTarget}\nFeatures (X): ${selectedFeatures.join(', ')}\n`;

        // Simulate epoch progress log inside console output
        let currentEpoch = 1;
        const interval = setInterval(() => {
            if (currentEpoch <= epochs) {
                const simulatedLoss = (0.78 * Math.pow(0.85, currentEpoch) + Math.random() * 0.05).toFixed(4);
                telemetryConsole.textContent += `Epoch ${currentEpoch}/${epochs} - loss: ${simulatedLoss}\n`;
                telemetryConsole.scrollTop = telemetryConsole.scrollHeight;
                currentEpoch++;
            } else {
                clearInterval(interval);
            }
        }, 100);

        try {
            const trainPayload = {
                model_type: model,
                epochs: epochs,
                learning_rate: lr,
                batch_size: 32,
                optimizer: optimizer,
                target_column: selectedTarget,
                features: selectedFeatures
            };

            const res = await fetch(API_TRAIN, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(trainPayload)
            });

            if (!res.ok) throw new Error();
            const data = await res.json();

            // Wait until progress simulation interval is complete before rendering results
            setTimeout(() => {
                // Populate metrics outputs
                document.getElementById('metrics-acc').textContent = data.metrics.accuracy + '%';
                document.getElementById('metrics-f1').textContent = data.metrics.f1_score + '%';
                document.getElementById('metrics-prec').textContent = data.metrics.precision + '%';
                document.getElementById('metrics-rec').textContent = data.metrics.recall + '%';

                telemetryConsole.textContent += `\nFitting completed successfully in ${data.metrics.training_time_seconds}s.\nFinal Validation Accuracy: ${data.metrics.accuracy}%\nF1-Score: ${data.metrics.f1_score}%`;
                telemetryConsole.scrollTop = telemetryConsole.scrollHeight;

                // Render Charts
                renderLossChart(data.loss_history);
                renderImportanceChart(data.feature_importance);

                // Unlock prediction playground
                trainedModelType = model;
                unlockInferencePlayground();
            }, epochs * 100 + 200);

        } catch (err) {
            console.error("Model fitting failed", err);
            telemetryConsole.textContent += "\nError: Model parameters fitting pipeline execution aborted.";
            btnTrain.disabled = false;
            btnTrain.innerHTML = '<i class="fa-solid fa-dumbbell"></i> Fit Model Parameters';
        } finally {
            setTimeout(() => {
                btnTrain.disabled = false;
                btnTrain.innerHTML = '<i class="fa-solid fa-dumbbell"></i> Fit Model Parameters';
            }, epochs * 100 + 250);
        }
    });

    // -------------------------------------------------------------
    // CHART GENERATORS
    // -------------------------------------------------------------
    function renderLossChart(lossHistory) {
        const labels = lossHistory.map(h => `Epoch ${h.epoch}`);
        const loss = lossHistory.map(h => h.loss);

        if (lossChartInstance) {
            lossChartInstance.destroy();
        }

        const ctx = document.getElementById('lossChart').getContext('2d');
        lossChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Fitting Loss Value',
                    data: loss,
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.04)',
                    borderWidth: 1.75,
                    fill: true,
                    pointRadius: 2,
                    tension: 0.15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 9 } } },
                    y: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 9 } } }
                }
            }
        });
    }

    function renderImportanceChart(importanceList) {
        const labels = importanceList.map(item => item.feature);
        const values = importanceList.map(item => item.importance);

        if (importanceChartInstance) {
            importanceChartInstance.destroy();
        }

        const ctx = document.getElementById('importanceChart').getContext('2d');
        importanceChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Feature Importance Weight',
                    data: values,
                    backgroundColor: 'rgba(79, 70, 229, 0.85)',
                    borderColor: '#4f46e5',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { family: 'Plus Jakarta Sans', size: 9 } }, max: 100 },
                    y: { grid: { display: false }, ticks: { color: '#4f46e5', font: { family: 'Plus Jakarta Sans', size: 9, weight: '700' } } }
                }
            }
        });
    }

    // -------------------------------------------------------------
    // LIVE INFERENCE PLAYGROUND
    // -------------------------------------------------------------
    function unlockInferencePlayground() {
        inferenceUnlockMsg.classList.add('hide');
        inferenceFormContainer.classList.remove('hide');
        inferenceResults.classList.add('hide');

        // Dynamically build the feature inputs based on selected features X
        dynamicFields.innerHTML = "";
        
        selectedFeatures.forEach(feat => {
            const colSchema = currentDataset.columns.find(c => c.name === feat) || { type: "numerical", min: 0, max: 100 };
            
            const fieldWrapper = document.createElement('div');
            fieldWrapper.className = "form-group";
            
            if (colSchema.type === "numerical") {
                const minVal = colSchema.min !== undefined ? colSchema.min : 0;
                const maxVal = colSchema.max !== undefined ? colSchema.max : 100;
                const meanVal = colSchema.mean !== undefined ? colSchema.mean : 50;

                fieldWrapper.innerHTML = `
                    <label>${feat}</label>
                    <input type="number" step="any" min="${minVal}" max="${maxVal}" value="${meanVal}" name="${feat}" required>
                    <span class="text-muted" style="font-size: 0.65rem;">Range: [${minVal} - ${maxVal}]</span>
                `;
            } else {
                // Categorical fallback select field
                // Create clean categories list based on preview rows values or standard binary
                const categories = ["Low", "Medium", "High", "Yes", "No"];
                fieldWrapper.innerHTML = `
                    <label>${feat}</label>
                    <select name="${feat}">
                        ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                    </select>
                `;
            }
            
            dynamicFields.appendChild(fieldWrapper);
        });
    }

    // Inference form submit handler
    inferenceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const inputs = {};
        const formData = new FormData(inferenceForm);
        for (let [key, val] of formData.entries()) {
            // Keep numerical values typed float
            inputs[key] = isNaN(val) ? val : parseFloat(val);
        }

        const btnPredict = document.getElementById('btn-run-inference');
        btnPredict.disabled = true;
        btnPredict.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running Inference...';

        try {
            const res = await fetch(API_PREDICT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model_type: trainedModelType || 'LSTM',
                    features: inputs
                })
            });

            if (!res.ok) throw new Error();
            const data = await res.json();

            // Display inference results probabilities
            inferenceResults.classList.remove('hide');
            inferenceBars.innerHTML = data.predictions.map((p, idx) => {
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

            // Scroll down to predictions view
            inferenceResults.scrollIntoView({ behavior: 'smooth' });

        } catch (err) {
            console.error("Inference prediction call failed", err);
            alert("Inference predictor error. Check input parameters mapping.");
        } finally {
            btnPredict.disabled = false;
            btnPredict.innerHTML = '<i class="fa-solid fa-bolt"></i> Generate Target Forecast';
        }
    });
});
