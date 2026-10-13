import React, { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SingularityBlackHole } from './SingularityBlackHole';

/**
 * VOID SUPERNOVA SPELL
 * Integra el shader raymarch relativista de Singularity-Master (Gargantua Black Hole)
 * con fases cinemáticas de aparición, rotación relativista y colapso cósmico final.
 */
export const VoidSupernovaSpell = ({
  id,
  target = [0, 0, 0],
  duration = 4.2,
  onComplete
}) => {
  const groupRef = useRef(null);
  const shockwaveRef = useRef(null);
  const photonRingRef = useRef(null);
  const lightRef = useRef(null);
  const startTimeRef = useRef(null);
  const [currentProgress, setCurrentProgress] = useState(0);

  useFrame((state, delta) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.getElapsedTime();
    }
    const elapsed = state.clock.getElapsedTime() - startTimeRef.current;
    const progress = Math.min(1.0, elapsed / duration);
    setCurrentProgress(progress);

    // FASE 1: Singularidad activa (0.0 a 0.75)
    if (progress < 0.75) {
      if (photonRingRef.current) {
        photonRingRef.current.rotation.z += delta * 1.8;
        const pulse = 1.0 + Math.sin(elapsed * 10) * 0.12;
        photonRingRef.current.scale.set(pulse, pulse, pulse);
        photonRingRef.current.material.opacity = Math.min(1.0, progress * 2.5);
      }
      if (shockwaveRef.current) shockwaveRef.current.visible = false;
      if (lightRef.current) {
        lightRef.current.intensity = 2.0 + progress * 3.0;
      }
    }
    // FASE 2: Colapso y Supernova Cósmica (0.75 a 1.0)
    else {
      const burstProgress = (progress - 0.75) / 0.25;

      // Anillo de fotones implosiona
      if (photonRingRef.current) {
        photonRingRef.current.scale.multiplyScalar(0.92);
        photonRingRef.current.material.opacity = Math.max(0, 1.0 - burstProgress);
      }

      // Onda expansiva de Supernova
      if (shockwaveRef.current) {
        shockwaveRef.current.visible = true;
        const waveScale = 0.5 + burstProgress * 7.5;
        shockwaveRef.current.scale.set(waveScale, waveScale, waveScale);
        shockwaveRef.current.material.opacity = Math.max(0, (1.0 - burstProgress) * 0.95);
      }

      if (lightRef.current) {
        lightRef.current.intensity = Math.max(0, (1.0 - burstProgress) * 9.0);
      }
    }

    if (progress >= 1.0) {
      onComplete?.(id);
    }
  });

  return (
    <group ref={groupRef} position={target} name={`singularity-void-spell-${id}`}>
      {/* 1. AGUJERO NEGRO RELATIVISTA CON SHADER RAYMARCH DE SINGULARITY-MASTER */}
      <SingularityBlackHole scale={2.8} progress={currentProgress} />

      {/* 2. Anillo de Fotones / Lente Gravitacional Exterior */}
      <mesh ref={photonRingRef} rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[1.35, 1.48, 64]} />
        <meshBasicMaterial
          color="#38bdf8"
          side={THREE.DoubleSide}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Onda de Choque de Supernova Expansiva */}
      <mesh ref={shockwaveRef} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.6, 1.1, 48]} />
        <meshBasicMaterial
          color="#c084fc"
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Luz puntual dinámica del núcleo */}
      <pointLight ref={lightRef} color="#a855f7" intensity={3.5} distance={10} />
    </group>
  );
};
