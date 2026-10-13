import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, BallCollider, CuboidCollider, CylinderCollider } from '@react-three/rapier';

// Importación de las habilidades mágicas inspiradas en LinearAbilityCasting
import { MeteorStrikeAbility } from '../vfx/MeteorStrikeAbility';
import { ThunderBoltAbility } from '../vfx/ThunderBoltAbility';
import { GlacierSpikeAbility } from '../vfx/GlacierSpikeAbility';
import { ToxicFluidVFX } from '../vfx/ToxicFluidVFX';
import { CosmicVoidVFX } from '../vfx/CosmicVoidVFX';

export const SpawnedEntity = ({
  id,
  type = 'bola',
  element = 'fuego',
  initialPosition = [0, 5, 0],
  onRemove,
  ttl = 14000
}) => {
  const rbRef = useRef(null);
  const { height } = useThree((state) => state.viewport);

  // 1. Auto-cleanup por temporizador
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove?.(id);
    }, ttl);
    return () => clearTimeout(timer);
  }, [id, ttl, onRemove]);

  // 2. Impulso inicial aleatorio al lanzarse
  useEffect(() => {
    if (rbRef.current) {
      const impulseX = (Math.random() - 0.5) * 1.6;
      const torque = (Math.random() - 0.5) * 2.0;
      rbRef.current.applyImpulse({ x: impulseX, y: -0.7, z: 0 }, true);
      rbRef.current.applyTorqueImpulse({ x: torque, y: torque, z: torque }, true);
    }
  }, []);

  // 3. Kill-plane vertical si sale del área
  useFrame(() => {
    if (!rbRef.current) return;
    const pos = rbRef.current.translation();
    if (pos.y < -height * 1.6) {
      onRemove?.(id);
    }
  });

  // 4. Mapeo de Colisionador Físico de Rapier según el Poder
  const colliderNode = useMemo(() => {
    if (element === 'rayo') {
      return <CylinderCollider args={[0.7, 0.22]} />; // Relámpago vertical
    }
    if (element === 'hielo') {
      return <CylinderCollider args={[0.6, 0.24]} />; // Aguja de hielo
    }
    if (type === 'cubo') {
      return <CuboidCollider args={[0.28, 0.28, 0.28]} />;
    }
    // Meteoro, Vacío y Fluido
    return <BallCollider args={[0.34]} />;
  }, [element, type]);

  // 5. Renderizado de la Habilidad Mágica Vistosa (Sin figuras geométricas básicas)
  const abilityNode = useMemo(() => {
    switch (element) {
      case 'fuego':
        // Meteoro de magma ardiente con cola de fuego de LinearAbilityCasting
        return <MeteorStrikeAbility scale={1.1} />;
      case 'rayo':
        // Relámpago en zigzag procedural con zarcillos vivos de ThunderAbility
        return <ThunderBoltAbility scale={1.1} />;
      case 'hielo':
        // Agujas de hielo cristalinas con vapor ártico de GlacierAbility
        return <GlacierSpikeAbility scale={1.05} />;
      case 'veneno':
        // Fluido viscoso orgánico deformable con brillo químico
        return <ToxicFluidVFX scale={1.1} />;
      case 'vacio':
      default:
        // Singularidad de agujero negro con disco de acreción
        return <CosmicVoidVFX scale={1.05} />;
    }
  }, [element]);

  return (
    <RigidBody
      ref={rbRef}
      colliders={false}
      position={initialPosition}
      restitution={0.8}
      friction={0.4}
      linearDamping={0.1}
      angularDamping={0.15}
      canSleep={false}
    >
      {colliderNode}
      {abilityNode}
    </RigidBody>
  );
};
