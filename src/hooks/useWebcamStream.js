import { useState, useEffect, useRef } from 'react';

/**
 * Genera un canvas animado Sci-Fi si la cámara no tiene frames aún
 */
function createSciFiTestStream() {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  let frame = 0;

  function renderFrame() {
    frame++;
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#060d1f');
    grad.addColorStop(1, '#02040a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Rejilla Sci-Fi
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Scanlines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    for (let y = 0; y < canvas.height; y += 4) {
      ctx.fillRect(0, y, canvas.width, 2);
    }

    // Línea de radar
    const scanY = (frame * 3) % canvas.height;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.fillRect(0, scanY, canvas.width, 4);

    // Textos Sci-Fi
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 34px monospace';
    ctx.fillText('⚡ DROIDCAM // HOLOGRAPHIC SIGNAL', 60, 100);

    ctx.font = '20px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`SIGNAL: ONLINE  |  FPS: 60  |  FRAME: ${frame}`, 60, 150);
    ctx.fillText(`STATUS: HOLOGRAPHIC STREAM ACTIVE`, 60, 185);

    // Mira central
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(canvas.width / 2 - 120, canvas.height / 2 - 80, 240, 160);
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#f43f5e';
    ctx.fill();

    requestAnimationFrame(renderFrame);
  }

  renderFrame();
  return canvas.captureStream(60);
}

export const useWebcamStream = (autoStart = true) => {
  const [stream, setStream] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [activeDeviceLabel, setActiveDeviceLabel] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error, setError] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [isTestPattern, setIsTestPattern] = useState(false);
  const testStreamRef = useRef(null);

  // Solicitar permiso de cámara expresamente mediante gesto de usuario
  const requestPermission = async () => {
    try {
      setError(null);
      console.log('[Webcam] Solicitando permisos explícitos de cámara...');
      const test = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setPermissionGranted(true);
      // Detener test inicial
      test.getTracks().forEach((t) => t.stop());
      // Re-enumerar dispositivos con sus nombres reales desbloqueados
      const available = await getCameraDevices();
      // Iniciar cámara con el mejor dispositivo encontrado
      if (available && available.length > 0) {
        await startCamera(available[0].deviceId);
      }
      return true;
    } catch (err) {
      console.warn('[Webcam] Permiso denegado o error de captura:', err);
      setError(`${err.name}: ${err.message}`);
      return false;
    }
  };

  // Obtener dispositivos disponibles
  const getCameraDevices = async () => {
    try {
      if (!navigator?.mediaDevices?.enumerateDevices) {
        throw new Error('navigator.mediaDevices no soportado en este entorno');
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);

      // Priorizar dispositivo que contenga "droidcam"
      const droidCam = videoInputs.find((d) =>
        d.label.toLowerCase().includes('droidcam')
      );

      if (droidCam) {
        console.log('[Webcam] 🎯 DroidCam encontrada:', droidCam.label);
        setSelectedDeviceId(droidCam.deviceId);
        return [droidCam, ...videoInputs.filter((d) => d.deviceId !== droidCam.deviceId)];
      } else if (videoInputs.length > 0) {
        setSelectedDeviceId(videoInputs[0].deviceId);
        return videoInputs;
      }
    } catch (err) {
      setError(err.message);
    }
    return [];
  };

  // Iniciar cámara real con constraints flexibles (sin exact rígido)
  const startCamera = async (deviceIdToUse) => {
    try {
      setError(null);
      const targetId = deviceIdToUse || selectedDeviceId;

      if (stream && !isTestPattern) {
        stream.getTracks().forEach((t) => t.stop());
      }

      // Constraints progresivos: primero intenta el deviceId seleccionado; si falla, intenta cualquier video
      let newStream = null;
      try {
        const constraints = targetId
          ? { video: { deviceId: targetId } }
          : { video: true };
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn('[Webcam] Fallo al pedir deviceId específico, intentando video genérico:', firstErr);
        // Fallback genérico sin deviceId
        newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setStream(newStream);
      setIsActive(true);
      setIsTestPattern(false);
      setPermissionGranted(true);

      const track = newStream.getVideoTracks()[0];
      if (track) {
        setActiveDeviceLabel(track.label || 'Cámara Conectada');
        console.log(`[Webcam] 🎥 Video en vivo activo: "${track.label}"`);
      }

      await getCameraDevices();
    } catch (err) {
      console.warn('[Webcam] Error conectando cámara real:', err.name, err.message);
      setError(`${err.name}: ${err.message}`);
      // Fallback visual para no dejar la pantalla en negro
      activateTestPattern();
    }
  };

  // Activar señal holográfica de prueba
  const activateTestPattern = () => {
    if (!testStreamRef.current) {
      testStreamRef.current = createSciFiTestStream();
    }
    setStream(testStreamRef.current);
    setIsActive(true);
    setIsTestPattern(true);
    setActiveDeviceLabel('⚡ Holograma Sci-Fi Activo');
  };

  // Detener cámara
  const stopCamera = () => {
    if (stream && !isTestPattern) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setStream(null);
    setIsActive(false);
  };

  useEffect(() => {
    getCameraDevices().then((available) => {
      if (autoStart && available && available.length > 0) {
        startCamera(available[0].deviceId).catch(() => {
          activateTestPattern();
        });
      } else if (autoStart) {
        activateTestPattern();
      }
    });

    return () => {
      if (stream && !isTestPattern) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return {
    stream,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    activeDeviceLabel,
    isActive,
    isTestPattern,
    permissionGranted,
    error,
    requestPermission,
    startCamera,
    stopCamera,
    activateTestPattern,
    refreshDevices: getCameraDevices
  };
};
