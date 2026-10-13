import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * BEAM DECIMATION SPELL (Inspirado en BeamAbility.js de LinearAbiltyCastingThreeJS)
 * Columna de luz/plasma de alta potencia sostenida con núcleo hiper-energético,
 * espirales helicoidales periféricas, orbe de carga y disco de impacto devastador.
 */
export const BeamDecimationSpell = ({
  id,
  target = [0, 0, 0],
  start = [-5, 3.5, 0],
  duration = 3.2,
  onComplete
}) => {
  const groupRef = useRef(null);
  const coreRef = useRef(null);
  const outerBeamRef = useRef(null);
  const helixRef = useRef(null);
  const chargeOrbRef = useRef(null);
  const impactDiscRef = useRef(null);
  const lightRef = useRef(null);
  const startTimeRef = useRef(null);

  const startVec = useMemo(() => new THREE.Vector3(...start), [start]);
  const targetVec = useMemo(() => new THREE.Vector3(...target), [target]);
  const beamLength = useMemo(() => startVec.distanceTo(targetVec), [startVec, targetVec]);
  const beamMid = useMemo(
    () => new THREE.Vector3().addVectors(startVec, targetVec).multiplyScalar(0.5),
    [startVec, targetVec]
  );

  const beamQuat = useMemo(() => {
    const dir = new THREE.Vector3().subVectors(targetVec, startVec).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    return new THREE.Quaternion().setFromUnitVectors(up, dir);
  }, [startVec, targetVec]);

  // Generador de hélice en espiral alrededor del haz
  const helixPoints = useMemo(() => {
    const pts = [];
    const count = 120;
    const turns = 6;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const angle = t * Math.PI * 2 * turns;
      const radius = 0.28 + Math.sin(t * Math.PI) * 0.12;
      const y = (t - 0.5) * beamLength;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
    }
    return pts;
  }, [beamLength]);

  const helixGeo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(helixPoints);
    return new THREE.TubeGeometry(curve, 100, 0.022, 6, false);
  }, [helixPoints]);

  useFrame((state) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.getElapsedTime();
    }
    const elapsed = state.clock.getElapsedTime() - startTimeRef.current;
    const progress = elapsed / duration;

    // FASE 1: Carga en el origen (0.0s - 0.4s)
    if (progress < 0.12) {
      const chargeProg = progress / 0.12;
      if (chargeOrbRef.current) {
        chargeOrbRef.current.visible = true;
        chargeOrbRef.current.scale.setScalar(chargeProg * 1.5);
      }
      if (coreRef.current) coreRef.current.visible = false;
      if (outerBeamRef.current) outerBeamRef.current.visible = false;
      if (helixRef.current) helixRef.current.visible = false;
      if (impactDiscRef.current) impactDiscRef.current.visible = false;
    }
    // FASE 2: Haz continuo sostenido (0.12 - 0.85)
    else if (progress < 0.85) {
      const fireProg = (progress - 0.12) / 0.73;
      if (chargeOrbRef.current) {
        chargeOrbRef.current.visible = true;
        chargeOrbRef.current.scale.setScalar(1.2 + Math.sin(elapsed * 25) * 0.2);
      }

      if (coreRef.current) {
        coreRef.current.visible = true;
        const pulse = 1.0 + Math.sin(elapsed * 30) * 0.25;
        coreRef.current.scale.set(pulse, 1, pulse);
        coreRef.current.material.opacity = 0.95;
      }

      if (outerBeamRef.current) {
        outerBeamRef.current.visible = true;
        const outerPulse = 1.0 + Math.cos(elapsed * 20) * 0.3;
        outerBeamRef.current.scale.set(outerPulse, 1, outerPulse);
        outerBeamRef.current.material.opacity = 0.55;
      }

      if (helixRef.current) {
        helixRef.current.visible = true;
        helixRef.current.rotation.y += 0.2;
      }

      // Disco de impacto en el punto objetivo
      if (impactDiscRef.current) {
        impactDiscRef.current.visible = true;
        impactDiscRef.current.rotation.z += 0.25;
        const discScale = 1.8 + Math.sin(elapsed * 20) * 0.4;
        impactDiscRef.current.scale.set(discScale, discScale, discScale);
        impactDiscRef.current.material.opacity = 0.9;
      }

      if (lightRef.current) {
        lightRef.current.intensity = 5.0 + Math.sin(elapsed * 40) * 2.0;
      }
    }
    // FASE 3: Disolución y colapso (0.85 - 1.0)
    else {
      const fadeProg = (progress - 0.85) / 0.15;
      const alpha = Math.max(0, 1.0 - fadeProg);

      if (coreRef.current) {
        coreRef.current.scale.set(alpha, 1, alpha);
        coreRef.current.material.opacity = alpha;
      }
      if (outerBeamRef.current) {
        outerBeamRef.current.material.opacity = alpha * 0.5;
      }
      if (helixRef.current) {
        helixRef.current.material.opacity = alpha * 0.7;
      }
      if (impactDiscRef.current) {
        impactDiscRef.current.scale.multiplyScalar(0.92);
        impactDiscRef.current.material.opacity = alpha;
      }
      if (chargeOrbRef.current) {
        chargeOrbRef.current.scale.multiplyScalar(0.85);
      }
      if (lightRef.current) {
        lightRef.current.intensity = alpha * 3.0;
      }

      if (progress >= 1.0) {
        onComplete?.(id);
      }
    }
  });

  return (
    <group ref={groupRef} name={`beam-spell-${id}`}>
      {/* 1. Orbe de Carga en el Punto de Disparo */}
      <mesh ref={chargeOrbRef} position={startVec} visible={false}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.9} />
      </mesh>

      {/* 2. Columna del Haz Central */}
      <group position={beamMid} quaternion={beamQuat}>
        {/* Núcleo blanco incandescente */}
        <mesh ref={coreRef} visible={false}>
          <cylinderGeometry args={[0.07, 0.07, beamLength, 16]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
        </mesh>

        {/* Capa de plasma celeste exterior */}
        <mesh ref={outerBeamRef} visible={false}>
          <cylinderGeometry args={[0.22, 0.22, beamLength, 16]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.55} blending={THREE.AdditiveBlending} />
        </mesh>

        {/* Hélice de energía espiralada */}
        <mesh ref={helixRef} geometry={helixGeo} visible={false}>
          <meshBasicMaterial color="#e0f2fe" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>

      {/* 3. Disco de Impacto Devastador en el Objetivo */}
      <mesh ref={impactDiscRef} position={targetVec} visible={false}>
        <ringGeometry args={[0.1, 1.2, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Luz dinámica de alto brillo */}
      <pointLight ref={lightRef} position={targetVec} color="#38bdf8" intensity={4.5} distance={12} />
    </group>
  );
};
