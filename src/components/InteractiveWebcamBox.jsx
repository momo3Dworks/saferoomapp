import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { TransformControls } from '@react-three/drei';
import { useOverlayStore } from '../store/useOverlayStore';
import { sendCameraTransform } from '../utils/syncManager';
import { WebcamMesh } from './WebcamMesh';

export const InteractiveWebcamBox = ({ stream }) => {
  const groupRef = useRef(null);
  const rigidBodyRef = useRef(null);
  const transformRef = useRef(null);
  const { gl } = useThree();

  const transform = useOverlayStore((state) => state.webcamTransform);
  const { position, rotation, scale, width, height, editMode, gizmoMode } = transform;

  const halfW = (width * scale[0]) / 2;
  const halfH = (height * scale[1]) / 2;
  const halfD = 0.2;

  // Sincronizar el RigidBody de Rapier cuando cambien position o rotation
  useEffect(() => {
    if (rigidBodyRef.current) {
      rigidBodyRef.current.setTranslation(
        { x: position[0], y: position[1], z: position[2] },
        true
      );
      const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ');
      const quat = new THREE.Quaternion().setFromEuler(euler);
      rigidBodyRef.current.setRotation(quat, true);
    }
  }, [position, rotation, scale]);

  // Manejar el cambio cuando el streamer arrastra con el ratón (TransformControls)
  const handleTransformChange = () => {
    if (!groupRef.current) return;
    const current = groupRef.current;

    const newPos = [
      parseFloat(current.position.x.toFixed(2)),
      parseFloat(current.position.y.toFixed(2)),
      parseFloat(current.position.z.toFixed(2))
    ];

    const newRot = [
      parseFloat(current.rotation.x.toFixed(3)),
      parseFloat(current.rotation.y.toFixed(3)),
      parseFloat(current.rotation.z.toFixed(3))
    ];

    const newScale = [
      parseFloat(current.scale.x.toFixed(2)),
      parseFloat(current.scale.y.toFixed(2)),
      parseFloat(current.scale.z.toFixed(2))
    ];

    sendCameraTransform({
      position: newPos,
      rotation: newRot,
      scale: newScale
    });
  };

  return (
    <>
      {/* Controles de Gizmo Interactivos en Pantalla cuando se activa Modo Edición */}
      {editMode && groupRef.current && (
        <TransformControls
          ref={transformRef}
          object={groupRef.current}
          mode={gizmoMode || 'translate'}
          onMouseUp={handleTransformChange}
          size={0.7}
        />
      )}

      {/* Malla Visual y Renderizado 3D de DroidCam */}
      <group
        ref={groupRef}
        position={position}
        rotation={rotation}
        scale={scale}
        name="webcam-interactive-container"
      >
        <WebcamMesh
          stream={stream}
          position={[0, 0, 0]}
          width={width}
          height={height}
        />

        {/* Indicador de Modo Edición */}
        {editMode && (
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[width + 0.2, height + 0.2]} />
            <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.6} />
          </mesh>
        )}
      </group>

      {/* Colisionador de Físicas Rapier Sincronizado en la Misma Posición y Ángulo */}
      <RigidBody
        ref={rigidBodyRef}
        type="fixed"
        position={position}
        rotation={rotation}
        restitution={0.85}
        friction={0.35}
      >
        <CuboidCollider args={[halfW, halfH, halfD]} />
      </RigidBody>
    </>
  );
};
