import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const FrostCrystalVFX = ({ scale = 1.0 }) => {
  const crystalRef = useRef(null);
  const orbitRef = useRef(null);

  useFrame((state, delta) => {
    if (crystalRef.current) {
      crystalRef.current.rotation.y += delta * 1.4;
      crystalRef.current.rotation.x += delta * 0.6;
    }
    if (orbitRef.current) {
      orbitRef.current.rotation.z -= delta * 2.2;
    }
  });

  return (
    <group scale={scale}>
      {/* 1. Cristal de Hielo Diamantado */}
      <mesh ref={crystalRef}>
        <octahedronGeometry args={[0.34, 0]} />
        <meshPhysicalMaterial
          color="#e0f2fe"
          emissive="#38bdf8"
          emissiveIntensity={1.8}
          roughness={0.05}
          metalness={0.1}
          transmission={0.6}
          thickness={0.5}
          ior={1.31} // Índice de refracción del hielo
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* 2. Esquirlas de escarcha flotantes */}
      <group ref={orbitRef}>
        <mesh position={[0.32, 0.2, 0]} rotation={[0.4, 0.5, 0]}>
          <octahedronGeometry args={[0.08, 0]} />
          <meshBasicMaterial color="#bae6fd" wireframe />
        </mesh>
        <mesh position={[-0.3, -0.22, 0.1]} rotation={[0.2, 0.8, 0]}>
          <octahedronGeometry args={[0.07, 0]} />
          <meshBasicMaterial color="#38bdf8" wireframe />
        </mesh>
      </group>

      <pointLight color="#7dd3fc" intensity={2.5} distance={3.5} />
    </group>
  );
};
