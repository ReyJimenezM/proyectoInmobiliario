# Plataforma Finca Raíz + Motor de Crédito (demo)

Demo funcional de extremo a extremo: vitrina de propiedades, simulador financiero (compra/arriendo)
y motor de estudio de crédito automatizado con auditoría y explicabilidad.

## Arranque rápido (un solo comando)

```bash
docker compose up --build
```

Esto levanta Postgres, corre las migraciones, puebla la base de datos con el seed
(idempotente — no duplica datos si ya corrió antes), y arranca backend y frontend:

- Frontend: http://localhost:3000
- Backend / docs interactivas: http://localhost:8000/docs

No requiere ningún paso manual adicional. Las secciones de abajo (por bloque) documentan
cómo correr cada pieza por separado durante desarrollo (útil para editar código con
recarga en caliente sin reconstruir la imagen de Docker).

> **No pude probar `docker compose up --build` en el entorno donde generé este proyecto**
> (no había Docker instalado). Validé la sintaxis YAML del `docker-compose.yml` y revisé
> los Dockerfiles manualmente, pero no hay garantía de que el build funcione a la primera
> — es el punto de mayor riesgo de todo el demo. Si falla, el sospechoso más probable es
> la instalación editable de `motor_decision` dentro del contenedor backend (línea
> `-e ../motor_decision` en `backend/requirements.txt`) o alguna dependencia nativa
> (bcrypt/psycopg2) que necesite una versión de imagen base distinta.

## Credenciales de prueba (creadas por el seed)

| Rol | Email | Password |
|---|---|---|
| admin/analista | `admin@fincaraiz-demo.co` | `Admin123!` |
| solicitante | `solicitante@fincaraiz-demo.co` | `Demo123!` |

## Desarrollo por bloque (sin Docker, con recarga en caliente)

### Bloque 1 — Modelo de datos, migraciones y seed

Requiere Docker (para Postgres) y Python 3.11+.

```bash
# 1. Levanta Postgres
docker compose up -d db

# 2. Backend: crea entorno virtual e instala dependencias
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 3. Copia variables de entorno
copy .env.example .env        # macOS/Linux: cp .env.example .env

# 4. Corre las migraciones
alembic upgrade head

# 5. Puebla la base de datos con datos de prueba
python -m app.seed.seed
```

Verificación esperada: el seed imprime `Seed completado.` y las credenciales de arriba.
Puedes confirmar las tablas con:

```bash
docker exec -it proyectoinmobiliario-db-1 psql -U fincaraiz -d fincaraiz -c "\dt"
```

Deberías ver 11 tablas: `usuarios`, `anunciantes`, `propiedades`, `imagenes_propiedad`,
`politicas_credito`, `solicitudes`, `documentos_solicitud`, `evaluaciones`,
`decisiones_manuales`, `auditoria`, `simulaciones`.

La tabla `auditoria` tiene triggers a nivel de base de datos que bloquean `UPDATE`/`DELETE`
(ver `backend/alembic/versions/0002_auditoria_append_only.py`) — es append-only real, no solo
por convención de la aplicación.

> Nota: este bloque fue verificado de forma estática (imports, compilación de migraciones y
> seed, hashing de contraseñas) en el entorno de generación, que no tenía Docker/Postgres
> disponible para una prueba end-to-end contra una base de datos real. Ejecuta los pasos
> de arriba para la verificación completa.

## Bloque 2 — Motor de decisión

```bash
cd motor_decision
python -m venv .venv
.venv\Scripts\activate
pip install -e . pytest
pytest -v          # 26 tests, deben pasar todos
```

## Bloque 3 — API de propiedades + simulador

```bash
cd backend
# (si vienes del Bloque 1, reusa el mismo venv/.env)
pip install -r requirements.txt
pytest tests/ -v    # 12 tests del cálculo financiero, deben pasar todos

uvicorn app.main:app --reload --port 8000
```

Con el servidor corriendo (y la base de datos poblada por el Bloque 1), prueba:

```bash
curl "http://localhost:8000/api/propiedades?ciudad=Bogot%C3%A1&pagina=1"
curl "http://localhost:8000/api/propiedades/{id_de_una_propiedad}"
curl -X POST http://localhost:8000/api/simulador/compra \
  -H "Content-Type: application/json" \
  -d '{"precio": 300000000, "cuota_inicial": 60000000, "ingresos_mensuales": 8000000, "plazo_anios": 15}'
curl -X POST http://localhost:8000/api/simulador/arriendo \
  -H "Content-Type: application/json" \
  -d '{"canon_mensual": 1800000, "ingresos_mensuales": 7000000, "tipo_ingreso": "empleado"}'
```

También disponible la documentación interactiva en `http://localhost:8000/docs`.

> Nota: en el entorno de generación no había Docker/Postgres disponibles, así que los
> endpoints de propiedades/simulador se verificaron por importación (la app registra
> correctamente sus rutas) y con tests unitarios de las funciones puras de cálculo
> financiero (amortización francesa y semáforos), pero no se probaron end-to-end contra
> una base de datos real. Ejecuta los `curl` de arriba para la verificación completa.

## Bloque 4 — API de solicitudes end-to-end

```bash
cd backend
pip install -r requirements.txt   # instala tambien motor_decision en modo editable
pytest tests/ -v                  # 21 tests deben pasar (incluye motor_client y checklist)
uvicorn app.main:app --reload --port 8000
```

Flujo completo por `curl` (con la DB del Bloque 1 ya poblada):

```bash
# 1. login con el usuario de prueba
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"solicitante@fincaraiz-demo.co","password":"Demo123!"}' | jq -r .access_token)

# 2. crear solicitud (usa un id de propiedad real de tu seed)
curl -X POST http://localhost:8000/api/solicitudes \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"propiedad_id":"<uuid-propiedad>","vertical":"compra"}'

# 3. completar los 4 pasos con PUT /api/solicitudes/{id}/datos-personales, /datos-laborales,
#    /datos-financieros, /garantias-referencias

# 4. ver checklist dinámico de documentos
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/solicitudes/{id}/documentos-requeridos

# 5. cargar un documento
curl -X POST "http://localhost:8000/api/solicitudes/{id}/documentos?tipo_documento=cedula_ciudadania" \
  -H "Authorization: Bearer $TOKEN" -F "archivo=@cedula.pdf"

# 6. enviar -> dispara el motor de decisión automáticamente
curl -X POST http://localhost:8000/api/solicitudes/{id}/enviar \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"acepta_politica_datos": true}'

# 7. ver el resultado con explicación
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/solicitudes/{id}/resultado
```

> Nota: igual que en los bloques anteriores, no pude correr este flujo contra Postgres real
> en el entorno de generación. Sí corrí 21 tests unitarios que cubren: el puente
> `motor_client` (mapeo Solicitud+PoliticaCredito -> motor_decision, incluyendo que
> `datos_personales` con `estado_civil`/`genero` nunca llega al motor), el checklist
> dinámico de documentos, y el cálculo financiero. También verifiqué que la app completa
> importa y registra sus 10 rutas.

## Bloque 5 — Frontend público (vitrina + simulador)

```bash
cd frontend
npm install
cp .env.local.example .env.local   # apunta a http://localhost:8000 por defecto
npm run dev
```

Con el backend corriendo (Bloques 1-4), abre `http://localhost:3000` y navega:
- Home con hero de búsqueda, propiedades destacadas y sección "Cómo funciona".
- `/venta/apartamento/bogota` — listados con filtros, orden y paginación.
- `/propiedad/{id}` — ficha con galería, características, y el simulador de crédito
  integrado (compra o arriendo según la propiedad).
- `/simulador` — simulador standalone sin propiedad precargada.

> Nota: **no pude instalar Node.js ni correr `npm install`/`next build`/`tsc` en este
> entorno** (no hay Node disponible; solo encontré binarios `node.exe` empaquetados con
> software de terceros no aptos para usar). Este bloque es el que tiene **mayor riesgo de
> errores de compilación no detectados** de todos los entregados hasta ahora — revisa con
> `npm run build` antes de dar por bueno este bloque. Los enlaces del header a
> `/login`, `/publicar`, `/blog` y `/proyectos-nuevos` son intencionalmente placeholders:
> `/login` se construye en el Bloque 6 (autenticación + wizard), los demás no estaban
> detallados en el prompt y quedan fuera de alcance del demo.

## Bloque 6 — Frontend de solicitud multi-paso

Mismo `npm run dev` del Bloque 5 (es el mismo proyecto Next.js). Con backend y frontend
corriendo:

1. Entra a cualquier ficha de propiedad y haz clic en "Inicia tu solicitud formal" desde
   el simulador (o ve directo a `/registro` / `/login` — demo: `solicitante@fincaraiz-demo.co`
   / `Demo123!`).
2. Si no tienes sesión, te manda a `/login?destino=...` y al autenticarte vuelve a
   `/solicitud/nueva` automáticamente.
3. `/solicitud/nueva` crea el borrador (`POST /api/solicitudes`) y redirige a
   `/solicitud/{id}/paso/1`.
4. Completa los 6 pasos: datos personales, laborales, financieros (con el checkbox
   obligatorio de autorización de centrales de riesgo), garantías y referencias,
   documentos (checklist dinámico + drag-and-drop), y revisión y envío.
5. Al enviar, ve a `/solicitud/{id}/resultado` con el estado (Aprobado ✅ / En revisión ⏳ /
   Rechazado con ruta alterna 🔁), la explicación en lenguaje simple, y el detalle de
   variables evaluadas.

> Nota: misma limitación que el Bloque 5 — no pude instalar Node.js ni correr
> `next build`/`tsc` en este entorno, así que este bloque tampoco fue compilado. Revísalo
> con `npm run build` antes de darlo por bueno. El componente `PasoRevisionEnvio` usa
> `router.push` con rutas absolutas (no relativas) a propósito, porque el router de
> Next.js no resuelve `../` como navegación relativa de archivos.

## Bloque 7 — Panel administrativo

Backend:
```bash
cd backend
pytest tests/ -v    # 23 tests deben pasar (incluye validación de pesos de política)
uvicorn app.main:app --reload --port 8000
```

Frontend: mismo `npm run dev`. Entra con `admin@fincaraiz-demo.co` / `Admin123!` — el login
detecta el rol y te manda directo a `/admin`.

- `/admin` — dashboard: solicitudes por estado, tasa de aprobación, tiempo promedio de
  evaluación, distribución de scores.
- `/admin/pipeline` — kanban Recibido → En evaluación → Revisión manual → Decisión.
- `/admin/solicitudes/{id}` — detalle completo, visor de documentos (descarga autenticada),
  score y explicación del motor, botones Aprobar/Rechazar/Solicitar información con
  comentario obligatorio (mín. 10 caracteres, queda en `auditoria`).
- `/admin/politicas` — variables y pesos de la política activa por vertical; "Nueva versión
  de política" valida que los pesos sumen 1.0 antes de publicar una versión nueva (no
  sobreescribe la anterior).
- `/admin/propiedades` — listado de propiedades con acceso a "Editar / fotos".
- `/admin/propiedades/{id}` — backoffice al estilo WordPress por propiedad: editar título,
  descripción, tipo, operación, precio, valor de administración, estado, zona (ciudad,
  barrio, zona, dirección) y características (área, habitaciones, baños, parqueaderos,
  estrato); y un gestor de fotos con subida real de archivos (drag-and-drop o clic),
  reordenar (la primera es la portada) y eliminar.

Nuevos endpoints backend: `POST /api/admin/solicitudes/{id}/decision`,
`GET/POST /api/admin/politicas`, `GET /api/admin/dashboard`, `GET /api/admin/propiedades`,
`PATCH /api/propiedades/{id}` (ahora acepta también zona y características),
`POST /api/propiedades/{id}/imagenes`, `DELETE /api/propiedades/{id}/imagenes/{imagen_id}`,
`PUT /api/propiedades/{id}/imagenes/orden` — todos protegidos con `requiere_analista_o_admin`.

Las fotos de propiedades se guardan en `storage/propiedades/` y se sirven **públicamente**
sin autenticación en `/media/propiedades/...` (a diferencia de los documentos de solicitud,
que son privados) — es una carpeta y un storage backend separados a propósito.

> Nota: este bloque sí se probó de punta a punta contra el demo corriendo en Docker
> (`docker compose up --build`): 32 tests backend en verde, PATCH de precio/zona/
> características, subida real de una imagen, verificación de que se sirve públicamente,
> reordenar y eliminar — todo confirmado con `curl` contra los contenedores reales, no solo
> revisión estática de código.

## Landing de captación (`/landing`)

Página comercial para campañas, con doble audiencia: el selector del hero cambia el mensaje
entre **inmobiliaria** y **persona que busca vivienda**, y ese mismo perfil configura los
campos del formulario al final de la página.

Es una ruta independiente de la vitrina (`app/landing/page.tsx`), con su propio header y
footer. La mayor parte es Server Component: solo son cliente el selector del hero, la
calculadora de ahorro y el formulario. No carga imágenes remotas — el hero es CSS puro — y
el script de Calendly se descarga **solo después** de enviar el formulario, para no pagarlo
en la primera carga.

### Configuración

Copia `frontend/.env.local.example` a `frontend/.env.local` y llena:

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_CALENDLY_URL` | Enlace del evento de Calendly. Si queda vacío, el formulario sigue recibiendo leads y solo muestra "te contactamos". |
| `NEXT_PUBLIC_CONTACTO_WHATSAPP` / `NEXT_PUBLIC_CONTACTO_EMAIL` | Contactos de respaldo si Calendly no está configurado o falla. |
| `LEADS_WEBHOOK_URL` | CRM / Zapier / Make / n8n al que se reenvía cada lead (opcional). |
| `LEADS_FILE` | Respaldo local en JSONL. Por defecto `storage/leads/leads.jsonl` relativo al directorio desde donde corre Next. |

Al enviar el formulario se hace `POST /api/leads` (route handler de Next, no directo al
backend: la landing debe poder capturar leads aunque el backend esté caído). El handler
valida con zod, descarta bots por honeypot, limita por IP y reparte el lead a tres destinos
—backend, webhook y archivo—, dándolo por recibido si al menos uno responde. Si Calendly
está configurado, el widget aparece con nombre, correo y teléfono ya prellenados en la URL,
y cuando la persona agenda se registra el evento correspondiente.

### Del formulario al CRM

Los leads llegan al módulo `/admin/leads`, que consume la API real:

| Endpoint | Quién | Para qué |
|---|---|---|
| `POST /api/leads` | Público | Lo llama el route handler de Next con lo que capturó la landing. Devuelve `{id, codigo}`; el código (`LD-XXXXXXXX`) es el radicado que ve la persona. |
| `POST /api/leads/{id}/agendado` | Público | Marca la reunión confirmada por Calendly. Es idempotente y solo lo puede llamar quien tenga el UUID, que no se expone en la página. |
| `GET /api/admin/leads` | Staff | Listado con filtros (`estado`, `tipo`, `q`) y el resumen del tablero calculado sobre ese mismo filtro. |
| `PATCH /api/admin/leads/{id}` | Staff sin `consulta` | Cambia estado, asesor y nota. Cada gestión queda en `auditoria` con el valor anterior. |

La landing captura un perfil grueso (inmobiliaria o persona) y el backend deriva el tipo con
el que trabaja el CRM: una persona que marca "Poner mi inmueble en arriendo" entra como
**propietario**, y el resto como **arrendatario**.

**Regla de tenant, distinta al resto de la aplicación:** la landing pública no sabe a qué
inmobiliaria pertenece quien deja sus datos, así que el lead nace sin `inmobiliaria_id`.
Los leads sin asignar son una bandeja compartida que ve todo el staff; en cuanto alguien los
gestiona quedan asignados a su inmobiliaria y desaparecen para las demás. Un lead ya
asignado a otro tenant responde 404, no 403 (un 403 confirmaría que existe). Una landing
white-label puede saltarse la bandeja mandando `inmobiliaria_id` en el POST.

El portal del propietario (`/propietario/leads`) sigue con los datos de demostración de
`lib/demo.ts`; el que quedó conectado a la base de datos es el CRM del backoffice.

> Nota: probado en el navegador contra `next dev` — render de la página, cambio de perfil,
> validación del formulario, `POST /api/leads` en 200 con el JSONL escrito, montaje del
> widget de Calendly con el prefill en la URL y ausencia de scroll horizontal en móvil.
> `next build` pasa limpio: `/landing` se prerenderiza como estática y `/api/leads` queda
> como ruta dinámica.
>
> El circuito completo landing → backend → CRM se probó contra PostgreSQL real (sobre una
> base desechable, no la del stack de docker): cuatro leads enviados desde el formulario, el
> tipo derivado correctamente en cada caso, el agendamiento marcado, el cambio de estado,
> asesor y nota persistido, y el lead reclamado por la inmobiliaria que lo gestionó. La
> migración `0015` se verificó con `upgrade head` → `downgrade 0014` → `upgrade head`,
> comprobando que el downgrade no deja tipos enum huérfanos, y el seed corrió completo sobre
> una base limpia. 322 pruebas de backend en verde, 17 de ellas nuevas para leads.
