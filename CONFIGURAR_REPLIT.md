# Configurar Frontend para Replit

## Tu URL de Replit:
```
https://b02c93ef-3a97-4b94-9815-6a4d87c7b9f0-00-2j0m945yco2s6.picard.replit.dev
```

## Paso 1: Crear archivo `.env.local`

En la raíz de tu proyecto Next.js (donde está `package.json`), crea un archivo llamado `.env.local` con este contenido:

```env
NEXT_PUBLIC_WS_URL=https://b02c93ef-3a97-4b94-9815-6a4d87c7b9f0-00-2j0m945yco2s6.picard.replit.dev
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
   - Que el servidor de Replit esté corriendo (botón "Run" activo)
   - Que la URL en `.env.local` sea correcta
   - Revisa la consola del navegador para ver errores

## Nota Importante

- **NO incluyas** `/rooms/XXXXX` en la URL, solo la URL base
- El código automáticamente agrega `/rooms/[CODIGO_SALA]` cuando se conecta
- Asegúrate de que el servidor en Replit esté corriendo antes de probar

## Si no funciona

1. Verifica que en Replit el servidor muestre: `Impostando Socket.IO server escuchando en puerto XXXX`
2. Revisa la consola del navegador (F12) para ver errores de conexión
3. Asegúrate de que `.env.local` esté en la raíz del proyecto (no en `app/` ni `server/`)


