import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Shader de fluido orgánico viscoso con distorsión de onda y refracción ácida
const FluidShader = {
  uniforms: {
    uTime: { value: 0 },
    uColorCore: { value: new THREE.Color('#39ff14') },
    uColorDeep: { value: new THREE.Color('#064e03') },
    uColorGlow: { value: new THREE.Color('#a3e635') }
  },
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vec3 pos = position;

      // Ondulaciones orgánicas de líquido viscoso
      float wave = sin(pos.x * 6.0 + uTime * 4.0) * cos(pos.y * 6.0 + uTime * 3.5) * 0.06;
      wave += sin(pos.z * 8.0 + uTime * 5.0) * 0.04;
      pos += normal * wave;

      vPosition = pos;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorCore;
    uniform vec3 uColorDeep;
    uniform vec3 uColorGlow;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vec3 viewDir = normalize(-vPosition);
      float fresnel = 1.0 - max(dot(viewDir, vNormal), 0.0);
      fresnel = pow(fresnel, 2.2);

      // Efecto de líquido translúcido con brillo especular
      vec3 lightDir = normalize(vec3(1.0, 1.5, 1.0));
      float diff = max(dot(vNormal, lightDir), 0.0);
      float spec = pow(max(dot(reflect(-lightDir, vNormal), viewDir), 0.0), 32.0);

      vec3 base = mix(uColorDeep, uColorCore, diff * 0.8 + 0.2);
      vec3 finalColor = mix(base, uColorGlow, fresnel) + vec3(spec * 0.8);

      gl_FragColor = vec4(finalColor, 0.92);
    }
  `
};

export const ToxicFluidVFX = ({ scale = 1.0 }) => {
  const meshRef = useRef(null);
  const bubblesRef = useRef(null);

  const fluidMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(FluidShader.uniforms),
      vertexShader: FluidShader.vertexShader,
      fragmentShader: FluidShader.fragmentShader,
      transparent: true,
      depthWrite: true,
      roughness: 0.1
    });
  }, []);

  useFrame((state, delta) => {
    if (fluidMaterial.uniforms) {
      fluidMaterial.uniforms.uTime.value += delta;
    }
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.7;
    }
    if (bubblesRef.current) {
      bubblesRef.current.rotation.y -= delta * 1.5;
    }
  });

  return (
    <group scale={scale}>
      {/* 1. Gota orgánica principal con deformación de superficie fluida */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.32, 36, 36]} />
        <primitive object={fluidMaterial} attach="material" />
      </mesh>

      {/* 2. Gotas satélite orbitantes (Metaball visual) */}
      <group ref={bubblesRef}>
        <mesh position={[0.3, 0.15, 0]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color="#39ff14" emissive="#15803d" roughness={0.1} />
        </mesh>
        <mesh position={[-0.25, -0.2, 0.15]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color="#39ff14" emissive="#15803d" roughness={0.1} />
        </mesh>
      </group>

      <pointLight color="#22c55e" intensity={2.2} distance={3} />
    </group>
  );
};
