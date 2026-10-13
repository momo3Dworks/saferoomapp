import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * SINGULARITY BLACK HOLE (Port fiel del shader de Singularity-Master)
 * E:\SafeRoomMemories_Threejs\src\utils\singularity-master
 * 
 * Implementa raymarching relativista con deflexión gravitacional (1/r^2),
 * disco de acreción rotatorio con ruido diferencial, horizonte de eventos
 * oscuro central y compositing front-to-back de plasma cósmico.
 */

const SingularityShader = {
  uniforms: {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uStepSize: { value: 0.015 },
    uPower: { value: 0.38 },
    uOriginRadius: { value: 0.14 },
    uWidth: { value: 0.038 },
    uRampCol1: { value: new THREE.Color(0.95, 0.72, 0.44) }, // Núcleo cálido oro/plasma
    uRampCol2: { value: new THREE.Color(0.85, 0.22, 0.05) }, // Ámbar/Magma
    uRampCol3: { value: new THREE.Color(0.45, 0.08, 0.85) }, // Violeta/Vacío cósmico
    uRampEmission: { value: 2.4 },
    uNoiseDeepTexture: { value: null }
  },
  vertexShader: `
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    void main() {
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uProgress;
    uniform float uStepSize;
    uniform float uPower;
    uniform float uOriginRadius;
    uniform float uWidth;
    uniform vec3 uRampCol1;
    uniform vec3 uRampCol2;
    uniform vec3 uRampCol3;
    uniform float uRampEmission;
    uniform sampler2D uNoiseDeepTexture;

    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      // Rayo en espacio de objeto local
      vec3 rayPos = vPosition;
      vec3 rayDir = normalize(vPosition - (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz);

      vec3 colorAcc = vec3(0.0);
      float alphaAcc = 0.0;

      // Jitter sutil para evitar banding
      float j = hash(gl_FragCoord.xy) * 0.008;
      rayPos += rayDir * j;

      float originR = uOriginRadius * clamp(uProgress * 2.5, 0.3, 1.0);
      float bandW = uWidth;

      // Marcha de rayos gravitacional (64 pasos)
      for (int i = 0; i < 64; i++) {
        float rLen = length(rayPos);

        // Fuerza de atracción gravitacional relativista hacia el centro
        vec3 rNorm = rayPos / max(rLen, 0.0001);
        float steerMag = (uStepSize * uPower) / max(rLen * rLen, 0.015);
        float range = clamp((1.0 - rLen) / 0.5, 0.0, 1.0);
        vec3 steer = rNorm * (steerMag * range);
        vec3 steeredDir = normalize(rayDir - steer);

        // Avance del rayo
        rayPos += rayDir * uStepSize;
        rayDir = steeredDir;

        // Plano del disco de acreción (XY)
        float xyLen = length(rayPos.xy);
        float rotPhase = xyLen * 4.27 - uTime * 0.35;
        float cosR = cos(rotPhase);
        float sinR = sin(rotPhase);
        vec2 rotXY = vec2(rayPos.x * cosR - rayPos.y * sinR, rayPos.x * sinR + rayPos.y * cosR);

        vec2 uvSample = rotXY * 0.65 + vec2(0.5);
        vec4 noiseDeep = texture2D(uNoiseDeepTexture, uvSample);

        // Banda transversal Z del disco (perfil acampanado)
        float zDist = abs(rayPos.z);
        float zBand = max(0.0, 1.0 - (zDist * zDist) / (bandW * bandW));

        float noiseAmp = noiseDeep.r * zBand;

        // Evaluación de gradiente térmico de plasma (Color Ramp)
        float rampInput = xyLen + (noiseAmp - 0.78) * 1.6;
        vec3 baseCol = mix(uRampCol1, uRampCol2, smoothstep(originR, 0.42, rampInput));
        baseCol = mix(baseCol, uRampCol3, smoothstep(0.42, 0.88, rampInput));
        vec3 emissiveCol = baseCol * uRampEmission;

        // Horizonte de eventos: Absorción total de luz dentro de originRadius
        float rNow = length(rayPos);
        bool insideCore = rNow < originR;
        vec3 shadedCol = insideCore ? vec3(0.0) : emissiveCol;

        // Opacidad y acumulación volumétrica front-to-back
        float aRadial = smoothstep(1.0, 0.12, xyLen);
        float aBand = smoothstep(bandW, 0.0, zDist) * aRadial * zBand;
        float alphaLocal = insideCore ? 1.0 : clamp(aBand * 2.2, 0.0, 1.0);

        float weight = (1.0 - alphaAcc) * alphaLocal;
        colorAcc += shadedCol * weight;
        alphaAcc += weight;

        if (alphaAcc >= 0.98) break;
      }

      // Desvanecimiento al final del ciclo de vida del hechizo
      float fade = clamp((1.0 - uProgress) * 3.0, 0.0, 1.0);
      gl_FragColor = vec4(colorAcc * fade, clamp(alphaAcc * fade, 0.0, 1.0));
    }
  `
};

export const SingularityBlackHole = ({
  position = [0, 0, 0],
  scale = 2.4,
  progress = 0
}) => {
  const meshRef = useRef(null);
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);

  // Cargar textura noise_deep.png de singularity-master
  const noiseTexture = useMemo(() => {
    const tex = textureLoader.load('/textures/noise_deep.png');
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }, [textureLoader]);

  const singularityMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(SingularityShader.uniforms),
      vertexShader: SingularityShader.vertexShader,
      fragmentShader: SingularityShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    mat.uniforms.uNoiseDeepTexture.value = noiseTexture;
    return mat;
  }, [noiseTexture]);

  useFrame((state, delta) => {
    if (singularityMaterial.uniforms) {
      singularityMaterial.uniforms.uTime.value = state.clock.getElapsedTime();
      singularityMaterial.uniforms.uProgress.value = progress;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group position={position} scale={scale}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <primitive object={singularityMaterial} attach="material" />
      </mesh>
    </group>
  );
};
