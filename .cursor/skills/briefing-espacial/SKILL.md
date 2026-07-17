---
name: briefing-espacial
description: >
  Arma un briefing espacial del día en español rioplatense combinando APOD y
  asteroides cercanos vía las tools del MCP cosmos-mcp. Usar cuando el usuario
  pida un briefing, resumen espacial, boletín del día, "qué hay en el cielo hoy"
  o un resumen divulgativo del cosmos.
---

# Briefing espacial

## Cuándo aplicar

Aplicá esta skill si el pedido suena a:

- "dame un resumen espacial de hoy"
- "armame un briefing del día"
- "qué hay de interesante en el espacio hoy"
- "boletín astronómico"

## Flujo

1. Llamá `apod_por_fecha` sin fecha (o con la fecha que pidió el usuario).
2. Llamá `asteroides_cercanos` con `fecha_inicio` y `fecha_fin` iguales al día (hoy, salvo que pidan otra fecha).
3. Armá un boletín breve en **español rioplatense**, tono divulgativo (no técnico).
4. Destacá:
   - La imagen/dato astronómico del día (título + 2–3 oraciones + imagen Markdown y link)
   - Si hay algún asteroide cercano relevante (nombre, distancia/tamaño en lenguaje simple)
5. Si un asteroide viene marcado como potencialmente peligroso, aclará que es una **clasificación técnica** de la NASA por tamaño/distancia orbital, **no** una alerta real de impacto.

No inventes datos: solo usá lo que devuelven las tools. Si una tool falla, decilo y seguí con lo que tengas.

Las tools ya devuelven Markdown y `structuredContent`. Conservá la imagen
`![título](url)` en la respuesta final para que Cursor la renderice visualmente;
no vuelques el JSON crudo al usuario.

El MCP también publica el prompt `briefing-del-dia`. Puede usarse como punto de
entrada portable, pero esta skill sigue siendo la fuente de tono y criterios
editoriales dentro de Cursor.

## Formato sugerido

```
🛰️ Briefing espacial — [fecha]

Foto del día
…

Asteroides cerca de casa
…

Cierre en una línea amable.
```

## Ejemplos de buen output

### Ejemplo 1 — día con imagen APOD

```
🛰️ Briefing espacial — 16 de julio de 2026

Foto del día
Hoy la NASA nos deja "NGC 1300", una galaxia espiral barrada espectacular.
En pocas palabras: es como un remolino cósmico a millones de años luz.
Mirá la imagen: https://apod.nasa.gov/…

Asteroides cerca de casa
Hoy hay varios acercamientos catalogados. El más cercano pasa a unos
cientos de miles de km: nada de pánico, es rutina del Sistema Solar.
Si aparece la etiqueta "potencialmente peligroso", es solo una categoría
técnica de la NASA (tamaño + órbita), no una alerta de impacto.

Que tengas un buen día mirando para arriba.
```

### Ejemplo 2 — APOD en video

```
🛰️ Briefing espacial — 3 de marzo de 2024

Foto del día
Bueno, hoy no es foto: la APOD es un video sobre auroras. Igual vale la pena.
Te dejo el link: …

Asteroides cerca de casa
En la lista del día, el más interesante es …, con un diámetro estimado
de decenas de metros y una distancia cómoda a la Tierra.
```

### Ejemplo 3 — sin asteroides destacados

```
🛰️ Briefing espacial — 12 de enero de 2025

Foto del día
La imagen del día es …: [resumen corto]. Link: …

Asteroides cerca de casa
Hoy el feed no trae nada especialmente llamativo. Tranqui: el cielo sigue
ahí arriba, solo que sin titulares.
```

## Cómo testearla

Prompts de prueba (con el MCP `cosmos-mcp` conectado en Cursor):

| Prompt | Qué se espera |
|--------|----------------|
| `Armame un briefing espacial de hoy` | Usa APOD + NeoWs del día; tono rioplatense; incluye link de imagen/video |
| `Dame un resumen espacial del 2024-01-01` | Misma estructura, fechas fijas en ambas tools |
| `Briefing del día, y avisame si hay algo peligroso` | Si hay PHA, aclara que es clasificación técnica, no alarma |

Checklist al revisar la respuesta:

- [ ] Llamó a las dos tools (no inventó)
- [ ] Español rioplatense, corto, divulgativo
- [ ] Incluye URL de la APOD
- [ ] Disclaimer de "potencialmente peligroso" si aplica
