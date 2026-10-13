import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const CosmicVoidVFX = ({ scale = 1.0 }) => {
  const diskRef = useRef(null);
  const ringRef = useRef(null);

  useFrame((state, delta) => {
    if (diskRef.current) {
      diskRef.current.rotation.z += delta * 2.8;
    }
    if (ringRef.current) {
      ringRef.current.rotation.x += delta * 1.2;
      ringRef.current.rotation.y += delta * 1.5;
    }
  });

  return (
    <group scale={scale}>
      {/* 1. Horizonte de Eventos (Negro absoluto absorbe luz) */}
      <mesh>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* 2. Resplandor de singularidad violeta */}
      <mesh scale={1.12}>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshStandardMaterial
          color="#a855f7"
          emissive="#c084fc"
          emissiveIntensity={4.0}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Disco de Acreción Giratorio */}
      <mesh ref={diskRef} rotation={[Math.PI / 2.3, 0, 0]}>
        <ringGeometry args={[0.28, 0.58, 48]} />
        <meshBasicMaterial
          color="#d946ef"
          side={THREE.DoubleSide}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Halo Gravitacional Exterior */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.48, 0.02, 16, 32]} />
        <meshBasicMaterial color="#7c3aed" wireframe />
      </mesh>

      <pointLight color="#c084fc" intensity={3.2} distance={3.8} />
    </group>
  );
};
