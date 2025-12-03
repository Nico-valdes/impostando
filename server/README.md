# Impostando - Backend Socket.IO Server

## Overview

Este es el servidor backend de Socket.IO para el juego Impostando - un juego de fiesta estilo "impostor" usando cartas de jugadores deportivos.

## Estructura del Proyecto

```
server/
  socket-server.js  # Servidor principal de Socket.IO
  package.json      # Dependencias del servidor
  .replit          # Configuración para Replit
  replit.nix       # Configuración de Node.js para Replit

data/
  customCards.json  # Datos de cartas personalizadas (para sala 00000)
```

## Cómo Funciona

- El servidor gestiona salas de juego con namespaces dinámicos (`/rooms/XXXXX`)
- Los jugadores se conectan con un código de sala, nombre y opcionalmente un flag de host
- El host puede iniciar partidas, barajar cartas, expulsar jugadores y terminar partidas
- Cada jugador recibe una carta - ya sea un miembro de la tripulación (jugador deportivo real) o un impostor
- La sala especial `00000` usa cartas personalizadas desde `data/customCards.json`

## Variables de Entorno

- `PORT`: Puerto del servidor (Replit lo asigna automáticamente)
- `IMPOSTANDO_SOCKET_PORT`: Puerto alternativo (default: 4000)

El servidor usa `process.env.PORT` primero (para Replit), luego `IMPOSTANDO_SOCKET_PORT`, y finalmente 4000 como fallback.

## Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar servidor
npm start

# O en modo desarrollo (con nodemon)
npm run dev
```

El servidor se ejecutará en el puerto especificado (default: 4000).

## Despliegue

### Replit

1. Sube los archivos del servidor a Replit
2. Instala dependencias: `npm install`
3. Configura variables de entorno en Secrets:
   - `PORT` = `8080` (o el que prefieras)
4. Haz clic en "Run"
5. Obtén la URL de Replit (ej: `https://tu-proyecto.tu-usuario.repl.co`)

Ver `../REPLIT_GUIDE.md` para instrucciones detalladas.

### Otras Plataformas

Ver `../DEPLOY_BACKEND.md` para Railway, Render, Fly.io, etc.

## Conexión del Frontend

El frontend debe conectarse usando:

```
https://[tu-dominio-replit]/rooms/[CODIGO_SALA]
```

Por ejemplo:
```
https://impostando-backend.tu-usuario.repl.co/rooms/ABC12
```

**Importante**: 
- Replit usa HTTPS automáticamente
- El servidor acepta conexiones de cualquier origen (CORS habilitado)
- Asegúrate de configurar `NEXT_PUBLIC_WS_URL` en tu frontend

## Características

- ✅ Salas dinámicas con códigos de 5 letras
- ✅ Gestión de jugadores y host
- ✅ Sistema de cartas con jugadores reales (API) y personalizados (JSON)
- ✅ Sala especial `00000` con cartas personalizadas
- ✅ Soporte para múltiples deportes (fútbol, básquet, todos)
- ✅ Sistema de impostores configurable
- ✅ Expulsión de jugadores
- ✅ Transferencia de host
- ✅ Bloqueo de salas

## APIs Utilizadas

- **TheSportsDB**: Para obtener jugadores y fotos de fútbol y básquet
- **Balldontlie**: Fallback para datos de básquet
- **DiceBear**: Para avatares de jugadores (en el frontend)

## Notas

- Las salas se almacenan en memoria (se pierden al reiniciar el servidor)
- El servidor está optimizado para mantener conexiones WebSocket persistentes
- Compatible con Replit, Railway, Render y otras plataformas que soporten Node.js
