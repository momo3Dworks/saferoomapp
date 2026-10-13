import { io } from 'socket.io-client';
import { useOverlayStore } from '../store/useOverlayStore';

export const syncChannel =
  typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('kick3d_overlay_channel')
    : null;

export const socket = io('http://localhost:3000', {
  transports: ['polling', 'websocket'],
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});

/**
 * Despacha el casteo de un hechizo/VFX cinematográfico que estalla en el canvas
 * @param {'meteor' | 'thunder' | 'fire' | 'glacier' | 'void'} spellType
 */
export function sendCastSpell(spellType = 'meteor', options = {}) {
  const payload = {
    id: `spell_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    spellType,
    options
  };

  syncChannel?.postMessage({ type: 'cast_spell', payload });
  if (socket.connected) socket.emit('cast_spell', payload);
  useOverlayStore.getState().castSpell(spellType, { id: payload.id, ...options });
}

export function sendSpawn(type = 'bola', element = 'fuego') {
  const payload = {
    id: `spawn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    element,
    user: 'StreamerDock',
    position: [
      (Math.random() - 0.5) * 5.5,
      6,
      (Math.random() - 0.5) * 0.4
    ]
  };

  syncChannel?.postMessage({ type: 'spawn', payload });
  if (socket.connected) socket.emit('spawn_entity', payload);
  useOverlayStore.getState().addEntity(payload);
}

export function sendModifier(modifier) {
  syncChannel?.postMessage({ type: 'modifier', payload: { modifier } });
  if (socket.connected) socket.emit('trigger_modifier', { modifier });
  useOverlayStore.getState().setModifier(modifier);
}

export function sendClear() {
  syncChannel?.postMessage({ type: 'clear' });
  if (socket.connected) socket.emit('clear_entities');
  useOverlayStore.getState().clearEntities();
  useOverlayStore.getState().clearSpells?.();
}

export function sendCameraTransform(partial) {
  syncChannel?.postMessage({ type: 'webcam_transform', payload: partial });
  useOverlayStore.getState().setWebcamTransform(partial);
}
