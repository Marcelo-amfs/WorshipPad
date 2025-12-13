/**
 * WorshipPad - Versão JavaScript vanilla (alternativa ao React)
 * @fileoverview Gerenciamento de áudio e equalizador usando Web Audio API
 */

/**
 * URL base da API do WorshipPad.
 * @constant {string}
 */
const API_BASE = '/api/WorshipPad';

/**
 * Contexto de áudio do navegador para processamento de áudio.
 * @type {AudioContext|null}
 */
let audioContext = null;

/**
 * Fonte de áudio atual conectada ao AudioContext.
 * @type {MediaElementAudioSourceNode|null}
 */
let audioSource = null;

/**
 * Nó de ganho para controle de volume.
 * @type {GainNode|null}
 */
let gainNode = null;

/**
 * Array de filtros biquad do equalizador.
 * @type {Array<BiquadFilterNode>}
 */
let filters = [];

/**
 * Chave musical atualmente sendo reproduzida.
 * @type {string|null}
 */
let currentKey = null;

/**
 * Intervalo usado para fade-in/out.
 * @type {number|null}
 */
let fadeInterval = null;

/**
 * Configuração das 10 bandas do equalizador.
 * Define frequências centrais e labels para cada banda.
 * @constant {Array<{freq: number, label: string}>}
 */
const eqBands = [
    { freq: 31, label: '31Hz' },
    { freq: 62, label: '62Hz' },
    { freq: 125, label: '125Hz' },
    { freq: 250, label: '250Hz' },
    { freq: 500, label: '500Hz' },
    { freq: 1000, label: '1kHz' },
    { freq: 2000, label: '2kHz' },
    { freq: 4000, label: '4kHz' },
    { freq: 8000, label: '8kHz' },
    { freq: 16000, label: '16kHz' }
];

/**
 * Valores atuais de ganho do equalizador (em dB).
 * Inicializado com zeros (sem alteração).
 * @type {Array<number>}
 */
let eqValues = eqBands.map(() => 0);

/**
 * Presets de equalização pré-configurados.
 * Cada preset contém valores de ganho em dB para as 10 bandas.
 * @constant {Object<string, Array<number>>}
 */
const eqPresets = {
    flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    vocal: [-3, -2, 0, 2, 3, 4, 3, 2, 0, -1],
    bass: [6, 5, 3, 2, 1, 0, -1, -2, -2, -3],
    treble: [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6]
};

/**
 * Inicializa a aplicação quando o DOM estiver carregado.
 * Configura AudioContext, botões, equalizador e atualiza a interface.
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeAudioContext();
    initializeButtons();
    initializeEqualizer();
    updateUI();
});

/**
 * Inicializa o AudioContext do navegador.
 * Cria o contexto de áudio e o nó de ganho, conectando à saída.
 * @throws {Error} Exibe notificação se houver erro na inicialização.
 */
function initializeAudioContext() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.connect(audioContext.destination);
    } catch (error) {
        console.error('Erro ao inicializar AudioContext:', error);
        showNotification('Erro ao inicializar áudio. Seu navegador pode não suportar Web Audio API.', 'error');
    }
}

/**
 * Inicializa os event listeners dos botões de teclas e do botão de parar.
 * Associa cada botão de tecla à função playKey correspondente.
 */
function initializeButtons() {
    const keyButtons = document.querySelectorAll('.key-btn');
    keyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-key');
            playKey(key);
        });
    });

    const stopBtn = document.getElementById('stopBtn');
    stopBtn.addEventListener('click', stop);
}

/**
 * Inicializa a interface do equalizador.
 * Cria dinamicamente os sliders para cada banda e configura seus event listeners.
 * Inicializa também os botões de preset.
 */
function initializeEqualizer() {
    const equalizer = document.getElementById('equalizer');
    
    eqBands.forEach((band, index) => {
        const bandDiv = document.createElement('div');
        bandDiv.className = 'eq-band';
        
        const label = document.createElement('div');
        label.className = 'eq-label';
        label.textContent = band.label;
        
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'eq-slider-container';
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.className = 'eq-slider';
        slider.min = -12;
        slider.max = 12;
        slider.value = 0;
        slider.step = 0.5;
        slider.setAttribute('orient', 'vertical');
        slider.dataset.bandIndex = index;
        
        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'eq-value';
        valueDisplay.textContent = '0dB';
        
        slider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            eqValues[index] = value;
            valueDisplay.textContent = `${value >= 0 ? '+' : ''}${value.toFixed(1)}dB`;
            applyEqualizer();
        });
        
        bandDiv.appendChild(label);
        sliderContainer.appendChild(slider);
        bandDiv.appendChild(sliderContainer);
        bandDiv.appendChild(valueDisplay);
        equalizer.appendChild(bandDiv);
    });
    
    // Inicializar botões de preset
    const presetButtons = document.querySelectorAll('.eq-preset-btn');
    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            applyPreset(preset);
        });
    });
}

/**
 * Aplica um preset de equalização pré-configurado.
 * Atualiza os valores do equalizador e os sliders na interface.
 * @param {string} preset - Nome do preset ('flat', 'vocal', 'bass', 'treble' ou 'reset').
 */
function applyPreset(preset) {
    if (preset === 'reset') {
        eqValues = eqBands.map(() => 0);
    } else if (eqPresets[preset]) {
        eqValues = [...eqPresets[preset]];
    }
    
    // Atualizar sliders
    const sliders = document.querySelectorAll('.eq-slider');
    const valueDisplays = document.querySelectorAll('.eq-value');
    
    sliders.forEach((slider, index) => {
        slider.value = eqValues[index];
        valueDisplays[index].textContent = `${eqValues[index] >= 0 ? '+' : ''}${eqValues[index].toFixed(1)}dB`;
    });
    
    applyEqualizer();
    showNotification(`Preset "${preset}" aplicado`, 'info');
}

/**
 * Aplica a equalização atual ao áudio.
 * Remove filtros antigos e cria uma nova cadeia de filtros com os valores atuais.
 */
function applyEqualizer() {
    if (!audioSource || !audioContext) return;
    
    // Remover filtros antigos
    filters.forEach(filter => {
        try {
            filter.disconnect();
        } catch (e) {}
    });
    filters = [];
    
    // Criar nova cadeia de filtros
    let currentNode = audioSource;
    
    eqBands.forEach((band, index) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = band.freq;
        filter.Q.value = 1;
        filter.gain.value = eqValues[index];
        
        currentNode.connect(filter);
        currentNode = filter;
        filters.push(filter);
    });
    
    // Conectar o último filtro ao gainNode
    currentNode.connect(gainNode);
}

/**
 * Reproduz uma chave musical específica.
 * Carrega o arquivo de áudio, aplica equalização e inicia a reprodução com fade-in.
 * @param {string} key - Chave musical a ser reproduzida (ex: 'C', 'C#', 'Cm', 'C#m').
 */
async function playKey(key) {
    try {
        // Se clicar no mesmo tom, para
        if (key === currentKey && audioSource) {
            await stop();
            return;
        }
        
        // Parar áudio atual se estiver tocando
        if (audioSource) {
            await stop();
        }
        
        // Obter URL do áudio
        const response = await fetch(`${API_BASE}/play/${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok && data.audioUrl) {
            // Criar novo elemento de áudio
            const audioUrl = `${API_BASE}/audio/${encodeURIComponent(key)}`;
            const audio = new Audio(audioUrl);
            audio.loop = true;
            
            // Conectar ao AudioContext
            audio.addEventListener('loadeddata', () => {
                if (!audioContext) {
                    initializeAudioContext();
                }
                
                // Criar source do AudioContext
                audioSource = audioContext.createMediaElementSource(audio);
                
                // Aplicar equalizador
                applyEqualizer();
                
                // Configurar volume inicial para fade in
                gainNode.gain.value = 0;
                
                // Reproduzir
                audio.play().then(() => {
                    fadeIn(1500);
                    currentKey = key;
                    updateUI();
                    showNotification(`Tocando: ${key}`, 'success');
                }).catch(error => {
                    console.error('Erro ao reproduzir:', error);
                    showNotification('Erro ao reproduzir áudio. Verifique as permissões do navegador.', 'error');
                });
            });
            
            audio.addEventListener('error', (e) => {
                console.error('Erro no áudio:', e);
                showNotification('Erro ao carregar áudio', 'error');
                audioSource = null;
                currentKey = null;
                updateUI();
            });
            
            // Armazenar referência ao elemento audio
            audioSource._audioElement = audio;
        } else {
            showNotification(data.error || 'Erro ao tocar', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showNotification('Erro de conexão com o servidor', 'error');
    }
}

/**
 * Para a reprodução de áudio atual.
 * Aplica fade-out, pausa o elemento de áudio e limpa todos os recursos.
 */
async function stop() {
    if (audioSource && audioSource._audioElement) {
        await fadeOut(1000);
        audioSource._audioElement.pause();
        audioSource._audioElement.currentTime = 0;
        audioSource._audioElement = null;
    }
    
    // Desconectar e limpar
    if (audioSource) {
        try {
            audioSource.disconnect();
        } catch (e) {}
        audioSource = null;
    }
    
    filters.forEach(filter => {
        try {
            filter.disconnect();
        } catch (e) {}
    });
    filters = [];
    
    currentKey = null;
    updateUI();
    showNotification('Parado', 'info');
}

/**
 * Aplica fade-in gradual no volume do áudio.
 * Aumenta o volume de 0 até 1 ao longo da duração especificada.
 * @param {number} durationMs - Duração do fade-in em milissegundos.
 */
function fadeIn(durationMs) {
    if (fadeInterval) {
        clearInterval(fadeInterval);
    }
    
    if (!gainNode) return;
    
    const step = 0.05;
    const interval = durationMs / (1 / step);
    let volume = 0;
    
    fadeInterval = setInterval(() => {
        volume += step;
        if (volume >= 1) {
            volume = 1;
            clearInterval(fadeInterval);
            fadeInterval = null;
        }
        gainNode.gain.value = volume;
    }, interval);
}

/**
 * Aplica fade-out gradual no volume do áudio.
 * Diminui o volume do valor atual até 0 ao longo da duração especificada.
 * @param {number} durationMs - Duração do fade-out em milissegundos.
 * @returns {Promise} Promise que resolve quando o fade-out é concluído.
 */
function fadeOut(durationMs) {
    return new Promise((resolve) => {
        if (fadeInterval) {
            clearInterval(fadeInterval);
        }
        
        if (!gainNode) {
            resolve();
            return;
        }
        
        const step = 0.05;
        const interval = durationMs / (1 / step);
        let volume = gainNode.gain.value;
        
        fadeInterval = setInterval(() => {
            volume -= step;
            if (volume <= 0) {
                volume = 0;
                clearInterval(fadeInterval);
                fadeInterval = null;
                resolve();
            }
            gainNode.gain.value = volume;
        }, interval);
    });
}

/**
 * Atualiza a interface do usuário com o estado atual.
 * Atualiza o texto de status, a chave atual e o estado visual dos botões.
 */
function updateUI() {
    const statusText = document.getElementById('statusText');
    const currentKeyElement = document.getElementById('currentKey');
    const keyButtons = document.querySelectorAll('.key-btn');
    
    // Remover classe active de todos os botões
    keyButtons.forEach(btn => btn.classList.remove('active'));
    
    if (currentKey && audioSource && audioSource._audioElement && !audioSource._audioElement.paused) {
        // Atualizar status
        statusText.textContent = `Tocando: ${currentKey}`;
        currentKeyElement.textContent = currentKey;
        currentKeyElement.style.display = 'inline-block';
        
        // Ativar botão correspondente
        const activeBtn = document.querySelector(`[data-key="${currentKey}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    } else {
        statusText.textContent = 'Pronto para tocar';
        currentKeyElement.textContent = '';
        currentKeyElement.style.display = 'none';
    }
}

/**
 * Exibe uma notificação na tela.
 * Cria um elemento de notificação estilizado e o remove automaticamente após 3 segundos.
 * @param {string} message - Mensagem a ser exibida.
 * @param {string} type - Tipo da notificação ('success', 'error', 'info').
 */
function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 10px;
        color: white;
        font-weight: bold;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    const colors = {
        success: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        error: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        info: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };
    
    notification.style.background = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

/**
 * Adiciona estilos CSS dinamicamente para animações de notificação.
 * Cria um elemento style e adiciona keyframes para slideIn e slideOut.
 */
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
