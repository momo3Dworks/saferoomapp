import React from 'react';
import { useThree } from '@react-three/fiber';
import { CuboidCollider } from '@react-three/rapier';

export const Bounds = ({ wallThickness = 1, depth = 4 }) => {
  const { width, height } = useThree((state) => state.viewport);
  const hW = width / 2;
  const hH = height / 2;
  const hT = wallThickness / 2;

  return (
    <group name="world-bounds">
      {/* Suelo */}
      <CuboidCollider
        position={[0, -hH - hT, 0]}
        args={[hW + wallThickness, hT, depth]}
        restitution={0.65}
        friction={0.7}
      />

      {/* Pared Izquierda */}
      <CuboidCollider
        position={[-hW - hT, 0, 0]}
        args={[hT, hH * 2, depth]}
        restitution={0.7}
        friction={0.3}
      />

      {/* Pared Derecha */}
      <CuboidCollider
        position={[hW + hT, 0, 0]}
        args={[hT, hH * 2, depth]}
        restitution={0.7}
        friction={0.3}
      />

      {/* Contención Frontal y Trasera 2.5D */}
      <CuboidCollider position={[0, 0, depth / 2]} args={[hW, hH, hT]} restitution={0.2} />
      <CuboidCollider position={[0, 0, -depth / 2]} args={[hW, hH, hT]} restitution={0.2} />
    </group>
  );
};
