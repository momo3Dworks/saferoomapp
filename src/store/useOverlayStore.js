import { create } from 'zustand';

const DEFAULT_WEBCAM_TRANSFORM = {
  position: [-3.4, -2.1, 0],
  rotation: [-0.15, 0.3, -0.05], // Perspectiva Sci-Fi inclinada a la izquierda mirando al centro
  scale: [1, 1, 1],
  width: 3.2,
  height: 1.8,
  editMode: false,
  gizmoMode: 'translate', // 'translate' | 'rotate' | 'scale'
  hologramStyle: 'scifi' // 'scifi' | 'clean' | 'matrix'
};

// Cargar transformación guardada en localStorage si existe
function loadSavedTransform() {
  try {
    const saved = localStorage.getItem('kick3d_webcam_transform');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Si la posición guardada estaba en la derecha (>0), invertirla a la izquierda
      if (parsed.position && parsed.position[0] > 0) {
        parsed.position[0] = -Math.abs(parsed.position[0]);
        if (parsed.rotation && parsed.rotation[1] < 0) {
          parsed.rotation[1] = Math.abs(parsed.rotation[1]);
        }
      }
      return { ...DEFAULT_WEBCAM_TRANSFORM, ...parsed };
    }
  } catch (e) {}
  return DEFAULT_WEBCAM_TRANSFORM;
}

export const useOverlayStore = create((set) => ({
  entities: [],
  activeSpells: [],
  activeModifier: null,
  webcamTransform: loadSavedTransform(),

  castSpell: (spellType = 'meteor', options = {}) =>
    set((state) => {
      const newSpell = {
        id: options.id || `spell_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: spellType, // 'meteor' | 'thunder' | 'fire' | 'glacier' | 'void'
        target: options.target || [0, -1.8, 0],
        start: options.start || [3.5, 5.5, 0],
        duration: options.duration || (spellType === 'thunder' ? 2.4 : spellType === 'meteor' ? 3.5 : 3.8),
        createdAt: Date.now()
      };
      // Límite de 8 hechizos simultáneos para garantizar 60 fps
      const current = state.activeSpells.length >= 8 ? state.activeSpells.slice(1) : state.activeSpells;
      return { activeSpells: [...current, newSpell] };
    }),

  removeSpell: (id) =>
    set((state) => ({
      activeSpells: state.activeSpells.filter((s) => s.id !== id)
    })),

  clearSpells: () => set({ activeSpells: [] }),

  addEntity: (entity = {}) =>
    set((state) => {
      if (entity.id && state.entities.some((e) => e.id === entity.id)) {
        return state;
      }
      const MAX_ENTITIES = 40;
      const current = state.entities.length >= MAX_ENTITIES ? state.entities.slice(1) : state.entities;

      const newEntity = {
        id: entity.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ent_${Date.now()}_${Math.random()}`),
        type: entity.type || 'bola',
        element: entity.element || 'fuego',
        position: entity.position || [
          (Math.random() - 0.5) * 5,
          5 + Math.random() * 2,
          (Math.random() - 0.5) * 0.4
        ],
        createdAt: Date.now()
      };

      return { entities: [...current, newEntity] };
    }),

  removeEntity: (id) =>
    set((state) => ({
      entities: state.entities.filter((e) => e.id !== id)
    })),

  clearEntities: () => set({ entities: [] }),

  setModifier: (mod) => set({ activeModifier: mod }),

  // Control y Persistencia de la Cámara 3D
  setWebcamTransform: (updater) =>
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.webcamTransform) : { ...state.webcamTransform, ...updater };
      try {
        localStorage.setItem('kick3d_webcam_transform', JSON.stringify({
          position: next.position,
          rotation: next.rotation,
          scale: next.scale,
          width: next.width,
          height: next.height
        }));
      } catch (e) {}
      return { webcamTransform: next };
    }),

  resetWebcamTransform: () =>
    set(() => {
      try {
        localStorage.removeItem('kick3d_webcam_transform');
      } catch (e) {}
      return { webcamTransform: DEFAULT_WEBCAM_TRANSFORM };
    })
}));
