import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const GlacierEruptionSpell = ({
  id,
  target = [0, -2.0, 0],
  duration = 3.6,
  onComplete
}) => {
  const groupRef = useRef(null);
  const spikesRef = useRef(null);
  const frostAuraRef = useRef(null);
  const lightRef = useRef(null);
  const startTimeRef = useRef(null);

  useFrame((state, delta) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.getElapsedTime();
    }
    const elapsed = state.clock.getElapsedTime() - startTimeRef.current;
    const progress = elapsed / duration;

    // Fase 1: Erupción rápida hacia arriba (0 a 0.5s)
    // Fase 2: Mantiene y brilla (0.5 a 2.5s)
    // Fase 3: Disolución y quiebre (2.5 a 3.6s)
    if (spikesRef.current) {
      let growY = 1.0;
      if (progress < 0.2) {
        growY = progress / 0.2; // Brota del suelo violentamente
      } else if (progress > 0.7) {
        growY = Math.max(0, (1.0 - progress) / 0.3); // Se retrae y rompe
      }
      spikesRef.current.scale.set(1.0, growY, 1.0);
      spikesRef.current.rotation.y += delta * 0.3;
    }

    if (frostAuraRef.current) {
      const auraScale = 0.8 + progress * 2.5;
      frostAuraRef.current.scale.set(auraScale, auraScale, auraScale);
      frostAuraRef.current.material.opacity = Math.max(0, (1.0 - progress) * 0.7);
    }

    if (lightRef.current) {
      lightRef.current.intensity = Math.max(0, Math.sin(progress * Math.PI) * 5.0);
    }

    if (progress >= 1.0) {
      onComplete?.(id);
    }
  });

  return (
    <group ref={groupRef} position={target} name={`glacier-spell-${id}`}>
      {/* 1. Racimo de Agujas de Hielo Glaciar */}
      <group ref={spikesRef}>
        {/* Espiga Central Colosal */}
        <mesh position={[0, 1.1, 0]}>
          <coneGeometry args={[0.38, 2.4, 6]} />
          <meshPhysicalMaterial
            color="#e0f2fe"
            emissive="#38bdf8"
            emissiveIntensity={1.8}
            roughness={0.05}
            transmission={0.7}
            thickness={0.8}
            transparent
            opacity={0.92}
          />
        </mesh>

        {/* Espigas Inclinadas Secundarias */}
        <mesh position={[0.45, 0.7, 0.2]} rotation={[0.3, 0.4, -0.45]}>
          <coneGeometry args={[0.26, 1.8, 5]} />
          <meshPhysicalMaterial
            color="#bae6fd"
            emissive="#0284c7"
            emissiveIntensity={1.6}
            roughness={0.1}
            transmission={0.65}
            transparent
            opacity={0.85}
          />
        </mesh>

        <mesh position={[-0.4, 0.8, -0.2]} rotation={[-0.3, 0.2, 0.4]}>
          <coneGeometry args={[0.28, 1.9, 5]} />
          <meshPhysicalMaterial
            color="#bae6fd"
            emissive="#0284c7"
            emissiveIntensity={1.6}
            roughness={0.1}
            transmission={0.65}
            transparent
            opacity={0.85}
          />
        </mesh>
      </group>

      {/* 2. Círculo de Escarcha y Niebla Ártica en el Suelo */}
      <mesh ref={frostAuraRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 1.2, 36]} />
        <meshBasicMaterial
          color="#7dd3fc"
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <pointLight ref={lightRef} position={[0, 1.5, 0]} color="#7dd3fc" intensity={4.5} distance={8} />
    </group>
  );
};
