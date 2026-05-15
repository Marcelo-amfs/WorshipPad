import React, { useState, useEffect, useRef, useCallback } from 'react';

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const baseFreqs = {
    'C': 130.81, 'C#': 138.59, 'D': 146.83, 'D#': 155.56,
    'E': 164.81, 'F': 174.61, 'F#': 185.00, 'G': 196.00,
    'G#': 207.65, 'A': 220.00, 'A#': 233.08, 'B': 246.94
};

// Fórmulas dos acordes
const chordFormulas = {
    major: [0, 4, 7],
    minor: [0, 3, 7]
};

function createChord(rootNote, isMinor = false) {
    const rootIndex = noteNames.indexOf(rootNote);
    if (rootIndex === -1) { throw new Error(`Nota inválida: ${rootNote}`); }
    const type = isMinor ? 'minor' : 'major';
    const intervals = chordFormulas[type];

    return intervals.map(semitones => {
        const noteIndex = (rootIndex + semitones) % 12;
        return {
            note: noteNames[noteIndex],
            frequency: Number((baseFreqs[rootNote] * Math.pow(2, semitones / 12)).toFixed(2))
        };
    });
}

// Configurações de timbres (Layers)
const layerDefs = {
    "Agudo": { type: 'sine', octave: 2 },
    "Ambiente Worship 1": { type: 'triangle', octave: 0 },
    "Ambiente Worship 2": { type: 'sine', octave: 0, detune: 5 },
    "Ambrose": { type: 'square', octave: 0, filter: 400 },
    "Angels": { type: 'sine', octave: 3, detune: 2 },
    "Atmospheric": { type: 'triangle', octave: 1, detune: -5 },
    "Cathedral": { type: 'sine', octave: 0 },
    "Cinematic": { type: 'sawtooth', octave: -1, filter: 300 },
    "Continuous": { type: 'sine', octave: 0 },
    "Evolving": { type: 'triangle', octave: 0, detune: 3 },
    "Grave": { type: 'sine', octave: -1 },
    "Guitar": { type: 'sawtooth', octave: 0, filter: 800 },
    "Hillsong": { type: 'triangle', octave: 1 },
    "Motion 1": { type: 'sine', octave: 0, detune: 7 },
    "Motion 2": { type: 'triangle', octave: 0, detune: -7 },
    "Organ Choir": { type: 'square', octave: 0, filter: 600 },
    "Organ": { type: 'sine', octave: 0 },
    "Rhodes Shimmer": { type: 'triangle', octave: 2 },
    "Shimmer": { type: 'sine', octave: 2, detune: 2 },
    "Shimmery": { type: 'sawtooth', octave: 2, filter: 1000 },
    "Shiny": { type: 'triangle', octave: 3 },
    "Solutions": { type: 'sine', octave: 0, detune: 4 },
    "Stout Creek": { type: 'triangle', octave: -1, detune: 2 },
    "Verb": { type: 'sine', octave: 1 },
    "Warm": { type: 'triangle', octave: 0 }
};

function usePlaylist() {
    const [songs, setSongs] = useState(() => {
        const saved = localStorage.getItem('worshipPadPlaylist');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('worshipPadPlaylist', JSON.stringify(songs));
    }, [songs]);

    const addSong = (name, key) => setSongs([...songs, { id: Date.now(), name, key }]);
    const removeSong = id => setSongs(songs.filter(s => s.id !== id));

    return { songs, addSong, removeSong };
}

function App() {
    const [currentKey, setCurrentKey] = useState(null);
    const [isMinor, setIsMinor] = useState(false);

    const { songs, addSong, removeSong } = usePlaylist();
    const [newSongName, setNewSongName] = useState('');
    const [newSongKey, setNewSongKey] = useState('C');
    const [currentSongIndex, setCurrentSongIndex] = useState(-1);
    
    const [showMixer, setShowMixer] = useState(false);
    const defaultVolumes = {
        "Agudo": 30,
        "Ambiente Worship 1": 35,
        "Ambiente Worship 2": 15,
        "Ambrose": 10,
        "Angels": 40,
        "Atmospheric": 90,
        "Cathedral": 50,
        "Cinematic": 55,
        "Continuous": 65,
        "Evolving": 90,
        "Grave": 65,
        "Guitar": 55,
        "Hillsong": 50,
        "Motion 1": 30,
        "Motion 2": 40,
        "Organ Choir": 30,
        "Organ": 55,
        "Rhodes Shimmer": 25,
        "Shimmer": 40,
        "Shimmery": 80,
        "Shiny": 75,
        "Solutions": 40,
        "Stout Creek": 55,
        "Verb": 75,
        "Warm": 40
    };

    const [layerVolumes, setLayerVolumes] = useState(() => {
        const saved = localStorage.getItem('padLayers_v3');
        if (saved) return JSON.parse(saved);
        return defaultVolumes;
    });

    const audioCtxRef = useRef(null);
    const nodesRef = useRef({
        oscillators: [],
        layerGains: {},
        masterGain: null,
        audioElements: [] // Store active HTMLAudioElements
    });

    useEffect(() => {
        localStorage.setItem('padLayers_v3', JSON.stringify(layerVolumes));
        
        // 1. Atualizar ganho dos Osciladores Web Audio API
        if (nodesRef.current.layerGains && audioCtxRef.current) {
            const now = audioCtxRef.current.currentTime;
            Object.entries(layerVolumes).forEach(([name, vol]) => {
                if (nodesRef.current.layerGains[name]) {
                    nodesRef.current.layerGains[name].gain.setTargetAtTime(vol / 100, now, 0.1);
                }
            });
        }
        
        // 2. Atualizar ou carregar os Samplers MP3
        if (!currentKey) return;
        
        const rootNote = currentKey.replace('m', '');
        const urlNote = rootNote.replace('#', '%23');

        Object.entries(layerVolumes).forEach(([layerName, vol]) => {
            let existingItem = nodesRef.current.audioElements.find(i => i.layer === layerName && !i.isFadingOut);
            
            if (existingItem) {
                existingItem.targetVolume = vol;
                existingItem.audio.volume = vol / 100;
            } else if (vol > 0) {
                // Instancia o áudio sob demanda (Lazy Load)
                const slug = layerName.toLowerCase().replace(/ /g, '-');
                const url = `https://tocandofacil.com.br/padworship/padworship/${urlNote}/${urlNote}-${slug}.mp3`;
                const audio = new Audio(url);
                audio.loop = true;
                audio.volume = vol / 100;
                audio.load();
                const p = audio.play();
                if(p !== undefined) {
                    p.catch(e => console.log("Bloqueio de auto-play mobile. O Synth nativo continuará.", e));
                }
                
                nodesRef.current.audioElements.push({
                    key: currentKey,
                    layer: layerName,
                    audio: audio,
                    targetVolume: vol,
                    isFadingOut: false
                });
            }
        });
    }, [layerVolumes, currentKey]);

    const stopSound = useCallback(() => {
        // Stop Oscillators
        if (nodesRef.current.masterGain && audioCtxRef.current) {
            const gain = nodesRef.current.masterGain.gain;
            const now = audioCtxRef.current.currentTime;
            gain.cancelScheduledValues(now);
            gain.setValueAtTime(gain.value, now);
            gain.exponentialRampToValueAtTime(0.0001, now + 2);
            
            const oscs = nodesRef.current.oscillators;
            setTimeout(() => {
                oscs.forEach(oData => { try { oData.osc.stop(); oData.osc.disconnect(); } catch (e) { } });
            }, 2100);
        }

        // Stop MP3s
        const audiosToStop = nodesRef.current.audioElements;
        nodesRef.current.audioElements = []; 
        
        audiosToStop.forEach(item => item.isFadingOut = true);

        // Fade out de 2.5 segundos macio
        let fadeVol = 1.0;
        const fadeInterval = setInterval(() => {
            fadeVol -= 0.05;
            if (fadeVol <= 0) {
                clearInterval(fadeInterval);
                audiosToStop.forEach(item => {
                    item.audio.pause();
                    item.audio.src = ""; 
                });
            } else {
                audiosToStop.forEach(item => {
                    try {
                        item.audio.volume = (item.targetVolume / 100) * fadeVol;
                    } catch(e) {}
                });
            }
        }, 125);

        setCurrentKey(null);
        setCurrentSongIndex(-1);
    }, []);

    const playNextSong = useCallback(() => {
        if (songs.length === 0) return;
        const nextIdx = currentSongIndex + 1;
        if (nextIdx < songs.length) {
            setCurrentSongIndex(nextIdx);
            const song = songs[nextIdx];
            const isMin = song.key.endsWith('m');
            setIsMinor(isMin);
            playSound(song.key.replace('m', ''), isMin);
        } else {
            stopSound();
        }
    }, [songs, currentSongIndex, stopSound]);

    const playSound = useCallback((keyNote, forceMinor = null) => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        const now = ctx.currentTime;

        const applyMinor = forceMinor !== null ? forceMinor : isMinor;
        const fullKey = keyNote + (applyMinor ? 'm' : '');

        if (currentKey === fullKey) {
            stopSound();
            return;
        }

        const chord = createChord(keyNote, applyMinor);
        const rootFreq = chord[0].frequency;
        const thirdFreq = chord[1].frequency;
        const fifthFreq = chord[2].frequency;

        // Se já estiver tocando, faz Glide do sintetizador
        if (currentKey && nodesRef.current.oscillators && nodesRef.current.oscillators.length > 0) {
            nodesRef.current.oscillators.forEach(oData => {
                let baseFreq = oData.isRoot ? rootFreq : (oData.isThird ? thirdFreq : fifthFreq);
                let targetFreq = baseFreq * Math.pow(2, oData.octave);
                if (oData.osc && oData.osc.frequency) {
                    oData.osc.frequency.cancelScheduledValues(now);
                    oData.osc.frequency.setValueAtTime(oData.osc.frequency.value, now);
                    oData.osc.frequency.exponentialRampToValueAtTime(targetFreq, now + 1.2);
                }
            });
            // O MP3 fará crossfade logo abaixo, mesmo durante glide de synth, para manter a textura fluída.
        }

        if (currentKey) {
            stopSound(); // Fade-out old MP3s and Synths
        }

        // Setup Web Audio Synthesizers (Native Fallback/Layer)
        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.0001, now);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        filter.Q.value = 0.2;
        
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;

        masterGain.connect(filter);
        filter.connect(compressor);
        compressor.connect(ctx.destination);

        const newOscs = [];
        const layerGains = {};

        Object.entries(layerDefs).forEach(([layerName, def]) => {
            const layerGain = ctx.createGain();
            layerGain.gain.value = (layerVolumes[layerName] || 0) / 100;
            layerGain.connect(masterGain);
            layerGains[layerName] = layerGain;

            let outNode = layerGain;
            if (def.filter) {
                const lp = ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = def.filter;
                lp.connect(layerGain);
                outNode = lp;
            }

            [
                { freq: rootFreq, isRoot: true },
                { freq: thirdFreq, isThird: true },
                { freq: fifthFreq, isFifth: false }
            ].forEach(note => {
                const osc = ctx.createOscillator();
                osc.type = def.type;
                osc.frequency.value = note.freq * Math.pow(2, def.octave || 0);
                if (def.detune) osc.detune.value = def.detune;

                const bal = ctx.createGain();
                bal.gain.value = note.isRoot ? 0.4 : 0.3;
                osc.connect(bal);
                bal.connect(outNode);
                osc.start(now);

                newOscs.push({ osc, octave: def.octave || 0, isRoot: note.isRoot, isThird: note.isThird });
            });
        });

        masterGain.gain.exponentialRampToValueAtTime(1.0, now + 3.0);

        // Setup MP3 Samplers
        const newAudios = [];
        const urlNote = keyNote.replace('#', '%23');
        
        Object.entries(layerVolumes).forEach(([layerName, vol]) => {
            if (vol > 0) {
                const slug = layerName.toLowerCase().replace(/ /g, '-');
                const url = `https://tocandofacil.com.br/padworship/padworship/${urlNote}/${urlNote}-${slug}.mp3`;
                
                const audio = new Audio(url);
                audio.loop = true;
                audio.volume = 0; 
                audio.load();
                const p = audio.play();
                if(p !== undefined) {
                    p.catch(e => console.log("Sem áudio MP3 no mobile"));
                }
                
                newAudios.push({
                    key: fullKey,
                    layer: layerName,
                    audio: audio,
                    targetVolume: vol,
                    isFadingOut: false
                });
            }
        });

        nodesRef.current = {
            oscillators: newOscs,
            layerGains: layerGains,
            masterGain: masterGain,
            filter: filter,
            audioElements: newAudios
        };
        
        // Fade in MP3s
        let fadeVol = 0.0;
        const fadeInterval = setInterval(() => {
            fadeVol += 0.05;
            if (fadeVol >= 1.0) {
                clearInterval(fadeInterval);
            }
            newAudios.forEach(item => {
                if(!item.isFadingOut) {
                    try {
                        item.audio.volume = (item.targetVolume / 100) * Math.min(fadeVol, 1.0);
                    } catch(e){}
                }
            });
        }, 150);

        setCurrentKey(fullKey);
    }, [currentKey, isMinor, layerVolumes, stopSound]);

    // Transição suave (Pitch Bend) da Terça ao alternar Maior/Menor
    useEffect(() => {
        if (currentKey && audioCtxRef.current && nodesRef.current.oscillators && nodesRef.current.oscillators.length > 0) {
            const now = audioCtxRef.current.currentTime;
            const rootNote = currentKey.replace('m', '');
            const chord = createChord(rootNote, isMinor);
            const newThirdFreq = chord[1].frequency;
            
            nodesRef.current.oscillators.forEach(oData => {
                if (oData.isThird && oData.osc && oData.osc.frequency) {
                    const targetFreq = newThirdFreq * Math.pow(2, oData.octave);
                    oData.osc.frequency.cancelScheduledValues(now);
                    oData.osc.frequency.setValueAtTime(oData.osc.frequency.value, now);
                    oData.osc.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.3);
                }
            });
            
            const fullKey = rootNote + (isMinor ? 'm' : '');
            if (currentKey !== fullKey) { setCurrentKey(fullKey); }
        }
    }, [isMinor]); 

    return (
        <div className="app-container">
            {showMixer ? (
                <div className="glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '1vh' }}>
                        <h2 className="title" style={{ fontSize: 'clamp(14px, 2.5vh, 18px)', margin: 0 }}>Mixer de Timbres</h2>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="remove-song" style={{ fontSize: '12px', width: 'auto', padding: '5px 10px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setLayerVolumes(defaultVolumes)}>Reset Padrão</button>
                            <button className="remove-song" onClick={() => setShowMixer(false)}>✕</button>
                        </div>
                    </div>
                    
                    <div style={{ flex: 1, width: '100%', overflowY: 'auto', paddingRight: '10px', minHeight: 0 }}>
                        <div className="mixer-grid" style={{ marginTop: 0 }}>
                            {Object.keys(layerDefs).map(layerName => (
                                <div key={layerName} className="mixer-item" style={{ '--vol': `${layerVolumes[layerName]}%` }}>
                                    <div className="mixer-item-bg"></div>
                                    <div className="mixer-content">
                                        <span className="mixer-name">{layerName}</span>
                                        <span className="mixer-value">{layerVolumes[layerName]}%</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0" max="100" 
                                        value={layerVolumes[layerName]} 
                                        onChange={(e) => setLayerVolumes({...layerVolumes, [layerName]: Number(e.target.value)})}
                                        className="mixer-slider-overlay"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <button className="add-song-btn" style={{ width: '100%', marginTop: '2vh', padding: '2vh' }} onClick={() => setShowMixer(false)}>
                        Aplicar e Voltar
                    </button>
                </div>
            ) : (
                <div className="glass-panel">
                    <h1 className="title" style={{ textAlign: 'center', marginBottom: '10px' }}>Atmosphere Pad</h1>

                    <div className={`status-orb ${currentKey ? 'active' : ''}`}>
                        {currentKey ? currentKey : 'OFF'}
                    </div>

                    <div className="controls">
                        <label className="toggle-label">
                            <input type="checkbox" checked={isMinor} onChange={e => setIsMinor(e.target.checked)} />
                            <span className="toggle-slider"></span>
                            <span className="toggle-text">Modo Menor</span>
                        </label>

                        <button className="add-song-btn" style={{ padding: '10px 15px', fontSize: '14px' }} onClick={() => setShowMixer(true)}>
                            ⚙️ Timbres
                        </button>
                    </div>

                    <div className="keys-grid">
                        {noteNames.map(note => {
                            const displayNote = isMinor ? note + 'm' : note;
                            return (
                                <button
                                    key={note}
                                    className={`key-btn ${currentKey === displayNote ? 'active' : ''}`}
                                    onClick={() => playSound(note, isMinor)}
                                >
                                    {displayNote}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                        {songs.length > 0 && (
                            <button className="stop-btn" style={{ background: 'rgba(79, 172, 254, 0.2)', color: '#4facfe' }} onClick={playNextSong}>
                                Próxima Música
                            </button>
                        )}
                        <button className="stop-btn" onClick={stopSound} disabled={!currentKey}>
                            Silenciar (Stop)
                        </button>
                    </div>

                    <div className="playlist-container" style={{ width: '100%' }}>
                        <h3 style={{ fontSize: '14px', color: '#888', marginBottom: '15px', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'center' }}>Playlist (Setlist)</h3>

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <input
                                type="text"
                                placeholder="Nome da música..."
                                value={newSongName}
                                onChange={(e) => setNewSongName(e.target.value)}
                                className="song-input"
                            />
                            <select
                                className="song-input"
                                style={{ flex: '0 0 80px', padding: '10px' }}
                                value={newSongKey}
                                onChange={(e) => setNewSongKey(e.target.value)}
                            >
                                {noteNames.flatMap(n => [n, n + 'm']).map(k => (
                                    <option key={k} value={k}>{k}</option>
                                ))}
                            </select>
                            <button
                                className="add-song-btn"
                                onClick={() => {
                                    if (newSongName) {
                                        addSong(newSongName, newSongKey);
                                        setNewSongName('');
                                    } else {
                                        alert("Digite o nome da música!");
                                    }
                                }}
                            >
                                + Add
                            </button>
                        </div>

                        <div className="song-list">
                            {songs.map((song, index) => (
                                <div key={song.id} className={`song-item ${index === currentSongIndex ? 'playing' : ''}`}>
                                    <span className="song-key">{song.key}</span>
                                    <span className="song-title">{song.name}</span>
                                    <button className="remove-song" onClick={() => removeSong(song.id)}>✕</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
