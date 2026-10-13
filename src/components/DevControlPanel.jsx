import React, { useState } from 'react';
import { useOverlayStore } from '../store/useOverlayStore';
import { sendSpawn, sendModifier, sendClear, sendCameraTransform, sendCastSpell } from '../utils/syncManager';

export const DevControlPanel = ({
  standaloneDock = false,
  webcamControls = {}
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'camera'
  const entities = useOverlayStore((state) => state.entities);
  const activeSpells = useOverlayStore((state) => state.activeSpells);
  const activeModifier = useOverlayStore((state) => state.activeModifier);
  const webcamTransform = useOverlayStore((state) => state.webcamTransform);
  const resetWebcamTransform = useOverlayStore((state) => state.resetWebcamTransform);

  const [spellTargetMode, setSpellTargetMode] = useState('center'); // 'center' | 'camera' | 'random'

  const handleCast = (spellType) => {
    let target = [0, 0, 0];
    if (spellTargetMode === 'camera') {
      target = [
        webcamTransform.position[0],
        webcamTransform.position[1],
        webcamTransform.position[2]
      ];
    } else if (spellTargetMode === 'random') {
      target = [
        (Math.random() - 0.5) * 4.5,
        (Math.random() - 0.5) * 2.5,
        0
      ];
    }
    sendCastSpell(spellType, { target });
  };

  const {
    devices = [],
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

  const handleSpawn = (type, element) => sendSpawn(type, element);
  const handleModifierToggle = (targetMod) => sendModifier(activeModifier === targetMod ? null : targetMod);

  // Modificar transformación de cámara
  const updateTransform = (partial) => {
    sendCameraTransform(partial);
  };

  // Presets de perspectiva Sci-Fi
  const applyPreset = (presetName) => {
    switch (presetName) {
      case 'scifi-hologram':
        updateTransform({
          position: [-3.2, -1.8, 0],
          rotation: [-0.2, 0.35, -0.08], // Inclinación perspectiva sci-fi (mirando al centro)
          scale: [1, 1, 1],
          width: 3.2,
          height: 1.8
        });
        break;
      case 'isometric':
        updateTransform({
          position: [-2.8, -1.5, 0],
          rotation: [-0.35, 0.45, -0.15],
          scale: [1.1, 1.1, 1.1],
          width: 3.2,
          height: 1.8
        });
        break;
      case 'classic-corner':
        updateTransform({
          position: [-3.4, -2.1, 0],
          rotation: [0, 0, 0], // Plano 2D clásico a la izquierda
          scale: [1, 1, 1],
          width: 3.2,
          height: 1.8
        });
        break;
      case 'center-floating':
        updateTransform({
          position: [0, 0, 0],
          rotation: [-0.15, 0, 0],
          scale: [1.2, 1.2, 1.2],
          width: 3.6,
          height: 2.0
        });
        break;
      default:
        resetWebcamTransform();
    }
  };

  if (collapsed && !standaloneDock) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 1000,
          background: 'rgba(20, 20, 25, 0.92)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: 8,
          padding: '8px 14px',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          fontSize: '12px',
          pointerEvents: 'auto'
        }}
      >
        🛠️ Controles de Chat & Cámara (H)
      </button>
    );
  }

  return (
    <div
      style={{
        position: standaloneDock ? 'relative' : 'fixed',
        bottom: standaloneDock ? 'auto' : 16,
        right: standaloneDock ? 'auto' : 16,
        zIndex: 1000,
        background: 'rgba(10, 13, 20, 0.96)',
        color: '#e2e8f0',
        padding: '16px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.18)',
        boxShadow: standaloneDock ? 'none' : '0 8px 32px rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(16px)',
        width: standaloneDock ? '100%' : '360px',
        maxWidth: '100%',
        fontSize: '12px',
        pointerEvents: 'auto',
        userSelect: 'none',
        maxHeight: standaloneDock ? 'none' : '88vh',
        overflowY: 'auto'
      }}
    >
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <strong style={{ color: '#38bdf8', fontSize: '13px' }}>
          {standaloneDock ? '🎛️ OBS DOCK: Panel Streamer' : '⚡ Panteón & Cámara 3D'}
        </strong>
        {!standaloneDock && (
          <button
            onClick={() => setCollapsed(true)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
          >
            ✕
          </button>
        )}
      </div>

      {/* PESTAÑAS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button
          onClick={() => setActiveTab('chat')}
          style={tabButtonStyle(activeTab === 'chat')}
        >
          ⚔️ Drops & Modificadores
        </button>
        <button
          onClick={() => setActiveTab('camera')}
          style={tabButtonStyle(activeTab === 'camera')}
        >
          📹 Cámara & Transform 3D
        </button>
      </div>

      {/* ==================================================== */}
      {/* PESTAÑA 1: HABILIDADES MÁGICAS & MODIFICADORES        */}
      {/* ==================================================== */}
      {activeTab === 'chat' && (
        <>
          <div style={{ marginBottom: 10, color: '#94a3b8', fontSize: '11px', background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
            <span>Efectos en pantalla: <b style={{ color: '#38bdf8' }}>{activeSpells.length}</b></span>
            <span>Modificador: <b style={{ color: '#f59e0b' }}>{activeModifier || 'Normal'}</b></span>
          </div>

          {/* SELECTOR DE PUNTO DE DETONACIÓN */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: 4 }}>🎯 PUNTO DE IMPACTO / DETONACIÓN:</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { id: 'center', label: '🎯 Centro Canvas' },
                { id: 'camera', label: '📹 Sobre Cámara' },
                { id: 'random', label: '🎲 Aleatorio' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSpellTargetMode(t.id)}
                  style={{
                    flex: 1,
                    background: spellTargetMode === t.id ? '#0284c7' : 'rgba(255,255,255,0.06)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 6px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    fontWeight: spellTargetMode === t.id ? 600 : 400
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>🔮 ESTALLAR HABILIDADES CINEMATOGRÁFICAS (TSL):</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button onClick={() => handleCast('void')} style={actionButtonStyle('#c084fc')}>
                🌌 Singularity Hoyo Negro
              </button>
              <button onClick={() => sendCastSpell('fire_cam')} style={actionButtonStyle('#f97316')}>
                🔥 Fuego EasyFire (Cámara)
              </button>
              <button onClick={() => handleCast('meteor')} style={actionButtonStyle('#ef4444')}>
                ☄️ Meteoro Magma
              </button>
              <button onClick={() => handleCast('thunder')} style={actionButtonStyle('#eab308')}>
                ⚡ Rayo Thunder
              </button>
              <button onClick={() => handleCast('fire')} style={actionButtonStyle('#fb923c')}>
                🌋 Erupción Fuego
              </button>
              <button onClick={() => handleCast('glacier')} style={actionButtonStyle('#06b6d4')}>
                ❄️ Erupción Glaciar
              </button>
              <button onClick={() => handleCast('beam')} style={actionButtonStyle('#38bdf8')}>
                💥 Haz Láser Plasma
              </button>
              <button onClick={() => sendCastSpell('void', { target: [0, 0, 0] })} style={actionButtonStyle('#9333ea')}>
                🕳️ Hoyo Negro Centro
              </button>
            </div>
            <button
              onClick={sendClear}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#94a3b8',
                borderRadius: 5,
                padding: '6px',
                fontSize: '10px',
                cursor: 'pointer',
                marginTop: 2
              }}
            >
              🧹 Limpiar Todos los Efectos
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: 600 }}>MODIFICADORES ROGUELIKE:</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button
                onClick={() => handleModifierToggle('sala_oscura')}
                style={toggleStyle(activeModifier === 'sala_oscura', '#6b21a8')}
              >
                🌑 Sala Oscura
              </button>
              <button
                onClick={() => handleModifierToggle('bendicion_divina')}
                style={toggleStyle(activeModifier === 'bendicion_divina', '#ca8a04')}
              >
                ✨ Bendición
              </button>
            </div>
          </div>
        </>
      )}

      {/* ==================================================== */}
      {/* PESTAÑA 2: CÁMARA DROIDCAM & TRANSFORMACIÓN 3D        */}
      {/* ==================================================== */}
      {activeTab === 'camera' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* ESTADO DE SEÑAL DROIDCAM */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 600, color: '#38bdf8' }}>SEÑAL DE VIDEO:</span>
              <span style={{ color: isCamActive ? (isTestPattern ? '#f59e0b' : '#4ade80') : '#f87171', fontWeight: 600 }}>
                {isCamActive ? (isTestPattern ? '⚡ HOLOGRAMA TEST' : '● DROIDCAM EN VIVO') : '○ APAGADA'}
              </span>
            </div>

            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: 8, wordBreak: 'break-all' }}>
              Fuente activa: <b style={{ color: '#fff' }}>{activeDeviceLabel || 'Ninguna'}</b>
            </div>

            {camError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, padding: '6px 8px', fontSize: '10px', color: '#fca5a5', marginBottom: 8 }}>
                ⚠️ <b>Aviso de Cámara:</b> Si DroidCam está agregada como fuente en OBS simultáneamente, Windows bloquea el acceso compartido. Prueba desactivar esa fuente temporalmente o usa el botón <b>Holograma Test</b>.
              </div>
            )}

            {devices.length > 0 && setSelectedDeviceId && (
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  startCamera?.(e.target.value);
                }}
                style={{
                  width: '100%',
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 4,
                  padding: '4px 6px',
                  fontSize: '11px',
                  marginBottom: 8
                }}
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label.toLowerCase().includes('droidcam') ? `⭐ ${d.label}` : d.label || `Cámara (${d.deviceId.slice(0, 5)})`}
                  </option>
                ))}
              </select>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
              <button
                onClick={() => startCamera?.()}
                style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 5, padding: '7px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
              >
                Conectar DroidCam
              </button>
              <button
                onClick={activateTestPattern}
                style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: 5, padding: '7px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
              >
                ⚡ Holograma Sci-Fi
              </button>
            </div>

            <button
              onClick={() => webcamControls.requestPermission?.()}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                border: 'none',
                borderRadius: 5,
                padding: '7px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              🔑 Desbloquear Permisos de Cámara
            </button>
          </div>

          {/* MODO GIZMO CON CURSOR */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: 6 }}>
              🎯 AJUSTE CON CURSOR (GIZMO):
            </div>
            <button
              onClick={() => updateTransform({ editMode: !webcamTransform.editMode })}
              style={{
                width: '100%',
                background: webcamTransform.editMode ? '#e11d48' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600,
                marginBottom: 8
              }}
            >
              {webcamTransform.editMode ? '✓ Guardar y Bloquear Posición' : '🛠️ Activar Gizmo de Cursor'}
            </button>

            {webcamTransform.editMode && (
              <div style={{ display: 'flex', gap: 4 }}>
                {['translate', 'rotate', 'scale'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateTransform({ gizmoMode: mode })}
                    style={{
                      flex: 1,
                      background: webcamTransform.gizmoMode === mode ? '#38bdf8' : 'rgba(255,255,255,0.06)',
                      color: webcamTransform.gizmoMode === mode ? '#000' : '#fff',
                      border: 'none',
                      borderRadius: 4,
                      padding: '5px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}
                  >
                    {mode === 'translate' ? '✥ Mover' : mode === 'rotate' ? '↻ Rotar' : '⤢ Escala'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SLIDERS DE PERSPECTIVA SCI-FI */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: 8 }}>
              📐 DEFORMACIÓN EN PERSPECTIVA SCI-FI:
            </div>

            <div style={sliderRowStyle}>
              <span>Inclinación X (Tilt):</span>
              <input
                type="range"
                min="-0.8"
                max="0.8"
                step="0.02"
                value={webcamTransform.rotation[0]}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateTransform({ rotation: [val, webcamTransform.rotation[1], webcamTransform.rotation[2]] });
                }}
              />
              <span style={{ width: 36, textAlign: 'right' }}>{(webcamTransform.rotation[0] * 57.3).toFixed(0)}°</span>
            </div>

            <div style={sliderRowStyle}>
              <span>Inclinación Y (Yaw):</span>
              <input
                type="range"
                min="-0.8"
                max="0.8"
                step="0.02"
                value={webcamTransform.rotation[1]}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateTransform({ rotation: [webcamTransform.rotation[0], val, webcamTransform.rotation[2]] });
                }}
              />
              <span style={{ width: 36, textAlign: 'right' }}>{(webcamTransform.rotation[1] * 57.3).toFixed(0)}°</span>
            </div>

            <div style={sliderRowStyle}>
              <span>Posición X:</span>
              <input
                type="range"
                min="-6"
                max="6"
                step="0.1"
                value={webcamTransform.position[0]}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateTransform({ position: [val, webcamTransform.position[1], webcamTransform.position[2]] });
                }}
              />
              <span style={{ width: 36, textAlign: 'right' }}>{webcamTransform.position[0].toFixed(1)}</span>
            </div>

            <div style={sliderRowStyle}>
              <span>Posición Y:</span>
              <input
                type="range"
                min="-4"
                max="4"
                step="0.1"
                value={webcamTransform.position[1]}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateTransform({ position: [webcamTransform.position[0], val, webcamTransform.position[2]] });
                }}
              />
              <span style={{ width: 36, textAlign: 'right' }}>{webcamTransform.position[1].toFixed(1)}</span>
            </div>
          </div>

          {/* PRESETS SCI-FI */}
          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: 8 }}>
              🚀 PRESETS DE PERSPECTIVA:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button onClick={() => applyPreset('scifi-hologram')} style={presetButtonStyle}>
                🛸 Holograma 3D
              </button>
              <button onClick={() => applyPreset('isometric')} style={presetButtonStyle}>
                📐 Isométrico
              </button>
              <button onClick={() => applyPreset('classic-corner')} style={presetButtonStyle}>
                📺 Esquina Clásica
              </button>
              <button onClick={() => applyPreset('center-floating')} style={presetButtonStyle}>
                🎯 Centro Flotante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const tabButtonStyle = (active) => ({
  flex: 1,
  background: active ? '#0284c7' : 'rgba(255, 255, 255, 0.06)',
  color: '#ffffff',
  border: 'none',
  padding: '7px 8px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: active ? 600 : 400
});

const actionButtonStyle = (color) => ({
  background: 'rgba(255, 255, 255, 0.07)',
  border: `1px solid ${color}88`,
  color: '#ffffff',
  padding: '7px 8px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '11px',
  textAlign: 'center',
  fontWeight: 500
});

const toggleStyle = (active, activeColor) => ({
  background: active ? activeColor : 'rgba(255, 255, 255, 0.07)',
  border: '1px solid rgba(255, 255, 255, 0.25)',
  color: '#ffffff',
  padding: '7px 8px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: active ? 'bold' : 'normal'
});

const presetButtonStyle = {
  background: 'rgba(56, 189, 248, 0.12)',
  border: '1px solid rgba(56, 189, 248, 0.3)',
  color: '#38bdf8',
  borderRadius: 5,
  padding: '6px',
  fontSize: '10px',
  cursor: 'pointer',
  fontWeight: 500
};

const sliderRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: '10px',
  color: '#94a3b8',
  marginBottom: 6
};
