document.addEventListener('DOMContentLoaded', () => {
    // API endpoints
    const API_STATUS = '/health';
    const API_INGEST = '/api/v1/ingest';
    const API_PREDICT = '/api/v1/predict';
    const API_ADMIN_STATUS = '/api/v1/admin/status';
    const API_ADMIN_SIMULATE = '/api/v1/admin/simulate';
    const API_ADMIN_TRAIN = '/api/v1/admin/train';

    // Domain Configurations
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

    // State Variables
    let currentDomain = 'saas';
    let activeUser = 'dev_alice';
    const knownUsersByDomain = {
        saas: new Set(DOMAINS_CONFIG.saas.users),
        gaming: new Set(DOMAINS_CONFIG.gaming.users),
        media: new Set(DOMAINS_CONFIG.media.users),
        ecommerce: new Set(DOMAINS_CONFIG.ecommerce.users)
    };

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
    const domainBtns = document.querySelectorAll('.domain-btn');
    const userSelector = document.getElementById('user-selector');
    const btnNewUser = document.getElementById('btn-new-user');
    const presetActionsGrid = document.getElementById('preset-actions-grid');
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

    // Helper: Find action icons/colors across all configs for rendering
    function getActionVisuals(actionId) {
        for (const domKey in DOMAINS_CONFIG) {
            const match = DOMAINS_CONFIG[domKey].actions.find(a => a.id === actionId);
            if (match) return match;
        }
        return { id: actionId, label: actionId, icon: "fa-bolt", color: "text-muted" };
    }

    // Initialize Domain UI (users selector and preset buttons)
    function selectDomain(domainKey) {
        currentDomain = domainKey;
        const config = DOMAINS_CONFIG[domainKey];

        // 1. Update Domain buttons
        domainBtns.forEach(btn => {
            if (btn.getAttribute('data-domain') === domainKey) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 2. Repopulate user selector
        userSelector.innerHTML = '';
        const usersSet = knownUsersByDomain[domainKey];
        usersSet.forEach(user => {
            const opt = document.createElement('option');
            opt.value = user;
            opt.textContent = `${user} (${config.name})`;
            userSelector.appendChild(opt);
        });

        // Add a fallback test user
        const testUser = `test_${config.prefix}_1`;
        if (!usersSet.has(testUser)) {
            usersSet.add(testUser);
            const opt = document.createElement('option');
            opt.value = testUser;
            opt.textContent = testUser;
            userSelector.appendChild(opt);
        }

        // Set default active user for this domain
        activeUser = Array.from(usersSet)[0];
        userSelector.value = activeUser;

        // 3. Render preset action buttons
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

    // 1. Check API Connection & Load Telemetry
    async function checkHealth() {
        try {
            const res = await fetch(API_STATUS);
            if (res.ok) {
                apiStatusPill.className = 'status-pill status-online';
                apiStatusText.textContent = 'Manovra API Online';
                return true;
            } else {
                throw new Error('Bad Status');
            }
        } catch (err) {
            apiStatusPill.className = 'status-pill status-offline';
            apiStatusText.textContent = 'Connection Offline';
            logToConsole('Connection to server failed. Verify FastAPI server is running.', 'ERROR');
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
            modelLoadedVal.textContent = data.model_loaded ? 'Ready (PyTorch)' : 'Random Weights';
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

    // Render sequence timeline querying backend history
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
            
            // Auto scroll timeline to end
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
            
            // Trigger animation
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
        btnSimulate.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Simulating...';
        logToConsole(`Batch simulating mock sequences for domain '${currentDomain}'...`);
        
        try {
            const res = await fetch(`${API_ADMIN_SIMULATE}?domain=${currentDomain}`, { method: 'POST' });
            const data = await res.json();
            
            logToConsole(data.message, 'SUCCESS');
            
            // Sync user list from config preset
            const config = DOMAINS_CONFIG[currentDomain];
            const usersSet = knownUsersByDomain[currentDomain];
            config.users.forEach(user => usersSet.add(user));

            // Reload dropdown
            userSelector.innerHTML = '';
            usersSet.forEach(user => {
                const opt = document.createElement('option');
                opt.value = user;
                opt.textContent = `${user} (${config.name})`;
                userSelector.appendChild(opt);
            });

            // Set active user to the first simulated user
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
                const visuals = getActionVisuals(eventType);

                item.innerHTML = `
                    <span>User <b class="select-all">${activeUser}</b> triggered <span class="stream-item-tag"><i class="fa-solid ${visuals.icon} ${visuals.color}"></i> ${eventType}</span></span>
                    <span class="stream-item-time">${now}</span>
                `;
                streamFeedList.appendChild(item);
                
                // Keep only latest 15 elements
                while (streamFeedList.children.length > 15) {
                    streamFeedList.removeChild(streamFeedList.firstChild);
                }
                
                streamFeedWrapper.scrollTop = streamFeedWrapper.scrollHeight;

                // Update UI
                await loadTelemetry();
                await fetchPredictions();
            }
        } catch (err) {
            logToConsole(`Failed to ingest event: ${eventType}`, 'ERROR');
        }
    }

    // Ingest custom event
    customEventForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const action = customActionInput.value.trim().toLowerCase().replace(/\s+/g, '_');
        if (action) {
            ingestEvent(action);
            customActionInput.value = '';
        }
    });

    // 5. Interface Interactions (User selection, domain select, console clearing, refresh)
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

    btnClearConsole.addEventListener('click', () => {
        consoleOutput.textContent = 'SYSTEM: Logs cleared.';
    });

    btnRefreshStatus.addEventListener('click', async () => {
        await loadTelemetry();
        logToConsole('Manovra engine diagnostics refreshed.');
    });
    
    btnForcePredict.addEventListener('click', async () => {
        await fetchPredictions();
        logToConsole(`Recalculated predictions for user: ${activeUser}`);
    });

    // Initial setup: Default domain is SaaS
    selectDomain('saas');
    loadTelemetry();
    fetchPredictions();
});
