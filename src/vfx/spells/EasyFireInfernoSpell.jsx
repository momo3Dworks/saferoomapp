import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Shader de Columna de Fuego Volumétrico con Convección Rápida
const InfernoShader = {
  uniforms: {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uColorCore: { value: new THREE.Color('#fffbeb') },
    uColorFlame: { value: new THREE.Color('#ff3b00') },
    uColorDark: { value: new THREE.Color('#260202') }
  },
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec3 pos = position;

      // Deformación de pilar de fuego ascendente
      float wave = sin(pos.y * 5.0 - uTime * 6.0) * 0.08;
      pos.x += wave * (pos.y + 1.0);
      pos.z += cos(pos.y * 5.0 - uTime * 6.0) * 0.08 * (pos.y + 1.0);

      vPosition = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uProgress;
    uniform vec3 uColorCore;
    uniform vec3 uColorFlame;
    uniform vec3 uColorDark;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      vec2 st = vec2(vUv.x * 4.0, vUv.y * 2.0 - uTime * 3.5);
      float n = noise(st) * 0.6 + noise(st * 2.0) * 0.4;

      // Disolución en los extremos
      float fade = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.4, vUv.y);
      float alpha = clamp(n * fade * (1.0 - uProgress * 0.7), 0.0, 1.0);

      vec3 col = mix(uColorDark, uColorFlame, smoothstep(0.1, 0.5, n));
      col = mix(col, uColorCore, smoothstep(0.5, 0.85, n));

      gl_FragColor = vec4(col * 2.0, alpha * 0.95);
    }
  `
};

export const EasyFireInfernoSpell = ({
  id,
  target = [0, -1.8, 0],
  duration = 4.0,
  onComplete
}) => {
  const groupRef = useRef(null);
  const pillarRef = useRef(null);
  const sparksRef = useRef(null);
  const lightRef = useRef(null);
  const startTimeRef = useRef(null);

  const infernoMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(InfernoShader.uniforms),
      vertexShader: InfernoShader.vertexShader,
      fragmentShader: InfernoShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }, []);

  // Chispas de convección térmica
  const sparkPoints = useMemo(() => {
    const count = 45;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 1.5;
      pos[i * 3 + 1] = Math.random() * 3.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.getElapsedTime();
    }
    const elapsed = state.clock.getElapsedTime() - startTimeRef.current;
    const progress = elapsed / duration;

    if (infernoMaterial.uniforms) {
      infernoMaterial.uniforms.uTime.value += delta;
      infernoMaterial.uniforms.uProgress.value = progress;
    }

    if (pillarRef.current) {
      // Crecimiento y luego desvanecimiento
      const growScale = Math.sin(Math.min(progress * Math.PI, Math.PI));
      pillarRef.current.scale.set(1 + growScale * 0.5, Math.max(0.01, growScale * 1.3), 1 + growScale * 0.5);
      pillarRef.current.rotation.y += delta * 1.2;
    }

    if (sparksRef.current) {
      sparksRef.current.rotation.y -= delta * 1.5;
      sparksRef.current.position.y += delta * 0.8;
      sparksRef.current.material.opacity = Math.max(0, 1.0 - progress);
    }

    if (lightRef.current) {
      lightRef.current.intensity = Math.max(0, Math.sin(progress * Math.PI) * 6.5);
    }

    if (progress >= 1.0) {
      onComplete?.(id);
    }
  });

  return (
    <group ref={groupRef} position={target} name={`inferno-spell-${id}`}>
      {/* 1. Columna de Fuego Volumétrico */}
      <mesh ref={pillarRef} position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.55, 0.8, 3.2, 24, 8, true]} />
        <primitive object={infernoMaterial} attach="material" />
      </mesh>

      {/* 2. Chispas de Convección Térmica Ascendentes */}
      <points ref={sparksRef} position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkPoints, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color="#ffb703"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 3. Luz Cálida de la Erupción */}
      <pointLight ref={lightRef} position={[0, 1.5, 0]} color="#ff4400" intensity={5} distance={8} />
    </group>
  );
};
