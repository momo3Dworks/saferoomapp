import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const ArcaneAbilityVFX = ({ scale = 1.0 }) => {
  const coreRef = useRef(null);
  const ring1Ref = useRef(null);
  const ring2Ref = useRef(null);
  const lightningRef = useRef(null);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    if (coreRef.current) {
      // Pulsación de energía mágica
      const pulse = 1 + Math.sin(t * 8) * 0.12;
      coreRef.current.scale.set(pulse, pulse, pulse);
    }

    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * 2.5;
      ring1Ref.current.rotation.x = Math.sin(t * 2) * 0.4;
    }

    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= delta * 3.2;
      ring2Ref.current.rotation.y = Math.cos(t * 2.5) * 0.5;
    }

    if (lightningRef.current) {
      // Giro errático estroboscópico de relámpagos
      lightningRef.current.rotation.set(
        Math.sin(t * 12) * Math.PI,
        Math.cos(t * 15) * Math.PI,
        t * 5
      );
    }
  });

  return (
    <group scale={scale}>
      {/* 1. Núcleo de Plasma Arcane */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.26, 24, 24]} />
        <meshStandardMaterial
          color="#fef08a"
          emissive="#eab308"
          emissiveIntensity={3.5}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* 2. Anillo Mágico Exterior 1 */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[0.45, 0.025, 16, 48]} />
        <meshBasicMaterial color="#38bdf8" wireframe />
      </mesh>

      {/* 3. Anillo Mágico Exterior 2 (Giroscópico) */}
      <mesh ref={ring2Ref} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[0.52, 0.02, 16, 48]} />
        <meshBasicMaterial color="#fbbf24" wireframe />
      </mesh>

      {/* 4. Zarcillos de Relámpago Linear Casting */}
      <group ref={lightningRef}>
        <mesh>
          <octahedronGeometry args={[0.42, 0]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.7} />
        </mesh>
      </group>

      <pointLight color="#38bdf8" intensity={3.5} distance={4} />
    </group>
  );
};
