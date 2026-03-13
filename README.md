# Scripts

Herramientas para generar y poblar el historial de contribuciones de GitHub.

## Flujo de trabajo

```
generate-random-days-json.js  →  data/commit-days.json  →  backfill-commits.sh  →  repo Git con commits históricos
```

1. **Generar el JSON** con los días y cantidades de commits deseados
2. **Ejecutar el backfill** para crear los commits en un repo destino

---

## generate-random-days-json.js

Genera un archivo JSON con fechas aleatorias y cantidad de commits por día, respetando vacaciones, feriados y fines de semana.

### Uso

```bash
node scripts/generate-random-days-json.js
```

### Configuración

Se configura editando el objeto `CONFIG` dentro del archivo:

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `startDate` | `string` | Fecha de inicio (`YYYY-MM-DD`) |
| `endDate` | `string` | Fecha de fin (`YYYY-MM-DD`) |
| `minDaysPerWeek` | `number` | Mínimo de días con commits por semana (1-5) |
| `maxDaysPerWeek` | `number` | Máximo de días con commits por semana (1-5) |
| `minQuantityPerDay` | `number` | Mínimo de commits por día |
| `maxQuantityPerDay` | `number` | Máximo de commits por día |
| `vacationPeriods` | `array` | Períodos sin commits (`{startDate, endDate}`) |
| `excludedMonthDays` | `array` | Feriados fijos por mes/día (`"MM-DD"`) |
| `excludedDates` | `array` | Fechas específicas excluidas (`"YYYY-MM-DD"`) |
| `weekendContributions` | `object` | Control de commits en fines de semana |
| `outputFilePath` | `string` | Ruta del archivo de salida |

#### weekendContributions

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `enabled` | `boolean` | Activar commits en fines de semana |
| `chancePerEligibleWeek` | `number` | Probabilidad (0-1) de contribuir un fin de semana |
| `maxDaysPerMonth` | `number` | Máximo de días de fin de semana con commits por mes |
| `maxDaysPerWeek` | `number` | Máximo de días de fin de semana por semana (1-2) |
| `minQuantityPerDay` | `number` | Mínimo de commits por día de fin de semana |
| `maxQuantityPerDay` | `number` | Máximo de commits por día de fin de semana |

### Salida

Genera `data/random-days.json` (configurable) con formato:

```json
[
  { "date": "2021-05-03", "quantity": 7 },
  { "date": "2021-05-04", "quantity": 9 }
]
```

---

## backfill-commits.sh

Lee un JSON con fechas y cantidades, y crea commits reales con fechas históricas en un repositorio Git destino.

### Requisitos

- `jq` — para parsear el JSON
- `git` — para crear los commits

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq
```

### Uso

```bash
# Ver qué haría sin ejecutar nada
./scripts/backfill-commits.sh --repo /path/to/repo --dry-run

# Ejecutar con el JSON por defecto (data/commit-days.json)
./scripts/backfill-commits.sh --repo /path/to/repo

# Ejecutar con un JSON personalizado
./scripts/backfill-commits.sh --repo /path/to/repo --data /path/to/custom.json
```

### Parámetros

| Parámetro | Requerido | Default | Descripción |
|-----------|-----------|---------|-------------|
| `--repo <path>` | Si | — | Ruta al repositorio Git destino |
| `--data <path>` | No | `data/commit-days.json` | Ruta al archivo JSON con los datos |
| `--dry-run` | No | `false` | Muestra el plan sin ejecutar commits |
| `-h, --help` | No | — | Muestra la ayuda |

### Cómo funciona

1. Valida dependencias (`jq`, `git`) y que el repo destino sea válido
2. Lee el JSON y muestra un resumen (total de días y commits)
3. Para cada entrada del JSON, crea N commits modificando un archivo `contributions.txt`:
   - Commits **impares**: agregan una línea con timestamp
   - Commits **pares**: eliminan la última línea
4. Cada commit usa `GIT_AUTHOR_DATE` y `GIT_COMMITTER_DATE` con la fecha del JSON
5. Los commits del mismo día tienen horas incrementales (09:00, 09:01, 09:02...) para evitar timestamps idénticos
6. Al finalizar, ejecuta `git push` automáticamente

### Progreso

Durante la ejecución muestra:

```
=== Backfill Commits ===
Repo:    /path/to/repo
Data:    data/commit-days.json
Days:    1154
Commits: 10321
Dry run: false
========================
[1/1154] 2021-05-03 — 7 commits (total: 7/10321)
[2/1154] 2021-05-04 — 9 commits (total: 16/10321)
...
```

### Formato del JSON de entrada

Array de objetos con `date` (ISO 8601) y `quantity` (entero positivo):

```json
[
  { "date": "2021-05-03", "quantity": 7 },
  { "date": "2021-05-04", "quantity": 9 }
]
```

---

## Ejemplo completo

```bash
# 1. Ajustar CONFIG en generate-random-days-json.js según necesidad

# 2. Generar el JSON
node scripts/generate-random-days-json.js

# 3. Copiar el JSON generado como datos de entrada
cp data/random-days.json data/commit-days.json

# 4. Crear un repo destino (o usar uno existente)
mkdir -p /tmp/my-contributions && cd /tmp/my-contributions && git init
# Configurar remote si es necesario:
# git remote add origin git@github.com:user/repo.git

# 5. Verificar con dry-run
./scripts/backfill-commits.sh --repo /tmp/my-contributions --dry-run

# 6. Ejecutar
./scripts/backfill-commits.sh --repo /tmp/my-contributions

# 7. Verificar commits
cd /tmp/my-contributions && git log --format="%ai %s" | head -20
```
