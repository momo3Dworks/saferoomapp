import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export const ThunderStrikeSpell = ({
  id,
  target = [0, -2.0, 0],
  duration = 2.4,
  onComplete
}) => {
  const groupRef = useRef(null);
  const boltRef = useRef(null);
  const ringRef = useRef(null);
  const lightRef = useRef(null);
  const startTimeRef = useRef(null);

  // Generador de relámpago vertical en zigzag de gran escala
  const boltCurve = useMemo(() => {
    const points = [];
    const segments = 16;
    const topY = 6.0;
    const bottomY = target[1];
    const step = (topY - bottomY) / segments;

    for (let i = 0; i <= segments; i++) {
      const y = topY - i * step;
      const jitter = i === 0 || i === segments ? 0 : 0.35;
      const x = target[0] + (Math.random() - 0.5) * jitter;
      const z = target[2] + (Math.random() - 0.5) * jitter;
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  }, [target]);

  const boltGeo = useMemo(() => {
    return new THREE.TubeGeometry(boltCurve, 40, 0.08, 8, false);
  }, [boltCurve]);

  useFrame((state) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.getElapsedTime();
    }
    const elapsed = state.clock.getElapsedTime() - startTimeRef.current;
    const progress = elapsed / duration;

    // Efecto estroboscópico de relámpago
    if (boltRef.current) {
      if (progress < 0.6) {
        boltRef.current.visible = Math.sin(elapsed * 45) > -0.6;
        boltRef.current.material.opacity = Math.max(0, 1.0 - progress * 1.5);
      } else {
        boltRef.current.visible = false;
      }
    }

    // Onda de choque eléctrica en el suelo
    if (ringRef.current) {
      const ringScale = 0.5 + progress * 5.0;
      ringRef.current.scale.set(ringScale, ringScale, ringScale);
      ringRef.current.material.opacity = Math.max(0, (1.0 - progress) * 0.9);
    }

    // Flash de luz
    if (lightRef.current) {
      lightRef.current.intensity = Math.max(0, (1.0 - progress) * 9.0);
    }

    if (progress >= 1.0) {
      onComplete?.(id);
    }
  });

  return (
    <group ref={groupRef} name={`thunder-spell-${id}`}>
      {/* 1. Haz de Relámpago Vertical Incandescente */}
      <mesh ref={boltRef}>
        <primitive object={boltGeo} attach="geometry" />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 2. Halo de Plasma Azul Eléctrico */}
      <mesh scale={[1.5, 1.0, 1.5]}>
        <primitive object={boltGeo} attach="geometry" />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Anillo de Ionización de Suelo */}
      <mesh
        ref={ringRef}
        position={[target[0], target[1] + 0.05, target[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.3, 0.7, 36]} />
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 4. Luz de Rayo Cegadora */}
      <pointLight
        ref={lightRef}
        position={[target[0], target[1] + 1.0, target[2]]}
        color="#bae6fd"
        intensity={8}
        distance={10}
      />
    </group>
  );
};
