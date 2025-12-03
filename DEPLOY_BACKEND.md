# Guía para Desplegar el Backend de Socket.IO

## Opciones Gratuitas Recomendadas

### 1. **Railway** (⭐ RECOMENDADO)
- **Plan gratuito**: $5 de crédito mensual (suficiente para desarrollo)
- **Ventajas**: Muy fácil de usar, soporta WebSockets nativamente
- **URL**: https://railway.app

**Pasos:**
1. Crear cuenta en Railway
2. Conectar tu repositorio de GitHub
3. Seleccionar el directorio `server/`
4. Railway detecta automáticamente Node.js
5. Agregar variable de entorno: `IMPOSTANDO_SOCKET_PORT=4000`
6. Railway te dará una URL como: `https://tu-proyecto.railway.app`
7. Actualizar `NEXT_PUBLIC_WS_URL` en tu frontend con esa URL

### 2. **Render**
- **Plan gratuito**: Tier gratuito disponible (se duerme después de 15 min de inactividad)
- **Ventajas**: Fácil de configurar, buena documentación
- **URL**: https://render.com

**Pasos:**
1. Crear cuenta en Render
2. Crear nuevo "Web Service"
3. Conectar repositorio de GitHub
4. Configuración:
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `node server/socket-server.js`
   - **Environment**: Agregar `IMPOSTANDO_SOCKET_PORT=10000` (Render usa puerto dinámico)
5. Render te dará una URL
6. Actualizar `NEXT_PUBLIC_WS_URL` en tu frontend

### 3. **Fly.io**
- **Plan gratuito**: 3 VMs compartidas gratuitas
- **Ventajas**: Muy rápido, buena para producción
- **URL**: https://fly.io

**Pasos:**
1. Instalar Fly CLI: `npm install -g @fly/cli`
2. Crear cuenta: `fly auth signup`
3. En el directorio `server/`, crear `fly.toml`:
```toml
app = "tu-app-impostando"
primary_region = "iad"

[build]

[env]
  IMPOSTANDO_SOCKET_PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

4. Deploy: `fly deploy`
5. Obtener URL y actualizar `NEXT_PUBLIC_WS_URL`

### 4. **Replit**
- **Plan gratuito**: Disponible con limitaciones
- **Ventajas**: Muy fácil, editor integrado
- **URL**: https://replit.com

**Pasos:**
1. Crear cuenta en Replit
2. Crear nuevo Repl "Node.js"
3. Subir archivos del servidor
4. Configurar `package.json` y dependencias
5. Ejecutar y obtener URL
6. Actualizar `NEXT_PUBLIC_WS_URL`

## Configuración Necesaria

### Variables de Entorno

En cualquier plataforma, necesitarás configurar:

```env
IMPOSTANDO_SOCKET_PORT=4000
# O el puerto que asigne la plataforma
```

### Actualizar Frontend

En tu proyecto Next.js, crear/actualizar `.env.local`:

```env
NEXT_PUBLIC_WS_URL=https://tu-backend.railway.app
# O la URL que te dé la plataforma elegida
```

## Recomendación Final

**Para empezar rápido**: **Railway** es la mejor opción:
- ✅ Muy fácil de configurar
- ✅ Soporta WebSockets sin problemas
- ✅ $5 gratis al mes (suficiente para desarrollo)
- ✅ No se duerme como Render
- ✅ Buena documentación

**Para producción**: **Fly.io** es excelente:
- ✅ Muy rápido
- ✅ Escalable
- ✅ Plan gratuito generoso
- ⚠️ Requiere un poco más de configuración

## Nota Importante

Todas estas plataformas te darán una URL HTTPS. Asegúrate de que tu servidor Socket.IO esté configurado para aceptar conexiones desde cualquier origen (ya lo tienes con `cors: { origin: "*" }`).


