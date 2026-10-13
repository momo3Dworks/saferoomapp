import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useOverlayStore } from '../store/useOverlayStore';

export const WebcamMesh = ({
  stream,
  position = [0, 0, 0],
  width = 3.2,
  height = 1.8
}) => {
  const videoRef = useRef(null);
  const textureRef = useRef(null);
  const borderLineRef = useRef(null);
  const [hasValidTexture, setHasValidTexture] = useState(false);
  const activeModifier = useOverlayStore((state) => state.activeModifier);

  useEffect(() => {
    let video = videoRef.current;
    if (!video) {
      video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      videoRef.current = video;
    }

    if (stream) {
      video.srcObject = stream;
      video.play().then(() => {
        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        texture.generateMipmaps = false;
        textureRef.current = texture;
        setHasValidTexture(true);
      }).catch((err) => {
        console.warn('[WebcamMesh] Error iniciando video:', err);
      });
    }

    return () => {
      if (video) {
        video.pause();
        video.srcObject = null;
      }
      if (textureRef.current) {
        textureRef.current.dispose();
      }
    };
  }, [stream]);

  useFrame((state, delta) => {
    if (textureRef.current && videoRef.current && videoRef.current.readyState >= 2) {
      textureRef.current.needsUpdate = true;
    }

    // Micro-pulsación sutil de la línea perimetral
    if (borderLineRef.current) {
      const t = state.clock.getElapsedTime();
      borderLineRef.current.material.opacity = 0.55 + Math.sin(t * 2) * 0.15;
    }
  });

  const activeSpells = useOverlayStore((state) => state.activeSpells);

  const hasFireSpell = activeSpells.some((s) => s.type === 'fire' || s.type === 'meteor');
  const hasThunderSpell = activeSpells.some((s) => s.type === 'thunder' || s.type === 'beam');
  const hasGlacierSpell = activeSpells.some((s) => s.type === 'glacier');

  // Color de acento según modificador roguelike o reacción a hechizo activo
  const accentColor = hasFireSpell
    ? '#ff5500'
    : hasThunderSpell
    ? '#00ffff'
    : hasGlacierSpell
    ? '#38bdf8'
    : activeModifier === 'sala_oscura'
    ? '#a855f7'
    : activeModifier === 'bendicion_divina'
    ? '#eab308'
    : '#38bdf8';

  const halfW = width / 2;
  const halfH = height / 2;
  const cornerLen = 0.09; // Micro-esquinas minimalistas discretas

  // Geometría de micro-brackets en las 4 esquinas (L-shapes sutiles y elegantes)
  const cornerGeometries = React.useMemo(() => {
    const offset = 0.015;
    // Sup Izq
    const tlPts = [
      new THREE.Vector3(-halfW - offset, halfH - cornerLen, 0.012),
      new THREE.Vector3(-halfW - offset, halfH + offset, 0.012),
      new THREE.Vector3(-halfW + cornerLen, halfH + offset, 0.012)
    ];
    // Sup Der
    const trPts = [
      new THREE.Vector3(halfW + offset, halfH - cornerLen, 0.012),
      new THREE.Vector3(halfW + offset, halfH + offset, 0.012),
      new THREE.Vector3(halfW - cornerLen, halfH + offset, 0.012)
    ];
    // Inf Izq
    const blPts = [
      new THREE.Vector3(-halfW - offset, -halfH + cornerLen, 0.012),
      new THREE.Vector3(-halfW - offset, -halfH - offset, 0.012),
      new THREE.Vector3(-halfW + cornerLen, -halfH - offset, 0.012)
    ];
    // Inf Der
    const brPts = [
      new THREE.Vector3(halfW + offset, -halfH + cornerLen, 0.012),
      new THREE.Vector3(halfW + offset, -halfH - offset, 0.012),
      new THREE.Vector3(halfW - cornerLen, -halfH - offset, 0.012)
    ];

    return {
      tl: new THREE.BufferGeometry().setFromPoints(tlPts),
      tr: new THREE.BufferGeometry().setFromPoints(trPts),
      bl: new THREE.BufferGeometry().setFromPoints(blPts),
      br: new THREE.BufferGeometry().setFromPoints(brPts)
    };
  }, [halfW, halfH]);

  // Contorno ultra-discreto en tono grafito técnico (no emisión chillona)
  const chassisEdgeGeo = React.useMemo(() => {
    const pad = 0.02;
    const pts = [
      new THREE.Vector3(-halfW - pad, -halfH - pad, 0.005),
      new THREE.Vector3(halfW + pad, -halfH - pad, 0.005),
      new THREE.Vector3(halfW + pad, halfH + pad, 0.005),
      new THREE.Vector3(-halfW - pad, halfH + pad, 0.005),
      new THREE.Vector3(-halfW - pad, -halfH - pad, 0.005)
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [halfW, halfH]);

  return (
    <group position={position} name="webcam-minimalist-scifi">
      {/* 1. SEÑAL DE VIDEO 100% LIMPIA, CRISTALINA Y SIN NINGUNA OBSTRUCCIÓN */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[width, height]} />
        {hasValidTexture && textureRef.current ? (
          <meshBasicMaterial map={textureRef.current} toneMapped={false} />
        ) : (
          <meshBasicMaterial color="#080c14" />
        )}
      </mesh>

      {/* 2. BISEL TRASERO MATE TIPO CHASIS STEALTH (Minimalista Grafito Oscuro) */}
      <mesh position={[0, 0, -0.008]}>
        <planeGeometry args={[width + 0.04, height + 0.04]} />
        <meshBasicMaterial color="#060911" />
      </mesh>

      {/* 3. LÍNEA TÉCNICA DE CONTORNO ULTRA FINA (Gris/Grafito tenue, sin emisión chillona) */}
      <line>
        <primitive object={chassisEdgeGeo} attach="geometry" />
        <lineBasicMaterial color="#1e293b" transparent opacity={0.45} />
      </line>

      {/* 4. MICRO-BRACKETS SCI-FI DE ESQUINA (Marcas sutiles tipo HUD aeroespacial) */}
      <group position={[0, 0, 0.006]}>
        <line>
          <primitive object={cornerGeometries.tl} attach="geometry" />
          <lineBasicMaterial color={accentColor} transparent opacity={0.7} />
        </line>
        <line>
          <primitive object={cornerGeometries.tr} attach="geometry" />
          <lineBasicMaterial color={accentColor} transparent opacity={0.7} />
        </line>
        <line>
          <primitive object={cornerGeometries.bl} attach="geometry" />
          <lineBasicMaterial color={accentColor} transparent opacity={0.7} />
        </line>
        <line>
          <primitive object={cornerGeometries.br} attach="geometry" />
          <lineBasicMaterial color={accentColor} transparent opacity={0.7} />
        </line>
      </group>

      {/* 5. MICRO INDICADOR HUD LED (Punto verde discreto de señal activa en Sup-Izq) */}
      <mesh position={[-halfW + 0.08, halfH + 0.035, 0.015]}>
        <circleGeometry args={[0.018, 16]} />
        <meshBasicMaterial color={hasValidTexture ? '#10b981' : '#38bdf8'} />
      </mesh>
    </group>
  );
};
