import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const MeteorDetonationSpell = ({
  id,
  target = [0, -1.8, 0],
  start = [4, 6, 0],
  duration = 3.5,
  onComplete
}) => {
  const groupRef = useRef(null);
  const meteorRef = useRef(null);
  const explosionRef = useRef(null);
  const shockwaveRef = useRef(null);
  const lightRef = useRef(null);
  const startTimeRef = useRef(null);

  const startVec = useMemo(() => new THREE.Vector3(...start), [start]);
  const targetVec = useMemo(() => new THREE.Vector3(...target), [target]);

  // Duraciones de fase: 0 a 0.8s = Vuelo; 0.8 a 3.5s = Explosión e impacto
  const flightDuration = 0.8;

  useFrame((state) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.getElapsedTime();
    }
    const elapsed = state.clock.getElapsedTime() - startTimeRef.current;

    // FASE 1: VUELO DEL METEORO
    if (elapsed < flightDuration) {
      const progress = elapsed / flightDuration;
      // Interpolación con aceleración de caída
      const tEased = progress * progress;
      const currentPos = new THREE.Vector3().lerpVectors(startVec, targetVec, tEased);

      if (meteorRef.current) {
        meteorRef.current.position.copy(currentPos);
        meteorRef.current.rotation.x += 0.2;
        meteorRef.current.rotation.y += 0.25;
        meteorRef.current.visible = true;
      }
      if (explosionRef.current) explosionRef.current.visible = false;
      if (shockwaveRef.current) shockwaveRef.current.visible = false;
      if (lightRef.current) {
        lightRef.current.position.copy(currentPos);
        lightRef.current.intensity = 2.0;
      }
    }
    // FASE 2: IMPACTO Y EXPLOSIÓN MASIVA
    else {
      const explodeProgress = (elapsed - flightDuration) / (duration - flightDuration);
      if (meteorRef.current) meteorRef.current.visible = false;

      // Esfera expansiva de fuego y magma
      if (explosionRef.current) {
        explosionRef.current.visible = true;
        explosionRef.current.position.copy(targetVec);
        const expScale = Math.sin(Math.min(explodeProgress * Math.PI, Math.PI)) * 2.2;
        explosionRef.current.scale.setScalar(Math.max(0.01, expScale));
        explosionRef.current.material.opacity = Math.max(0, 1.0 - explodeProgress);
      }

      // Onda de choque circular en el suelo
      if (shockwaveRef.current) {
        shockwaveRef.current.visible = true;
        shockwaveRef.current.position.set(targetVec.x, targetVec.y + 0.05, targetVec.z);
        const waveScale = 0.5 + explodeProgress * 4.5;
        shockwaveRef.current.scale.set(waveScale, waveScale, waveScale);
        shockwaveRef.current.material.opacity = Math.max(0, (1.0 - explodeProgress) * 0.8);
      }

      // Destello de luz puntual
      if (lightRef.current) {
        lightRef.current.position.copy(targetVec);
        lightRef.current.intensity = Math.max(0, (1.0 - explodeProgress) * 7.0);
      }

      if (explodeProgress >= 1.0) {
        onComplete?.(id);
      }
    }
  });

  return (
    <group ref={groupRef} name={`meteor-spell-${id}`}>
      {/* 1. Proyectil Meteórico en Vuelo */}
      <group ref={meteorRef}>
        <mesh>
          <dodecahedronGeometry args={[0.42, 1]} />
          <meshStandardMaterial
            color="#1c0f0a"
            emissive="#ff3700"
            emissiveIntensity={2.5}
            roughness={0.6}
          />
        </mesh>
        {/* Estela de fuego cónica */}
        <mesh position={[0, 0.6, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.55, 1.5, 16, 1, true]} />
          <meshBasicMaterial
            color="#ff5500"
            transparent
            opacity={0.8}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {/* 2. Esfera Expansiva de Explosión */}
      <mesh ref={explosionRef}>
        <sphereGeometry args={[1.0, 32, 32]} />
        <meshBasicMaterial
          color="#ff7700"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Onda de Choque en el Suelo (Shockwave Ring) */}
      <mesh ref={shockwaveRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.9, 48]} />
        <meshBasicMaterial
          color="#ffaa00"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Luz de Detonación Dinámica */}
      <pointLight ref={lightRef} color="#ff4400" intensity={3} distance={9} decay={2} />
    </group>
  );
};
