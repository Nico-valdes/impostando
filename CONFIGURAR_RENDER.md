# Configurar Frontend para Render

## Tu URL de Render:
```
https://impostando.onrender.com
```

## Paso 1: Crear/Actualizar archivo `.env.local`

En la raíz de tu proyecto Next.js (donde está `package.json`), crea o actualiza el archivo `.env.local` con este contenido:

```env
NEXT_PUBLIC_WS_URL=https://impostando.onrender.com
```

## Paso 2: Reiniciar el servidor de desarrollo

Si tienes Next.js corriendo, deténlo (Ctrl+C) y vuelve a iniciarlo:

```bash
npm run dev
```

## Paso 3: Verificar la conexión

1. Abre tu app en el navegador
2. Crea o únete a una sala
3. Deberías ver "ONLINE" en verde en el header
4. Si ves "OFFLINE" en rojo, verifica:
   - Que el servidor de Render esté activo (puede tardar unos segundos en despertar)
   - Que la URL en `.env.local` sea correcta
   - Revisa la consola del navegador para ver errores

## Nota Importante sobre Render

⚠️ **Render se duerme después de 15 minutos de inactividad** en el plan gratuito.

**Soluciones:**
1. **UptimeRobot** (gratis): https://uptimerobot.com
   - Crea un monitor HTTP que haga ping cada 5 minutos a: `https://impostando.onrender.com`
   - Esto mantendrá el servidor despierto

2. **Primera conexión puede tardar**: La primera conexión después de que se duerme puede tardar 30-60 segundos en responder mientras Render "despierta" el servidor.

## Si no funciona

1. Verifica que en Render el servicio muestre: `Impostando Socket.IO server escuchando en puerto 10000`
2. Revisa la consola del navegador (F12) para ver errores de conexión
3. Asegúrate de que `.env.local` esté en la raíz del proyecto
4. Espera unos segundos si es la primera conexión (Render puede estar despertando)

## URL Completa de Conexión

El frontend se conectará automáticamente a:
```
https://impostando.onrender.com/rooms/[CODIGO_SALA]
```

No necesitas agregar el path `/rooms/`, el código lo hace automáticamente.

