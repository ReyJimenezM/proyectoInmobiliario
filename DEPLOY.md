# Guia de Despliegue - Plataforma Inmobiliaria

## Variables de Entorno Requeridas

Todas las opciones de despliegue necesitan estas variables:

| Variable | Descripcion | Ejemplo |
|----------|-------------|---------|
| `POSTGRES_USER` | Usuario de PostgreSQL | `fincaraiz` |
| `POSTGRES_PASSWORD` | Contrasena de PostgreSQL (usar valor seguro) | `clave-segura-aleatoria` |
| `POSTGRES_DB` | Nombre de la base de datos | `fincaraiz` |
| `JWT_SECRET_KEY` | Clave secreta para tokens JWT (minimo 32 caracteres) | `openssl rand -hex 32` |
| `PUBLIC_BASE_URL` | URL publica del backend | `https://api.midominio.com` |
| `NEXT_PUBLIC_API_URL` | URL del backend (accesible desde el navegador) | `https://api.midominio.com` |
| `TASA_REFERENCIAL_EA_DEFAULT` | Tasa de interes referencial | `0.12` |

---

## Opcion A: Railway.app (Recomendado - Mas Simple)

Railway permite desplegar directamente desde un repositorio de GitHub con soporte nativo para Docker.

### Pasos

1. **Crear cuenta** en [railway.app](https://railway.app) y conectar tu repositorio de GitHub.

2. **Crear un nuevo proyecto** desde el dashboard de Railway:
   - Click en "New Project" > "Deploy from GitHub Repo"
   - Seleccionar el repositorio

3. **Agregar la base de datos PostgreSQL**:
   - Dentro del proyecto, click en "New" > "Database" > "PostgreSQL"
   - Railway creara automaticamente las variables de conexion

4. **Configurar el servicio del Backend**:
   - Click en "New" > "GitHub Repo" (seleccionar el mismo repo)
   - En Settings > Build:
     - Root Directory: `/` (raiz)
     - Dockerfile Path: `backend/Dockerfile`
   - En Variables, agregar:
     ```
     DATABASE_URL=postgresql+psycopg2://${{Postgres.PGUSER}}:${{Postgres.PGPASSWORD}}@${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}
     JWT_SECRET_KEY=<generar con: openssl rand -hex 32>
     STORAGE_BACKEND=local
     STORAGE_LOCAL_PATH=/app/storage/documentos
     STORAGE_PUBLIC_PATH=/app/storage/propiedades
     PUBLIC_BASE_URL=${{RAILWAY_PUBLIC_DOMAIN}}
     TASA_REFERENCIAL_EA_DEFAULT=0.12
     ```
   - En Settings > Networking: generar un dominio publico

5. **Configurar el servicio del Frontend**:
   - Click en "New" > "GitHub Repo" (seleccionar el mismo repo otra vez)
   - En Settings > Build:
     - Root Directory: `/` (raiz)
     - Dockerfile Path: `frontend/Dockerfile`
   - En Variables, agregar:
     ```
     NEXT_PUBLIC_API_URL=https://<dominio-del-backend>.railway.app
     API_INTERNAL_URL=http://<nombre-servicio-backend>.railway.internal:8000
     ```
   - En Settings > Build > Build Args:
     ```
     NEXT_PUBLIC_API_URL=https://<dominio-del-backend>.railway.app
     ```
   - En Settings > Networking: generar un dominio publico

6. **Desplegar**: Railway despliega automaticamente con cada push a la rama principal.

### Notas sobre Railway
- El almacenamiento local de archivos no persiste entre despliegues. Para produccion considerar usar un servicio externo como S3/Cloudflare R2.
- Railway cobra por uso (CPU + memoria + red). El plan gratuito incluye $5 USD/mes.

---

## Opcion B: Render.com (Alternativa)

Render soporta Blueprint Specs via el archivo `render.yaml` incluido en el repositorio.

### Pasos

1. **Crear cuenta** en [render.com](https://render.com) y conectar tu repositorio de GitHub.

2. **Despliegue automatico con Blueprint**:
   - Ir a Dashboard > "New" > "Blueprint"
   - Seleccionar el repositorio
   - Render detectara automaticamente el archivo `render.yaml`
   - Revisar los servicios que se van a crear y confirmar

3. **Verificar variables**:
   - `JWT_SECRET_KEY` se genera automaticamente
   - `DATABASE_URL` se conecta automaticamente a la base de datos creada
   - Verificar que `NEXT_PUBLIC_API_URL` apunte al dominio correcto del backend

4. **Dominio personalizado** (opcional):
   - En cada servicio, ir a Settings > Custom Domains
   - Agregar tu dominio y configurar los registros DNS

### Notas sobre Render
- El plan gratuito suspende los servicios despues de 15 minutos de inactividad.
- El disco persistente (para archivos subidos) esta disponible desde el plan Starter ($7 USD/mes por servicio).
- La base de datos gratuita se elimina despues de 90 dias.

---

## Opcion C: DigitalOcean App Platform

### Pasos

1. **Crear cuenta** en [cloud.digitalocean.com](https://cloud.digitalocean.com).

2. **Crear base de datos administrada**:
   - Ir a Databases > Create Database Cluster
   - Seleccionar PostgreSQL 16
   - Anotar los datos de conexion

3. **Crear la App**:
   - Ir a Apps > Create App
   - Conectar el repositorio de GitHub

4. **Configurar el Backend**:
   - Source: GitHub repo
   - Dockerfile Path: `backend/Dockerfile`
   - Variables de entorno:
     ```
     DATABASE_URL=postgresql+psycopg2://<usuario>:<contrasena>@<host>:25060/<db>?sslmode=require
     JWT_SECRET_KEY=<generar con: openssl rand -hex 32>
     STORAGE_BACKEND=local
     STORAGE_LOCAL_PATH=/app/storage/documentos
     STORAGE_PUBLIC_PATH=/app/storage/propiedades
     PUBLIC_BASE_URL=https://<tu-app>.ondigitalocean.app
     TASA_REFERENCIAL_EA_DEFAULT=0.12
     ```
   - HTTP Port: 8000

5. **Configurar el Frontend**:
   - Source: GitHub repo
   - Dockerfile Path: `frontend/Dockerfile`
   - Build Arg: `NEXT_PUBLIC_API_URL=https://<dominio-backend>`
   - Variable: `API_INTERNAL_URL=http://<servicio-backend>:8000`
   - HTTP Port: 3000

6. **Desplegar** y verificar que ambos servicios estan en estado "Running".

### Notas sobre DigitalOcean
- App Platform escala automaticamente.
- La base de datos administrada comienza en $15 USD/mes.
- Los componentes de la app comienzan en $5 USD/mes cada uno.

---

## Opcion D: VPS Manual con Docker Compose

Para desplegar en cualquier VPS (DigitalOcean Droplet, Linode, Hetzner, AWS EC2, etc.).

### Requisitos del servidor
- Ubuntu 22.04+ o Debian 12+
- Minimo 2 GB RAM, 1 vCPU
- Docker y Docker Compose instalados

### Pasos

1. **Instalar Docker** (si no esta instalado):
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   # Cerrar sesion y volver a entrar
   ```

2. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/<tu-usuario>/<tu-repo>.git
   cd <tu-repo>
   ```

3. **Crear archivo `.env`** en la raiz del proyecto:
   ```bash
   cat > .env << 'EOF'
   # Base de datos
   POSTGRES_USER=fincaraiz
   POSTGRES_PASSWORD=$(openssl rand -hex 24)
   POSTGRES_DB=fincaraiz

   # Backend
   JWT_SECRET_KEY=$(openssl rand -hex 32)
   PUBLIC_BASE_URL=https://api.tudominio.com
   CORS_ORIGINS=https://tudominio.com
   TASA_REFERENCIAL_EA_DEFAULT=0.12

   # Frontend
   NEXT_PUBLIC_API_URL=https://api.tudominio.com
   EOF
   ```
   **Importante**: Editar el archivo y reemplazar los dominios con los tuyos. Generar valores reales para `POSTGRES_PASSWORD` y `JWT_SECRET_KEY`:
   ```bash
   openssl rand -hex 24   # para POSTGRES_PASSWORD
   openssl rand -hex 32   # para JWT_SECRET_KEY
   ```

4. **Construir y levantar**:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   ```

5. **Verificar que todo esta corriendo**:
   ```bash
   docker compose ps
   docker compose logs -f backend   # ver logs del backend
   docker compose logs -f frontend  # ver logs del frontend
   ```

6. **Configurar proxy inverso con Caddy** (HTTPS automatico):
   ```bash
   sudo apt install -y caddy
   ```
   Crear `/etc/caddy/Caddyfile`:
   ```
   api.tudominio.com {
       reverse_proxy localhost:8000
   }

   tudominio.com {
       reverse_proxy localhost:3000
   }
   ```
   ```bash
   sudo systemctl reload caddy
   ```
   Caddy obtendra certificados SSL automaticamente via Let's Encrypt.

7. **Configurar DNS**: Apuntar ambos dominios (`tudominio.com` y `api.tudominio.com`) a la IP del servidor.

### Comandos utiles

```bash
# Ver estado de los servicios
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Ver logs
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Reiniciar un servicio
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart backend

# Actualizar (despues de git pull)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Backup de la base de datos
docker compose exec db pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backup_$(date +%Y%m%d).sql

# Restaurar backup
cat backup.sql | docker compose exec -T db psql -U ${POSTGRES_USER} ${POSTGRES_DB}
```

---

## Seguridad - Checklist

- [ ] `JWT_SECRET_KEY` generado con `openssl rand -hex 32` (nunca usar el valor por defecto)
- [ ] `POSTGRES_PASSWORD` es una contrasena fuerte y aleatoria
- [ ] El puerto 5432 (PostgreSQL) NO esta expuesto a internet
- [ ] HTTPS habilitado en todos los dominios publicos
- [ ] `CORS_ORIGINS` configurado solo con los dominios permitidos (no usar `*` en produccion)
- [ ] Archivo `.env` agregado a `.gitignore` (nunca subir secretos al repositorio)
- [ ] Backups automaticos de la base de datos configurados
