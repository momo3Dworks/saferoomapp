import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useOverlayStore } from '../../store/useOverlayStore';

/**
 * EASYFIRE CAMERA COLLISION (Basado en threejs-easyfire-main)
 * E:\SafeRoomMemories_Threejs\src\utils\threejs-easyfire-main
 *
 * Implementa el SDF Box Collider (SDFBox.ts) de EasyFire contra el volumen de la cámara:
 * 1. La llama asciende desde la base de la pantalla hacia la cámara.
 * 2. Al colisionar con la caja de la cámara, el campo de velocidad/humo se desvía
 *    a lo largo de las normales del SDFBox, envolviendo los bordes perimetrales.
 * 3. En el interior (d < 0), la densidad es 0, manteniendo la señal de video 100% visible.
 */

const EasyFireCollisionShader = {
  uniforms: {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uCameraPos: { value: new THREE.Vector3() },
    uBoxHalfExtents: { value: new THREE.Vector3(1.6, 0.9, 0.2) },
    uColorCore: { value: new THREE.Color('#fff7ed') },
    uColorFlame: { value: new THREE.Color('#ff4500') },
    uColorSmoke: { value: new THREE.Color('#1c0502') }
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uProgress;
    uniform vec3 uCameraPos;
    uniform vec3 uBoxHalfExtents;
    uniform vec3 uColorCore;
    uniform vec3 uColorFlame;
    uniform vec3 uColorSmoke;

    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    // Ruido pseudo-3D simplex para la turbulencia térmica
    float hash(vec3 p) {
      p = fract(p * 0.3183099 + 0.1);
      p *= 17.0;
      return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }

    float noise3D(vec3 x) {
      vec3 i = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
            mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
        mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
            mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z
      );
    }

    // SDF Box de threejs-easyfire (SDFBox.ts)
    float sdBox(vec3 p, vec3 b) {
      vec3 q = abs(p) - b;
      return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
    }

    // Normal del SDF Box para desviar las llamas
    vec3 calcBoxNormal(vec3 p, vec3 b) {
      float eps = 0.02;
      return normalize(vec3(
        sdBox(p + vec3(eps, 0, 0), b) - sdBox(p - vec3(eps, 0, 0), b),
        sdBox(p + vec3(0, eps, 0), b) - sdBox(p - vec3(0, eps, 0), b),
        sdBox(p + vec3(0, 0, eps), b) - sdBox(p - vec3(0, 0, eps), b)
      ));
    }

    void main() {
      // Coordenadas relativas a la caja de la cámara
      vec3 localP = vWorldPosition - uCameraPos;
      vec3 boxExt = uBoxHalfExtents;

      float distToBox = sdBox(localP, boxExt);

      // Si está dentro de la cámara, suprimir llama (video 100% visible)
      if (distToBox < -0.05) {
        discard;
      }

      // Advección de convección ascendente con ruido turbulento
      vec3 flowP = localP * 1.8;
      flowP.y -= uTime * 4.2;

      // Desviación del flujo en el borde de colisión de la cámara (Boundary Slip)
      if (distToBox < 0.35) {
        vec3 n = calcBoxNormal(localP, boxExt);
        flowP += n * (0.35 - distToBox) * 2.8;
      }

      float n1 = noise3D(flowP);
      float n2 = noise3D(flowP * 2.2 + vec3(uTime * 1.2, 0.0, 0.0));
      float turbulentNoise = n1 * 0.65 + n2 * 0.35;

      // Envoltura de colisión: Más brillo y concentración de fuego a lo largo de los bordes del marco
      float edgeLip = smoothstep(0.35, 0.0, abs(distToBox)) * 1.5;

      // Desvanecimiento vertical y por ciclo de vida
      float heightFade = smoothstep(boxExt.y + 1.2, -boxExt.y - 0.8, localP.y);
      float lifeFade = clamp((1.0 - uProgress) * 2.5, 0.0, 1.0);

      float fireDensity = clamp((turbulentNoise * 1.2 + edgeLip - 0.25) * heightFade * lifeFade, 0.0, 1.0);

      if (fireDensity < 0.05) discard;

      // Gradiente de color térmico (Núcleo blanco -> Llamas naranja -> Humo oscuro)
      vec3 col = mix(uColorSmoke, uColorFlame, smoothstep(0.1, 0.5, fireDensity));
      col = mix(col, uColorCore, smoothstep(0.65, 0.95, fireDensity));

      gl_FragColor = vec4(col * (1.8 + edgeLip * 1.2), fireDensity * 0.9);
    }
  `
};

export const EasyFireCameraCollision = ({
  id,
  duration = 4.5,
  onComplete
}) => {
  const groupRef = useRef(null);
  const meshRef = useRef(null);
  const lightRef = useRef(null);
  const startTimeRef = useRef(null);

  const webcamTransform = useOverlayStore((state) => state.webcamTransform);
  const { position, scale, width, height } = webcamTransform;

  const halfW = (width * scale[0]) / 2;
  const halfH = (height * scale[1]) / 2;
  const halfD = 0.22;

  const fireMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(EasyFireCollisionShader.uniforms),
      vertexShader: EasyFireCollisionShader.vertexShader,
      fragmentShader: EasyFireCollisionShader.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }, []);

  useFrame((state, delta) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.getElapsedTime();
    }
    const elapsed = state.clock.getElapsedTime() - startTimeRef.current;
    const progress = Math.min(1.0, elapsed / duration);

    if (fireMaterial.uniforms) {
      fireMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
      fireMaterial.uniforms.uProgress.value = progress;
      fireMaterial.uniforms.uCameraPos.value.set(position[0], position[1], position[2]);
      fireMaterial.uniforms.uBoxHalfExtents.value.set(halfW, halfH, halfD);
    }

    if (lightRef.current) {
      const pulse = Math.sin(progress * Math.PI) * (4.5 + Math.sin(elapsed * 25) * 1.2);
      lightRef.current.intensity = Math.max(0, pulse);
    }

    if (progress >= 1.0) {
      onComplete?.(id);
    }
  });

  return (
    <group ref={groupRef} name={`easyfire-cam-collision-${id}`}>
      {/* Volumen Envolvente de Raymarch alrededor del Bounding Box de la Cámara */}
      <mesh
        ref={meshRef}
        position={[position[0], position[1] + 0.15, position[2]]}
      >
        <boxGeometry args={[width * scale[0] + 1.2, height * scale[1] + 1.6, 1.2]} />
        <primitive object={fireMaterial} attach="material" />
      </mesh>

      {/* Luz ambiental cálida de las llamas proyectada sobre la cámara */}
      <pointLight
        ref={lightRef}
        position={[position[0], position[1] + halfH, position[2] + 0.4]}
        color="#ff5500"
        intensity={4}
        distance={6}
      />
    </group>
  );
};
