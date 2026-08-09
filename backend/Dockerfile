FROM python:3.11-slim

WORKDIR /workspace

# motor_decision se instala en modo editable (ver requirements.txt: -e ../motor_decision),
# por eso ambos directorios se copian preservando la misma estructura relativa del repo.
COPY motor_decision ./motor_decision
COPY backend ./backend

WORKDIR /workspace/backend
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && python -m app.seed.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
