/**
 * WorshipPad - Aplicação React para controle de pads musicais
 * @fileoverview Componentes e hooks principais da aplicação
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';

/**
 * URL base da API do WorshipPad para comunicação com o backend.
 * Detecta automaticamente se está em produção (Netlify) ou desenvolvimento.
 * Em produção, usa a URL completa do backend configurada.
 * Em desenvolvimento, usa caminho relativo.
 * @constant {string}
 */
const API_BASE = (() => {
    // Verifica se há uma variável global configurada (definida no index.html)
    if (window.WORSHIP_PAD_API_URL) {
        return window.WORSHIP_PAD_API_URL;
    }
    
    // Detecta se está rodando no Netlify
    const hostname = window.location.hostname;
    const isNetlify = hostname.includes('netlify.app') || hostname.includes('netlify.com');
    
    if (isNetlify) {
        // Em produção no Netlify, você precisa configurar a URL do seu backend
        // Substitua pela URL do seu servidor backend em produção
        // Exemplo: 'https://seu-backend.herokuapp.com/api/WorshipPad'
        // ou 'https://api.worshipad.com/api/WorshipPad'
        const defaultUrl = 'https://seu-backend-url.com/api/WorshipPad';
        if (defaultUrl.includes('seu-backend-url.com')) {
            console.warn('⚠️ ATENÇÃO: Configure a URL do backend no index.html ou app.jsx!');
            console.warn('Edite wwwroot/index.html e defina window.WORSHIP_PAD_API_URL com a URL do seu backend.');
        }
        return defaultUrl;
    }
    
    // Em desenvolvimento, usa caminho relativo
    return '/api/WorshipPad';
})();

/**
 * Configuração das bandas do equalizador (10 bandas).
 * Define as frequências centrais e labels para cada banda de equalização.
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
 * Presets de equalização pré-configurados.
 * Cada preset contém valores de ganho em dB para as 10 bandas do equalizador.
 * @constant {Object<string, Array<number>>}
 */
const eqPresets = {
    flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    vocal: [-3, -2, 0, 2, 3, 4, 3, 2, 0, -1],
    bass: [6, 5, 3, 2, 1, 0, -1, -2, -2, -3],
    treble: [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6]
};

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const baseFreqs = {
    'C': 130.81, 'C#': 138.59, 'D': 146.83, 'D#': 155.56,
    'E': 164.81, 'F': 174.61, 'F#': 185.00, 'G': 196.00,
    'G#': 207.65, 'A': 220.00, 'A#': 233.08, 'B': 246.94
};

function getChordFrequencies(key) {
    const isMinor = key.endsWith('m');
    const rootNote = isMinor ? key.slice(0, -1) : key;
    const rootIndex = noteNames.indexOf(rootNote);
    
    if (rootIndex === -1) return [];

    const thirdIndex = (rootIndex + (isMinor ? 3 : 4)) % 12;
    const fifthIndex = (rootIndex + 7) % 12;

    const rootFreq = baseFreqs[rootNote];
    const thirdFreq = baseFreqs[noteNames[thirdIndex]] * (thirdIndex < rootIndex ? 2 : 1);
    const fifthFreq = baseFreqs[noteNames[fifthIndex]] * (fifthIndex < rootIndex ? 2 : 1);

    return [
        rootFreq / 2, // Grave (C2)
        rootFreq,     // Tônica (C3)
        thirdFreq,    // Terça
        fifthFreq,    // Quinta (G3)
        rootFreq * 2, // Oitava (C4)
        fifthFreq * 2 // Oitava da Quinta (G4)
    ];
}

function createReverbImpulse(context) {
    const length = context.sampleRate * 4.0; // 4 segundos de reverb
    const impulse = context.createBuffer(2, length, context.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
        const decay = Math.exp(-i / (context.sampleRate * 1.5));
        left[i] = (Math.random() * 2 - 1) * decay;
        right[i] = (Math.random() * 2 - 1) * decay;
    }
    return impulse;
}

/**
 * Hook personalizado para gerenciar reprodução de áudio com equalizador.
 * Gerencia o AudioContext, filtros de equalização, fade-in/out e controle de reprodução.
 * @returns {Object} Objeto contendo estado e funções de controle do player de áudio.
 */
function useAudioPlayer() {
    const audioContextRef = useRef(null);
    const synthNodesRef = useRef({
        oscillators: [],
        masterGain: null,
        reverb: null,
        filter: null
    });
    const gainNodeRef = useRef(null);
    const filtersRef = useRef([]);
    const fadeIntervalRef = useRef(null);
    const [currentKey, setCurrentKey] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [eqValues, setEqValues] = useState(eqBands.map(() => 0));

    /**
     * Inicializa o AudioContext do navegador se ainda não foi criado.
     * Cria também o nó de ganho (gainNode) e conecta à saída de áudio.
     * @throws {Error} Se houver erro ao inicializar o AudioContext.
     */
    const initializeAudioContext = useCallback(() => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                gainNodeRef.current = audioContextRef.current.createGain();
                gainNodeRef.current.connect(audioContextRef.current.destination);
            }
        } catch (error) {
            console.error('Erro ao inicializar AudioContext:', error);
            throw error;
        }
    }, []);

    /**
     * Inicializa a cadeia de filtros do equalizador.
     * Cria um filtro biquad para cada banda de frequência e os conecta em série.
     * @param {Array<number>|null} initialValues - Valores iniciais de ganho para cada banda (opcional).
     */
    const initializeEqualizer = useCallback((initialValues = null) => {
        if (!synthNodesRef.current.masterGain || !audioContextRef.current) return;
        if (filtersRef.current.length > 0) return;

        const valuesToUse = initialValues || eqValues;

        let currentNode = synthNodesRef.current.masterGain;

        eqBands.forEach((band, index) => {
            const filter = audioContextRef.current.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = band.freq;
            filter.Q.value = 1;
            filter.gain.value = valuesToUse[index] || 0;

            currentNode.connect(filter);
            currentNode = filter;
            filtersRef.current.push(filter);
        });

        currentNode.connect(gainNodeRef.current);
    }, [eqValues]);

    /**
     * Atualiza os valores de ganho dos filtros do equalizador.
     * Pode usar transição suave (ramp) ou atualização imediata.
     * @param {Array<number>} newValues - Novos valores de ganho para cada banda.
     * @param {boolean} useRamp - Se true, usa transição suave de 150ms; caso contrário, atualiza imediatamente.
     */
    const updateEqualizerValues = useCallback((newValues, useRamp = false) => {
        if (!audioContextRef.current) return;
        
        if (filtersRef.current.length === 0) {
            initializeEqualizer(newValues);
            return;
        }

        const currentTime = audioContextRef.current.currentTime;
        
        filtersRef.current.forEach((filter, index) => {
            if (filter && newValues[index] !== undefined) {
                try {
                    if (useRamp) {
                        filter.gain.cancelScheduledValues(currentTime);
                        filter.gain.linearRampToValueAtTime(
                            newValues[index],
                            currentTime + 0.15
                        );
                    } else {
                        filter.gain.cancelScheduledValues(currentTime);
                        filter.gain.setValueAtTime(newValues[index], currentTime);
                    }
                } catch (e) {
                    filter.gain.value = newValues[index];
                }
            }
        });
    }, [initializeEqualizer]);

    /**
     * Aplica a equalização atual ao áudio.
     * Inicializa os filtros se necessário, ou apenas atualiza os valores existentes.
     */
    const applyEqualizer = useCallback(() => {
        if (!synthNodesRef.current.masterGain || !audioContextRef.current) return;
        
        if (filtersRef.current.length === 0) {
            initializeEqualizer();
        } else {
            updateEqualizerValues(eqValues, false);
        }
    }, [eqValues, initializeEqualizer, updateEqualizerValues]);

    /**
     * Aplica fade-in gradual no volume do áudio.
     * Aumenta o volume de 0 até 1 ao longo da duração especificada.
     * @param {number} durationMs - Duração do fade-in em milissegundos.
     */
    const fadeIn = useCallback((durationMs) => {
        if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
        }

        if (!gainNodeRef.current) return;

        const step = 0.05;
        const interval = durationMs / (1 / step);
        let volume = 0;

        fadeIntervalRef.current = setInterval(() => {
            volume += step;
            if (volume >= 1) {
                volume = 1;
                clearInterval(fadeIntervalRef.current);
                fadeIntervalRef.current = null;
            }
            gainNodeRef.current.gain.value = volume;
        }, interval);
    }, []);

    /**
     * Aplica fade-out gradual no volume do áudio.
     * Diminui o volume do valor atual até 0 ao longo da duração especificada.
     * @param {number} durationMs - Duração do fade-out em milissegundos.
     * @returns {Promise} Promise que resolve quando o fade-out é concluído.
     */
    const fadeOut = useCallback((durationMs) => {
        return new Promise((resolve) => {
            if (fadeIntervalRef.current) {
                clearInterval(fadeIntervalRef.current);
            }

            if (!gainNodeRef.current) {
                resolve();
                return;
            }

            const step = 0.05;
            const interval = durationMs / (1 / step);
            let volume = gainNodeRef.current.gain.value;

            fadeIntervalRef.current = setInterval(() => {
                volume -= step;
                if (volume <= 0) {
                    volume = 0;
                    clearInterval(fadeIntervalRef.current);
                    fadeIntervalRef.current = null;
                    resolve();
                }
                gainNodeRef.current.gain.value = volume;
            }, interval);
        });
    }, []);

    /**
     * Reproduz uma chave musical específica gerando os sons (Sintetizador).
     */
    const playKey = useCallback(async (key, onSuccess, onError, shouldStopOnSameKey = true) => {
        try {
            if (key === currentKey && isPlaying && shouldStopOnSameKey) {
                await stop();
                return;
            }

            if (key === currentKey && isPlaying && !shouldStopOnSameKey) {
                if (onSuccess) onSuccess(key);
                return;
            }

            if (isPlaying) {
                await stop();
            }

            initializeAudioContext();
            const ctx = audioContextRef.current;

            // Limpar nodes anteriores
            synthNodesRef.current.oscillators.forEach(osc => {
                try { osc.stop(); osc.disconnect(); } catch(e){}
            });
            if (synthNodesRef.current.masterGain) synthNodesRef.current.masterGain.disconnect();
            if (synthNodesRef.current.reverb) synthNodesRef.current.reverb.disconnect();
            if (synthNodesRef.current.filter) synthNodesRef.current.filter.disconnect();

            filtersRef.current.forEach(filter => {
                try { filter.disconnect(); } catch (e) {}
            });
            filtersRef.current = [];

            // Criar nós do sintetizador
            const masterGain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            const reverb = ctx.createConvolver();
            
            reverb.buffer = createReverbImpulse(ctx);
            
            filter.type = 'lowpass';
            filter.frequency.value = 800; // Tom quente e abafado
            filter.Q.value = 1;

            // Roteamento: Mix Seco (Gain) -> Filter -> EQ -> Saída
            // Mix Molhado (Reverb) -> Filter -> EQ -> Saída
            masterGain.connect(filter);
            
            const reverbGain = ctx.createGain();
            reverbGain.gain.value = 0.6; // Nível do reverb
            masterGain.connect(reverb);
            reverb.connect(reverbGain);
            reverbGain.connect(filter);

            synthNodesRef.current = {
                oscillators: [],
                masterGain: masterGain,
                reverb: reverb,
                filter: filter
            };

            const freqs = getChordFrequencies(key);
            if (freqs.length === 0) {
                throw new Error("Chave inválida");
            }

            // Gerar osciladores para cada frequência do acorde
            freqs.forEach((freq, i) => {
                // Criamos dois osciladores por nota com uma leve desafinação (Chorus)
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                
                // Sawtooth e Triangle juntos formam um som rico de pad
                osc1.type = 'sawtooth';
                osc2.type = 'triangle';
                
                osc1.frequency.value = freq;
                osc2.frequency.value = freq;
                
                // Desafinação sutil para criar um som amplo e espesso
                osc1.detune.value = 5;
                osc2.detune.value = -5;

                const oscGain = ctx.createGain();
                // Baixar volume de frequências mais altas para não irritar
                const volume = i === 0 ? 0.3 : (i > 3 ? 0.05 : 0.1); 
                oscGain.gain.value = volume;

                osc1.connect(oscGain);
                osc2.connect(oscGain);
                oscGain.connect(masterGain);

                osc1.start();
                osc2.start();

                synthNodesRef.current.oscillators.push(osc1, osc2);
            });

            // Conectar o filtro ao masterGain do sistema (onde aplica EQ e Fade)
            // No initializeEqualizer, ele conecta o synthNodesRef.current.masterGain ao EQ
            // Precisamos atualizar o initializeEqualizer para conectar o 'filter' final
            synthNodesRef.current.masterGain = filter; // Trick para o initialize usar a saída do filtro
            
            initializeEqualizer(eqValues);
            gainNodeRef.current.gain.value = 0; // Prepara para fade in

            fadeIn(2000); // Pad tem fade in suave e longo
            setCurrentKey(key);
            setIsPlaying(true);
            
            if (onSuccess) onSuccess(key);

        } catch (error) {
            console.error('Erro:', error);
            if (onError) onError(error);
        }
    }, [currentKey, isPlaying, initializeAudioContext, applyEqualizer, fadeIn]);

    /**
     * Para a reprodução de áudio atual.
     * Aplica fade-out, pausa o elemento de áudio e limpa todos os recursos.
     */
    const stop = useCallback(async () => {
        if (!isPlaying) return;
        
        await fadeOut(1500); // Fade out longo e suave
        
        synthNodesRef.current.oscillators.forEach(osc => {
            try { 
                osc.stop(); 
                osc.disconnect(); 
            } catch(e){}
        });
        
        if (synthNodesRef.current.masterGain) {
            try { synthNodesRef.current.masterGain.disconnect(); } catch(e){}
        }
        
        filtersRef.current.forEach(filter => {
            try { filter.disconnect(); } catch (e) {}
        });
        filtersRef.current = [];

        if (transitionIntervalRef.current) {
            clearInterval(transitionIntervalRef.current);
            transitionIntervalRef.current = null;
        }

        setCurrentKey(null);
        setIsPlaying(false);
    }, [fadeOut, isPlaying]);

    /**
     * Efeito que aplica a equalização sempre que os valores mudarem.
     */
    useEffect(() => {
        applyEqualizer();
    }, [applyEqualizer]);

    /**
     * Referência para armazenar o intervalo de transição do equalizador.
     * @type {React.MutableRefObject<number|null>}
     */
    const transitionIntervalRef = useRef(null);

    /**
     * Realiza transição suave entre valores do equalizador.
     * Usa função de easing (ease-in-out) para transição natural.
     * @param {Array<number>|string} targetValues - Valores alvo ou nome de preset ('reset' ou nome de preset).
     * @param {number} durationMs - Duração da transição em milissegundos (padrão: 800ms).
     */
    const transitionEqValues = useCallback((targetValues, durationMs = 800) => {
        if (transitionIntervalRef.current) {
            clearInterval(transitionIntervalRef.current);
            transitionIntervalRef.current = null;
        }

        if (!Array.isArray(targetValues) || targetValues.length !== eqBands.length) {
            // Se não for array de valores, usar applyPreset padrão
            if (targetValues === 'reset') {
                const resetValues = eqBands.map(() => 0);
                setEqValues(resetValues);
                updateEqualizerValues(resetValues, true);
            } else if (eqPresets[targetValues]) {
                const presetValues = [...eqPresets[targetValues]];
                setEqValues(presetValues);
                updateEqualizerValues(presetValues, true);
            }
            return;
        }

        // Garantir que os filtros estão inicializados
        if (filtersRef.current.length === 0 && audioSourceRef.current) {
            initializeEqualizer();
        }

        // Capturar valores iniciais do estado atual
        setEqValues(currentValues => {
            const startValues = [...currentValues];
            const steps = 15; // Menos passos para reduzir atualizações
            const stepDuration = Math.max(durationMs / steps, 50); // Mínimo 50ms entre atualizações
            let currentStep = 0;

            transitionIntervalRef.current = setInterval(() => {
                currentStep++;
                const progress = currentStep / steps;
                // Usar easing function (ease-in-out)
                const easedProgress = progress < 0.5 
                    ? 2 * progress * progress 
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

                const newValues = startValues.map((start, index) => {
                    const target = targetValues[index];
                    return start + (target - start) * easedProgress;
                });

                // Atualizar apenas os filtros de áudio com rampa suave (não atualizar estado a cada passo)
                updateEqualizerValues(newValues, true);

                if (currentStep >= steps) {
                    // Garantir valores finais exatos no estado e nos filtros
                    setEqValues([...targetValues]);
                    updateEqualizerValues(targetValues, true);
                    if (transitionIntervalRef.current) {
                        clearInterval(transitionIntervalRef.current);
                        transitionIntervalRef.current = null;
                    }
                }
            }, stepDuration);

            return currentValues; // Retornar valores atuais sem mudar
        });
    }, [setEqValues, updateEqualizerValues, initializeEqualizer]);

    return {
        currentKey,
        isPlaying,
        eqValues,
        setEqValues,
        playKey,
        stop,
        applyPreset: (preset) => {
            if (preset === 'reset') {
                transitionEqValues(eqBands.map(() => 0));
            } else if (eqPresets[preset]) {
                transitionEqValues([...eqPresets[preset]]);
            } else if (Array.isArray(preset)) {
                // Se for array de valores, fazer transição suave
                transitionEqValues(preset);
            }
        }
    };
}

/**
 * Componente de botão para representar uma tecla musical.
 * @param {Object} props - Propriedades do componente.
 * @param {string} props.keyValue - Valor da chave a ser exibida no botão.
 * @param {boolean} props.isSharp - Indica se a tecla é um sustenido.
 * @param {boolean} props.isActive - Indica se a tecla está atualmente ativa (tocando).
 * @param {Function} props.onClick - Função chamada quando o botão é clicado.
 * @returns {JSX.Element} Elemento de botão estilizado.
 */
function KeyButton({ keyValue, isSharp, isActive, onClick }) {
    return (
        <button
            className={`key-btn ${isSharp ? 'sharp' : ''} ${isActive ? 'active' : ''}`}
            onClick={onClick}
        >
            {keyValue}
        </button>
    );
}

/**
 * Componente de slider vertical para uma banda do equalizador.
 * @param {Object} props - Propriedades do componente.
 * @param {{freq: number, label: string}} props.band - Objeto contendo frequência e label da banda.
 * @param {number} props.value - Valor atual do ganho em dB.
 * @param {Function} props.onChange - Função chamada quando o valor do slider muda.
 * @returns {JSX.Element} Elemento de slider com label e valor exibido.
 */
function EqSlider({ band, value, onChange }) {
    return (
        <div className="eq-band">
            <div className="eq-label">{band.label}</div>
            <div className="eq-slider-container">
                <input
                    type="range"
                    className="eq-slider"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    orient="vertical"
                />
            </div>
            <div className="eq-value">
                {value >= 0 ? '+' : ''}{value.toFixed(1)}dB
            </div>
        </div>
    );
}

/**
 * Hook para gerenciar presets de equalizador personalizados.
 * Armazena e gerencia presets salvos no localStorage.
 * @returns {Object} Objeto contendo presets e funções para gerenciá-los.
 */
function useEqPresets() {
    const [presets, setPresets] = useState(() => {
        const saved = localStorage.getItem('worshipPadEqPresets');
        return saved ? JSON.parse(saved) : [];
    });

    const savePresets = useCallback((newPresets) => {
        setPresets(newPresets);
        localStorage.setItem('worshipPadEqPresets', JSON.stringify(newPresets));
    }, []);

    const addPreset = useCallback((name, values) => {
        const newPreset = {
            id: Date.now(),
            name: name.trim(),
            values: [...values]
        };
        const newPresets = [...presets, newPreset];
        savePresets(newPresets);
        return newPreset;
    }, [presets, savePresets]);

    const removePreset = useCallback((id) => {
        const newPresets = presets.filter(preset => preset.id !== id);
        savePresets(newPresets);
    }, [presets, savePresets]);

    const updatePreset = useCallback((id, updates) => {
        const newPresets = presets.map(preset => 
            preset.id === id ? { ...preset, ...updates } : preset
        );
        savePresets(newPresets);
    }, [presets, savePresets]);

    const getPresetById = useCallback((id) => {
        return presets.find(p => p.id === id);
    }, [presets]);

    return { presets, addPreset, removePreset, updatePreset, getPresetById };
}

/**
 * Componente para gerenciar presets de equalizador personalizados.
 * Permite criar, editar, remover e aplicar presets salvos.
 * @param {Object} props - Propriedades do componente.
 * @param {Array} props.presets - Lista de presets personalizados.
 * @param {Array<number>} props.eqValues - Valores atuais do equalizador.
 * @param {Function} props.addPreset - Função para adicionar um novo preset.
 * @param {Function} props.removePreset - Função para remover um preset.
 * @param {Function} props.updatePreset - Função para atualizar um preset existente.
 * @param {Function} props.applyPreset - Função para aplicar um preset.
 * @param {Function} props.showNotification - Função para exibir notificações.
 * @returns {JSX.Element} Interface de gerenciamento de presets.
 */
function PresetManager({ presets, eqValues, addPreset, removePreset, updatePreset, applyPreset, showNotification }) {
    const [showPresetManager, setShowPresetManager] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [editingPresetId, setEditingPresetId] = useState(null);
    const [editPresetName, setEditPresetName] = useState('');

    const handleSavePreset = useCallback(() => {
        if (!newPresetName.trim()) {
            showNotification('Por favor, insira um nome para o preset', 'error');
            return;
        }
        addPreset(newPresetName, eqValues);
        setNewPresetName('');
        showNotification(`Preset "${newPresetName}" criado`, 'success');
    }, [newPresetName, eqValues, addPreset, showNotification]);

    const handleStartEdit = useCallback((preset) => {
        setEditingPresetId(preset.id);
        setEditPresetName(preset.name);
    }, []);

    const handleSaveEdit = useCallback(() => {
        if (!editPresetName.trim()) {
            showNotification('Por favor, insira um nome para o preset', 'error');
            return;
        }
        updatePreset(editingPresetId, { name: editPresetName.trim() });
        setEditingPresetId(null);
        setEditPresetName('');
        showNotification('Preset atualizado', 'success');
    }, [editingPresetId, editPresetName, updatePreset, showNotification]);

    const handleCancelEdit = useCallback(() => {
        setEditingPresetId(null);
        setEditPresetName('');
    }, []);

    const handleApplyPreset = useCallback((preset) => {
        if (preset && preset.values) {
            applyPreset(preset.values);
            // Notificação removida conforme solicitado
        }
    }, [applyPreset]);

    return (
        <div className="preset-manager">
            <button 
                className="preset-manager-toggle"
                onClick={() => setShowPresetManager(!showPresetManager)}
            >
                {showPresetManager ? 'Ocultar' : 'Gerenciar'} Presets Personalizados
            </button>
            
            {showPresetManager && (
                <div className="preset-manager-content">
                    <div className="preset-manager-form">
                        <input
                            type="text"
                            placeholder="Nome do preset"
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSavePreset()}
                            className="preset-name-input"
                        />
                        <button className="save-preset-btn" onClick={handleSavePreset}>
                            Salvar Preset Atual
                        </button>
                    </div>

                    <div className="presets-list">
                        <h3>Presets Personalizados</h3>
                        {presets.length === 0 ? (
                            <div className="empty-presets">Nenhum preset personalizado criado</div>
                        ) : (
                            presets.map(preset => (
                                editingPresetId === preset.id ? (
                                    <div key={preset.id} className="preset-item editing">
                                        <input
                                            type="text"
                                            value={editPresetName}
                                            onChange={(e) => setEditPresetName(e.target.value)}
                                            className="preset-name-input"
                                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                                        />
                                        <button className="save-edit-btn" onClick={handleSaveEdit}>✓</button>
                                        <button className="cancel-edit-btn" onClick={handleCancelEdit}>✕</button>
                                    </div>
                                ) : (
                                    <div key={preset.id} className="preset-item">
                                        <span className="preset-name">{preset.name}</span>
                                        <div className="preset-actions">
                                            <button 
                                                className="apply-preset-btn"
                                                onClick={() => handleApplyPreset(preset)}
                                                title="Aplicar"
                                            >
                                                Aplicar
                                            </button>
                                            <button
                                                className="edit-preset-btn"
                                                onClick={() => handleStartEdit(preset)}
                                                title="Editar nome"
                                            >
                                                ✎
                                            </button>
                                            <button
                                                className="remove-preset-btn"
                                                onClick={() => {
                                                    removePreset(preset.id);
                                                    showNotification(`Preset "${preset.name}" removido`, 'info');
                                                }}
                                                title="Remover"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                )
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Componente principal do equalizador.
 * Exibe sliders para cada banda e botões de preset.
 * @param {Object} props - Propriedades do componente.
 * @param {Array<number>} props.eqValues - Valores atuais de ganho para cada banda.
 * @param {Function} props.setEqValues - Função para atualizar os valores do equalizador.
 * @param {Function} props.applyPreset - Função para aplicar um preset.
 * @param {Function} props.showNotification - Função para exibir notificações.
 * @param {Array} props.presets - Lista de presets personalizados.
 * @param {Function} props.addPreset - Função para adicionar um preset.
 * @param {Function} props.removePreset - Função para remover um preset.
 * @param {Function} props.updatePreset - Função para atualizar um preset.
 * @returns {JSX.Element} Interface completa do equalizador.
 */
function Equalizer({ eqValues, setEqValues, applyPreset, showNotification, presets, addPreset, removePreset, updatePreset }) {
    const handleSliderChange = useCallback((index, value) => {
        const newValues = [...eqValues];
        newValues[index] = value;
        setEqValues(newValues);
    }, [eqValues, setEqValues]);

    const handlePreset = useCallback((preset) => {
        applyPreset(preset);
        // Notificação removida conforme solicitado
    }, [applyPreset]);

    return (
        <div className="equalizer-section">
            <h2>Equalizador</h2>
            <div className="eq-controls">
                <button className="eq-preset-btn" onClick={() => handlePreset('flat')}>Flat</button>
                <button className="eq-preset-btn" onClick={() => handlePreset('vocal')}>Vocal</button>
                <button className="eq-preset-btn" onClick={() => handlePreset('bass')}>Bass</button>
                <button className="eq-preset-btn" onClick={() => handlePreset('treble')}>Treble</button>
                <button className="eq-preset-btn" onClick={() => handlePreset('reset')}>Reset</button>
            </div>
            <PresetManager
                presets={presets}
                eqValues={eqValues}
                addPreset={addPreset}
                removePreset={removePreset}
                updatePreset={updatePreset}
                applyPreset={setEqValues}
                showNotification={showNotification}
            />
            <div className="equalizer">
                {eqBands.map((band, index) => (
                    <EqSlider
                        key={band.freq}
                        band={band}
                        value={eqValues[index]}
                        onChange={(value) => handleSliderChange(index, value)}
                    />
                ))}
            </div>
        </div>
    );
}

/**
 * Hook para gerenciar notificações da aplicação.
 * Mantém uma lista de notificações ativas e as remove automaticamente após 3 segundos.
 * @returns {Object} Objeto contendo lista de notificações e função para exibir novas.
 */
function useNotifications() {
    const [notifications, setNotifications] = useState([]);

    const showNotification = useCallback((message, type = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000);
    }, []);

    return { notifications, showNotification };
}

/**
 * Componente para exibir uma notificação individual.
 * @param {Object} props - Propriedades do componente.
 * @param {{id: number, message: string, type: string}} props.notification - Objeto da notificação.
 * @returns {JSX.Element} Elemento de notificação estilizado.
 */
function Notification({ notification }) {
    return (
        <div className={`notification notification-${notification.type}`}>
            {notification.message}
        </div>
    );
}

/**
 * Hook para gerenciar a lista de músicas.
 * Armazena músicas no localStorage e fornece funções para CRUD.
 * @returns {Object} Objeto contendo lista de músicas e funções para gerenciá-las.
 */
function useSongList() {
    const [songs, setSongs] = useState(() => {
        const saved = localStorage.getItem('worshipPadSongs');
        return saved ? JSON.parse(saved) : [];
    });

    const saveSongs = useCallback((newSongs) => {
        setSongs(newSongs);
        localStorage.setItem('worshipPadSongs', JSON.stringify(newSongs));
    }, []);

    const addSong = useCallback((name, key, presetId = null) => {
        const newSong = {
            id: Date.now(),
            name: name.trim(),
            key: key,
            presetId: presetId
        };
        const newSongs = [...songs, newSong];
        saveSongs(newSongs);
        return newSong;
    }, [songs, saveSongs]);

    const removeSong = useCallback((id) => {
        const newSongs = songs.filter(song => song.id !== id);
        saveSongs(newSongs);
    }, [songs, saveSongs]);

    const reorderSongs = useCallback((fromIndex, toIndex) => {
        const newSongs = [...songs];
        const [removed] = newSongs.splice(fromIndex, 1);
        newSongs.splice(toIndex, 0, removed);
        saveSongs(newSongs);
    }, [songs, saveSongs]);

    const updateSong = useCallback((id, updates) => {
        const newSongs = songs.map(song => 
            song.id === id ? { ...song, ...updates } : song
        );
        saveSongs(newSongs);
    }, [songs, saveSongs]);

    return { songs, addSong, removeSong, reorderSongs, updateSong };
}

/**
 * Componente para exibir e gerenciar a lista de músicas.
 * Permite adicionar, editar, remover e reordenar músicas, além de reproduzi-las.
 * @param {Object} props - Propriedades do componente.
 * @param {Array} props.songs - Lista de músicas.
 * @param {Function} props.addSong - Função para adicionar uma música.
 * @param {Function} props.removeSong - Função para remover uma música.
 * @param {Function} props.reorderSongs - Função para reordenar músicas.
 * @param {Function} props.updateSong - Função para atualizar uma música.
 * @param {Function} props.onSelectSong - Função chamada quando uma música é selecionada.
 * @param {Function} props.playKey - Função para reproduzir uma chave musical.
 * @param {Function} props.showNotification - Função para exibir notificações.
 * @param {boolean} props.showSongList - Indica se a lista deve ser exibida.
 * @param {Function} props.setIsMinor - Função para definir o modo menor.
 * @param {Array} props.presets - Lista de presets de equalizador.
 * @param {Function} props.applyEqPreset - Função para aplicar um preset de EQ.
 * @param {string} props.currentKey - Chave musical atualmente tocando.
 * @param {Object} props.currentSong - Música atualmente selecionada.
 * @param {Function} props.stop - Função para parar a reprodução.
 * @param {Function} props.handleNextSong - Função para avançar para a próxima música.
 * @returns {JSX.Element} Interface completa da lista de músicas.
 */
function SongList({ songs, addSong, removeSong, reorderSongs, updateSong, onSelectSong, playKey, showNotification, showSongList, setIsMinor, presets, applyEqPreset, currentKey, currentSong, stop, handleNextSong }) {
    const [newSongName, setNewSongName] = useState('');
    const [newSongKey, setNewSongKey] = useState('C');
    const [newSongPresetId, setNewSongPresetId] = useState('flat');
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [editingSongId, setEditingSongId] = useState(null);
    const [editSongName, setEditSongName] = useState('');
    const [editSongKey, setEditSongKey] = useState('');
    const [editSongPresetId, setEditSongPresetId] = useState('');

    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const allKeys = [...keys, ...keys.map(k => k + 'm')];

    // Combinar presets padrão com presets personalizados
    const allPresets = [
        { id: 'flat', name: 'Flat', values: eqPresets.flat, isDefault: true },
        { id: 'vocal', name: 'Vocal', values: eqPresets.vocal, isDefault: true },
        { id: 'bass', name: 'Bass', values: eqPresets.bass, isDefault: true },
        { id: 'treble', name: 'Treble', values: eqPresets.treble, isDefault: true },
        ...presets.map(p => ({ ...p, isDefault: false }))
    ];

    const handleAddSong = useCallback(() => {
        if (!newSongName.trim()) {
            showNotification('Por favor, insira um nome para a música', 'error');
            return;
        }
        const songName = newSongName.trim();
        // Presets padrão são strings, presets personalizados são números
        // Se não houver preset selecionado, usar o primeiro (flat) como padrão
        const presetId = newSongPresetId ? (isNaN(newSongPresetId) ? newSongPresetId : parseInt(newSongPresetId)) : (allPresets.length > 0 ? allPresets[0].id : null);
        addSong(songName, newSongKey, presetId);
        setNewSongName('');
        setNewSongKey('C');
        setNewSongPresetId('flat');
        showNotification(`Música "${songName}" adicionada`, 'success');
    }, [newSongName, newSongKey, newSongPresetId, addSong, showNotification, allPresets]);

    const handleSelectSong = useCallback(async (song) => {
        // Verificar se é a mesma música que está tocando
        const isSameSong = currentSong && currentSong.id === song.id;
        
        // Se for a mesma música, para de tocar
        if (isSameSong) {
            if (stop) {
                await stop();
            }
            onSelectSong(null);
            showNotification(`Parado: ${song.name}`, 'info');
            return;
        }
        
        // Verificar se é tom menor e atualizar o flag
        const isMinorKey = song.key.endsWith('m');
        if (setIsMinor) {
            setIsMinor(isMinorKey);
        }
        
        // Aplicar preset de EQ se houver
        if (song.presetId && applyEqPreset) {
            const preset = allPresets.find(p => p.id === song.presetId);
            if (preset) {
                applyEqPreset(preset.values);
                // Notificação removida conforme solicitado
            }
        }
        
        onSelectSong(song);
        
        // Tocar a música
        playKey(
            song.key,
            (successKey) => {
                showNotification(`Tocando: ${song.name} (${successKey})`, 'success');
            },
            (error) => {
                showNotification(error.message || 'Erro ao tocar', 'error');
            },
            false
        );
    }, [onSelectSong, playKey, showNotification, setIsMinor, allPresets, applyEqPreset, currentSong, stop]);

    const handleDragStart = useCallback((index) => {
        setDraggedIndex(index);
    }, []);

    const handleDragOver = useCallback((e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        setDragOverIndex(index);
    }, [draggedIndex]);

    const handleDragEnd = useCallback(() => {
        if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
            reorderSongs(draggedIndex, dragOverIndex);
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    }, [draggedIndex, dragOverIndex, reorderSongs]);

    const handleMoveUp = useCallback((index) => {
        if (index > 0) {
            reorderSongs(index, index - 1);
            showNotification('Música movida para cima', 'info');
        }
    }, [reorderSongs, showNotification]);

    const handleMoveDown = useCallback((index) => {
        if (index < songs.length - 1) {
            reorderSongs(index, index + 1);
            showNotification('Música movida para baixo', 'info');
        }
    }, [reorderSongs, songs.length, showNotification]);

    const handleStartEdit = useCallback((song) => {
        setEditingSongId(song.id);
        setEditSongName(song.name);
        setEditSongKey(song.key);
        // Presets padrão são strings, presets personalizados são números
        // Se não houver preset, usar o primeiro (flat) como padrão
        const defaultPresetId = allPresets.length > 0 ? allPresets[0].id : '';
        setEditSongPresetId(song.presetId ? (typeof song.presetId === 'string' ? song.presetId : song.presetId.toString()) : defaultPresetId);
    }, [allPresets]);

    const handleCancelEdit = useCallback(() => {
        setEditingSongId(null);
        setEditSongName('');
        setEditSongKey('');
        setEditSongPresetId('');
    }, []);

    const handleSaveEdit = useCallback(() => {
        if (!editSongName.trim()) {
            showNotification('Por favor, insira um nome para a música', 'error');
            return;
        }
        // Presets padrão são strings, presets personalizados são números
        // Se não houver preset selecionado, usar o primeiro (flat) como padrão
        const presetId = editSongPresetId ? (isNaN(editSongPresetId) ? editSongPresetId : parseInt(editSongPresetId)) : (allPresets.length > 0 ? allPresets[0].id : null);
        updateSong(editingSongId, {
            name: editSongName.trim(),
            key: editSongKey,
            presetId: presetId
        });
        showNotification('Música atualizada', 'success');
        handleCancelEdit();
    }, [editingSongId, editSongName, editSongKey, editSongPresetId, updateSong, showNotification, allPresets]);

    return (
        <>
            {showSongList && (
                <div className="song-list-wrapper">
                    <div className="song-list-section">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%' }}>
                            <h2 style={{ paddingBottom: '5px'}}>Lista de Músicas</h2>
                            {songs.length > 0 && (
                                <button
                                    className="next-btn-songlist"
                                    onClick={handleNextSong}
                                    title="Próxima música"
                                >
                                    ▶
                                </button>
                            )}
                        </div>
                        <div className="song-list-add-form">
                            <input
                                type="text"
                                placeholder="Nome da música"
                                value={newSongName}
                                onChange={(e) => setNewSongName(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddSong()}
                                className="song-name-input"
                            />
                            <select
                                value={newSongKey}
                                onChange={(e) => setNewSongKey(e.target.value)}
                                className="song-key-select"
                            >
                                {allKeys.map(key => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                            </select>
                            <select
                                value={newSongPresetId}
                                onChange={(e) => setNewSongPresetId(e.target.value)}
                                className="song-preset-select"
                            >
                                {allPresets.map(preset => (
                                    <option key={preset.id} value={preset.id}>{preset.name}</option>
                                ))}
                            </select>
                            <button className="add-song-btn" onClick={handleAddSong}>
                                Adicionar
                            </button>
                        </div>

                        <div className="song-list-items">
                            {songs.length === 0 ? (
                                <div className="empty-list">Nenhuma música adicionada ainda</div>
                            ) : (
                                songs.map((song, index) => (
                                    editingSongId === song.id ? (
                                        <div key={song.id} className="song-item editing">
                                            <div className="song-edit-form">
                                                <input
                                                    type="text"
                                                    value={editSongName}
                                                    onChange={(e) => setEditSongName(e.target.value)}
                                                    className="song-name-input"
                                                    placeholder="Nome da música"
                                                />
                                                <select
                                                    value={editSongKey}
                                                    onChange={(e) => setEditSongKey(e.target.value)}
                                                    className="song-key-select"
                                                >
                                                    {allKeys.map(key => (
                                                        <option key={key} value={key}>{key}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={editSongPresetId}
                                                    onChange={(e) => setEditSongPresetId(e.target.value)}
                                                    className="song-preset-select"
                                                >
                                                    {allPresets.map(preset => (
                                                        <option key={preset.id} value={preset.id}>{preset.name}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    className="save-edit-btn"
                                                    onClick={handleSaveEdit}
                                                    title="Salvar"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    className="cancel-edit-btn"
                                                    onClick={handleCancelEdit}
                                                    title="Cancelar"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            key={song.id}
                                            className={`song-item ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index && draggedIndex !== index ? 'drag-over' : ''}`}
                                            draggable
                                            onDragStart={() => handleDragStart(index)}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <div className="song-item-content" onClick={() => handleSelectSong(song)}>
                                                <span className="song-number">{index + 1}</span>
                                                <span className="song-name">{song.name}</span>
                                                <span className="song-key">{song.key}</span>
                                                {song.presetId && (
                                                    <span className="song-preset-badge">
                                                        {allPresets.find(p => p.id === song.presetId)?.name || 'Preset'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="song-item-actions">
                                                <button
                                                    className="edit-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStartEdit(song);
                                                    }}
                                                    title="Editar"
                                                >
                                                    ✎
                                                </button>
                                                <button
                                                    className="move-btn up"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMoveUp(index);
                                                    }}
                                                    disabled={index === 0}
                                                    title="Mover para cima"
                                                >
                                                    ↑
                                                </button>
                                                <button
                                                    className="move-btn down"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleMoveDown(index);
                                                    }}
                                                    disabled={index === songs.length - 1}
                                                    title="Mover para baixo"
                                                >
                                                    ↓
                                                </button>
                                                <button
                                                    className="remove-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeSong(song.id);
                                                        showNotification(`Música "${song.name}" removida`, 'info');
                                                    }}
                                                    title="Remover"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    )
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/**
 * Componente principal da aplicação WorshipPad.
 * Gerencia o estado global, interface do usuário e coordena todos os componentes.
 * @returns {JSX.Element} Interface principal da aplicação.
 */
function App() {
    const { currentKey, isPlaying, eqValues, setEqValues, playKey, stop, applyPreset } = useAudioPlayer();
    const { notifications, showNotification } = useNotifications();
    const [showEqualizer, setShowEqualizer] = useState(false);
    const [showSongList, setShowSongList] = useState(false);
    const [isMinor, setIsMinor] = useState(false);
    const [currentSong, setCurrentSong] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('worshipPadDarkMode');
        return saved ? JSON.parse(saved) : false;
    });
    const { songs, addSong, removeSong, reorderSongs, updateSong } = useSongList();
    const { presets, addPreset, removePreset, updatePreset } = useEqPresets();

    /**
     * Efeito para aplicar o tema escuro/claro baseado no estado isDarkMode.
     * Salva a preferência no localStorage.
     */
    useEffect(() => {
        const root = document.documentElement;
        if (isDarkMode) {
            root.setAttribute('data-theme', 'dark');
        } else {
            root.removeAttribute('data-theme');
        }
        localStorage.setItem('worshipPadDarkMode', JSON.stringify(isDarkMode));
    }, [isDarkMode]);

    /**
     * Alterna a exibição do equalizador, fechando a lista de músicas se estiver aberta.
     */
    const handleToggleEqualizer = useCallback(() => {
        setShowEqualizer(prev => {
            if (!prev) {
                setShowSongList(false);
            }
            return !prev;
        });
    }, []);

    const handleToggleSongList = useCallback(() => {
        setShowSongList(prev => {
            if (!prev) {
                setShowEqualizer(false);
            }
            return !prev;
        });
    }, []);

    /**
     * Lista de todas as notas musicais disponíveis (sem acordes menores).
     * @constant {Array<string>}
     */
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    /**
     * Extrai a nota base de uma chave musical, removendo o sufixo 'm' se presente.
     * @param {string} note - Chave musical (ex: 'Cm', 'C#m', 'C').
     * @returns {string|null} Nota base sem o sufixo 'm', ou null se a nota for inválida.
     */
    const getBaseNote = useCallback((note) => {
        if (!note) return null;
        if (note.endsWith('m')) {
            return note.substring(0, note.length - 1);
        }
        return note;
    }, []);

    /**
     * Efeito que troca automaticamente entre modo maior e menor quando o flag isMinor muda.
     * Se uma música estiver tocando, atualiza a chave sem tocar automaticamente.
     * Se não houver música, toca automaticamente a nova chave.
     */
    useEffect(() => {
        if (isPlaying && currentKey && currentSong) {
            // Se uma música estiver tocando, apenas parar e não tocar automaticamente
            const baseNote = getBaseNote(currentKey);
            if (baseNote) {
                const newKey = isMinor ? baseNote + 'm' : baseNote;
                if (newKey !== currentKey) {
                    // Parar a música atual
                    stop().then(() => {
                        // Atualizar a chave da música sem tocar
                        const updatedSong = {
                            ...currentSong,
                            key: newKey
                        };
                        setCurrentSong(updatedSong);
                        // Atualizar a música na lista também
                        updateSong(currentSong.id, { key: newKey });
                    });
                }
            }
        } else if (isPlaying && currentKey && !currentSong) {
            // Se não houver música tocando, comportamento normal (tocar automaticamente)
            const baseNote = getBaseNote(currentKey);
            if (baseNote) {
                const newKey = isMinor ? baseNote + 'm' : baseNote;
                if (newKey !== currentKey) {
                    playKey(
                        newKey,
                        (successKey) => {
                            showNotification(`Trocado para: ${successKey}`, 'info');
                        },
                        (error) => {
                            showNotification(error.message || 'Erro ao trocar', 'error');
                        }
                    );
                }
            }
        }
    }, [isMinor, isPlaying, currentKey, currentSong, getBaseNote, playKey, stop, updateSong, showNotification]);

    const handleKeyClick = useCallback(async (key) => {
        // Se o flag de menor estiver marcado, adiciona 'm' no final
        const keyToPlay = isMinor ? key + 'm' : key;
        
        // Não limpar música atual para manter a sequência guardada
        // A sequência continua preservada mesmo quando um tom é acionado diretamente
        
        playKey(
            keyToPlay,
            (successKey) => {
                showNotification(`Tocando: ${successKey}`, 'success');
            },
            (error) => {
                showNotification(error.message || 'Erro ao tocar', 'error');
            }
        );
    }, [playKey, showNotification, isMinor]);

    const handleStop = useCallback(async () => {
        try {
            await stop();
            // Não limpar currentSong para manter a sequência
            // setCurrentSong(null);
            showNotification('Parado', 'info');
        } catch (error) {
            showNotification(error.message || 'Erro ao parar', 'error');
        }
    }, [stop, showNotification]);

    /**
     * Avança para a próxima música na lista.
     * Se não houver música tocando, inicia a primeira da lista.
     * Se for a última música, para a reprodução.
     * Aplica automaticamente o preset de EQ associado à música.
     */
    const handleNextSong = useCallback(async () => {
        if (!currentSong || songs.length === 0) {
            // Se não há música tocando, tocar a primeira da lista
            if (songs.length > 0) {
                const firstSong = songs[0];
                const isMinorKey = firstSong.key.endsWith('m');
                setIsMinor(isMinorKey);
                
                // Aplicar preset se houver
                const allPresets = [
                    { id: 'flat', name: 'Flat', values: eqPresets.flat, isDefault: true },
                    { id: 'vocal', name: 'Vocal', values: eqPresets.vocal, isDefault: true },
                    { id: 'bass', name: 'Bass', values: eqPresets.bass, isDefault: true },
                    { id: 'treble', name: 'Treble', values: eqPresets.treble, isDefault: true },
                    ...presets.map(p => ({ ...p, isDefault: false }))
                ];
                
                if (firstSong.presetId) {
                    const preset = allPresets.find(p => p.id === firstSong.presetId);
                    if (preset) {
                        applyPreset(preset.values);
                    }
                }
                
                setCurrentSong(firstSong);
                playKey(
                    firstSong.key,
                    (successKey) => {
                        showNotification(`Tocando: ${firstSong.name} (${successKey})`, 'success');
                    },
                    (error) => {
                        showNotification(error.message || 'Erro ao tocar', 'error');
                    },
                    false
                );
            }
            return;
        }

        // Encontrar índice da música atual
        const currentIndex = songs.findIndex(song => song.id === currentSong.id);
        
        if (currentIndex === -1) {
            showNotification('Música atual não encontrada na lista', 'error');
            return;
        }

        // Verificar se é a última música
        if (currentIndex === songs.length - 1) {
            // Se for a última, parar de tocar
            await stop();
            setCurrentSong(null);
            showNotification('Fim da lista', 'info');
            return;
        }

        // Calcular próximo índice
        const nextIndex = currentIndex + 1;
        const nextSong = songs[nextIndex];

        // Verificar se é tom menor e atualizar o flag
        const isMinorKey = nextSong.key.endsWith('m');
        setIsMinor(isMinorKey);

        // Aplicar preset de EQ se houver
        const allPresets = [
            { id: 'flat', name: 'Flat', values: eqPresets.flat, isDefault: true },
            { id: 'vocal', name: 'Vocal', values: eqPresets.vocal, isDefault: true },
            { id: 'bass', name: 'Bass', values: eqPresets.bass, isDefault: true },
            { id: 'treble', name: 'Treble', values: eqPresets.treble, isDefault: true },
            ...presets.map(p => ({ ...p, isDefault: false }))
        ];

        if (nextSong.presetId) {
            const preset = allPresets.find(p => p.id === nextSong.presetId);
            if (preset) {
                applyPreset(preset.values);
            }
        }

        // Atualizar música atual e tocar
        setCurrentSong(nextSong);
        playKey(
            nextSong.key,
            (successKey) => {
                showNotification(`Tocando: ${nextSong.name} (${successKey})`, 'success');
            },
            (error) => {
                showNotification(error.message || 'Erro ao tocar', 'error');
            },
            false
        );
    }, [currentSong, songs, playKey, stop, showNotification, setIsMinor, presets, applyPreset]);

    return (
        <div className="container">
            <header>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', width: '100%' }}>
                    {!showSongList && songs.length > 0 && (
                        <button
                            className="next-btn-header"
                            onClick={handleNextSong}
                            title="Próxima música"
                        >
                            ▶
                        </button>
                    )}
                    <h1 style={{ margin: 0 }}>WorshipPad</h1>
                    <button
                        className="theme-toggle-btn"
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        title={isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
                        style={{ position: 'absolute', right: 0 }}
                    >
                        {isDarkMode ? '☀️' : '🌙'}
                    </button>
                </div>
                <p className="subtitle">Controle de Pads Musicais</p>
            </header>

            <div className="status-bar">
                <span id="statusText">
                    {isPlaying ? `Tocando: ${currentKey}` : 'Pronto para tocar'}
                </span>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {currentSong && (
                        <span className="current-song">{currentSong.name}</span>
                    )}
                    {currentKey && (
                        <span className="current-key">{currentKey}</span>
                    )}
                </div>
            </div>

            <div className="minor-toggle-container">
                <label className="minor-toggle-label">
                    <input
                        type="checkbox"
                        checked={isMinor}
                        onChange={(e) => setIsMinor(e.target.checked)}
                        className="minor-checkbox"
                    />
                    <span className="minor-toggle-text">Menor (m)</span>
                </label>
            </div>

            <div className="keys-container">
                <div className="key-row">
                    {keys.map(key => {
                        // Mostrar 'm' na frente quando isMinor estiver ativo
                        const displayKey = isMinor ? key + 'm' : key;
                        const keyToPlay = isMinor ? key + 'm' : key;
                        const baseNote = getBaseNote(currentKey);
                        const isActive = baseNote === key && isPlaying;
                        
                        return (
                            <KeyButton
                                key={key}
                                keyValue={displayKey}
                                isSharp={false}
                                isActive={isActive}
                                onClick={() => handleKeyClick(key)}
                            />
                        );
                    })}
                </div>
            </div>

            <div className="controls">
                <button className="control-btn stop-btn" onClick={handleStop}>
                    <span>Parar</span>
                </button>
                <button 
                    className={`control-btn songs-btn ${showSongList ? 'active' : ''}`}
                    onClick={handleToggleSongList}
                >
                    <span>{showSongList ? 'Ocultar' : 'Mostrar'} Lista de Músicas</span>
                </button>
                <button 
                    className={`control-btn eq-toggle-btn ${showEqualizer ? 'active' : ''}`}
                    onClick={handleToggleEqualizer}
                >
                    <span>{showEqualizer ? 'Ocultar' : 'Mostrar'} Equalizador</span>
                </button>
            </div>

            {showEqualizer && (
                <div className="equalizer-wrapper">
                    <Equalizer
                        eqValues={eqValues}
                        setEqValues={setEqValues}
                        applyPreset={applyPreset}
                        showNotification={showNotification}
                        presets={presets}
                        addPreset={addPreset}
                        removePreset={removePreset}
                        updatePreset={updatePreset}
                    />
                </div>
            )}

            {showSongList && (
                <SongList
                    songs={songs}
                    addSong={addSong}
                    removeSong={removeSong}
                    reorderSongs={reorderSongs}
                    updateSong={updateSong}
                    onSelectSong={(song) => {
                        setCurrentSong(song);
                    }}
                    playKey={playKey}
                    showNotification={showNotification}
                    showSongList={showSongList}
                    setIsMinor={setIsMinor}
                    presets={presets}
                    applyEqPreset={applyPreset}
                    currentKey={currentKey}
                    currentSong={currentSong}
                    stop={stop}
                    handleNextSong={handleNextSong}
                />
            )}

            <div className="info">
                <p>Dica: Clique no mesmo tom novamente para parar</p>
            </div>

            <div className="notifications-container">
                {notifications.map(notification => (
                    <Notification key={notification.id} notification={notification} />
                ))}
            </div>
        </div>
    );
}

export default App;
