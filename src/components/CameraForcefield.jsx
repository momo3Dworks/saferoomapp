import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useOverlayStore } from '../store/useOverlayStore';

// Shader de escudo de fuerza hexagonal sci-fi reactivo
const ForcefieldShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#38bdf8') },
    uIntensity: { value: 0.7 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uIntensity;
    varying vec2 vUv;
    varying vec3 vNormal;

    // Patrón hexagonal procedural
    float hexGrid(vec2 p) {
      vec2 q = vec2(p.x * 2.0 * 0.5773503, p.y + p.x * 0.5773503);
      vec2 pi = floor(q);
      vec2 pf = fract(q);
      float v = mod(pi.x + pi.y, 3.0);
      float d = min(min(pf.x, 1.0 - pf.x), min(pf.y, 1.0 - pf.y));
      return smoothstep(0.04, 0.08, d);
    }

    void main() {
      vec2 uvScaled = vUv * vec2(16.0, 9.0);
      float hex = 1.0 - hexGrid(uvScaled);

      // Onda de energía pulsante viajando por el escudo
      float scan = sin(vUv.y * 12.0 - uTime * 4.0) * 0.5 + 0.5;
      float pulse = sin(uTime * 3.0) * 0.2 + 0.8;

      // Resplandor en los bordes (Fresnel)
      float edge = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 4.0) * pow(1.0 - abs(vUv.y - 0.5) * 2.0, 4.0);

      float alpha = (hex * 0.6 + scan * 0.2) * (1.0 - edge * 0.5) * uIntensity * pulse;
      vec3 col = uColor * (1.2 + scan * 0.5);

      gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
    }
  `
};

export const CameraForcefield = ({ width = 3.2, height = 1.8 }) => {
  const meshRef = useRef(null);
  const activeModifier = useOverlayStore((state) => state.activeModifier);

  const shieldMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(ForcefieldShader.uniforms),
      vertexShader: ForcefieldShader.vertexShader,
      fragmentShader: ForcefieldShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }, []);

  useFrame((state, delta) => {
    if (shieldMaterial.uniforms) {
      shieldMaterial.uniforms.uTime.value += delta;

      // Cambiar color del escudo según el modificador activo
      if (activeModifier === 'sala_oscura') {
        shieldMaterial.uniforms.uColor.value.set('#c084fc');
        shieldMaterial.uniforms.uIntensity.value = 0.9;
      } else if (activeModifier === 'bendicion_divina') {
        shieldMaterial.uniforms.uColor.value.set('#fde047');
        shieldMaterial.uniforms.uIntensity.value = 1.2;
      } else {
        shieldMaterial.uniforms.uColor.value.set('#38bdf8');
        shieldMaterial.uniforms.uIntensity.value = 0.65;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0.08]} name="camera-forcefield-shield">
      <planeGeometry args={[width + 0.1, height + 0.1]} />
      <primitive object={shieldMaterial} attach="material" />
    </mesh>
  );
};
