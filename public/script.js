document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const elements = {
        themeToggle: document.getElementById('themeToggle'),
        getTokenBtn: document.getElementById('getTokenBtn'),
        startSharingBtn: document.getElementById('startSharingBtn'),
        stopSharingBtn: document.getElementById('stopSharingBtn'),
        shareCountSelect: document.getElementById('shareCount'),
        customSharesGroup: document.getElementById('customSharesGroup'),
        consoleOutput: document.getElementById('consoleOutput'),
        progressBar: document.getElementById('progressBar'),
        totalSharesEl: document.getElementById('total-shares'),
        successRateEl: document.getElementById('success-rate'),
        errorCountEl: document.getElementById('error-count'),
        mostSharedUrlEl: document.getElementById('most-shared-url'),
        errorWarning: document.getElementById('errorWarning'),
        sharingStatus: document.getElementById('sharingStatus')
    };

    // State Management
    const state = {
        isSharing: false,
        stats: {
            totalShares: 0,
            successfulShares: 0,
            failedShares: 0,
            sharedUrls: {}
        },
        session: {
            token: null,
            sessionId: null,
            statusInterval: null
        },
        lastLogCount: 0
    };

    // Theme Management
    const themeManager = {
        toggle() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            elements.themeToggle.textContent = newTheme === 'dark' ? '🌙' : '☀️';
        }
    };

    // Error Handler
    const errorHandler = {
        threshold: 10,
        
        updateErrorCount(count) {
            elements.errorCountEl.textContent = count;
            
            if (count > this.threshold) {
                this.showWarning();
            }
        },

        showWarning() {
            elements.errorWarning.classList.add('show');
            if (state.isSharing) {
                sharingManager.stop();
                elements.sharingStatus.innerHTML = `
                    <div class="error">
                        <i class="fas fa-exclamation-circle"></i>
                        Sharing paused due to high error rate. Please check the recommendations below.
                    </div>
                `;
            }
        },

        handleError(error, context) {
            console.error(`${context}:`, error);
            logManager.log(`${context}: ${error.message}`, 'error');
            state.stats.failedShares++;
            this.updateErrorCount(state.stats.failedShares);
        },

        // Check if message indicates a sharing error
        isErrorMessage(message) {
            const errorPatterns = [
                'Failed to share post',
                'limit how often you can post',
                'try again later',
                'error',
                'failed',
                'blocked',
                'spam'
            ];
            return errorPatterns.some(pattern => 
                message.toLowerCase().includes(pattern.toLowerCase())
            );
        }
    };

    // Log Manager
    const logManager = {
        log(message, type = 'normal') {
            try {
                const line = document.createElement('div');
                line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
                line.classList.add('console-line', type);
                elements.consoleOutput.appendChild(line);
                elements.consoleOutput.scrollTop = elements.consoleOutput.scrollHeight;
            } catch (error) {
                console.error('Logging error:', error);
            }
        },

        updateConsole(logs) {
            if (!Array.isArray(logs)) return;
            
            if (logs.length > state.lastLogCount) {
                const newLogs = logs.slice(state.lastLogCount);
                newLogs.forEach(log => {
                    this.log(log.message, log.type);
                });
                state.lastLogCount = logs.length;
            }
        }
    };

    // Stats Manager
    const statsManager = {
        update() {
            try {
                // Update display with current stats
                elements.totalSharesEl.textContent = state.stats.totalShares;
                elements.errorCountEl.textContent = state.stats.failedShares;
                
                if (state.stats.totalShares > 0) {
                    const rate = (state.stats.successfulShares / state.stats.totalShares) * 100;
                    elements.successRateEl.textContent = `${rate.toFixed(1)}%`;
                } else {
                    elements.successRateEl.textContent = 'N/A';
                }
                
                const mostShared = Object.entries(state.stats.sharedUrls)
                    .sort((a, b) => b[1] - a[1])[0];
                elements.mostSharedUrlEl.textContent = mostShared ? mostShared[0] : 'None';

                // Check error threshold
                if (state.stats.failedShares > errorHandler.threshold) {
                    errorHandler.showWarning();
                }
            } catch (error) {
                console.error('Stats update error:', error);
            }
        },

        updateProgress(current, total) {
            try {
                const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
                elements.progressBar.style.width = `${percentage}%`;
            } catch (error) {
                console.error('Progress update error:', error);
            }
        },

        // Parse sharing progress from log message
        parseProgress(message) {
            const match = message.match(/(\d+)\/(\d+)/);
            if (match) {
                return {
                    current: parseInt(match[1]),
                    total: parseInt(match[2])
                };
            }
            return null;
        }
    };

    // Sharing Manager
    const sharingManager = {
        async start() {
            const shareUrl = document.getElementById('shareUrl').value;
            let shareCount = elements.shareCountSelect.value;
            const interval = document.getElementById('interval').value;

            if (shareCount === 'custom') {
                shareCount = document.getElementById('customShareCount').value;
            }

            if (!this.validateInputs(shareUrl, shareCount, interval)) {
                return;
            }

            state.isSharing = true;
            elements.startSharingBtn.disabled = true;
            elements.stopSharingBtn.disabled = false;
            document.getElementById('step2').classList.remove('active');
            document.getElementById('step3').classList.add('active');

            try {
                const response = await fetch('/api/share', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: state.session.token,
                        url: shareUrl,
                        count: shareCount,
                        interval: interval
                    })
                });

                const data = await response.json();

                if (data.success) {
                    state.session.sessionId = data.sessionId;
                    logManager.log(`Sharing session started with ID: ${state.session.sessionId}`);
                    state.session.statusInterval = setInterval(() => this.getStatus(), 1000); // Faster updates
                    
                    state.stats.sharedUrls[shareUrl] = (state.stats.sharedUrls[shareUrl] || 0) + parseInt(shareCount);
                    statsManager.update();
                } else {
                    throw new Error(data.message);
                }
            } catch (error) {
                errorHandler.handleError(error, 'Sharing start error');
                this.reset();
            }
        },

        validateInputs(url, count, interval) {
            if (!url || !count || !interval) {
                logManager.log('Please fill all sharing configuration fields.', 'error');
                return false;
            }
            if (isNaN(count) || count <= 0) {
                logManager.log('Share count must be a positive number.', 'error');
                return false;
            }
            if (isNaN(interval) || interval < 1000) {
                logManager.log('Interval must be at least 1000ms.', 'error');
                return false;
            }
            return true;
        },

        async stop() {
            if (!state.session.sessionId) return;

            try {
                const response = await fetch('/api/stop-sharing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: state.session.sessionId })
                });

                if (!response.ok) {
                    throw new Error('Failed to stop sharing');
                }

                logManager.log('Sharing stopped by user.');
                this.reset();
            } catch (error) {
                errorHandler.handleError(error, 'Stop sharing error');
                // Force reset even if stop request fails
                this.reset();
            }
        },

        async getStatus() {
            if (!state.session.sessionId) return;

            try {
                const response = await fetch(`/api/status/${state.session.sessionId}`);
                const data = await response.json();

                if (data.success) {
                    const { sharedCount, targetCount, status, logs } = data;
                    
                    // Process new logs first
                    this.processLogs(logs);
                    
                    // Update progress based on the most recent log
                    if (logs && logs.length > 0) {
                        const lastLog = logs[logs.length - 1];
                        const progress = statsManager.parseProgress(lastLog.message);
                        if (progress) {
                            statsManager.updateProgress(progress.current, progress.total);
                        }
                    }

                    // Update stats display
                    statsManager.update();

                    if (status === 'stopped' || status === 'finished') {
                        this.reset();
                    }
                }
            } catch (error) {
                errorHandler.handleError(error, 'Status check error');
            }
        },

        processLogs(logs) {
            if (!Array.isArray(logs)) return;
            
            const newLogs = logs.filter(log => !log.processed);
            
            newLogs.forEach(log => {
                // Check for errors in the message
                if (errorHandler.isErrorMessage(log.message)) {
                    state.stats.failedShares++;
                    log.type = 'error'; // Mark as error for display
                } else if (log.message.includes('Post shared')) {
                    state.stats.successfulShares++;
                }
                log.processed = true;
            });

            // Update total shares
            state.stats.totalShares = state.stats.successfulShares + state.stats.failedShares;
            
            // Update console with new logs
            logManager.updateConsole(newLogs);
        },

        reset() {
            state.isSharing = false;
            if (state.session.statusInterval) {
                clearInterval(state.session.statusInterval);
                state.session.statusInterval = null;
            }
            state.session.sessionId = null;
            elements.startSharingBtn.disabled = false;
            elements.stopSharingBtn.disabled = true;
            document.getElementById('step3').classList.remove('active');
            document.getElementById('step2').classList.add('active');
            state.lastLogCount = 0;
        }
    };

    // Token Manager
    const tokenManager = {
        async getToken() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const tokenStatus = document.getElementById('tokenStatus');

            if (!username || !password) {
                tokenStatus.textContent = 'Please enter username and password.';
                tokenStatus.className = 'status error';
                return;
            }

            elements.getTokenBtn.disabled = true;
            tokenStatus.textContent = 'Getting token...';
            tokenStatus.className = 'status';

            try {
                const response = await fetch('/api/get-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.success) {
                    state.session.token = data.token;
                    tokenStatus.textContent = 'Token retrieved successfully!';
                    tokenStatus.className = 'status success';
                    document.getElementById('step1').classList.remove('active');
                    document.getElementById('step2').classList.add('active');
                    elements.startSharingBtn.disabled = false;
                } else {
                    throw new Error(data.message);
                }
            } catch (error) {
                tokenStatus.textContent = `Error: ${error.message}`;
                tokenStatus.className = 'status error';
            } finally {
                elements.getTokenBtn.disabled = false;
            }
        }
    };

    // Event Listeners
    elements.themeToggle.addEventListener('click', () => themeManager.toggle());
    elements.shareCountSelect.addEventListener('change', () => {
        elements.customSharesGroup.classList.toggle('active', 
            elements.shareCountSelect.value === 'custom');
    });
    elements.getTokenBtn.addEventListener('click', () => tokenManager.getToken());
    elements.startSharingBtn.addEventListener('click', () => sharingManager.start());
    elements.stopSharingBtn.addEventListener('click', () => sharingManager.stop());

    // Initialize theme
    themeManager.toggle();
}); 