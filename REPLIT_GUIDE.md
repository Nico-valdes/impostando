# Guía para Desplegar en Replit

## Paso 1: Crear el Repl

1. Ve a https://replit.com
2. Haz clic en **"Create Repl"** o **"+"**
3. Selecciona **"Node.js"** como template
4. Dale un nombre (ej: "impostando-backend")

## Paso 2: Subir los Archivos del Servidor

Tienes dos opciones:

### Opción A: Subir manualmente
1. En Replit, haz clic en los **3 puntos** (⋮) junto a "Files"
2. Selecciona **"Upload file"**
3. Sube estos archivos desde `server/`:
   - `socket-server.js`
   - `package.json`
   - `.replit` (si existe)
   - `replit.nix` (si existe)

### Opción B: Clonar desde GitHub (recomendado)
1. En Replit, haz clic en **"Import from GitHub"**
2. Pega la URL de tu repositorio
3. Selecciona el directorio `server/` o copia los archivos necesarios

## Paso 3: Instalar Dependencias

En la consola de Replit, ejecuta:

```bash
npm install
```

Esto instalará `socket.io` y otras dependencias.

## Paso 4: Configurar Variables de Entorno

1. En Replit, busca el panel **"Secrets"** (🔒) en la barra lateral izquierda
2. Haz clic en **"Secrets"** o **"Environment Variables"**
3. Agrega estas variables:
   - `PORT` = `8080` (o el puerto que prefieras)
   - `IMPOSTANDO_SOCKET_PORT` = `8080` (mismo valor)

**Nota**: Replit asigna un puerto automáticamente, pero puedes usar el que quieras.

## Paso 5: Ejecutar el Servidor

1. Haz clic en el botón **"Run"** (▶️) en la parte superior
2. O ejecuta en la consola:
   ```bash
   node socket-server.js
   ```

## Paso 6: Obtener la URL

1. Replit te dará una URL en la parte superior, algo como:
   ```
   https://impostando-backend.tu-usuario.repl.co
   ```
2. **IMPORTANTE**: Replit usa HTTPS, así que tu URL será `https://...`

## Paso 7: Configurar el Frontend

En tu proyecto Next.js (local o en Vercel), crea o actualiza `.env.local`:

```env
NEXT_PUBLIC_WS_URL=https://impostando-backend.tu-usuario.repl.co
```

**Nota**: Si Replit te da una URL con un path, asegúrate de incluirla completa.

## Paso 8: Verificar que Funciona

1. El servidor debería mostrar: `Impostando Socket.IO server escuchando en puerto XXXX`
2. En la consola de Replit verás los logs de conexiones
3. Prueba conectarte desde tu frontend

## Solución de Problemas

### El servidor no inicia
- Verifica que `package.json` tenga las dependencias correctas
- Asegúrate de que `socket.io` esté instalado: `npm install socket.io`

### No se conecta desde el frontend
- Verifica que la URL en `.env.local` sea correcta (con `https://`)
- Asegúrate de que el servidor esté corriendo en Replit
- Revisa la consola del navegador para ver errores de conexión

### CORS errors
- El servidor ya tiene `cors: { origin: "*" }`, así que debería funcionar
- Si hay problemas, verifica que la URL sea correcta

## Mantener el Servidor Activo

**Importante**: En el plan gratuito de Replit, el servidor se detiene después de un tiempo de inactividad.

Para mantenerlo activo:
1. Usa un servicio como **UptimeRobot** (gratis) para hacer ping cada 5 minutos
2. O considera usar Railway o Render que no se duermen

## URL de UptimeRobot
https://uptimerobot.com

Configura un "HTTP(s) Monitor" que haga ping a tu URL de Replit cada 5 minutos.

