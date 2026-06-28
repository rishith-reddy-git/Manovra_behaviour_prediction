document.addEventListener('DOMContentLoaded', () => {
    // API endpoints
    const API_STATUS = '/health';
    const API_INGEST = '/api/v1/ingest';
    const API_PREDICT = '/api/v1/predict';
    const API_ADMIN_STATUS = '/api/v1/admin/status';
    const API_ADMIN_SIMULATE = '/api/v1/admin/simulate';
    const API_ADMIN_TRAIN = '/api/v1/admin/train';

    // State Variables
    let activeUser = 'test_user_1';
    const knownUsers = new Set(['test_user_1', 'shopper_alice', 'browser_bob', 'supporter_charlie']);

    // DOM Elements
    const apiStatusPill = document.getElementById('api-status-pill');
    const apiStatusText = document.getElementById('api-status-text');
    const btnRefreshStatus = document.getElementById('btn-refresh-status');

    // Telemetry Elements
    const modelLoadedVal = document.getElementById('model-loaded-val');
    const activeUsersVal = document.getElementById('active-users-val');
    const totalEventsVal = document.getElementById('total-events-val');
    const weightSizeVal = document.getElementById('weight-size-val');
    
    const cfgEmbedding = document.getElementById('cfg-embedding');
    const cfgHidden = document.getElementById('cfg-hidden');
    const cfgLayers = document.getElementById('cfg-layers');
    const cfgSeqLen = document.getElementById('cfg-seq-len');
    const cfgModified = document.getElementById('cfg-modified');

    // Admin Operations Elements
    const btnSimulate = document.getElementById('btn-simulate');
    const btnTrain = document.getElementById('btn-train');
    const consoleOutput = document.getElementById('console-output');
    const btnClearConsole = document.getElementById('btn-clear-console');

    // Sandbox Controls Elements
    const userSelector = document.getElementById('user-selector');
    const btnNewUser = document.getElementById('btn-new-user');
    const presetBtns = document.querySelectorAll('.btn-preset');
    const customEventForm = document.getElementById('custom-event-form');
    const customActionInput = document.getElementById('custom-action-input');
    const streamFeedWrapper = document.getElementById('stream-feed-wrapper');
    const emptyFeedPlaceholder = document.getElementById('empty-feed-placeholder');
    const streamFeedList = document.getElementById('stream-feed-list');

    // Timeline / Prediction Elements
    const sequenceTimeline = document.getElementById('sequence-timeline');
    const emptyTimelinePlaceholder = document.getElementById('empty-timeline-placeholder');
    const btnForcePredict = document.getElementById('btn-force-predict');
    const predictionsWrapper = document.getElementById('predictions-wrapper');
    const emptyPredictionsPlaceholder = document.getElementById('empty-predictions-placeholder');
    const predictionsList = document.getElementById('predictions-list');

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
        });
    });

    // Helper: Write to console log

    function logToConsole(message, type = 'INFO') {
        const time = new Date().toLocaleTimeString();
        consoleOutput.textContent += `\n[${time}] ${type}: ${message}`;
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    // 1. Check API Connection & Load Telemetry
    async function checkHealth() {
        try {
            const res = await fetch(API_STATUS);
            if (res.ok) {
                apiStatusPill.className = 'status-pill status-online';
                apiStatusText.textContent = 'API Connection Active';
                return true;
            } else {
                throw new Error('Bad Status');
            }
        } catch (err) {
            apiStatusPill.className = 'status-pill status-offline';
            apiStatusText.textContent = 'API Connection Offline';
            logToConsole('Connection to server failed. Verify uvicorn is running.', 'ERROR');
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

            // Populate text elements
            modelLoadedVal.textContent = data.model_loaded ? 'Loaded' : 'Random Init';
            modelLoadedVal.className = 'stat-value ' + (data.model_loaded ? 'text-green' : 'text-yellow');
            
            activeUsersVal.textContent = data.active_users;
            totalEventsVal.textContent = data.total_events;
            
            const sizeKB = (data.model_size_bytes / 1024).toFixed(1);
            weightSizeVal.textContent = data.model_size_bytes > 0 ? `${sizeKB} KB` : 'N/A';

            // Populate table values
            cfgEmbedding.textContent = data.settings.embedding_dim;
            cfgHidden.textContent = data.settings.hidden_dim;
            cfgLayers.textContent = data.settings.num_layers;
            cfgSeqLen.textContent = data.settings.max_seq_length;
            cfgModified.textContent = data.model_last_modified;

            logToConsole('Telemetry and settings refreshed.');
        } catch (err) {
            logToConsole('Failed to retrieve model telemetry status.', 'ERROR');
        }
    }

    // 2. Load User Predictions & History Sequence
    async function fetchPredictions() {
        if (!activeUser) return;
        
        try {
            const res = await fetch(`${API_PREDICT}/${activeUser}`);
            if (!res.ok) {
                // Usually 404 because user has no history
                if (res.status === 404) {
                    renderEmptyPredictions();
                    renderEmptyTimeline();
                }
                return;
            }
            const data = await res.json();
            
            renderTimeline(activeUser, data.history_length);
            renderPredictions(data.predictions);
        } catch (err) {
            logToConsole(`Failed fetching predictions for ${activeUser}`, 'ERROR');
        }
    }

    // Helper: Fetch history directly or deduce it
    async function renderTimeline(userId, length) {
        // Since prediction route only returns length and user, we can fetch history if we had an endpoint.
        // Wait, does the API store history? Yes, in `user_histories` in memory.
        // However, we don't have a direct GET history endpoint in the original routes.
        // But we can trigger a GET prediction, and since we ingested the action in the client,
        // we can maintain the visual history sequence locally, OR we can query the backend.
        // Wait! Let's check: does predict endpoint return the history? No, only history_length.
        // Oh, let's add a quick endpoint to GET user history! 
        // Wait, if we can add a route `/api/v1/history/{user_id}` or similar in `main.py` or `predict.py`,
        // it makes rendering the timeline 100% correct and synced with the server!
        // Let's verify: yes, we can fetch it. If we don't have it, we can just maintain a local dictionary
        // of sequences in `app.js` that mirrors what we sent, plus we seed it on simulate.
        // To keep the backend code robust and fully integrated, let's create a quick API router for history,
        // OR we can just add a route `/api/v1/history/{user_id}` in `api/routes/predict.py`.
        // Let's write code that fetches history if available, or falls back to local tracking.
        // Wait! We can easily add a `/history/{user_id}` route to `predict.py` since it's so simple:
        // @router.get("/history/{user_id}")
        // def get_history(user_id: str): return {"user_id": user_id, "history": user_histories.get(user_id, [])}
        // Let's modify `api/routes/predict.py` to add this route! It is extremely clean and ensures high fidelity!
        // For now, let's write the JS to query `/api/v1/history/${userId}`.
        
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
                const node = document.createElement('div');
                node.className = `timeline-node action-${action}`;
                node.textContent = action;
                sequenceTimeline.appendChild(node);
                
                if (idx < history.length - 1) {
                    const arrow = document.createElement('div');
                    arrow.className = 'timeline-arrow';
                    arrow.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
                    sequenceTimeline.appendChild(arrow);
                }
            });
            
            // Auto scroll timeline to end
            sequenceTimeline.scrollLeft = sequenceTimeline.scrollWidth;
        } catch (err) {
            // Fallback: if route doesn't exist, show generic indicator
            emptyTimelinePlaceholder.style.display = 'none';
            sequenceTimeline.innerHTML = `<div class="timeline-node">Session length: ${length} events</div>`;
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
            
            const predEl = document.createElement('div');
            predEl.className = 'prediction-item';
            predEl.innerHTML = `
                <div class="prediction-meta">
                    <span class="prediction-name">
                        <i class="fa-solid fa-bolt"></i> ${item.predicted_action}
                    </span>
                    <span class="prediction-percent">${probPct}%</span>
                </div>
                <div class="prediction-bar-track">
                    <div class="prediction-bar-fill" style="width: 0%"></div>
                </div>
            `;
            predictionsList.appendChild(predEl);
            
            // Trigger animation in next frame
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

    // 3. Operations Handlers (Simulate & Train)
    btnSimulate.addEventListener('click', async () => {
        btnSimulate.disabled = true;
        btnSimulate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Seeding...';
        
        try {
            const res = await fetch(API_ADMIN_SIMULATE, { method: 'POST' });
            const data = await res.json();
            
            logToConsole(data.message, 'SUCCESS');
            
            // Add simulated users to the select if not exists
            const simulatedUsers = ['shopper_alice', 'browser_bob', 'supporter_charlie', 'shopper_david', 'browser_emily'];
            simulatedUsers.forEach(user => {
                if (!knownUsers.has(user)) {
                    knownUsers.add(user);
                    const opt = document.createElement('option');
                    opt.value = user;
                    opt.textContent = `${user} (Simulated)`;
                    userSelector.appendChild(opt);
                }
            });

            // Update UI
            await loadTelemetry();
            
            // Set Alice as active simulated user to show immediate data
            userSelector.value = 'shopper_alice';
            activeUser = 'shopper_alice';
            await fetchPredictions();
        } catch (err) {
            logToConsole('Batch simulation failed.', 'ERROR');
        } finally {
            btnSimulate.disabled = false;
            btnSimulate.innerHTML = '<i class="fa-solid fa-database"></i> Batch Simulate';
        }
    });

    btnTrain.addEventListener('click', async () => {
        btnTrain.disabled = true;
        btnTrain.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Training...';
        logToConsole('Training started on current user histories...');

        try {
            const res = await fetch(API_ADMIN_TRAIN, { method: 'POST' });
            const data = await res.json();

            if (data.status === 'success') {
                logToConsole(data.message, 'SUCCESS');
                if (data.logs) {
                    consoleOutput.textContent += `\n\n=== TRAINING LOGS ===\n${data.logs.trim()}\n======================\n`;
                    consoleOutput.scrollTop = consoleOutput.scrollHeight;
                }
                await loadTelemetry();
                await fetchPredictions();
            } else {
                logToConsole(data.message, 'WARNING');
            }
        } catch (err) {
            logToConsole('Model training execution failed.', 'ERROR');
        } finally {
            btnTrain.disabled = false;
            btnTrain.innerHTML = '<i class="fa-solid fa-dumbbell"></i> Train Model';
        }
    });

    // 4. Ingest Event Handlers
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
                // Add to visual stream list
                emptyFeedPlaceholder.style.display = 'none';
                const item = document.createElement('li');
                item.className = 'stream-item';
                
                const now = new Date().toLocaleTimeString();
                item.innerHTML = `
                    <span>User <b class="select-all">${activeUser}</b> triggered <span class="stream-item-tag">${eventType}</span></span>
                    <span class="stream-item-time">${now}</span>
                `;
                streamFeedList.appendChild(item);
                
                // Keep only latest 15 elements in UI log
                while (streamFeedList.children.length > 15) {
                    streamFeedList.removeChild(streamFeedList.firstChild);
                }
                
                // Scroll log wrapper to bottom
                streamFeedWrapper.scrollTop = streamFeedWrapper.scrollHeight;

                // Update UI: history stats, predictions
                await loadTelemetry();
                await fetchPredictions();
            }
        } catch (err) {
            logToConsole(`Failed to ingest event: ${eventType}`, 'ERROR');
        }
    }

    // Ingest via preset buttons
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('data-action');
            if (action) ingestEvent(action);
        });
    });

    // Ingest custom event
    customEventForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const action = customActionInput.value.trim();
        if (action) {
            ingestEvent(action);
            customActionInput.value = '';
        }
    });

    // 5. Interface Interactions (User selection, console clearing, refresh)
    userSelector.addEventListener('change', (e) => {
        activeUser = e.target.value;
        logToConsole(`Target user switched to: ${activeUser}`);
        fetchPredictions();
    });

    btnNewUser.addEventListener('click', () => {
        const randId = 'user_' + Math.floor(1000 + Math.random() * 9000);
        knownUsers.add(randId);
        
        const opt = document.createElement('option');
        opt.value = randId;
        opt.textContent = randId;
        userSelector.appendChild(opt);
        
        userSelector.value = randId;
        activeUser = randId;
        logToConsole(`Created new temporary user profile: ${randId}`);
        fetchPredictions();
    });

    btnClearConsole.addEventListener('click', () => {
        consoleOutput.textContent = 'SYSTEM: Console cleared.';
    });

    btnRefreshStatus.addEventListener('click', loadTelemetry);
    btnForcePredict.addEventListener('click', fetchPredictions);

    // Initial load
    loadTelemetry();
    fetchPredictions();
});
