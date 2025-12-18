class CashPlayPointsManager {
    constructor() {
        this.isRunning = false;
        this.intervalId = null;
        this.stats = {
            requests: 0,
            successes: 0,
            errors: 0,
            totalPoints: null
        };
        this.autoScroll = true;
        this.currentUserData = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.updateUI();
    }

    initializeElements() {
        // Form elements
        this.uidInput = document.getElementById('uid');
        this.emailInput = document.getElementById('email');
        this.deviceIdInput = document.getElementById('deviceId');
        this.intervalSlider = document.getElementById('interval');
        this.intervalValue = document.getElementById('intervalValue');
        
        // Control buttons
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.autoScrollBtn = document.getElementById('autoScrollBtn');
        
        // Status elements
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        
        // Stats elements
        this.requestCount = document.getElementById('requestCount');
        this.successCount = document.getElementById('successCount');
        this.errorCount = document.getElementById('errorCount');
        this.totalPoints = document.getElementById('totalPoints');
        
        // User info and log containers
        this.userInfoContainer = document.getElementById('userInfoContainer');
        this.logContainer = document.getElementById('logContainer');
    }

    bindEvents() {
        // Slider value update
        this.intervalSlider.addEventListener('input', (e) => {
            this.intervalValue.textContent = e.target.value;
            this.saveSettings();
        });

        // Control buttons
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.clearBtn.addEventListener('click', () => this.clearLog());
        this.autoScrollBtn.addEventListener('click', () => this.toggleAutoScroll());

        // Save settings on input change
        this.uidInput.addEventListener('input', () => this.saveSettings());
        this.emailInput.addEventListener('input', () => this.saveSettings());
        this.deviceIdInput.addEventListener('input', () => this.saveSettings());

        // Prevent form submission on Enter
        [this.uidInput, this.emailInput, this.deviceIdInput].forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!this.isRunning && this.validateInputs()) {
                        this.start();
                    }
                }
            });
        });
    }

    saveSettings() {
        const settings = {
            uid: this.uidInput.value,
            email: this.emailInput.value,
            deviceId: this.deviceIdInput.value,
            interval: this.intervalSlider.value
        };
        localStorage.setItem('cashplayPointsSettings', JSON.stringify(settings));
    }

    loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('cashplayPointsSettings') || '{}');
            if (settings.uid) this.uidInput.value = settings.uid;
            if (settings.email) this.emailInput.value = settings.email;
            if (settings.deviceId) this.deviceIdInput.value = settings.deviceId;
            if (settings.interval) {
                this.intervalSlider.value = settings.interval;
                this.intervalValue.textContent = settings.interval;
            }
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
        }
    }

    validateInputs() {
        const uid = this.uidInput.value.trim();
        const email = this.emailInput.value.trim();
        const deviceId = this.deviceIdInput.value.trim();

        if (!uid) {
            this.addLog('error', 'UID do usuário é obrigatório');
            this.uidInput.focus();
            return false;
        }

        if (!email) {
            this.addLog('error', 'E-mail é obrigatório');
            this.emailInput.focus();
            return false;
        }

        if (!deviceId) {
            this.addLog('error', 'Device ID é obrigatório');
            this.deviceIdInput.focus();
            return false;
        }

        // Validação básica de e-mail
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.addLog('error', 'Formato de e-mail inválido');
            this.emailInput.focus();
            return false;
        }

        return true;
    }

    async start() {
        if (!this.validateInputs()) {
            return;
        }

        this.isRunning = true;
        this.updateUI();
        
        const uid = this.uidInput.value.trim();
        const email = this.emailInput.value.trim();
        const deviceId = this.deviceIdInput.value.trim();
        
        this.addLog('info', `🚀 Iniciando monitoramento para usuário: ${uid}`);
        this.addLog('info', `📧 E-mail: ${email}`);
        this.addLog('info', `📱 Device ID: ${deviceId}`);
        this.addLog('info', `⏱️ Intervalo: ${this.intervalSlider.value} segundos`);

        // Primeira execução imediata
        await this.executeUpdate();

        // Configurar execução periódica
        const intervalMs = parseInt(this.intervalSlider.value) * 1000;
        this.intervalId = setInterval(() => {
            this.executeUpdate();
        }, intervalMs);
    }

    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.updateUI();
        this.addLog('info', '⏹️ Monitoramento parado pelo usuário');
    }

    async executeUpdate() {
        if (!this.isRunning) return;

        const uid = this.uidInput.value.trim();
        const email = this.emailInput.value.trim();
        const deviceId = this.deviceIdInput.value.trim();
        const timestamp = new Date().toLocaleTimeString('pt-BR');
        
        this.stats.requests++;
        this.updateStats();

        try {
            // 1. Buscar dados atuais do usuário
            this.addLog('info', `🔍 ${timestamp} - Buscando dados do usuário...`);
            const beforeData = await this.getUserData(uid);
            
            if (beforeData && beforeData.point !== undefined) {
                this.addLog('success', `📊 ${timestamp} - Pontos atuais: ${beforeData.point}`);
                this.updateUserInfo(beforeData);
            }

            // 2. Adicionar pontos
            this.addLog('info', `⚡ ${timestamp} - Adicionando pontos...`);
            const addResult = await this.addPoints(uid, email, deviceId);
            
            if (addResult && addResult.message) {
                this.addLog('success', `✅ ${timestamp} - ${addResult.message}`);
            }

            // Aguardar 2 segundos como no script PHP
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 3. Verificar pontos atualizados
            this.addLog('info', `🔄 ${timestamp} - Verificando pontos atualizados...`);
            const afterData = await this.getUserData(uid);
            
            if (afterData && afterData.point !== undefined) {
                const pointsDiff = beforeData && beforeData.point !== undefined 
                    ? afterData.point - beforeData.point 
                    : 0;
                
                this.addLog('success', 
                    `💰 ${timestamp} - Pontos agora: ${afterData.point} ${pointsDiff > 0 ? `(+${pointsDiff})` : ''}`
                );
                
                this.stats.totalPoints = afterData.point;
                this.updateUserInfo(afterData);
            }

            this.stats.successes++;
            
        } catch (error) {
            this.handleError(error, timestamp);
        }
        
        this.updateStats();
    }

    async getUserData(uid) {
        try {
            const response = await fetch(`/api/getUser/${uid}`, {
                method: 'GET',
                headers: {
                    'User-Agent': 'okhttp/4.12.0'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Erro ao buscar dados do usuário: ${error.message}`);
        }
    }

    async addPoints(uid, email, deviceId) {
        try {
            const payload = {
                uid: uid,
                email: email,
                deviceId: deviceId
            };

            const response = await fetch("/api/addPointGame", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=UTF-8",
                    "User-Agent": "okhttp/4.12.0"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Erro ao adicionar pontos: ${error.message}`);
        }
    }

    handleError(error, timestamp) {
        this.stats.errors++;
        
        let errorMessage = error.message;
        
        // Tratar erros específicos
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Erro de conectividade. Verifique sua conexão com a internet.';
        } else if (error.message.includes('CORS')) {
            errorMessage = 'Erro de CORS. O servidor pode não permitir requisições do navegador.';
        }
        
        this.addLog('error', `❌ ${timestamp} - ${errorMessage}`);
        
        // Se muitos erros consecutivos, sugerir parar
        if (this.stats.errors > 3 && this.stats.successes === 0) {
            this.addLog('warning', '⚠️ Muitos erros detectados. Verifique as configurações ou pare o processo.');
        }
    }

    updateUserInfo(userData) {
        if (!userData) return;

        this.currentUserData = userData;
        
        const userInfoHtml = `
            <div class="user-info-grid">
                <div class="user-info-item">
                    <div class="user-info-label">UID</div>
                    <div class="user-info-value">${userData.uid || 'N/A'}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">E-mail</div>
                    <div class="user-info-value">${userData.email || 'N/A'}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">Pontos</div>
                    <div class="user-info-value">${userData.point || 0}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">Total de Jogos</div>
                    <div class="user-info-value">${userData.totalGame || 0}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">Código de Convite</div>
                    <div class="user-info-value">${userData.codeInvite || 'N/A'}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">Total de Referências</div>
                    <div class="user-info-value">${userData.totalReferral || 0}</div>
                </div>
            </div>
        `;
        
        this.userInfoContainer.innerHTML = userInfoHtml;
    }

    addLog(type, message) {
        // Remover mensagem de log vazio se existir
        const emptyLog = this.logContainer.querySelector('.log-empty');
        if (emptyLog) {
            emptyLog.remove();
        }

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = message;

        this.logContainer.appendChild(logEntry);

        // Limitar número de logs (manter últimos 100)
        const logs = this.logContainer.querySelectorAll('.log-entry');
        if (logs.length > 100) {
            logs[0].remove();
        }

        // Auto scroll se habilitado
        if (this.autoScroll) {
            this.logContainer.scrollTop = this.logContainer.scrollHeight;
        }
    }

    clearLog() {
        this.logContainer.innerHTML = `
            <div class="log-empty">
                <span class="log-empty-icon">📝</span>
                <p>Log limpo. Clique em "Iniciar" para começar novamente.</p>
            </div>
        `;
        
        // Reset stats
        this.stats = {
            requests: 0,
            successes: 0,
            errors: 0,
            totalPoints: this.stats.totalPoints // Manter pontos totais
        };
        this.updateStats();
    }

    toggleAutoScroll() {
        this.autoScroll = !this.autoScroll;
        this.autoScrollBtn.classList.toggle('active', this.autoScroll);
        this.autoScrollBtn.textContent = this.autoScroll ? 'Auto Scroll' : 'Manual Scroll';
    }

    updateUI() {
        // Atualizar botões
        this.startBtn.disabled = this.isRunning;
        this.stopBtn.disabled = !this.isRunning;
        
        // Atualizar inputs
        this.uidInput.disabled = this.isRunning;
        this.emailInput.disabled = this.isRunning;
        this.deviceIdInput.disabled = this.isRunning;
        this.intervalSlider.disabled = this.isRunning;
        
        // Atualizar status
        if (this.isRunning) {
            this.statusDot.className = 'status-dot running';
            this.statusText.textContent = 'Executando';
        } else {
            this.statusDot.className = 'status-dot stopped';
            this.statusText.textContent = 'Parado';
        }
    }

    updateStats() {
        this.requestCount.textContent = this.stats.requests;
        this.successCount.textContent = this.stats.successes;
        this.errorCount.textContent = this.stats.errors;
        this.totalPoints.textContent = this.stats.totalPoints !== null ? this.stats.totalPoints : '-';
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new CashPlayPointsManager();
});

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registrado com sucesso: ', registration);
            })
            .catch((registrationError) => {
                console.log('Falha ao registrar SW: ', registrationError);
            });
    });
}

