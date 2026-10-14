import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useOverlayStore } from '../store/useOverlayStore';

// =============================================================================
// HOLOGRAPHIC SHADER — Glitch Displacement + Chromatic Aberration + Scanlines
// =============================================================================
const HologramShader = {
  uniforms: {
    uMap: { value: null },
    uTime: { value: 0 },
    uGlitch: { value: 0 },
    uChroma: { value: 0 },
    uColor: { value: new THREE.Color('#38bdf8') },
    uScanSpeed: { value: 1.4 },
    uGridOpacity: { value: 0.08 },
    uAlpha: { value: 1.0 }
  },
  vertexShader: `
    uniform float uTime;
    uniform float uGlitch;
    varying vec2 vUv;
    varying float vGlitch;

    float hash(float n) { return fract(sin(n) * 43758.5453123); }

    void main() {
      vUv = uv;
      vGlitch = uGlitch;
      vec3 pos = position;

      if (uGlitch > 0.01) {
        float band = floor(uv.y * 18.0);
        float t    = uTime * 9.0;
        float rng  = hash(band + floor(t));
        float slip = (rng - 0.5) * 0.12 * uGlitch * step(0.55, hash(band * 7.3 + t * 0.3));
        float dispY = sin(uv.y * 34.0 + uTime * 6.0) * 0.018 * uGlitch;
        pos.x += slip;
        pos.y += dispY;
        float shake = (hash(t * 0.71) - 0.5) * 0.04 * uGlitch;
        pos.x += shake;
      }

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uMap;
    uniform float uTime;
    uniform float uGlitch;
    uniform float uChroma;
    uniform vec3  uColor;
    uniform float uScanSpeed;
    uniform float uGridOpacity;
    uniform float uAlpha;

    varying vec2  vUv;
    varying float vGlitch;

    float hash(float n) { return fract(sin(n) * 43758.5453123); }

    void main() {
      vec2 uv = vUv;
      float chromaAmt = uChroma * 0.018;
      vec2 rOffset = vec2(chromaAmt,  0.0);
      vec2 bOffset = vec2(-chromaAmt, 0.0);

      float glitchSlip = 0.0;
      if (uGlitch > 0.01) {
        float band = floor(uv.y * 18.0);
        float t    = uTime * 9.0;
        float rng  = hash(band + floor(t));
        glitchSlip = (rng - 0.5) * 0.10 * uGlitch * step(0.55, hash(band * 7.3 + t * 0.3));
      }

      vec2 uvR = clamp(uv + rOffset + vec2(glitchSlip * 0.5, 0.0), 0.0, 1.0);
      vec2 uvG = clamp(uv + vec2(glitchSlip, 0.0),                  0.0, 1.0);
      vec2 uvB = clamp(uv + bOffset - vec2(glitchSlip * 0.3, 0.0),  0.0, 1.0);

      vec4 texR = texture2D(uMap, uvR);
      vec4 texG = texture2D(uMap, uvG);
      vec4 texB = texture2D(uMap, uvB);
      vec4 tex  = vec4(texR.r, texG.g, texB.b, texG.a);

      float scan     = sin(uv.y * 320.0 - uTime * uScanSpeed * 6.0) * 0.5 + 0.5;
      float scanLine = mix(1.0, 0.82, scan * 0.38);

      float beam  = fract(uTime * 0.28);
      float beamA = smoothstep(0.06, 0.0, abs(uv.y - beam)) * 0.18;

      vec2  gridUv = uv * vec2(32.0, 18.0);
      float gx     = smoothstep(0.92, 1.0, fract(gridUv.x));
      float gy     = smoothstep(0.92, 1.0, fract(gridUv.y));
      float grid   = max(gx, gy) * uGridOpacity;

      float vigX    = pow(1.0 - abs(uv.x - 0.5) * 2.0, 1.4);
      float vigY    = pow(1.0 - abs(uv.y - 0.5) * 2.0, 1.4);
      float vignette = vigX * vigY;

      vec3 holoTint = uColor * 0.12;
      vec3 col = tex.rgb * scanLine + holoTint + grid * uColor + beamA * uColor;

      float edgeGlow = (1.0 - vignette) * 0.06 + sin(uTime * 2.1) * 0.02;
      col += uColor * edgeGlow;

      if (uGlitch > 0.4) {
        float flash = (hash(floor(uTime * 12.0)) - 0.5) * uGlitch * 0.25;
        col = mix(col, uColor * 1.8, clamp(flash, 0.0, 0.5));
      }

      gl_FragColor = vec4(col, tex.a * uAlpha);
    }
  `
};

// =============================================================================
// HOLOGRAPHIC OVERLAY SHADER — Persistent scanlines + grid + edge glow
// =============================================================================
const HoloOverlayShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#38bdf8') },
    uOpacity: { value: 0.038 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3  uColor;
    uniform float uOpacity;
    varying vec2  vUv;

    void main() {
      float scan  = sin(vUv.y * 420.0 - uTime * 5.5) * 0.5 + 0.5;
      float scanA = scan * 0.13;

      float beam  = fract(uTime * 0.22);
      float beamA = smoothstep(0.05, 0.0, abs(vUv.y - beam)) * 0.18;

      vec2  g   = fract(vUv * vec2(28.0, 16.0));
      float gx  = smoothstep(0.94, 1.0, g.x);
      float gy  = smoothstep(0.94, 1.0, g.y);
      float grid = max(gx, gy) * 0.07;

      float ex = pow(abs(vUv.x - 0.5) * 2.0, 3.0);
      float ey = pow(abs(vUv.y - 0.5) * 2.0, 3.0);
      float edgeGlow = max(ex, ey) * 0.22 + 0.04;
      edgeGlow *= 0.8 + sin(uTime * 1.8) * 0.2;

      float alpha = (scanA + beamA + grid + edgeGlow) * uOpacity;
      gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 0.72));
    }
  `
};

// =============================================================================
// HUD CANVAS TEXTURE — futuristic text / counters / hex values
// =============================================================================
function useHudTexture(width, height) {
  const canvasRef = useRef(null);
  const textureRef = useRef(null);
  const frameCount = useRef(0);

  if (!canvasRef.current) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = Math.round(512 * (height / width));
    canvasRef.current = canvas;
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    textureRef.current = tex;
  }

  const updateTexture = (time, accentColor, glitchActive) => {
    frameCount.current++;
    if (frameCount.current % 2 !== 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const color = accentColor || '#38bdf8';
    const hh = String(Math.floor(time / 3600) % 24).padStart(2, '0');
    const mm = String(Math.floor(time / 60) % 60).padStart(2, '0');
    const ss = String(Math.floor(time) % 60).padStart(2, '0');
    const ms2 = String(Math.floor((time % 1) * 100)).padStart(2, '0');

    const drawText = (txt, x, y, size, opacity = 1) => {
      ctx.save();
      if (glitchActive && Math.random() < 0.3) {
        x += (Math.random() - 0.5) * 8;
        y += (Math.random() - 0.5) * 4;
      }
      ctx.globalAlpha = opacity;
      ctx.font = `${size}px "Courier New", monospace`;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.fillText(txt, x, y);
      ctx.restore();
    };

    // Timer — top left
    drawText(`${hh}:${mm}:${ss}.${ms2}`, 10, 28, 22, 0.9);
    drawText('STREAM UPTIME', 10, 44, 9, 0.45);

    // Signal / latency — top right
    const lat = (Math.sin(time * 1.3) * 4 + 12).toFixed(1);
    const sig = (Math.sin(time * 0.7) * 5 + 95).toFixed(0);
    drawText(`SIG  ${sig}%`, W - 92, 22, 11, 0.7);
    drawText(`LAT  ${lat}ms`, W - 92, 36, 11, 0.7);

    // Scrolling hex lines — bottom left
    for (let i = 0; i < 4; i++) {
      const seed = Math.floor(time * 3 + i * 17);
      const hexVal = ((seed * 0xdeadbeef) >>> 0).toString(16).toUpperCase().padStart(8, '0');
      const yy = H - 10 - i * 13;
      if (yy > 0) drawText(`0x${hexVal}`, 8, yy, 9, 0.28);
    }

    // Scrolling hex lines — bottom right
    for (let i = 0; i < 4; i++) {
      const seed = Math.floor(time * 2.1 + i * 31 + 999);
      const hexVal = ((seed * 0xcafebabe) >>> 0).toString(16).toUpperCase().padStart(8, '0');
      drawText(hexVal, W - 78, H - 10 - i * 13, 9, 0.22);
    }

    // Vertical binary strip — left edge
    for (let i = 0; i < 20; i++) {
      const bit = Math.floor(Math.random() * 2);
      const yy = ((time * 80 + i * 14) % H);
      drawText(String(bit), 2, yy, 8, 0.12);
    }

    // Coordinate display — bottom center
    const cx = ((Math.sin(time * 0.11) + 1) * 50).toFixed(2);
    const cy = ((Math.cos(time * 0.09) + 1) * 50).toFixed(2);
    const coordLabel = `X:${cx}  Y:${cy}  Z:0.00`;
    ctx.save();
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.fillText(coordLabel, W / 2 - ctx.measureText(coordLabel).width / 2, H - 6);
    ctx.restore();

    // System status symbol — top right
    const symbols = ['◆', '◈', '◉', '◎'];
    const sym = symbols[Math.floor(time * 2) % symbols.length];
    drawText(`SYS ${sym} ONLINE`, W - 102, 52, 9, 0.45);

    // Glitch artifacts
    if (glitchActive) {
      for (let i = 0; i < 3; i++) {
        const gx2 = Math.random() * W;
        const gy2 = Math.random() * H;
        ctx.save();
        ctx.globalAlpha = Math.random() * 0.35;
        ctx.fillStyle = color;
        ctx.fillRect(gx2, gy2, Math.random() * 80 + 10, Math.random() * 4 + 1);
        ctx.restore();
      }
    }

    textureRef.current.needsUpdate = true;
  };

  return { textureRef, updateTexture };
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================
export const WebcamMesh = ({
  stream,
  position = [0, 0, 0],
  width = 3.2,
  height = 1.8
}) => {
  const videoRef = useRef(null);
  const videoTexRef = useRef(null);
  const holoMatRef = useRef(null);
  const overlayMatRef = useRef(null);
  const glitchState = useRef({ active: false, intensity: 0, chromaBoost: 0, timer: 0, nextGlitch: 3, elapsed: 0 });
  const outerBorderRef = useRef(null);
  const innerBorderRef = useRef(null);
  const cornerRefs = useRef([]);
  const tickRefs = useRef([]);

  const [hasValidTexture, setHasValidTexture] = useState(false);

  const activeModifier = useOverlayStore((state) => state.activeModifier);
  const activeSpells = useOverlayStore((state) => state.activeSpells);

  const hasFireSpell = activeSpells.some((s) => s.type === 'fire' || s.type === 'meteor');
  const hasThunderSpell = activeSpells.some((s) => s.type === 'thunder' || s.type === 'beam');
  const hasGlacierSpell = activeSpells.some((s) => s.type === 'glacier');

  const accentColor =
    hasFireSpell ? '#ff5500'
      : hasThunderSpell ? '#00ffff'
        : hasGlacierSpell ? '#38bdf8'
          : activeModifier === 'sala_oscura' ? '#a855f7'
            : activeModifier === 'bendicion_divina' ? '#eab308'
              : '#38bdf8';

  // ── Video texture setup ────────────────────────────────────────────────────
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
        videoTexRef.current = texture;
        if (holoMatRef.current) holoMatRef.current.uniforms.uMap.value = texture;
        setHasValidTexture(true);
      }).catch((err) => console.warn('[WebcamMesh] Video error:', err));
    }
    return () => {
      if (video) { video.pause(); video.srcObject = null; }
      if (videoTexRef.current) videoTexRef.current.dispose();
    };
  }, [stream]);

  // ── Shader materials ───────────────────────────────────────────────────────
  const holoMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(HologramShader.uniforms),
      vertexShader: HologramShader.vertexShader,
      fragmentShader: HologramShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    holoMatRef.current = mat;
    return mat;
  }, []);

  const overlayMaterial = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(HoloOverlayShader.uniforms),
      vertexShader: HoloOverlayShader.vertexShader,
      fragmentShader: HoloOverlayShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    overlayMatRef.current = mat;
    return mat;
  }, []);

  // ── HUD canvas texture ─────────────────────────────────────────────────────
  const { textureRef: hudTexRef, updateTexture: updateHud } = useHudTexture(width, height);

  // ── Subdivided geometry ────────────────────────────────────────────────────
  const holoGeo = useMemo(() => new THREE.PlaneGeometry(width, height, 32, 18), [width, height]);

  // ── Frame and corner geometries ────────────────────────────────────────────
  const halfW = width / 2;
  const halfH = height / 2;
  const cPad = 0.028;
  const cLen = 0.22;
  const innerTick = 0.06;

  const frameGeos = useMemo(() => {
    const pad = cPad;

    const borderGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfW - pad, -halfH - pad, 0),
      new THREE.Vector3(halfW + pad, -halfH - pad, 0),
      new THREE.Vector3(halfW + pad, halfH + pad, 0),
      new THREE.Vector3(-halfW - pad, halfH + pad, 0),
      new THREE.Vector3(-halfW - pad, -halfH - pad, 0),
    ]);

    const inset = 0.055;
    const innerGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-halfW + inset, -halfH + inset, 0),
      new THREE.Vector3(halfW - inset, -halfH + inset, 0),
      new THREE.Vector3(halfW - inset, halfH - inset, 0),
      new THREE.Vector3(-halfW + inset, halfH - inset, 0),
      new THREE.Vector3(-halfW + inset, -halfH + inset, 0),
    ]);

    const makeCorner = (sx, sy) => {
      const ox = sx * (halfW + pad);
      const oy = sy * (halfH + pad);
      return {
        main: new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(ox - sx * cLen * 1.6, oy, 0),
          new THREE.Vector3(ox, oy, 0),
          new THREE.Vector3(ox, oy - sy * cLen * 1.6, 0),
        ]),
        tick: new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(ox - sx * innerTick, oy - sy * (cLen * 1.6 - innerTick), 0),
          new THREE.Vector3(ox - sx * innerTick, oy - sy * cLen * 1.6, 0),
        ])
      };
    };

    const tl = makeCorner(-1, 1);
    const tr = makeCorner(1, 1);
    const bl = makeCorner(-1, -1);
    const br = makeCorner(1, -1);

    const edgeTicks = [];
    const tickCount = 3;
    const tickSize = 0.04;

    for (let i = 0; i < tickCount; i++) {
      const t2 = (i + 1) / (tickCount + 1);
      const xPos = -halfW + t2 * width;
      edgeTicks.push(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(xPos, halfH + pad, 0),
        new THREE.Vector3(xPos, halfH + pad + tickSize, 0),
      ]));
      edgeTicks.push(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(xPos, -halfH - pad, 0),
        new THREE.Vector3(xPos, -halfH - pad - tickSize, 0),
      ]));
    }
    for (let i = 0; i < tickCount; i++) {
      const t2 = (i + 1) / (tickCount + 1);
      const yPos = -halfH + t2 * height;
      edgeTicks.push(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(halfW + pad, yPos, 0),
        new THREE.Vector3(halfW + pad + tickSize, yPos, 0),
      ]));
      edgeTicks.push(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-halfW - pad, yPos, 0),
        new THREE.Vector3(-halfW - pad - tickSize, yPos, 0),
      ]));
    }

    return { borderGeo, innerGeo, tl, tr, bl, br, edgeTicks };
  }, [halfW, halfH, width, height]);

  const allCorners = [
    frameGeos.tl.main, frameGeos.tl.tick,
    frameGeos.tr.main, frameGeos.tr.tick,
    frameGeos.bl.main, frameGeos.bl.tick,
    frameGeos.br.main, frameGeos.br.tick,
  ];

  // ── useFrame ───────────────────────────────────────────────────────────────
  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const gs = glitchState.current;

    if (videoTexRef.current && videoRef.current?.readyState >= 2) {
      videoTexRef.current.needsUpdate = true;
    }

    // Glitch state machine
    gs.timer += delta;
    if (!gs.active && gs.timer >= gs.nextGlitch) {
      gs.active = true;
      gs.intensity = 0.4 + Math.random() * 0.6;
      gs.chromaBoost = 0.5 + Math.random() * 0.5;
      gs.duration = 0.08 + Math.random() * 0.35;
      gs.elapsed = 0;
    }
    if (gs.active) {
      gs.elapsed += delta;
      if (gs.elapsed >= gs.duration) {
        gs.active = false;
        gs.intensity = 0;
        gs.chromaBoost = 0;
        gs.timer = 0;
        gs.nextGlitch = 2.5 + Math.random() * 6.0;
      }
    }

    // Update hologram shader
    if (holoMaterial.uniforms) {
      holoMaterial.uniforms.uTime.value = t;
      holoMaterial.uniforms.uGlitch.value = gs.active ? gs.intensity : 0;
      holoMaterial.uniforms.uChroma.value = gs.active ? gs.chromaBoost : 0;
      holoMaterial.uniforms.uColor.value.set(accentColor);
      if (videoTexRef.current) holoMaterial.uniforms.uMap.value = videoTexRef.current;
    }

    if (overlayMaterial.uniforms) {
      overlayMaterial.uniforms.uTime.value = t;
      overlayMaterial.uniforms.uColor.value.set(accentColor);
    }

    // Animate frame lines
    const pulse = 0.5 + Math.sin(t * 1.8) * 0.18;
    const fastPulse = 0.5 + Math.sin(t * 4.2) * 0.5;
    const glitchMod = gs.active ? fastPulse : pulse;

    if (outerBorderRef.current?.material) {
      outerBorderRef.current.material.opacity = 0.55 * glitchMod + (gs.active ? 0.3 : 0);
    }
    if (innerBorderRef.current?.material) {
      innerBorderRef.current.material.opacity = 0.22 + Math.sin(t * 2.6) * 0.06;
    }
    cornerRefs.current.forEach((ref) => {
      if (ref?.material) ref.material.opacity = 0.85 + Math.sin(t * 2.2) * 0.12;
    });
    tickRefs.current.forEach((ref, i) => {
      if (ref?.material) ref.material.opacity = 0.32 + Math.sin(t * 1.5 + i * 0.4) * 0.15;
    });

    // Update HUD
    updateHud(t, accentColor, gs.active);
    if (hudTexRef.current) hudTexRef.current.needsUpdate = true;
  });

  return (
    <group position={position} name="webcam-holographic">

      {/* 1. Back chassis plate */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[width + 0.08, height + 0.08]} />
        <meshBasicMaterial color="#040610" />
      </mesh>

      {/* 2. Holographic video mesh (subdivided for glitch displacement) */}
      <mesh position={[0, 0, 0.005]}>
        <primitive object={holoGeo} attach="geometry" />
        {hasValidTexture && videoTexRef.current
          ? <primitive object={holoMaterial} attach="material" />
          : <meshBasicMaterial color="#050c1a" />
        }
      </mesh>

      {/* 3. Holographic overlay — scanlines + grid + edge glow */}
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[width, height]} />
        <primitive object={overlayMaterial} attach="material" />
      </mesh>

      {/* 4. HUD canvas text layer */}
      <mesh position={[0, 0, 0.016]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          map={hudTexRef.current}
          transparent
          opacity={0.92}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 5. Frame lines + corners + ticks */}
      <group position={[0, 0, 0.022]}>

        {/* Outer border */}
        <line ref={outerBorderRef}>
          <primitive object={frameGeos.borderGeo} attach="geometry" />
          <lineBasicMaterial color={accentColor} transparent opacity={0.7} />
        </line>

        {/* Inner inset border */}
        <line ref={innerBorderRef}>
          <primitive object={frameGeos.innerGeo} attach="geometry" />
          <lineBasicMaterial color={accentColor} transparent opacity={0.22} />
        </line>

        {/* Corner brackets */}
        {allCorners.map((geo, i) => (
          <line key={`corner-${i}`} ref={(el) => { cornerRefs.current[i] = el; }}>
            <primitive object={geo} attach="geometry" />
            <lineBasicMaterial
              color={accentColor}
              transparent
              opacity={i % 2 === 0 ? 0.95 : 0.5}
            />
          </line>
        ))}

        {/* Edge tick marks */}
        {frameGeos.edgeTicks.map((geo, i) => (
          <line key={`tick-${i}`} ref={(el) => { tickRefs.current[i] = el; }}>
            <primitive object={geo} attach="geometry" />
            <lineBasicMaterial color={accentColor} transparent opacity={0.38} />
          </line>
        ))}

        {/* Corner dot indicators */}
        {[
          [-halfW - cPad, halfH + cPad],
          [halfW + cPad, halfH + cPad],
          [-halfW - cPad, -halfH - cPad],
          [halfW + cPad, -halfH - cPad],
        ].map(([cx, cy], i) => (
          <mesh key={`dot-${i}`} position={[cx, cy, 0.001]}>
            <circleGeometry args={[0.022, 8]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>
        ))}

        {/* Signal indicator dot */}
        <mesh position={[-halfW - cPad - 0.06, halfH + cPad + 0.045, 0.001]}>
          <circleGeometry args={[0.016, 12]} />
          <meshBasicMaterial color={hasValidTexture ? '#10b981' : '#38bdf8'} />
        </mesh>
      </group>
    </group>
  );
};