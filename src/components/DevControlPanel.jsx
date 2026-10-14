import React, { useState, useEffect, useRef } from 'react';
import { useOverlayStore } from '../store/useOverlayStore';
import { sendSpawn, sendModifier, sendClear, sendCameraTransform, sendCastSpell } from '../utils/syncManager';

// ─── Inline CSS once ────────────────────────────────────────────────────────
const GLOBAL_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;600;700&display=swap');

  @keyframes scanMove {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(200%); }
  }
  @keyframes cornerPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
  @keyframes glowPulse {
    0%, 100% { box-shadow: 0 0 6px #38bdf888, inset 0 0 6px #38bdf822; }
    50%       { box-shadow: 0 0 14px #38bdf8cc, inset 0 0 10px #38bdf844; }
  }
  @keyframes tickerSlide {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes hudBlink {
    0%, 94%, 100% { opacity: 1; }
    95%, 99%      { opacity: 0.1; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-3px); }
  }

  .scifi-panel {
    font-family: 'Share Tech Mono', monospace;
  }
  .scifi-corner-tl, .scifi-corner-tr, .scifi-corner-bl, .scifi-corner-br {
    position: absolute;
    width: 18px;
    height: 18px;
    animation: cornerPulse 2.8s ease-in-out infinite;
  }
  .scifi-corner-tl { top: -1px;  left: -1px;  border-top: 2px solid; border-left: 2px solid; }
  .scifi-corner-tr { top: -1px;  right: -1px; border-top: 2px solid; border-right: 2px solid; }
  .scifi-corner-bl { bottom: -1px; left: -1px;  border-bottom: 2px solid; border-left: 2px solid; }
  .scifi-corner-br { bottom: -1px; right: -1px; border-bottom: 2px solid; border-right: 2px solid; }

  .scifi-mid-tick-top, .scifi-mid-tick-bottom, .scifi-mid-tick-left, .scifi-mid-tick-right {
    position: absolute;
    background: currentColor;
    opacity: 0.5;
  }
  .scifi-mid-tick-top    { top: -3px;    left: 50%; width: 1px; height: 5px; transform: translateX(-50%); }
  .scifi-mid-tick-bottom { bottom: -3px; left: 50%; width: 1px; height: 5px; transform: translateX(-50%); }
  .scifi-mid-tick-left   { left: -3px;   top: 50%; height: 1px; width: 5px; transform: translateY(-50%); }
  .scifi-mid-tick-right  { right: -3px;  top: 50%; height: 1px; width: 5px; transform: translateY(-50%); }

  .scifi-scan-line {
    position: absolute;
    left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #38bdf855, transparent);
    animation: scanMove 3.5s linear infinite;
    pointer-events: none;
  }
  .scifi-panel-glow {
    animation: glowPulse 3s ease-in-out infinite;
  }
  .scifi-tab-active {
    animation: glowPulse 2s ease-in-out infinite;
  }
  .scifi-hud-blink {
    animation: hudBlink 4s ease-in-out infinite;
  }
  .scifi-ticker-wrap {
    overflow: hidden;
    white-space: nowrap;
  }
  .scifi-ticker-inner {
    display: inline-block;
    animation: tickerSlide 12s linear infinite;
  }
  .scifi-float {
    animation: float 4s ease-in-out infinite;
  }
`;

// ── Inject global style once ─────────────────────────────────────────────────
let styleInjected = false;
function injectStyle() {
  if (styleInjected) return;
  styleInjected = true;
  const el = document.createElement('style');
  el.textContent = GLOBAL_STYLE;
  document.head.appendChild(el);
}

// ── SciFi frame wrapper ──────────────────────────────────────────────────────
const ScifiFrame = ({ children, color = '#38bdf8', style = {}, className = '', glow = false }) => (
  <div
    className={`scifi-panel-glow ${className}`}
    style={{
      position: 'relative',
      border: `1px solid ${color}55`,
      borderRadius: 4,
      padding: 10,
      background: 'rgba(6, 14, 28, 0.85)',
      ...style
    }}
  >
    <span className="scifi-corner-tl" style={{ color, borderColor: color }} />
    <span className="scifi-corner-tr" style={{ color, borderColor: color }} />
    <span className="scifi-corner-bl" style={{ color, borderColor: color }} />
    <span className="scifi-corner-br" style={{ color, borderColor: color }} />
    <span className="scifi-mid-tick-top"    style={{ color }} />
    <span className="scifi-mid-tick-bottom" style={{ color }} />
    <span className="scifi-mid-tick-left"   style={{ color }} />
    <span className="scifi-mid-tick-right"  style={{ color }} />
    <div className="scifi-scan-line" />
    {children}
  </div>
);

// ── Live HUD clock ────────────────────────────────────────────────────────────
const HudClock = ({ color = '#38bdf8' }) => {
  const [time, setTime] = useState('');
  const [uptime, setUptime] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');
      setTime(`${hh}:${mm}:${ss}.${ms}`);
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      setUptime(elapsed);
    }, 40);
    return () => clearInterval(id);
  }, []);

  const uptimeMins = String(Math.floor(uptime / 60)).padStart(2, '0');
  const uptimeSecs = String(uptime % 60).padStart(2, '0');

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <div>
        <div style={{ fontSize: 18, fontFamily: "'Orbitron', sans-serif", color, letterSpacing: 2, fontWeight: 700 }} className="scifi-hud-blink">
          {time}
        </div>
        <div style={{ fontSize: 9, color: `${color}88`, letterSpacing: 1, marginTop: 2 }}>SYS CLOCK // LOCAL TIME</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 12, color, fontFamily: "'Orbitron', sans-serif", fontWeight: 600 }}>
          {uptimeMins}:{uptimeSecs}
        </div>
        <div style={{ fontSize: 9, color: `${color}88`, letterSpacing: 1 }}>UPTIME</div>
      </div>
    </div>
  );
};

// ── Scrolling ticker ─────────────────────────────────────────────────────────
const HexTicker = ({ color = '#38bdf855' }) => {
  const items = '0xDEAD :: 0xBEEF :: SYS:OK :: NET:◆ :: XMIT:▶ :: 0xCAFE :: FRAME:OK :: 0xFF3A :: SYNC:● :: ';
  return (
    <div className="scifi-ticker-wrap" style={{ fontSize: 9, color, borderTop: `1px solid ${color}`, paddingTop: 3, marginTop: 6 }}>
      <span className="scifi-ticker-inner">{items}{items}</span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const DevControlPanel = ({
  standaloneDock = false,
  webcamControls = {}
}) => {
  injectStyle();

  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const entities       = useOverlayStore((state) => state.entities);
  const activeSpells   = useOverlayStore((state) => state.activeSpells);
  const activeModifier = useOverlayStore((state) => state.activeModifier);
  const webcamTransform  = useOverlayStore((state) => state.webcamTransform);
  const resetWebcamTransform = useOverlayStore((state) => state.resetWebcamTransform);

  const [spellTargetMode, setSpellTargetMode] = useState('center');

  const accentColor = activeModifier === 'sala_oscura'      ? '#c084fc'
                    : activeModifier === 'bendicion_divina' ? '#eab308'
                    : '#38bdf8';

  const handleCast = (spellType) => {
    let target = [0, 0, 0];
    if (spellTargetMode === 'camera') {
      target = [...webcamTransform.position];
    } else if (spellTargetMode === 'random') {
      target = [(Math.random() - 0.5) * 4.5, (Math.random() - 0.5) * 2.5, 0];
    }
    sendCastSpell(spellType, { target });
  };

  const {
    devices          = [],
    selectedDeviceId = '',
    setSelectedDeviceId,
    activeDeviceLabel = '',
    isActive: isCamActive = false,
    isTestPattern = false,
    error: camError,
    startCamera,
    stopCamera,
    activateTestPattern,
    renderWebcam = true,
    setRenderWebcam
  } = webcamControls;

  const handleModifierToggle = (targetMod) =>
    sendModifier(activeModifier === targetMod ? null : targetMod);

  const updateTransform = (partial) => sendCameraTransform(partial);

  const applyPreset = (presetName) => {
    switch (presetName) {
      case 'scifi-hologram':
        updateTransform({ position: [-3.2, -1.8, 0], rotation: [-0.2, 0.35, -0.08], scale: [1,1,1], width: 3.2, height: 1.8 });
        break;
      case 'isometric':
        updateTransform({ position: [-2.8, -1.5, 0], rotation: [-0.35, 0.45, -0.15], scale: [1.1,1.1,1.1], width: 3.2, height: 1.8 });
        break;
      case 'classic-corner':
        updateTransform({ position: [-3.4, -2.1, 0], rotation: [0, 0, 0], scale: [1,1,1], width: 3.2, height: 1.8 });
        break;
      case 'center-floating':
        updateTransform({ position: [0, 0, 0], rotation: [-0.15, 0, 0], scale: [1.2,1.2,1.2], width: 3.6, height: 2.0 });
        break;
      default:
        resetWebcamTransform();
    }
  };

  // ── Collapsed pill ─────────────────────────────────────────────────────────
  if (collapsed && !standaloneDock) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 1000,
          background: 'rgba(6, 14, 28, 0.94)',
          color: accentColor,
          border: `1px solid ${accentColor}55`,
          borderRadius: 4,
          padding: '7px 14px',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          fontSize: '11px',
          fontFamily: "'Share Tech Mono', monospace",
          letterSpacing: 1,
          pointerEvents: 'auto',
          boxShadow: `0 0 10px ${accentColor}44`
        }}
      >
        ◈ CTRL PANEL
      </button>
    );
  }

  // ── Panel base styles ──────────────────────────────────────────────────────
  const panelStyle = {
    position:    standaloneDock ? 'relative' : 'fixed',
    bottom:      standaloneDock ? 'auto' : 16,
    right:       standaloneDock ? 'auto' : 16,
    zIndex:      1000,
    background:  'rgba(4, 8, 18, 0.97)',
    color:       '#e2e8f0',
    padding:     '14px',
    borderRadius: 6,
    border:      `1px solid ${accentColor}44`,
    boxShadow:   standaloneDock ? 'none' : `0 8px 40px rgba(0,0,0,0.8), 0 0 20px ${accentColor}22`,
    backdropFilter: 'blur(20px)',
    width:       standaloneDock ? '100%' : '360px',
    maxWidth:    '100%',
    fontSize:    '11px',
    fontFamily:  "'Share Tech Mono', monospace",
    pointerEvents: 'auto',
    userSelect:  'none',
    maxHeight:   standaloneDock ? 'none' : '88vh',
    overflowY:   'auto',
    position:    standaloneDock ? 'relative' : 'fixed',
  };

  return (
    <div className="scifi-panel" style={panelStyle}>

      {/* Corners on outer panel */}
      <span className="scifi-corner-tl" style={{ color: accentColor, borderColor: accentColor, width: 22, height: 22 }} />
      <span className="scifi-corner-tr" style={{ color: accentColor, borderColor: accentColor, width: 22, height: 22 }} />
      <span className="scifi-corner-bl" style={{ color: accentColor, borderColor: accentColor, width: 22, height: 22 }} />
      <span className="scifi-corner-br" style={{ color: accentColor, borderColor: accentColor, width: 22, height: 22 }} />
      <span className="scifi-mid-tick-top"    style={{ color: accentColor }} />
      <span className="scifi-mid-tick-bottom" style={{ color: accentColor }} />
      <span className="scifi-mid-tick-left"   style={{ color: accentColor }} />
      <span className="scifi-mid-tick-right"  style={{ color: accentColor }} />
      <div className="scifi-scan-line" />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ color: accentColor, fontSize: 13, fontFamily: "'Orbitron', sans-serif", fontWeight: 700, letterSpacing: 2 }}>
            {standaloneDock ? '◈ OBS STREAMER DOCK' : '◈ PANTEÓN SCI-FI CTRL'}
          </div>
          <div style={{ color: `${accentColor}66`, fontSize: 9, marginTop: 2, letterSpacing: 1 }}>
            SYSTEM v2.4.1 // NODE:ACTIVE // {activeSpells.length} SPELLS
          </div>
        </div>
        {!standaloneDock && (
          <button
            onClick={() => setCollapsed(true)}
            style={{ background: 'none', border: `1px solid ${accentColor}44`, color: accentColor, cursor: 'pointer', fontSize: 11, padding: '2px 6px', borderRadius: 3, fontFamily: 'inherit' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Live clock */}
      <ScifiFrame color={accentColor} style={{ marginBottom: 10, padding: '8px 10px' }}>
        <HudClock color={accentColor} />
        <HexTicker color={`${accentColor}66`} />
      </ScifiFrame>

      {/* ── TABS ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
        {[
          { id: 'chat',   label: '⚔ DROPS & MOD' },
          { id: 'camera', label: '◉ CÁMARA 3D' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={isActive ? 'scifi-tab-active' : ''}
              style={{
                flex: 1,
                background:   isActive ? `${accentColor}22` : 'rgba(255,255,255,0.04)',
                color:         isActive ? accentColor : '#64748b',
                border:        `1px solid ${isActive ? accentColor : '#ffffff22'}`,
                padding:       '7px 8px',
                borderRadius:  4,
                cursor:        'pointer',
                fontSize:      10,
                fontFamily:    'inherit',
                fontWeight:    isActive ? 700 : 400,
                letterSpacing: 1,
                transition:    'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* TAB 1: HABILIDADES & MODIFICADORES                                */}
      {/* ================================================================= */}
      {activeTab === 'chat' && (
        <>
          {/* Status bar */}
          <ScifiFrame color={accentColor} style={{ marginBottom: 8, padding: '6px 10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
              <span style={{ color: `${accentColor}aa` }}>EFFECTS <span style={{ color: accentColor }}>{activeSpells.length}</span></span>
              <span style={{ color: `${accentColor}aa` }}>MOD: <span style={{ color: activeModifier ? '#f59e0b' : accentColor }}>{activeModifier || 'NORMAL'}</span></span>
            </div>
          </ScifiFrame>

          {/* Target selector */}
          <ScifiFrame color={accentColor} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: `${accentColor}88`, marginBottom: 6, letterSpacing: 1 }}>◈ PUNTO DE IMPACTO / DETONACIÓN</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { id: 'center', label: '◎ CENTRO' },
                { id: 'camera', label: '◉ CÁMARA' },
                { id: 'random', label: '◆ RANDOM' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSpellTargetMode(t.id)}
                  style={{
                    flex: 1,
                    background:  spellTargetMode === t.id ? `${accentColor}33` : 'rgba(255,255,255,0.04)',
                    color:        spellTargetMode === t.id ? accentColor : '#64748b',
                    border:       `1px solid ${spellTargetMode === t.id ? accentColor : '#ffffff22'}`,
                    borderRadius: 3,
                    padding:      '5px 4px',
                    fontSize:     9,
                    cursor:       'pointer',
                    fontFamily:   'inherit',
                    letterSpacing: 0.5,
                    fontWeight:   spellTargetMode === t.id ? 700 : 400
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </ScifiFrame>

          {/* Spells */}
          <ScifiFrame color={accentColor} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: `${accentColor}88`, marginBottom: 8, letterSpacing: 1 }}>◈ HABILIDADES CINEMATOGRÁFICAS TSL</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {[
                { fn: () => handleCast('void'),                    color: '#c084fc', label: '🌌 Singularity' },
                { fn: () => sendCastSpell('fire_cam'),             color: '#f97316', label: '🔥 Fuego Cámara' },
                { fn: () => handleCast('meteor'),                  color: '#ef4444', label: '☄️ Meteoro' },
                { fn: () => handleCast('thunder'),                 color: '#eab308', label: '⚡ Rayo Thunder' },
                { fn: () => handleCast('fire'),                    color: '#fb923c', label: '🌋 Erupción' },
                { fn: () => handleCast('glacier'),                 color: '#06b6d4', label: '❄️ Glaciar' },
                { fn: () => handleCast('beam'),                    color: '#38bdf8', label: '💥 Haz Láser' },
                { fn: () => sendCastSpell('void', { target:[0,0,0] }), color: '#9333ea', label: '🕳️ Hoyo Central' },
              ].map((btn, i) => (
                <button key={i} onClick={btn.fn} style={spellBtnStyle(btn.color)}>
                  {btn.label}
                </button>
              ))}
            </div>
            <button
              onClick={sendClear}
              style={{
                width: '100%', marginTop: 6,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#64748b',
                borderRadius: 3,
                padding: '5px',
                fontSize: 9,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: 1
              }}
            >
              ✕ LIMPIAR TODOS LOS EFECTOS
            </button>
          </ScifiFrame>

          {/* Modifiers */}
          <ScifiFrame color={accentColor}>
            <div style={{ fontSize: 9, color: `${accentColor}88`, marginBottom: 6, letterSpacing: 1 }}>◈ MODIFICADORES ROGUELIKE</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              <button
                onClick={() => handleModifierToggle('sala_oscura')}
                style={toggleBtnStyle(activeModifier === 'sala_oscura', '#a855f7')}
              >
                🌑 SALA OSCURA
              </button>
              <button
                onClick={() => handleModifierToggle('bendicion_divina')}
                style={toggleBtnStyle(activeModifier === 'bendicion_divina', '#eab308')}
              >
                ✨ BENDICIÓN
              </button>
            </div>
          </ScifiFrame>
        </>
      )}

      {/* ================================================================= */}
      {/* TAB 2: CÁMARA & TRANSFORMACIÓN 3D                                 */}
      {/* ================================================================= */}
      {activeTab === 'camera' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Signal status */}
          <ScifiFrame color={isCamActive ? (isTestPattern ? '#f59e0b' : '#4ade80') : '#f87171'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
              <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, letterSpacing: 1, color: accentColor }}>SEÑAL DE VIDEO</span>
              <span style={{
                color: isCamActive ? (isTestPattern ? '#f59e0b' : '#4ade80') : '#f87171',
                fontSize: 10, fontWeight: 700, letterSpacing: 1
              }}>
                {isCamActive ? (isTestPattern ? '⚡ HOLO TEST' : '● DROIDCAM LIVE') : '○ OFFLINE'}
              </span>
            </div>
            <div style={{ fontSize: 9, color: '#64748b', marginBottom: 8, wordBreak: 'break-all' }}>
              SOURCE: <span style={{ color: '#e2e8f0' }}>{activeDeviceLabel || 'NONE'}</span>
            </div>

            {camError && (
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 3, padding: '5px 7px', fontSize: 9, color: '#fca5a5', marginBottom: 8 }}>
                ⚠ AVISO: DroidCam compartido con OBS puede bloquearse. Usa Holograma Test o desactiva la fuente en OBS.
              </div>
            )}

            {devices.length > 0 && setSelectedDeviceId && (
              <select
                value={selectedDeviceId}
                onChange={(e) => { setSelectedDeviceId(e.target.value); startCamera?.(e.target.value); }}
                style={{
                  width: '100%', background: '#0a101e', color: '#e2e8f0',
                  border: `1px solid ${accentColor}44`, borderRadius: 3,
                  padding: '4px 6px', fontSize: 10, marginBottom: 8,
                  fontFamily: 'inherit'
                }}
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label.toLowerCase().includes('droidcam') ? `◉ ${d.label}` : d.label || `CAM-${d.deviceId.slice(0, 5)}`}
                  </option>
                ))}
              </select>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 6 }}>
              <button onClick={() => startCamera?.()} style={camBtnStyle('#16a34a')}>◉ CONECTAR</button>
              <button onClick={activateTestPattern}   style={camBtnStyle('#0284c7')}>⚡ HOLO TEST</button>
            </div>
            <button
              onClick={() => webcamControls.requestPermission?.()}
              style={{ ...camBtnStyle('#d97706'), width: '100%' }}
            >
              ◆ DESBLOQUEAR PERMISOS
            </button>
          </ScifiFrame>

          {/* Gizmo */}
          <ScifiFrame color={accentColor}>
            <div style={{ fontSize: 9, color: `${accentColor}88`, marginBottom: 6, letterSpacing: 1 }}>◈ GIZMO / MODO EDICIÓN</div>
            <button
              onClick={() => updateTransform({ editMode: !webcamTransform.editMode })}
              style={{
                width: '100%',
                background: webcamTransform.editMode ? 'rgba(225,29,72,0.25)' : `${accentColor}18`,
                color:  webcamTransform.editMode ? '#f43f5e' : accentColor,
                border: `1px solid ${webcamTransform.editMode ? '#e11d48' : accentColor}`,
                borderRadius: 3, padding: '7px', fontSize: 10,
                cursor: 'pointer', fontWeight: 700, marginBottom: 8,
                fontFamily: 'inherit', letterSpacing: 1
              }}
            >
              {webcamTransform.editMode ? '✓ GUARDAR & BLOQUEAR' : '◈ ACTIVAR GIZMO'}
            </button>
            {webcamTransform.editMode && (
              <div style={{ display: 'flex', gap: 4 }}>
                {[['translate', '✥ MOVER'], ['rotate', '↻ ROTAR'], ['scale', '⤢ ESCALA']].map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => updateTransform({ gizmoMode: mode })}
                    style={{
                      flex: 1,
                      background: webcamTransform.gizmoMode === mode ? `${accentColor}33` : 'rgba(255,255,255,0.04)',
                      color: webcamTransform.gizmoMode === mode ? accentColor : '#64748b',
                      border: `1px solid ${webcamTransform.gizmoMode === mode ? accentColor : '#ffffff22'}`,
                      borderRadius: 3, padding: '5px 3px', fontSize: 9,
                      cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0.5
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </ScifiFrame>

          {/* Sliders */}
          <ScifiFrame color={accentColor}>
            <div style={{ fontSize: 9, color: `${accentColor}88`, marginBottom: 8, letterSpacing: 1 }}>◈ DEFORMACIÓN SCI-FI PERSPECTIVA</div>
            {[
              { label: 'TILT X', min: -0.8, max: 0.8, step: 0.02, val: webcamTransform.rotation[0],
                onChange: (v) => updateTransform({ rotation: [v, webcamTransform.rotation[1], webcamTransform.rotation[2]] }),
                fmt: (v) => `${(v * 57.3).toFixed(0)}°` },
              { label: 'YAW Y',  min: -0.8, max: 0.8, step: 0.02, val: webcamTransform.rotation[1],
                onChange: (v) => updateTransform({ rotation: [webcamTransform.rotation[0], v, webcamTransform.rotation[2]] }),
                fmt: (v) => `${(v * 57.3).toFixed(0)}°` },
              { label: 'POS X',  min: -6, max: 6, step: 0.1, val: webcamTransform.position[0],
                onChange: (v) => updateTransform({ position: [v, webcamTransform.position[1], webcamTransform.position[2]] }),
                fmt: (v) => v.toFixed(1) },
              { label: 'POS Y',  min: -4, max: 4, step: 0.1, val: webcamTransform.position[1],
                onChange: (v) => updateTransform({ position: [webcamTransform.position[0], v, webcamTransform.position[2]] }),
                fmt: (v) => v.toFixed(1) },
            ].map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ width: 46, fontSize: 9, color: `${accentColor}88`, letterSpacing: 0.5 }}>{s.label}</span>
                <input
                  type="range" min={s.min} max={s.max} step={s.step} value={s.val}
                  onChange={(e) => s.onChange(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor }}
                />
                <span style={{ width: 32, textAlign: 'right', fontSize: 10, color: accentColor }}>{s.fmt(s.val)}</span>
              </div>
            ))}
          </ScifiFrame>

          {/* Presets */}
          <ScifiFrame color={accentColor}>
            <div style={{ fontSize: 9, color: `${accentColor}88`, marginBottom: 8, letterSpacing: 1 }}>◈ PRESETS DE PERSPECTIVA</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {[
                { key: 'scifi-hologram',  label: '◈ HOLOGRAMA 3D' },
                { key: 'isometric',       label: '◎ ISOMÉTRICO'   },
                { key: 'classic-corner',  label: '◆ ESQUINA CLÁS' },
                { key: 'center-floating', label: '◉ CENTRO FLOAT' },
              ].map((p) => (
                <button key={p.key} onClick={() => applyPreset(p.key)} style={presetBtnStyle(accentColor)}>
                  {p.label}
                </button>
              ))}
            </div>
          </ScifiFrame>
        </div>
      )}
    </div>
  );
};

// ─── Style helpers ────────────────────────────────────────────────────────────
const spellBtnStyle = (color) => ({
  background:    `${color}18`,
  border:        `1px solid ${color}66`,
  color:         '#e2e8f0',
  padding:       '6px 5px',
  borderRadius:  3,
  cursor:        'pointer',
  fontSize:      10,
  textAlign:     'center',
  fontFamily:    "'Share Tech Mono', monospace",
  letterSpacing: 0.3,
  transition:    'background 0.15s',
});

const toggleBtnStyle = (active, color) => ({
  background:    active ? `${color}33` : 'rgba(255,255,255,0.04)',
  border:        `1px solid ${active ? color : 'rgba(255,255,255,0.15)'}`,
  color:         active ? color : '#64748b',
  padding:       '6px 5px',
  borderRadius:  3,
  cursor:        'pointer',
  fontSize:      10,
  fontFamily:    "'Share Tech Mono', monospace",
  fontWeight:    active ? 700 : 400,
  letterSpacing: 1,
});

const camBtnStyle = (bgColor) => ({
  background:    bgColor,
  color:         '#fff',
  border:        'none',
  borderRadius:  3,
  padding:       '6px',
  fontSize:      10,
  cursor:        'pointer',
  fontFamily:    "'Share Tech Mono', monospace",
  letterSpacing: 0.5,
  fontWeight:    600,
});

const presetBtnStyle = (color) => ({
  background:    `${color}14`,
  border:        `1px solid ${color}44`,
  color:         color,
  borderRadius:  3,
  padding:       '6px',
  fontSize:      9,
  cursor:        'pointer',
  fontFamily:    "'Share Tech Mono', monospace",
  letterSpacing: 0.5,
  fontWeight:    600,
});