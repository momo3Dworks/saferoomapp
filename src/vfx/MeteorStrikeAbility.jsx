import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Shader de Asteroide Magmático con grietas de lava viva y estela de fuego
const MagmaShader = {
  uniforms: {
    uTime: { value: 0 },
    uLavaColor: { value: new THREE.Color('#ff3300') },
    uCrustColor: { value: new THREE.Color('#1a120b') }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      // Deformación rugosa de roca meteórica
      vec3 pos = position + normal * (sin(position.x * 8.0) * cos(position.y * 8.0) * 0.04);
      vPosition = pos;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uLavaColor;
    uniform vec3 uCrustColor;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;

    // Ruido para grietas de lava
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float voronoi(vec2 x) {
      vec2 n = floor(x);
      vec2 f = fract(x);
      float m = 8.0;
      for(int j=-1; j<=1; j++) {
        for(int i=-1; i<=1; i++) {
          vec2 g = vec2(float(i),float(j));
          vec2 o = vec2(hash(n + g), hash(n + g + 0.5));
          vec2 r = g - f + o;
          float d = dot(r, r);
          m = min(m, d);
        }
      }
      return sqrt(m);
    }

    void main() {
      float seams = voronoi(vUv * 8.0);
      float pulse = sin(uTime * 6.0) * 0.2 + 0.8;
      float crack = smoothstep(0.02, 0.18, seams);

      // Mezclar corteza volcánica oscura y lava ardiente incandescente
      vec3 color = mix(uLavaColor * (2.5 * pulse), uCrustColor, crack);
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

export const MeteorStrikeAbility = ({ scale = 1.0 }) => {
  const rockRef = useRef(null);
  const trailRef = useRef(null);
  const shockwaveRef = useRef(null);

  const magmaMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(MagmaShader.uniforms),
      vertexShader: MagmaShader.vertexShader,
      fragmentShader: MagmaShader.fragmentShader
    });
  }, []);

  // Estela de fuego y brasas que deja detrás
  const trailGeometry = useMemo(() => {
    return new THREE.ConeGeometry(0.45, 1.4, 16, 1, true);
  }, []);

  useFrame((state, delta) => {
    if (magmaMaterial.uniforms) {
      magmaMaterial.uniforms.uTime.value += delta;
    }
    if (rockRef.current) {
      rockRef.current.rotation.x += delta * 1.8;
      rockRef.current.rotation.y += delta * 2.2;
    }
    if (trailRef.current) {
      trailRef.current.rotation.y -= delta * 3.0;
    }
    if (shockwaveRef.current) {
      shockwaveRef.current.rotation.z += delta * 2.0;
    }
  });

  return (
    <group scale={scale}>
      {/* 1. Núcleo: Asteroide con Magma en las Grietas */}
      <mesh ref={rockRef}>
        <dodecahedronGeometry args={[0.34, 1]} />
        <primitive object={magmaMaterial} attach="material" />
      </mesh>

      {/* 2. Estela de Fuego y Plasma Ascendente (Tail Flame) */}
      <mesh ref={trailRef} position={[0, 0.65, 0]} rotation={[Math.PI, 0, 0]}>
        <primitive object={trailGeometry} attach="geometry" />
        <meshBasicMaterial
          color="#ff4400"
          transparent
          opacity={0.65}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Halo y Ondas de Choque (Shockwave Aura) */}
      <mesh ref={shockwaveRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.38, 0.55, 32]} />
        <meshBasicMaterial
          color="#ffaa00"
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <pointLight color="#ff3700" intensity={3.5} distance={4.5} />
    </group>
  );
};
