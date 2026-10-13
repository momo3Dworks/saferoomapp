import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servidor HTTP y Socket.io
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Almacén en memoria para tokens OAuth2 de Kick
export const tokenStore = {
  accessToken: null,
  refreshToken: null,
  expiresAt: null
};

// ==========================================
// 1. LÓGICA DE COMMAND PARSER Y EMISOR SOCKET
// ==========================================

const VALID_ENTITIES = ['bola', 'taco', 'cubo'];
const VALID_ELEMENTS = ['fuego', 'hielo', 'veneno', 'rayo', 'vacio'];

/**
 * Normaliza y mapea modificadores roguelike para el shader y R3F
 */
function normalizeModifier(tipo) {
  const t = (tipo || '').toLowerCase();
  if (t === 'oscuridad' || t === 'maldicion' || t === 'sala_oscura') {
    return 'sala_oscura';
  }
  if (t === 'divina' || t === 'luz' || t === 'bendicion_divina') {
    return 'bendicion_divina';
  }
  if (t === 'furia' || t === 'furia_elemental') {
    return 'furia_elemental';
  }
  if (t === 'normal' || t === 'limpiar' || t === 'reset') {
    return null;
  }
  return t;
}

/**
 * Parsea el texto del chat y emite las directivas 3D por Socket.io
 * @param {string} text - Contenido del mensaje de chat
 * @param {string} user - Nombre del usuario en Kick
 * @param {Server} socketEmitter - Instancia de Socket.io
 */
export function commandParser(text, user = 'Viewer', socketEmitter = io) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  // Regla 0: Hechizos y habilidades directas (!castear, !meteoro, !rayo, !fuego, !glaciar, !vacio, !laser)
  const spellAliases = {
    '!meteoro': 'meteor',
    '!meteor': 'meteor',
    '!rayo': 'thunder',
    '!trueno': 'thunder',
    '!thunder': 'thunder',
    '!fuego': 'fire',
    '!inferno': 'fire',
    '!fire': 'fire',
    '!hielo': 'glacier',
    '!glaciar': 'glacier',
    '!glacier': 'glacier',
    '!vacio': 'void',
    '!void': 'void',
    '!hoyonegro': 'void',
    '!singularity': 'void',
    '!laser': 'beam',
    '!beam': 'beam',
    '!fuegocam': 'fire_cam',
    '!fuego_cam': 'fire_cam'
  };

  const firstWord = trimmed.split(/\s+/)[0]?.toLowerCase();
  if (trimmed.startsWith('!castear') || spellAliases[firstWord]) {
    const parts = trimmed.split(/\s+/);
    let rawSpell = spellAliases[firstWord] || parts[1]?.toLowerCase() || 'meteor';
    let spellType = 'meteor';
    if (['rayo', 'trueno', 'thunder'].includes(rawSpell)) spellType = 'thunder';
    else if (['fuego', 'inferno', 'fire'].includes(rawSpell)) spellType = 'fire';
    else if (['hielo', 'glaciar', 'glacier'].includes(rawSpell)) spellType = 'glacier';
    else if (['vacio', 'void'].includes(rawSpell)) spellType = 'void';
    else if (['laser', 'beam', 'rayolaser'].includes(rawSpell)) spellType = 'beam';

    const payload = {
      id: `spell_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      spellType,
      user,
      options: {
        target: [(Math.random() - 0.5) * 3.0, (Math.random() - 0.5) * 1.5, 0]
      }
    };

    socketEmitter.emit('cast_spell', payload);
    console.log(`[Socket.io] 🔮 'cast_spell' (${spellType}) estallado en canvas por ${user}:`, payload);
    return { event: 'cast_spell', payload };
  }

  // Regla 1: !dropear [item] [elemento] -> Mapeado directamente a detonación de hechizo cinematográfico
  if (trimmed.startsWith('!dropear')) {
    const parts = trimmed.split(/\s+/);
    const rawElement = parts[2]?.toLowerCase() || parts[1]?.toLowerCase() || 'fuego';

    let spellType = 'meteor';
    if (rawElement.includes('rayo') || rawElement.includes('trueno')) spellType = 'thunder';
    else if (rawElement.includes('hielo') || rawElement.includes('glaciar')) spellType = 'glacier';
    else if (rawElement.includes('veneno') || rawElement.includes('acido') || rawElement.includes('fuego')) spellType = 'fire';
    else if (rawElement.includes('vacio')) spellType = 'void';
    else if (rawElement.includes('laser')) spellType = 'beam';

    const payload = {
      id: `spell_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      spellType,
      user,
      options: {
        target: [(Math.random() - 0.5) * 3.5, (Math.random() - 0.5) * 1.8, 0]
      }
    };

    socketEmitter.emit('cast_spell', payload);
    console.log(`[Socket.io] 🔮 'cast_spell' via dropear (${spellType}) por ${user}:`, payload);
    return { event: 'cast_spell', payload };
  }

  // Regla 2: !bendicion [tipo] (ej. "!bendicion oscuridad", "!bendicion divina")
  if (trimmed.startsWith('!bendicion')) {
    const parts = trimmed.split(/\s+/);
    const rawType = parts[1]?.toLowerCase() || 'bendicion_divina';
    const modifier = normalizeModifier(rawType);

    const payload = {
      modifier,
      user
    };

    socketEmitter.emit('trigger_modifier', payload);
    console.log(`[Socket.io] 🟣 'trigger_modifier' emitido por ${user}:`, payload);
    return { event: 'trigger_modifier', payload };
  }

  // Regla retrocompatible: !dios [bendicion|maldicion]
  if (trimmed.startsWith('!dios')) {
    const parts = trimmed.split(/\s+/);
    const choice = parts[1]?.toLowerCase();
    const modifier = choice === 'maldicion' ? 'sala_oscura' : 'bendicion_divina';

    const payload = { modifier, user };
    socketEmitter.emit('trigger_modifier', payload);
    console.log(`[Socket.io] 🟣 'trigger_modifier' (!dios) emitido por ${user}:`, payload);
    return { event: 'trigger_modifier', payload };
  }

  return null;
}

// ==========================================
// 2. RUTAS OAUTH2 PARA KICK DEVELOPER API
// ==========================================

/**
 * GET /auth/kick
 * Redirige al streamer a la pantalla de autorización oficial de Kick
 */
app.get('/auth/kick', (req, res) => {
  const clientId = process.env.KICK_CLIENT_ID;
  const redirectUri = process.env.KICK_REDIRECT_URI || `http://localhost:${PORT}/auth/callback`;
  const scopes = 'events:subscribe channel:read user:read';

  if (!clientId || clientId === 'tu_client_id_aqui') {
    return res.status(500).send(`
      <div style="font-family: sans-serif; padding: 2rem; color: #b91c1c;">
        <h2>⚠️ Falta configurar KICK_CLIENT_ID en el archivo .env</h2>
        <p>Edita el archivo <code>.env</code> en la raíz del proyecto y agrega tus credenciales de <a href="https://dev.kick.com" target="_blank">dev.kick.com</a>.</p>
      </div>
    `);
  }

  const kickAuthUrl = new URL('https://id.kick.com/oauth/authorize');
  kickAuthUrl.searchParams.set('client_id', clientId);
  kickAuthUrl.searchParams.set('redirect_uri', redirectUri);
  kickAuthUrl.searchParams.set('response_type', 'code');
  kickAuthUrl.searchParams.set('scope', scopes);
  kickAuthUrl.searchParams.set('state', Math.random().toString(36).substring(7));

  console.log(`[OAuth2 Kick] Redirigiendo a Kick Auth: ${kickAuthUrl.toString()}`);
  res.redirect(kickAuthUrl.toString());
});

/**
 * GET /auth/callback
 * Recibe el 'code' temporal de Kick, lo intercambia por Access Token y lo almacena
 */
app.get('/auth/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    console.error(`[OAuth2 Kick Error]: ${error} - ${error_description}`);
    return res.status(400).json({ error, error_description });
  }

  if (!code) {
    return res.status(400).send('Error: Código de autorización ausente.');
  }

  try {
    const clientId = process.env.KICK_CLIENT_ID;
    const clientSecret = process.env.KICK_CLIENT_SECRET;
    const redirectUri = process.env.KICK_REDIRECT_URI || `http://localhost:${PORT}/auth/callback`;

    console.log('[OAuth2 Kick] Intercambiando código por token...');

    const tokenResponse = await fetch('https://id.kick.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: String(code)
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('[OAuth2 Kick] Error al intercambiar token:', tokenData);
      return res.status(tokenResponse.status).json({
        error: 'Error al obtener token de Kick',
        details: tokenData
      });
    }

    // Almacenar en memoria
    tokenStore.accessToken = tokenData.access_token;
    tokenStore.refreshToken = tokenData.refresh_token || null;
    tokenStore.expiresAt = tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : null;

    console.log('[OAuth2 Kick] ✅ Autenticación exitosa! Token guardado en memoria.');
    console.log('[OAuth2 Kick] Access Token (primeros 12 caracteres):', tokenData.access_token?.substring(0, 12) + '...');

    return res.send(`
      <div style="font-family: sans-serif; padding: 2rem; background: #0f172a; color: #f8fafc; min-height: 100vh;">
        <h2 style="color: #22c55e;">✅ ¡Autenticación con Kick exitosa!</h2>
        <p>El Access Token ha sido registrado correctamente en el backend del Overlay.</p>
        <p>Puedes cerrar esta ventana y regresar a tu OBS Studio o al navegador del overlay.</p>
        <a href="${CLIENT_ORIGIN}" style="display: inline-block; margin-top: 1rem; padding: 10px 18px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Ir al Overlay (${CLIENT_ORIGIN})</a>
      </div>
    `);
  } catch (err) {
    console.error('[OAuth2 Kick] Excepción en /auth/callback:', err);
    return res.status(500).json({ error: 'Excepción de red al contactar id.kick.com', message: err.message });
  }
});

// ==========================================
// 3. WEBHOOK LISTENER PARA EVENTOS DE KICK
// ==========================================

/**
 * POST /api/webhooks/kick
 * Recibe eventos webhook (simulados u oficiales) como 'chat.message.sent'
 */
app.post('/api/webhooks/kick', (req, res) => {
  const payload = req.body || {};

  // Extraer el mensaje del payload según las estructuras de Kick EventSub / Webhooks
  // Estructura oficial Kick: { event: 'chat.message.sent', data: { content: '...', sender: { username: '...' } } }
  // Estructuras comunes de webhook: req.body.content o req.body.message
  const messageText =
    payload?.data?.content ||
    payload?.content ||
    payload?.message ||
    '';

  const username =
    payload?.data?.sender?.username ||
    payload?.sender?.username ||
    payload?.sender ||
    payload?.user ||
    'ChatViewer';

  console.log(`[Kick Webhook] Evento recibido | Usuario: "${username}" | Mensaje: "${messageText}"`);

  // Procesar con el CommandParser
  const result = commandParser(messageText, username, io);

  return res.status(200).json({
    status: 'ok',
    processed: !!result,
    result
  });
});

// Endpoint de estado y comprobación rápida
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    authenticatedWithKick: !!tokenStore.accessToken,
    activeConnections: io.engine.clientsCount
  });
});

// ==========================================
// 4. CICLO DE VIDA DE SOCKET.IO
// ==========================================

io.on('connection', (socket) => {
  console.log(`[Socket.io] 🔌 Cliente conectado (Overlay): ${socket.id}`);

  // Permite que clientes o paneles de test envíen mensajes de chat directo
  socket.on('chat_command', (data) => {
    commandParser(data.message, data.user, io);
  });

  // Retransmisión de hechizos cinematográficos y entidades
  socket.on('cast_spell', (data) => {
    io.emit('cast_spell', data);
  });

  socket.on('spawn_entity', (data) => {
    io.emit('spawn_entity', data);
  });

  socket.on('trigger_modifier', (data) => {
    io.emit('trigger_modifier', data);
  });

  socket.on('clear_entities', () => {
    io.emit('clear_entities');
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] ❌ Cliente desconectado: ${socket.id}`);
  });
});

// Inicialización del servidor
httpServer.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 [Kick Roguelike Backend] Activo en http://localhost:${PORT}`);
  console.log(`🔑 Iniciar OAuth Kick: http://localhost:${PORT}/auth/kick`);
  console.log(`📩 Webhook Endpoint:   POST http://localhost:${PORT}/api/webhooks/kick`);
  console.log(`📡 Socket.io listo para clientes en: ${CLIENT_ORIGIN}`);
  console.log(`======================================================\n`);
});
