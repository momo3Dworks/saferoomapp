# Kick3D Interactive Roguelike Overlay

Overlay 3D transparente con físicas en tiempo real para OBS Studio / Streamlabs. Conecta el chat de Kick/Twitch como un panteón de dioses que lanza entidades físicas (fuego, hielo, veneno, rayo, vacío) y altera el entorno mediante modificadores roguelike.

---

## 🚀 Inicio Rápido

### 1. Iniciar el Frontend (Overlay en Vite)
```bash
npm run dev
```
Por defecto correrá en `http://localhost:5173`.

### 2. (Opcional) Iniciar el Backend Socket.io
```bash
npm run server
```
Escucha en `http://localhost:3001` y parsea comandos de chat.

---

## 🎥 Configuración en OBS Studio

1. En OBS, agrega una nueva fuente de tipo **Navegador (Browser Source)**.
2. Ingresa la URL: `http://localhost:5173`
3. Configura el tamaño a tu resolución de lienzo (ej. **1920x1080**).
4. Marca la casilla **"Apagar fuente cuando no esté visible"** (opcional para ahorrar GPU).
5. La escena ya tiene transparencia alfa nativa configurada (`gl={{ alpha: true, premultipliedAlpha: false }}`).

---

## 🎮 Controles y Pruebas en Vivo (Dev HUD)

El overlay incluye un panel interactivo flotante en pantalla con atajos para probar sin depender del chat:
- Presiona la tecla **`H`** en cualquier momento para mostrar u ocultar el panel (para dejar la pantalla 100% limpia en stream).
- **Botones de Drop Directo**:
  - `!dropear bola fuego`
  - `!dropear taco hielo`
  - `!dropear cubo veneno`
  - `!dropear bola rayo`
  - `!dropear taco vacio`
- **Modificadores Roguelike**:
  - **Sala Oscura**: Viñeta intensa y reducción drástica de iluminación ambiental.
  - **Bendición Divina**: Luz dorada de alta intensidad.
- **Webcam Collision Box**:
  - Checkbox para visualizar el marco de colisión correspondiente al **38.2% (Phi)** en la esquina inferior derecha donde rebotan los objetos del chat.

---

## 📡 API de Socket.io (Backend)

Envía mensajes HTTP POST para probar la integración con bots de Kick:
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "!dropear bola fuego", "user": "DiosDelChat"}'
```
Eventos emitidos vía Socket:
- `spawn_entity`: `{ id, type, element, position, user }`
- `trigger_modifier`: `{ modifier: 'sala_oscura' | 'bendicion_divina' | null, user }`
