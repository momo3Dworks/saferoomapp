import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const ThunderBoltAbility = ({ scale = 1.0 }) => {
  const boltRef = useRef(null);
  const branchRef = useRef(null);
  const ringsRef = useRef(null);

  // Generador de trayectoria de rayo en zigzag (Thunder Ribbon Path)
  const generateBoltPath = (segments = 14, jitter = 0.18, height = 2.2) => {
    const points = [];
    const step = height / segments;
    for (let i = 0; i <= segments; i++) {
      const y = height / 2 - i * step;
      // Los extremos se mantienen más estables, el centro zigzaguea con violencia
      const factor = Math.sin((i / segments) * Math.PI);
      const x = (Math.random() - 0.5) * jitter * factor * 2;
      const z = (Math.random() - 0.5) * jitter * factor * 2;
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  };

  const [boltGeo, branchGeo] = useMemo(() => {
    const mainCurve = generateBoltPath(12, 0.22, 2.0);
    const branchCurve = generateBoltPath(8, 0.28, 1.2);
    return [
      new THREE.TubeGeometry(mainCurve, 32, 0.045, 8, false),
      new THREE.TubeGeometry(branchCurve, 20, 0.025, 6, false)
    ];
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // Efecto estroboscópico eléctrico violento
    if (boltRef.current) {
      boltRef.current.visible = Math.sin(t * 35) > -0.7; // Frecuencia de relámpago
      boltRef.current.rotation.y += delta * 4;
    }
    if (branchRef.current) {
      branchRef.current.visible = Math.cos(t * 40) > -0.5;
    }
    if (ringsRef.current) {
      ringsRef.current.rotation.z += delta * 6;
      ringsRef.current.scale.setScalar(1 + Math.sin(t * 15) * 0.15);
    }
  });

  return (
    <group scale={scale}>
      {/* 1. Tronco Principal del Rayo Eléctrico (Main Lightning Bolt) */}
      <mesh ref={boltRef}>
        <primitive object={boltGeo} attach="geometry" />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 2. Halo Eléctrico Azul Cían Exterior */}
      <mesh scale={[1.4, 1.0, 1.4]}>
        <primitive object={boltGeo} attach="geometry" />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Ramificación Eléctrica Lateral (Branch Bolt) */}
      <mesh ref={branchRef} position={[0.2, -0.1, 0]} rotation={[0, 0, -0.3]}>
        <primitive object={branchGeo} attach="geometry" />
        <meshBasicMaterial
          color="#fef08a"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Anillo de Ionización de Suelo / Punto de Impacto */}
      <mesh ref={ringsRef} position={[0, -0.9, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.55, 32]} />
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <pointLight color="#67e8f9" intensity={4.5} distance={5} />
    </group>
  );
};
