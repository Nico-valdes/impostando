# Cartas Personalizadas - Sala Especial 00000

Este archivo contiene las cartas personalizadas que se usarán cuando se juegue en la sala con código **00000**.

## Estructura del JSON

Cada objeto en el array debe tener los siguientes campos:

```json
{
  "name": "Nombre de la persona",
  "photo": "URL de la foto o avatar",
  "funFact": "Dato curioso sobre la persona",
  "category": "Categoría (opcional, ej: 'personal', 'amigos', etc.)"
}
```

## Ejemplo

```json
{
  "name": "Juan Pérez",
  "photo": "https://api.dicebear.com/9.x/croodles/svg?seed=juan",
  "funFact": "Le encanta el café a las 3am",
  "category": "personal"
}
```

## Cómo funciona

1. Cuando alguien crea o se une a la sala con código **00000**, el servidor carga automáticamente las cartas desde este archivo.
2. Los jugadores recibirán cartas con los datos personalizados (nombre, foto, dato curioso).
3. El impostor verá una carta especial que dice "IMPOSTOR".
4. Los demás jugadores verán la misma carta de una de las personas del JSON.

## Notas

- El campo `photo` puede ser una URL de imagen o un avatar de DiceBear.
- El campo `funFact` se mostrará en la carta revelada.
- El campo `category` se usa como "equipo" en la carta.
- Puedes agregar tantas personas como quieras al array.



