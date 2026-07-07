# GUÍA DE CONTENIDO — BANCO DE PREGUNTAS CARNET QUEST

Guía obligatoria para generar y verificar preguntas del banco (permiso B, DGT España).

## Esquema EXACTO de cada pregunta

```json
{
  "id": "M07-023",
  "mundo": 7,
  "tema": "Adelantamiento",
  "pregunta": "…",
  "imagen": null,
  "opciones": ["…", "…", "…"],
  "correcta": 1,
  "dificultad": 4,
  "explicacion_corta": "…",
  "truco": "…",
  "trampa": "…",
  "explicacion_larga": "…",
  "tags": ["adelantamiento"],
  "senalId": null
}
```

- `id`: formato `MXX-NNN` (XX = mundo con dos dígitos, NNN secuencial desde 001). Únicos.
- `mundo`: entero, igual que XX.
- `imagen`: siempre `null` en esta fase.
- `opciones`: 3 opciones (2–4 permitidas). UNA sola claramente correcta.
- `correcta`: índice 0-based de la correcta.
- `dificultad`: 1–5.
- `explicacion_corta`: 1–2 frases, SIEMPRE.
- `truco`: mnemotecnia memorable en castellano de calle; `""` solo si de verdad no existe truco posible.
- `trampa`: por qué la opción incorrecta tienta (se muestra al fallar). SIEMPRE.
- `explicacion_larga`: OBLIGATORIA si `dificultad >= 4` (≥ 80 caracteres, párrafo didáctico completo). OMITIR el campo si dificultad < 4.
- `tags`: 1–4 tags kebab-case.
- `senalId`: código de señal (p.ej. `"R-301"`) SOLO si la pregunta trata específicamente de esa señal y el código existe en `datos/senales.json` (o `datos/senales.expanded.json`); si no, `null`.

## Reglas de oro (innegociables)

1. **Redacción 100 % ORIGINAL.** PROHIBIDO copiar preguntas de bancos de terceros, autoescuelas o tests online (tienen copyright). Imita el ESTILO del examen DGT real (redacciones-trampa con "salvo…", "excepto…", "como norma general…", "por construcción…"), NUNCA el texto.
2. **NORMATIVA > HUMOR.** Exactitud según la normativa española VIGENTE en 2026 (Ley de Tráfico, RGCir, RGCond, Reglamento General de Vehículos y reformas recientes). Si un dato es sensible a cambios normativos (tasas de alcohol, límites de velocidad, baliza V-16, plazos ITV, puntos, sanciones) y NO estás seguro al 100 %, añade la marca literal `[VERIFICAR DGT 2026]` al FINAL de `explicacion_corta` — nunca inventes cifras.
   - ATENTO: desde el 1 de enero de 2026 la **baliza V-16 conectada** es obligatoria en España y SUSTITUYE a los triángulos de preseñalización. NO enseñes los triángulos como vigentes.
   - Hay reforma en curso sobre **tasas de alcohol** (posible 0,2 g/l para todos). Investiga con búsquedas web antes de dar cifras; si no puedes confirmar, marca.
3. Cada pregunta tiene UNA respuesta claramente correcta. Las incorrectas deben ser tentadoras pero inequívocamente falsas (nada de "ambas valen según se mire").
4. La `trampa` explica por qué pica la gente (el matiz, la palabra cambiada, la excepción). El `truco` es una mnemotecnia de colega, tipo: "Sin señales, la derecha manda", "Triángulo avisa, círculo manda, cuadrado informa", "Novel o profesional → la mitad de todo".
5. Voz: castellano de calle, segunda persona, humor de colega, precisión quirúrgica en lo normativo. Máximo una exclamación por texto.
6. Distribución de dificultad aproximada: 15 % dif-1, 30 % dif-2, 30 % dif-3, 20 % dif-4, 5 % dif-5.
7. Varía la posición de la correcta (reparte entre índices 0, 1 y 2) y la longitud de las opciones (que la correcta NO sea siempre la más larga).
8. No repitas el mismo dato normativo como pregunta central más de 2 veces por banco; cubre TODOS los subtemas asignados.
9. NO hagas `git commit` ni toques archivos fuera de los que se te indican.

## Validación antes de terminar

```bash
node -e "const a=JSON.parse(require('fs').readFileSync('<TU_ARCHIVO>','utf8'));console.log(a.length)"
```

Y repasa tú mismo un 10 % aleatorio de tus preguntas como si fueras el examinador más quisquilloso de la DGT.
