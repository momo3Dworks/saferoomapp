import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const GlacierSpikeAbility = ({ scale = 1.0 }) => {
  const spikesGroupRef = useRef(null);
  const mistRef = useRef(null);

  useFrame((state, delta) => {
    if (spikesGroupRef.current) {
      spikesGroupRef.current.rotation.y += delta * 0.4;
    }
    if (mistRef.current) {
      mistRef.current.rotation.z -= delta * 1.5;
    }
  });

  return (
    <group scale={scale}>
      {/* 1. Agrupación de Agujas Glaciares (Glacier Spikes Cluster) */}
      <group ref={spikesGroupRef}>
        {/* Espiga Central Principal */}
        <mesh position={[0, 0.25, 0]}>
          <coneGeometry args={[0.22, 1.3, 5]} />
          <meshPhysicalMaterial
            color="#e0f2fe"
            emissive="#38bdf8"
            emissiveIntensity={1.4}
            roughness={0.1}
            transmission={0.7}
            thickness={0.6}
            transparent
            opacity={0.92}
          />
        </mesh>

        {/* Espiga Lateral 1 */}
        <mesh position={[0.22, 0.05, 0.1]} rotation={[0.25, 0.3, -0.3]}>
          <coneGeometry args={[0.15, 0.9, 5]} />
          <meshPhysicalMaterial
            color="#bae6fd"
            emissive="#0284c7"
            emissiveIntensity={1.6}
            roughness={0.1}
            transmission={0.6}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Espiga Lateral 2 */}
        <mesh position={[-0.2, 0.1, -0.1]} rotation={[-0.2, 0.4, 0.35]}>
          <coneGeometry args={[0.16, 1.0, 5]} />
          <meshPhysicalMaterial
            color="#bae6fd"
            emissive="#0284c7"
            emissiveIntensity={1.6}
            roughness={0.1}
            transmission={0.6}
            transparent
            opacity={0.85}
          />
        </mesh>
      </group>

      {/* 2. Bruma y Aura de Hielo en la Base */}
      <mesh ref={mistRef} position={[0, -0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.65, 32]} />
        <meshBasicMaterial
          color="#7dd3fc"
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <pointLight color="#7dd3fc" intensity={3.0} distance={3.8} />
    </group>
  );
};
