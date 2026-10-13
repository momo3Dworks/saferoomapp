import { useEffect } from 'react';
import { useOverlayStore } from '../store/useOverlayStore';
import { socket, syncChannel } from '../utils/syncManager';

export const useSocketListener = () => {
  const addEntity = useOverlayStore((state) => state.addEntity);
  const setModifier = useOverlayStore((state) => state.setModifier);
  const clearEntities = useOverlayStore((state) => state.clearEntities);
  const clearSpells = useOverlayStore((state) => state.clearSpells);
  const castSpell = useOverlayStore((state) => state.castSpell);
  const setWebcamTransform = useOverlayStore((state) => state.setWebcamTransform);

  useEffect(() => {
    // 1. Escuchar mensajes del canal local (Dock <-> Escena 3D)
    const handleBroadcast = (event) => {
      const data = event.data || {};
      if (data.type === 'cast_spell' && data.payload) {
        castSpell(data.payload.spellType, { id: data.payload.id, ...data.payload.options });
      } else if (data.type === 'spawn' && data.payload) {
        addEntity(data.payload);
      } else if (data.type === 'modifier') {
        setModifier(data.payload?.modifier ?? null);
      } else if (data.type === 'clear') {
        clearEntities();
        clearSpells?.();
      } else if (data.type === 'webcam_transform' && data.payload) {
        setWebcamTransform(data.payload);
      }
    };

    syncChannel?.addEventListener('message', handleBroadcast);

    // 2. Escuchar eventos del servidor Socket.io
    const onCastSpell = (data) => {
      if (data && data.spellType) {
        castSpell(data.spellType, { id: data.id, ...data.options });
      }
    };
    const onSpawnEntity = (data) => addEntity(data);
    const onTriggerModifier = (data) => setModifier(data?.modifier ?? null);
    const onClearEntities = () => {
      clearEntities();
      clearSpells?.();
    };

    socket.on('cast_spell', onCastSpell);
    socket.on('spawn_entity', onSpawnEntity);
    socket.on('trigger_modifier', onTriggerModifier);
    socket.on('clear_entities', onClearEntities);

    return () => {
      syncChannel?.removeEventListener('message', handleBroadcast);
      socket.off('cast_spell', onCastSpell);
      socket.off('spawn_entity', onSpawnEntity);
      socket.off('trigger_modifier', onTriggerModifier);
      socket.off('clear_entities', onClearEntities);
    };
  }, [addEntity, setModifier, clearEntities, clearSpells, castSpell, setWebcamTransform]);
};
