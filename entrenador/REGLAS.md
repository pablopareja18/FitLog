# Reglas del entrenador (FitLog)

Archivo de referencia para la revisión semanal automática. La app lee `programa.json` (raíz del repo) y sube cada entreno a `entrenos/AAAA-MM-DD_<id>.json`.

## Semana tipo
- Martes: Pecho, hombro y tríceps (`dia: 1`)
- Jueves: Pierna (`dia: 3`)
- Viernes: Espalda y bíceps, con press inclinado y laterales (`dia: 4`)
- `dia`: 0 = lunes … 6 = domingo. Mantener los `id` de sesión `martes`, `jueves`, `viernes` (el historial se agrupa por ellos).

## Cómo progresar
- Doble progresión. Cuando en un ejercicio se completa el tope del rango en todas las series con el RIR pedido, la semana siguiente se sube el peso:
  - Máquinas y poleas: el siguiente escalón disponible (normalmente +2,5 a +5 kg).
  - Barra (sentadilla, rumano): +2,5 kg.
  - Mancuernas: +1 a +2,5 kg (12,5 → 14 o 15).
- Si no se llega al mínimo del rango en 2 semanas seguidas, bajar un 5-10 %.
- Si entre series se pierden más de 2 repeticiones, el problema es la primera serie demasiado al fallo o poco descanso: mantener el peso y recordarlo en la nota del ejercicio.
- RIR objetivo: series principales RIR 1, el resto RIR 1-2. Nada al fallo (RIR 0) salvo la última serie de aislamientos.
- Descarga cada 5-6 semanas de carga, o antes si el rendimiento cae 2 semanas seguidas: mismos ejercicios, 2 series en lugar de 3 y un 85-90 % del peso.
- Sesiones de unos 60-75 minutos. No añadir volumen si la sesión ya pasa de 80 minutos.

## Formato de `programa.json`
```json
{
  "actualizado": "AAAA-MM-DDTHH:MM",
  "semana": "Semana del 30 nov",
  "inicio": "AAAA-MM-DD (lunes de la semana)",
  "nota": "Mensaje corto para la semana",
  "sesiones": [
    { "id": "martes", "dia": 1, "nombre": "Pecho, hombro y tríceps",
      "ejercicios": [
        { "id": "press-pecho-maquina", "descanso": 180, "nota": "opcional",
          "series": [ { "kg": 90, "reps": [8, 10], "rir": "1" } ] }
      ] }
  ]
}
```
- `actualizado` debe cambiar siempre: la app solo carga el programa si ese valor es distinto.
- Los `id` de ejercicio tienen que existir en `fuente/src/exercises.js` o ser personalizados del usuario (por ejemplo `c_mwpcc4zcgr1aki` = Remo abierto).
- Copiar el mismo archivo a `fuente/programa.json`.
