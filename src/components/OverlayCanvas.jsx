import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Bounds } from './Bounds';
import { PhysicsSpawner } from './PhysicsSpawner';
import { InteractiveWebcamBox } from './InteractiveWebcamBox';
import { SpellCastingScene } from '../vfx/SpellCastingScene';
import { useOverlayStore } from '../store/useOverlayStore';

export const OverlayCanvas = ({
  webcamStream = null,
  renderWebcam = true
}) => {
  const activeModifier = useOverlayStore((state) => state.activeModifier);
  const editMode = useOverlayStore((state) => state.webcamTransform.editMode);

  // Modificadores de iluminación roguelike
  const isDarkRoom = activeModifier === 'sala_oscura';
  const isDivineBlessing = activeModifier === 'bendicion_divina';

  const ambientIntensity = isDarkRoom ? 0.08 : isDivineBlessing ? 0.8 : 0.45;
  const dirLightColor = isDivineBlessing ? '#ffd700' : '#ffffff';
  const dirLightIntensity = isDarkRoom ? 0.3 : isDivineBlessing ? 2.2 : 1.4;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: editMode ? 'auto' : 'none',
        background: 'transparent',
        zIndex: 1
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        gl={{
          alpha: true,
          premultipliedAlpha: false,
          antialias: true,
          powerPreference: 'high-performance'
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0); // Transparencia total OBS
        }}
      >
        <ambientLight intensity={ambientIntensity} />
        <directionalLight
          position={[5, 12, 6]}
          intensity={dirLightIntensity}
          color={dirLightColor}
          castShadow
        />
        <pointLight position={[0, -2, 4]} intensity={0.4} color="#ffffff" />

        {/* 1. Escena de Habilidades Mágicas Cinematográficas TSL (LinearAbility & EasyFire bursts independientes) */}
        <SpellCastingScene />

        {/* 2. Entorno 3D y Cámara Streamer */}
        <Physics gravity={[0, 0, 0]}>
          <Bounds />
          {renderWebcam && <InteractiveWebcamBox stream={webcamStream} />}
        </Physics>
      </Canvas>
    </div>
  );
};
