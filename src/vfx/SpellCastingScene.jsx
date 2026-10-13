import React from 'react';
import { useOverlayStore } from '../store/useOverlayStore';
import { MeteorDetonationSpell } from './spells/MeteorDetonationSpell';
import { ThunderStrikeSpell } from './spells/ThunderStrikeSpell';
import { EasyFireInfernoSpell } from './spells/EasyFireInfernoSpell';
import { EasyFireCameraCollision } from './spells/EasyFireCameraCollision';
import { GlacierEruptionSpell } from './spells/GlacierEruptionSpell';
import { VoidSupernovaSpell } from './spells/VoidSupernovaSpell';
import { BeamDecimationSpell } from './spells/BeamDecimationSpell';

export const SpellCastingScene = () => {
  const activeSpells = useOverlayStore((state) => state.activeSpells);
  const removeSpell = useOverlayStore((state) => state.removeSpell);
  const webcamPos = useOverlayStore((state) => state.webcamTransform.position);

  return (
    <group name="spell-casting-scene-layer">
      {activeSpells.map((spell) => {
        const { id, type, target, start, duration, targetCamera } = spell;

        switch (type) {
          case 'meteor':
            return (
              <MeteorDetonationSpell
                key={id}
                id={id}
                target={target || [0, 0, 0]}
                start={start || [3.5, 4.5, 0]}
                duration={duration || 3.2}
                onComplete={removeSpell}
              />
            );
          case 'thunder':
            return (
              <ThunderStrikeSpell
                key={id}
                id={id}
                target={target || [0, -1.2, 0]}
                duration={duration || 2.4}
                onComplete={removeSpell}
              />
            );
          case 'fire_cam':
          case 'fire_collision':
            return (
              <EasyFireCameraCollision
                key={id}
                id={id}
                duration={duration || 4.5}
                onComplete={removeSpell}
              />
            );
          case 'fire':
            // Si el objetivo es la cámara, usar EasyFireCameraCollision
            if (
              targetCamera ||
              (target && Math.abs(target[0] - webcamPos[0]) < 0.5 && Math.abs(target[1] - webcamPos[1]) < 0.5)
            ) {
              return (
                <EasyFireCameraCollision
                  key={id}
                  id={id}
                  duration={duration || 4.5}
                  onComplete={removeSpell}
                />
              );
            }
            return (
              <EasyFireInfernoSpell
                key={id}
                id={id}
                target={target || [0, -0.8, 0]}
                duration={duration || 3.8}
                onComplete={removeSpell}
              />
            );
          case 'glacier':
            return (
              <GlacierEruptionSpell
                key={id}
                id={id}
                target={target || [0, -1.2, 0]}
                duration={duration || 3.4}
                onComplete={removeSpell}
              />
            );
          case 'beam':
            return (
              <BeamDecimationSpell
                key={id}
                id={id}
                target={target || [0, 0, 0]}
                start={start || [-4.5, 3.2, 0]}
                duration={duration || 3.2}
                onComplete={removeSpell}
              />
            );
          case 'void':
          default:
            return (
              <VoidSupernovaSpell
                key={id}
                id={id}
                target={target || [0, 0, 0]}
                duration={duration || 3.6}
                onComplete={removeSpell}
              />
            );
        }
      })}
    </group>
  );
};
