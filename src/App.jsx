import React, { useState, useEffect, useMemo } from 'react';
import { OverlayCanvas } from './components/OverlayCanvas';
import { DevControlPanel } from './components/DevControlPanel';
import { useSocketListener } from './hooks/useSocketListener';
import { useOverlayStore } from './store/useOverlayStore';
import { useWebcamStream } from './hooks/useWebcamStream';

export function App() {
  const [showWebcamDebug, setShowWebcamDebug] = useState(false);
  const [renderWebcam, setRenderWebcam] = useState(true);
  const activeModifier = useOverlayStore((state) => state.activeModifier);

  // Hook inteligente para capturar DroidCam
  const webcamControls = useWebcamStream(true);

  // Detección de parámetros URL: ?obs=true (oculta panel) o ?dock=true (solo panel de OBS)
  const queryParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const isObsCleanMode = queryParams.has('obs');
  const isDockOnlyMode = queryParams.has('dock');

  // Conectar listener sincronizado de Socket.io y BroadcastChannel
  useSocketListener();

  // Visibilidad del HUD (se puede alternar con la tecla 'H')
  const [hudVisible, setHudVisible] = useState(!isObsCleanMode);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'h' || e.key === 'H') {
        setHudVisible((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Si se abre en OBS como Dock exclusivo: ?dock=true
  if (isDockOnlyMode) {
    return (
      <div style={{ padding: 16, background: '#0b0f19', minHeight: '100vh', color: '#fff', overflowY: 'auto' }}>
        <DevControlPanel
          showWebcamDebug={showWebcamDebug}
          setShowWebcamDebug={setShowWebcamDebug}
          standaloneDock
          webcamControls={{ ...webcamControls, renderWebcam, setRenderWebcam }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'transparent'
      }}
    >
      {/* 3D R3F Canvas con físicas y feed de DroidCam */}
      <OverlayCanvas
        showWebcamDebug={showWebcamDebug}
        webcamStream={webcamControls.stream}
        renderWebcam={renderWebcam}
      />

      {/* Efectos roguelike visuales */}
      {activeModifier === 'sala_oscura' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            background: 'radial-gradient(circle at center, transparent 35%, rgba(0, 0, 0, 0.88) 100%)',
            transition: 'opacity 0.6s ease',
            zIndex: 2
          }}
        />
      )}

      {activeModifier === 'bendicion_divina' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            boxShadow: 'inset 0 0 100px rgba(255, 215, 0, 0.4)',
            transition: 'opacity 0.6s ease',
            zIndex: 2
          }}
        />
      )}

      {/* Panel interactivo de prueba */}
      {hudVisible && (
        <DevControlPanel
          showWebcamDebug={showWebcamDebug}
          setShowWebcamDebug={setShowWebcamDebug}
          webcamControls={{ ...webcamControls, renderWebcam, setRenderWebcam }}
        />
      )}
    </div>
  );
}

export default App;
