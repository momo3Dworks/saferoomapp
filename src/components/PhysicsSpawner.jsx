import React from 'react';
import { useOverlayStore } from '../store/useOverlayStore';
import { SpawnedEntity } from './SpawnedEntity';

export const PhysicsSpawner = () => {
  const entities = useOverlayStore((state) => state.entities);
  const removeEntity = useOverlayStore((state) => state.removeEntity);

  return (
    <group name="physics-spawner-container">
      {entities.map((item) => (
        <SpawnedEntity
          key={item.id}
          id={item.id}
          type={item.type}
          element={item.element}
          initialPosition={item.position}
          onRemove={removeEntity}
        />
      ))}
    </group>
  );
};
