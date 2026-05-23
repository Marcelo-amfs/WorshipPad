import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const baseFreqs = {
    'C': 130.81, 'C#': 138.59, 'D': 146.83, 'D#': 155.56,
    'E': 164.81, 'F': 174.61, 'F#': 185.00, 'G': 196.00,
    'G#': 207.65, 'A': 220.00, 'A#': 233.08, 'B': 246.94
};

const chordFormulas = {
    major: [0, 4, 7],
    minor: [0, 3, 7]
};

function createChord(rootNote, isMinor = false) {
    const rootIndex = noteNames.indexOf(rootNote);
    if (rootIndex === -1) throw new Error(`Nota inválida: ${rootNote}`);
    const intervals = chordFormulas[isMinor ? 'minor' : 'major'];
    return intervals.map(semitones => {
        const noteIndex = (rootIndex + semitones) % 12;
        return {
            note: noteNames[noteIndex],
            frequency: Number((baseFreqs[rootNote] * Math.pow(2, semitones / 12)).toFixed(2))
        };
    });
}

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

const defaultVolumes = {
    "Agudo": 30, "Ambiente Worship 1": 35, "Ambiente Worship 2": 15,
    "Ambrose": 10, "Angels": 40, "Atmospheric": 90, "Cathedral": 50,
    "Cinematic": 55, "Continuous": 65, "Evolving": 90, "Grave": 65,
    "Guitar": 55, "Hillsong": 50, "Motion 1": 30, "Motion 2": 40,
    "Organ Choir": 30, "Organ": 55, "Rhodes Shimmer": 25, "Shimmer": 40,
    "Shimmery": 80, "Shiny": 75, "Solutions": 40, "Stout Creek": 55,
    "Verb": 75, "Warm": 40
};

function usePlaylist() {
    const [songs, setSongs] = useState(() => {
        const saved = localStorage.getItem('worshipPadPlaylist');
        return saved ? JSON.parse(saved) : [];
    });
    useEffect(() => {
        localStorage.setItem('worshipPadPlaylist', JSON.stringify(songs));
    }, [songs]);
    const addSong = (name, key) => setSongs(prev => [...prev, { id: Date.now(), name, key }]);
    const removeSong = id => setSongs(prev => prev.filter(s => s.id !== id));
    return { songs, addSong, removeSong };
}

export default function App() {
    const [currentKey, setCurrentKey] = useState(null);
    const [isMinor, setIsMinor] = useState(false);
    const { songs, addSong, removeSong } = usePlaylist();
    const [newSongName, setNewSongName] = useState('');
    const [newSongKey, setNewSongKey] = useState('C');
    const [currentSongIndex, setCurrentSongIndex] = useState(-1);
    const [mobileTab, setMobileTab] = useState('pads');
    const [layerVolumes, setLayerVolumes] = useState(() => {
        const saved = localStorage.getItem('padLayers_v4');
        return saved ? JSON.parse(saved) : defaultVolumes;
    });

    const audioCtxRef = useRef(null);
    const nodesRef = useRef({ oscillators: [], layerGains: {}, masterGain: null, audioElements: [] });

    // Sync volumes to live audio nodes
    useEffect(() => {
        localStorage.setItem('padLayers_v4', JSON.stringify(layerVolumes));
        if (nodesRef.current.layerGains && audioCtxRef.current) {
            const now = audioCtxRef.current.currentTime;
            Object.entries(layerVolumes).forEach(([name, vol]) => {
                if (nodesRef.current.layerGains[name]) {
                    nodesRef.current.layerGains[name].gain.setTargetAtTime(vol / 100, now, 0.1);
                }
            });
        }
        if (!currentKey) return;
        const urlNote = currentKey.replace('m', '').replace('#', 'sus');
        Object.entries(layerVolumes).forEach(([layerName, vol]) => {
            let existing = nodesRef.current.audioElements.find(i => i.layer === layerName && !i.isFadingOut);
            if (existing) {
                existing.targetVolume = vol;
                existing.audio.volume = vol / 100;
            } else if (vol > 0) {
                const slug = layerName.toLowerCase().replace(/ /g, '-');
                const audio = new Audio(`https://tocandofacil.com.br/padworship/padworship/${urlNote}/${urlNote}-${slug}.mp3`);
                audio.loop = true;
                audio.volume = vol / 100;
                audio.load();
                audio.play().catch(() => {});
                nodesRef.current.audioElements.push({ key: currentKey, layer: layerName, audio, targetVolume: vol, isFadingOut: false });
            }
        });
    }, [layerVolumes, currentKey]);

    const stopSound = useCallback(() => {
        if (nodesRef.current.masterGain && audioCtxRef.current) {
            const gain = nodesRef.current.masterGain.gain;
            const now = audioCtxRef.current.currentTime;
            gain.cancelScheduledValues(now);
            gain.setValueAtTime(gain.value, now);
            gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
            const oscs = nodesRef.current.oscillators;
            setTimeout(() => oscs.forEach(d => { try { d.osc.stop(); d.osc.disconnect(); } catch {}  }), 1600);
        }
        const audiosToStop = nodesRef.current.audioElements;
        nodesRef.current.audioElements = [];
        audiosToStop.forEach(item => item.isFadingOut = true);
        let fadeVol = 1.0;
        const iv = setInterval(() => {
            fadeVol -= 0.05;
            if (fadeVol <= 0) {
                clearInterval(iv);
                audiosToStop.forEach(item => { item.audio.pause(); item.audio.src = ''; });
            } else {
                audiosToStop.forEach(item => { try { item.audio.volume = (item.targetVolume / 100) * fadeVol; } catch {} });
            }
        }, 75);
        setCurrentKey(null);
        setCurrentSongIndex(-1);
    }, []);

    const playSound = useCallback((keyNote, forceMinor = null) => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        const applyMinor = forceMinor !== null ? forceMinor : isMinor;
        const fullKey = keyNote + (applyMinor ? 'm' : '');

        if (currentKey === fullKey) { stopSound(); return; }

        const chord = createChord(keyNote, applyMinor);
        const [rootFreq, thirdFreq, fifthFreq] = chord.map(c => c.frequency);

        if (currentKey) stopSound();

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.0001, now);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 2000; filter.Q.value = 0.2;
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -24; compressor.knee.value = 30;
        compressor.ratio.value = 12; compressor.attack.value = 0.003; compressor.release.value = 0.25;
        masterGain.connect(filter); filter.connect(compressor); compressor.connect(ctx.destination);

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
                lp.type = 'lowpass'; lp.frequency.value = def.filter;
                lp.connect(layerGain); outNode = lp;
            }
            [{ freq: rootFreq, isRoot: true }, { freq: thirdFreq, isThird: true }, { freq: fifthFreq }].forEach(n => {
                const osc = ctx.createOscillator();
                osc.type = def.type;
                osc.frequency.value = n.freq * Math.pow(2, def.octave || 0);
                if (def.detune) osc.detune.value = def.detune;
                const bal = ctx.createGain();
                bal.gain.value = n.isRoot ? 0.4 : 0.3;
                osc.connect(bal); bal.connect(outNode); osc.start(now);
                newOscs.push({ osc, octave: def.octave || 0, isRoot: n.isRoot, isThird: n.isThird });
            });
        });
        masterGain.gain.exponentialRampToValueAtTime(1.0, now + 1.0);

        const urlNote = keyNote.replace('#', 'sus');
        const newAudios = [];
        Object.entries(layerVolumes).forEach(([layerName, vol]) => {
            if (vol > 0) {
                const slug = layerName.toLowerCase().replace(/ /g, '-');
                const audio = new Audio(`https://tocandofacil.com.br/padworship/padworship/${urlNote}/${urlNote}-${slug}.mp3`);
                audio.loop = true; audio.volume = 0; audio.load();
                audio.play().catch(() => {});
                newAudios.push({ key: fullKey, layer: layerName, audio, targetVolume: vol, isFadingOut: false });
            }
        });
        nodesRef.current = { oscillators: newOscs, layerGains, masterGain, filter, audioElements: newAudios };

        let fadeVol = 0;
        const iv = setInterval(() => {
            fadeVol = Math.min(fadeVol + 0.05, 1);
            newAudios.forEach(item => { if (!item.isFadingOut) try { item.audio.volume = (item.targetVolume / 100) * fadeVol; } catch {} });
            if (fadeVol >= 1) clearInterval(iv);
        }, 50);
        setCurrentKey(fullKey);
    }, [currentKey, isMinor, layerVolumes, stopSound]);

    const playNextSong = useCallback(() => {
        if (!songs.length) return;
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
    }, [songs, currentSongIndex, stopSound, playSound]);

    // Smooth minor/major pitch bend
    useEffect(() => {
        if (!currentKey || !audioCtxRef.current || !nodesRef.current.oscillators.length) return;
        const now = audioCtxRef.current.currentTime;
        const rootNote = currentKey.replace('m', '');
        const chord = createChord(rootNote, isMinor);
        const newThirdFreq = chord[1].frequency;
        nodesRef.current.oscillators.forEach(oData => {
            if (oData.isThird && oData.osc?.frequency) {
                const target = newThirdFreq * Math.pow(2, oData.octave);
                oData.osc.frequency.cancelScheduledValues(now);
                oData.osc.frequency.setValueAtTime(oData.osc.frequency.value, now);
                oData.osc.frequency.exponentialRampToValueAtTime(target, now + 0.3);
            }
        });
        const fullKey = rootNote + (isMinor ? 'm' : '');
        if (currentKey !== fullKey) setCurrentKey(fullKey);
    }, [isMinor]);

    const handleAddSong = () => {
        if (newSongName.trim()) {
            addSong(newSongName.trim(), newSongKey);
            setNewSongName('');
        }
    };

    return (
        <div className={`app-layout tab-context--${mobileTab}`}>

            {/* ── MAIN AREA ── */}
            <main className={`main-area glass-panel tab-panel ${mobileTab === 'pads' ? 'tab-active' : ''}`}>
                <header className="header-panel">
                    <div>
                        <h1 className="app-title">Atmosphere Pad</h1>
                        <p className="app-subtitle">Worship Sound Generator</p>
                    </div>
                    <div className={`status-orb ${currentKey ? 'active' : ''}`}>
                        <span className="status-orb-text">{currentKey || 'OFF'}</span>
                        {currentKey && <div className="orb-ring" />}
                    </div>
                </header>

                <div className="controls-bar">
                    <label className="toggle-label" htmlFor="minor-toggle">
                        <input id="minor-toggle" type="checkbox" checked={isMinor} onChange={e => setIsMinor(e.target.checked)} />
                        <span className="toggle-slider" />
                        <span className="toggle-text">Modo Menor</span>
                    </label>
                    <div className="action-buttons">
                        {songs.length > 0 && (
                            <button id="next-song-btn" className="btn-action btn-next" onClick={playNextSong}>
                                <span>⏭</span> Próxima
                            </button>
                        )}
                        <button id="stop-btn" className="btn-action btn-stop" onClick={stopSound} disabled={!currentKey}>
                            <span>⏹</span> Stop
                        </button>
                    </div>
                </div>

                <div className="keys-panel">
                    <div className="keys-grid">
                        {noteNames.map(note => {
                            const displayNote = isMinor ? note + 'm' : note;
                            return (
                                <button
                                    key={note}
                                    id={`key-${note.replace('#', 's')}`}
                                    className={`key-btn ${currentKey === displayNote ? 'active' : ''}`}
                                    onClick={() => playSound(note, isMinor)}
                                >
                                    <span className="key-note">{displayNote}</span>
                                    {currentKey === displayNote && <span className="key-wave" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* ── SIDEBAR ── */}
            <aside className="sidebar">

                {/* MIXER PANEL */}
                <div className={`mixer-panel glass-panel tab-panel ${mobileTab === 'mixer' ? 'tab-active' : ''}`}>
                    <div className="panel-header">
                        <h2 className="panel-title">
                            <span className="panel-icon">🎚️</span>
                            Mixer
                        </h2>
                        <button
                            id="reset-mixer-btn"
                            className="btn-ghost"
                            onClick={() => setLayerVolumes(defaultVolumes)}
                            title="Resetar para valores padrão"
                        >
                            ↺ Reset
                        </button>
                    </div>
                    <div className="mixer-list">
                        {Object.keys(layerDefs).map(layerName => (
                            <div key={layerName} className="mixer-row">
                                <div className="mixer-label">
                                    <span className="mixer-name">{layerName}</span>
                                    <span className="mixer-vol">{layerVolumes[layerName]}%</span>
                                </div>
                                <div className="fader-track">
                                    <div
                                        className="fader-fill"
                                        style={{ width: `${layerVolumes[layerName]}%` }}
                                    />
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={layerVolumes[layerName]}
                                        onChange={e => setLayerVolumes(prev => ({ ...prev, [layerName]: Number(e.target.value) }))}
                                        className="fader-input"
                                        aria-label={`Volume de ${layerName}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* PLAYLIST PANEL */}
                <div className={`playlist-panel glass-panel tab-panel ${mobileTab === 'playlist' ? 'tab-active' : ''}`}>
                    <div className="panel-header">
                        <h2 className="panel-title">
                            <span className="panel-icon">📋</span>
                            Setlist
                        </h2>
                    </div>

                    <div className="playlist-add">
                        <input
                            id="song-name-input"
                            type="text"
                            placeholder="Nome da música..."
                            value={newSongName}
                            onChange={e => setNewSongName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddSong()}
                            className="input-field"
                        />
                        <select
                            id="song-key-select"
                            className="input-field input-select"
                            value={newSongKey}
                            onChange={e => setNewSongKey(e.target.value)}
                        >
                            {noteNames.flatMap(n => [n, n + 'm']).map(k => (
                                <option key={k} value={k}>{k}</option>
                            ))}
                        </select>
                        <button id="add-song-btn" className="btn-add" onClick={handleAddSong}>+</button>
                    </div>

                    <div className="playlist-list">
                        {songs.length === 0 && (
                            <div className="playlist-empty">
                                <p>Sua setlist está vazia.</p>
                                <p>Adicione músicas acima!</p>
                            </div>
                        )}
                        {songs.map((song, index) => (
                            <div
                                key={song.id}
                                className={`song-row ${index === currentSongIndex ? 'playing' : ''}`}
                                onClick={() => {
                                    const isMin = song.key.endsWith('m');
                                    setIsMinor(isMin);
                                    setCurrentSongIndex(index);
                                    playSound(song.key.replace('m', ''), isMin);
                                }}
                            >
                                {index === currentSongIndex && <span className="playing-dot" />}
                                <span className="song-key-badge">{song.key}</span>
                                <span className="song-title">{song.name}</span>
                                <button
                                    className="btn-remove"
                                    onClick={e => { e.stopPropagation(); removeSong(song.id); }}
                                    title="Remover da lista"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* ── MOBILE NAV TABS ── */}
            <nav className="mobile-nav" role="tablist">
                {[
                    { id: 'pads', icon: '🎹', label: 'Pads' },
                    { id: 'mixer', icon: '🎚️', label: 'Mixer' },
                    { id: 'playlist', icon: '📋', label: 'Setlist' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={mobileTab === tab.id}
                        className={`mobile-tab ${mobileTab === tab.id ? 'active' : ''}`}
                        onClick={() => setMobileTab(tab.id)}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}
