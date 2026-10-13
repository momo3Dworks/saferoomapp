import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Shader volumétrico procedural de fuego ardiente con FBM Noise y gradiente térmico
const FireShader = {
  uniforms: {
    uTime: { value: 0 },
    uColorCore: { value: new THREE.Color('#fff7cc') },   // Núcleo blanco/amarillo
    uColorFlame: { value: new THREE.Color('#ff4d00') },  // Llama naranja intensa
    uColorSmoke: { value: new THREE.Color('#380303') }   // Borde brasa oscuro
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorCore;
    uniform vec3 uColorFlame;
    uniform vec3 uColorSmoke;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    // Generador de ruido pseudo-3D
    float hash(float n) { return fract(sin(n) * 43758.5453123); }
    float noise(vec3 x) {
      vec3 p = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      float n = p.x + p.y * 57.0 + 113.0 * p.z;
      return mix(
        mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
            mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
        mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
            mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
    }

    // FBM (Fractal Brownian Motion) para convección de turbulencia
    float fbm(vec3 p) {
      float f = 0.0;
      f += 0.5000 * noise(p); p *= 2.02;
      f += 0.2500 * noise(p); p *= 2.03;
      f += 0.1250 * noise(p); p *= 2.01;
      f += 0.0625 * noise(p);
      return f;
    }

    void main() {
      vec3 pos = vPosition * 3.5;
      // Desplazamiento hacia arriba para convección de fuego
      pos.y -= uTime * 3.2;

      float n = fbm(pos);
      float flameShape = fbm(pos + vec3(0.0, uTime * 1.5, 0.0));

      // Fresnel rim para volumen esférico
      vec3 viewDir = normalize(-vPosition);
      float fresnel = 1.0 - max(dot(viewDir, vNormal), 0.0);
      fresnel = pow(fresnel, 1.8);

      // Mezcla de temperatura
      float intensity = clamp(n * 1.3 - fresnel * 0.4, 0.0, 1.0);
      vec3 color = mix(uColorSmoke, uColorFlame, smoothstep(0.1, 0.6, intensity));
      color = mix(color, uColorCore, smoothstep(0.6, 1.0, intensity));

      float alpha = smoothstep(0.15, 0.9, intensity + (1.0 - fresnel * 0.5));

      gl_FragColor = vec4(color * 1.6, alpha * 0.95);
    }
  `
};

export const VolumetricFireVFX = ({ scale = 1.0 }) => {
  const meshRef = useRef(null);
  const sparksRef = useRef(null);

  const fireMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(FireShader.uniforms),
      vertexShader: FireShader.vertexShader,
      fragmentShader: FireShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }, []);

  // Generar chispas ardientes flotantes
  const sparkPoints = useMemo(() => {
    const count = 30;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 0.6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    if (fireMaterial.uniforms) {
      fireMaterial.uniforms.uTime.value += delta;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.8;
    }
    if (sparksRef.current) {
      sparksRef.current.rotation.y -= delta * 1.2;
    }
  });

  return (
    <group scale={scale}>
      {/* 1. Núcleo volumétrico ardiente */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.34, 32, 32]} />
        <primitive object={fireMaterial} attach="material" />
      </mesh>

      {/* 2. Resplandor expansivo suave */}
      <mesh scale={1.25}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial
          color="#ff3b00"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. Chispas de convección térmica */}
      <points ref={sparksRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[sparkPoints, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color="#ffdd55"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 4. Luz puntual dinámica para iluminar el suelo y la webcam */}
      <pointLight color="#ff5500" intensity={2.8} distance={3.5} decay={2} />
    </group>
  );
};
