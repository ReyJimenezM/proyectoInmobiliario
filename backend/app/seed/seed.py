"""Script de seed: puebla la base de datos con datos de prueba para que el demo
se vea completo desde el primer arranque. Ejecutar con: python -m app.seed.seed
"""
import dataclasses
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.security import hash_password
from app.models import (
    Usuario,
    Anunciante,
    Propiedad,
    ImagenPropiedad,
    PoliticaCredito,
    Solicitud,
    DocumentoSolicitud,
    Evaluacion,
    DecisionManual,
    MotorDecisionConfig,
)
from motor_decision.robusto import MOTOR_DEFAULT
from app.models.enums import (
    RolUsuario,
    TipoAnunciante,
    TipoPropiedad,
    OperacionPropiedad,
    EstadoPropiedad,
    Vertical,
    EstadoSolicitud,
    EstadoDocumento,
    DecisionEvaluacion,
    DecisionManual as DecisionManualEnum,
)

DEFAULT_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")  # creado en la migracion 0003

UNSPLASH_IDS = [
    "1560448204-e02f11c3d0e2", "1560185127-6ed189bf02f4", "1512917774080-9991f1c4c750",
    "1502672260266-1c1ef2d93688", "1484154218962-a197022b5858", "1493809842364-78817add7ffb",
    "1568605114967-8130f3a36994", "1523217582562-09d0def993a6", "1600585154340-be6161a56a0c",
    "1600596542815-ffad4c1539a9", "1600607687939-ce8a6c25118c", "1600607687644-aac4c3eac7f4",
    "1598928506311-c55ded91a20c", "1599423300746-b62533397364", "1613977257363-707ba9348227",
    "1580587771525-78b9dba3b914", "1571939228382-b2f2b585ce15", "1615529182904-14819c35db37",
    "1522708323590-d24dbb6b0267", "1449844908441-8829872d2607",
]


def img_url(seed_id: str, w: int = 1200, h: int = 800) -> str:
    return f"https://images.unsplash.com/photo-{seed_id}?w={w}&h={h}&fit=crop"


# Cada banda incluye una `condicion` legible por motor_decision.reglas.evaluar_banda:
# claves `<hecho>_min/_max/_in/_equals`, evaluadas contra los "hechos" calculados del
# payload de la solicitud. Los umbrales viven aqui (datos versionados), no en el codigo
# del motor -- ver No Negociable #2.
CONDICIONES_LABORALES = [
    {"etiqueta": "alta", "puntaje": 100, "condicion": {"tipo_ocupacion_in": ["indefinido"], "antiguedad_meses_min": 12}},
    {"etiqueta": "media", "puntaje": 60, "condicion": {"tipo_ocupacion_in": ["termino_fijo", "independiente", "pensionado"]}},
    {"etiqueta": "baja", "puntaje": 20, "condicion": {}},
]
CARACTER_REFERENCIAS = [
    {"etiqueta": "alta", "puntaje": 100, "condicion": {"referencias_verificadas_min": 2}},
    {"etiqueta": "media", "puntaje": 55, "condicion": {"referencias_verificadas_min": 1}},
    {"etiqueta": "baja", "puntaje": 10, "condicion": {}},
]
GARANTIA_CODEUDOR_POLIZA = [
    {"etiqueta": "alta", "puntaje": 100, "condicion": {"codeudor_ingresos_min": 1000000}},
    {"etiqueta": "media", "puntaje": 50, "condicion": {"tiene_poliza_equals": True}},
    {"etiqueta": "baja", "puntaje": 0, "condicion": {}},
]
CAPITAL_AHORROS = [
    {"etiqueta": "alta", "puntaje": 100, "condicion": {"monto_ahorros_min": 5000000}},
    {"etiqueta": "media", "puntaje": 50, "condicion": {"monto_ahorros_min": 1}},
    {"etiqueta": "baja", "puntaje": 0, "condicion": {}},
]

VARIABLES_COMPRA = [
    {
        "nombre": "capacidad", "peso": 0.40,
        "bandas": [
            {"etiqueta": "alta", "puntaje": 100, "condicion": {"ratio_max": 0.30}},
            {"etiqueta": "media", "puntaje": 65, "condicion": {"ratio_max": 0.35}},
            {"etiqueta": "baja", "puntaje": 30, "condicion": {"ratio_max": 0.45}},
            {"etiqueta": "cero", "puntaje": 0, "condicion": {}},
        ],
    },
    {"nombre": "condiciones", "peso": 0.20, "bandas": CONDICIONES_LABORALES},
    {"nombre": "caracter", "peso": 0.25, "bandas": CARACTER_REFERENCIAS},
    {"nombre": "garantia", "peso": 0.10, "bandas": GARANTIA_CODEUDOR_POLIZA},
    {"nombre": "capital", "peso": 0.05, "bandas": CAPITAL_AHORROS},
]

# La vertical arriendo usa los mismos pesos/estructura; solo cambian los umbrales de
# capacidad (30/35 en vez de 30/35/45 -- ver Parte B.2 del prompt: 31-35% amarillo, >35% rojo)
VARIABLES_ARRIENDO = [
    {
        "nombre": "capacidad", "peso": 0.40,
        "bandas": [
            {"etiqueta": "alta", "puntaje": 100, "condicion": {"ratio_max": 0.30}},
            {"etiqueta": "media", "puntaje": 55, "condicion": {"ratio_max": 0.35}},
            {"etiqueta": "baja", "puntaje": 0, "condicion": {}},
        ],
    },
    {"nombre": "condiciones", "peso": 0.20, "bandas": CONDICIONES_LABORALES},
    {"nombre": "caracter", "peso": 0.25, "bandas": CARACTER_REFERENCIAS},
    {"nombre": "garantia", "peso": 0.10, "bandas": GARANTIA_CODEUDOR_POLIZA},
    {"nombre": "capital", "peso": 0.05, "bandas": CAPITAL_AHORROS},
]

BANDAS_DECISION = {"aprobado_min": 70, "revision_min": 45, "revision_max": 69}


def run(db: Session) -> None:
    if db.query(Usuario).count() > 0:
        print("La base de datos ya tiene datos. Aborta el seed para evitar duplicados.")
        return

    # --- usuarios de prueba ---
    super_admin = Usuario(
        id=uuid.uuid4(), email="superadmin@fincaraiz-demo.co", password_hash=hash_password("SuperAdmin123!"),
        rol=RolUsuario.super_admin, nombre_completo="Andrés Vélez (Super Admin)", telefono="3001112233",
    )
    admin = Usuario(
        id=uuid.uuid4(), email="admin@fincaraiz-demo.co", password_hash=hash_password("Admin123!"),
        rol=RolUsuario.admin, nombre_completo="Laura Gómez (Analista)", telefono="3001234567",
        inmobiliaria_id=DEFAULT_TENANT_ID,
    )
    asesor = Usuario(
        id=uuid.uuid4(), email="asesor@fincaraiz-demo.co", password_hash=hash_password("Asesor123!"),
        rol=RolUsuario.asesor, nombre_completo="Pedro Ríos (Asesor comercial)", telefono="3004445566",
        inmobiliaria_id=DEFAULT_TENANT_ID,
    )
    solicitante = Usuario(
        id=uuid.uuid4(), email="solicitante@fincaraiz-demo.co", password_hash=hash_password("Demo123!"),
        rol=RolUsuario.solicitante, nombre_completo="Carlos Rodríguez", telefono="3109876543",
    )
    db.add_all([super_admin, admin, asesor, solicitante])
    db.flush()

    # --- anunciantes ---
    anunciantes = [
        Anunciante(id=uuid.uuid4(), tipo=TipoAnunciante.inmobiliaria, nombre="Habitat Inmobiliaria",
                   telefono_contacto="6013456789", email="contacto@habitatinmobiliaria.co",
                   inmobiliaria_id=DEFAULT_TENANT_ID),
        Anunciante(id=uuid.uuid4(), tipo=TipoAnunciante.constructora, nombre="Constructora Prisma",
                   telefono_contacto="6042345678", email="ventas@prisma.co", inmobiliaria_id=DEFAULT_TENANT_ID),
        Anunciante(id=uuid.uuid4(), tipo=TipoAnunciante.particular, nombre="María Fernanda Osorio",
                   telefono_contacto="3151112233", email="mfosorio@gmail.com", inmobiliaria_id=DEFAULT_TENANT_ID),
        Anunciante(id=uuid.uuid4(), tipo=TipoAnunciante.inmobiliaria, nombre="Zona Urbana Propiedades",
                   telefono_contacto="6053456123", email="info@zonaurbana.co", inmobiliaria_id=DEFAULT_TENANT_ID),
    ]
    db.add_all(anunciantes)
    db.flush()

    # --- propiedades ---
    ciudades = [
        ("Bogotá", ["Chapinero", "Usaquén", "Suba", "Chicó"]),
        ("Medellín", ["El Poblado", "Laureles", "Envigado"]),
        ("Cali", ["Ciudad Jardín", "Granada"]),
        ("Barranquilla", ["El Prado", "Alto Prado"]),
        ("Cartagena", ["Bocagrande", "Manga"]),
    ]
    tipos = [TipoPropiedad.apartamento, TipoPropiedad.casa, TipoPropiedad.apartaestudio,
             TipoPropiedad.oficina, TipoPropiedad.local]

    propiedades = []
    for i in range(18):
        ciudad, barrios = ciudades[i % len(ciudades)]
        barrio = barrios[i % len(barrios)]
        operacion = OperacionPropiedad.venta if i % 3 != 0 else OperacionPropiedad.arriendo
        tipo = tipos[i % len(tipos)]
        area = 45 + (i * 7) % 180
        habitaciones = 1 + (i % 4)
        precio = (
            float(180_000_000 + (i * 23_000_000) % 650_000_000)
            if operacion == OperacionPropiedad.venta
            else float(1_200_000 + (i * 180_000) % 5_500_000)
        )
        prop = Propiedad(
            id=uuid.uuid4(),
            titulo=f"{tipo.value.capitalize()} en {barrio}, {ciudad}",
            descripcion=(
                f"{tipo.value.capitalize()} de {area} m² ubicado en {barrio}, {ciudad}. "
                "Excelente iluminación natural, acabados de alta calidad, cerca a zonas "
                "comerciales y transporte público. Ideal para familias o profesionales."
            ),
            tipo=tipo,
            operacion=operacion,
            precio=precio,
            valor_admin=float(150_000 + (i * 15_000) % 400_000) if tipo == TipoPropiedad.apartamento else None,
            area_m2=float(area),
            habitaciones=habitaciones,
            banos=max(1, habitaciones - 1),
            parqueaderos=i % 3,
            ciudad=ciudad,
            zona=barrio,
            barrio=barrio,
            direccion=f"Calle {10 + i} # {20 + i}-{30 + i}",
            estrato=2 + (i % 5),
            anunciante_id=anunciantes[i % len(anunciantes)].id,
            inmobiliaria_id=DEFAULT_TENANT_ID,
            simulador_activo=(i % 5 != 4),
            estado=EstadoPropiedad.activo,
        )
        propiedades.append(prop)
    db.add_all(propiedades)
    db.flush()

    for i, prop in enumerate(propiedades):
        for j in range(3):
            db.add(ImagenPropiedad(
                id=uuid.uuid4(), propiedad_id=prop.id,
                url=img_url(UNSPLASH_IDS[(i * 3 + j) % len(UNSPLASH_IDS)]), orden=j,
            ))

    # --- politicas de credito v1 ---
    politica_compra = PoliticaCredito(
        id=uuid.uuid4(), version=1, vertical=Vertical.compra,
        variables=VARIABLES_COMPRA, bandas_decision=BANDAS_DECISION, activa=True,
        autor_id=admin.id, inmobiliaria_id=DEFAULT_TENANT_ID,
        motivo_cambio="Version inicial del demo, pesos segun marco de las 5 C.",
    )
    politica_arriendo = PoliticaCredito(
        id=uuid.uuid4(), version=1, vertical=Vertical.arriendo,
        variables=VARIABLES_ARRIENDO, bandas_decision=BANDAS_DECISION, activa=True,
        autor_id=admin.id, inmobiliaria_id=DEFAULT_TENANT_ID,
        motivo_cambio="Version inicial del demo, pesos segun marco de las 5 C.",
    )
    db.add_all([politica_compra, politica_arriendo])
    db.flush()

    # --- motor de decision robusto (Fase 2) ---
    motor_config = MotorDecisionConfig(
        id=uuid.uuid4(), inmobiliaria_id=DEFAULT_TENANT_ID, version=MOTOR_DEFAULT.version,
        autor=MOTOR_DEFAULT.autor, pesos=MOTOR_DEFAULT.pesos,
        parametros=dataclasses.asdict(MOTOR_DEFAULT.parametros),
        reglas=[dataclasses.asdict(r) for r in MOTOR_DEFAULT.reglas],
        activa=True, autor_id=admin.id,
        notas="Version inicial cargada desde el porte de Habitat Risk.",
    )
    db.add(motor_config)

    # --- solicitudes de ejemplo en distintos estados ---
    ejemplos = [
        dict(estado=EstadoSolicitud.aprobada, vertical=Vertical.compra, score=82.5,
             decision=DecisionEvaluacion.aprobada, nombre="Andrea Salazar"),
        dict(estado=EstadoSolicitud.aprobada, vertical=Vertical.arriendo, score=91.0,
             decision=DecisionEvaluacion.aprobada, nombre="Jorge Ibáñez"),
        dict(estado=EstadoSolicitud.rechazada, vertical=Vertical.compra, score=32.0,
             decision=DecisionEvaluacion.rechazada, nombre="Pedro Martínez"),
        dict(estado=EstadoSolicitud.revision_manual, vertical=Vertical.arriendo, score=58.0,
             decision=DecisionEvaluacion.revision_manual, nombre="Luisa Fernanda Cano"),
        dict(estado=EstadoSolicitud.revision_manual, vertical=Vertical.compra, score=52.5,
             decision=DecisionEvaluacion.revision_manual, nombre="Diego Alejandro Ríos"),
        dict(estado=EstadoSolicitud.en_evaluacion, vertical=Vertical.compra, score=None,
             decision=None, nombre="Sandra Milena Torres"),
        dict(estado=EstadoSolicitud.enviada, vertical=Vertical.arriendo, score=None,
             decision=None, nombre="Felipe Castaño"),
    ]

    for idx, ej in enumerate(ejemplos):
        prop = propiedades[idx % len(propiedades)]
        solicitante_ej = Usuario(
            id=uuid.uuid4(), email=f"solicitante{idx+1}@fincaraiz-demo.co",
            password_hash=hash_password("Demo123!"), rol=RolUsuario.solicitante,
            nombre_completo=ej["nombre"], telefono="30012340" + str(idx),
        )
        db.add(solicitante_ej)
        db.flush()

        ingreso = 4_500_000 + idx * 300_000
        cuota = ingreso * (0.28 + idx * 0.05)
        solicitud = Solicitud(
            id=uuid.uuid4(), solicitante_id=solicitante_ej.id, propiedad_id=prop.id,
            inmobiliaria_id=DEFAULT_TENANT_ID,
            # creado_en debe quedar ANTES de evaluado_en (mas abajo, "hoy - idx dias"):
            # de lo contrario el tiempo promedio de evaluacion del dashboard sale negativo.
            creado_en=datetime.now(timezone.utc) - timedelta(days=idx + 2),
            vertical=ej["vertical"], estado=ej["estado"],
            datos_personales={
                "nombres_apellidos": ej["nombre"],
                "tipo_documento": "Cédula de ciudadanía", "numero_documento": f"10{20000000+idx}",
                "fecha_nacimiento": "1990-05-14", "estado_civil": "Soltero(a)",
                "personas_a_cargo": idx % 3, "telefono": "30012340" + str(idx),
                "email": f"solicitante{idx+1}@fincaraiz-demo.co",
                "direccion_residencia": "Calle 45 # 12-30", "ciudad_residencia": prop.ciudad,
                "tiempo_residencia": "3 años", "es_propietario": idx % 2 == 0,
            },
            datos_laborales={
                "tipo_ocupacion": "indefinido" if idx % 2 == 0 else "independiente",
                "empresa": "Empresa Demo S.A.S." if idx % 2 == 0 else None,
                "cargo": "Analista" if idx % 2 == 0 else None,
                "antiguedad_cargo_meses": 24 + idx * 3, "antiguedad_laboral_anios": 5 + idx,
                "telefono_verificacion": "6011234567",
            },
            datos_financieros={
                "ingresos_mensuales_fijos": ingreso, "ingresos_variables": 0,
                "gastos_mensuales_fijos": ingreso * 0.2, "tiene_otros_creditos": idx % 3 == 0,
                "tiene_ahorros": idx % 2 == 0, "monto_ahorros": 8_000_000 if idx % 2 == 0 else 0,
                "autorizacion_centrales_riesgo": True,
            },
            garantias_referencias={
                "tiene_codeudor": idx % 2 == 0, "tiene_poliza": ej["vertical"] == Vertical.arriendo,
                "referencia_laboral": {"nombre": "Ref Laboral", "relacion": "Jefe directo", "telefono": "3001112222"},
                "referencia_personal": {"nombre": "Ref Personal", "relacion": "Amigo", "telefono": "3002223333"},
            },
        )
        db.add(solicitud)
        db.flush()

        db.add(DocumentoSolicitud(
            id=uuid.uuid4(), solicitud_id=solicitud.id, tipo_documento="cedula_ciudadania",
            url_archivo=f"/storage/documentos/{solicitud.id}/cedula.pdf", estado=EstadoDocumento.cargado,
        ))
        db.add(DocumentoSolicitud(
            id=uuid.uuid4(), solicitud_id=solicitud.id, tipo_documento="soporte_ingresos",
            url_archivo=f"/storage/documentos/{solicitud.id}/soporte_ingresos.pdf", estado=EstadoDocumento.cargado,
        ))

        if ej["score"] is not None:
            politica = politica_compra if ej["vertical"] == Vertical.compra else politica_arriendo
            evaluacion = Evaluacion(
                id=uuid.uuid4(), solicitud_id=solicitud.id, politica_version_id=politica.id,
                score=ej["score"],
                variables_evaluadas=[
                    {"nombre": "capacidad", "peso": 0.40, "valor_calculado": round(cuota / ingreso, 2),
                     "banda": "media", "puntaje_obtenido": 65},
                    {"nombre": "condiciones", "peso": 0.20, "banda": "alta", "puntaje_obtenido": 100},
                    {"nombre": "caracter", "peso": 0.25, "banda": "alta", "puntaje_obtenido": 100},
                    {"nombre": "garantia", "peso": 0.10, "banda": "media", "puntaje_obtenido": 50},
                    {"nombre": "capital", "peso": 0.05, "banda": "media", "puntaje_obtenido": 50},
                ],
                decision=ej["decision"],
                explicacion_generada=(
                    f"Tu solicitud quedó {ej['decision'].value.replace('_', ' ')}. "
                    "La variable que más influyó fue la relación cuota/ingreso. "
                    "Referencias y garantías estuvieron en banda alta."
                ),
                evaluado_en=datetime.now(timezone.utc) - timedelta(days=idx),
            )
            db.add(evaluacion)
            db.flush()

            if ej["estado"] in (EstadoSolicitud.aprobada, EstadoSolicitud.rechazada) and idx % 2 == 0:
                db.add(DecisionManual(
                    id=uuid.uuid4(), evaluacion_id=evaluacion.id, analista_id=admin.id,
                    decision_final=(
                        DecisionManualEnum.aprobada if ej["decision"] == DecisionEvaluacion.aprobada
                        else DecisionManualEnum.rechazada
                    ),
                    comentario="Revisado manualmente, documentación consistente con lo declarado.",
                ))

    db.commit()
    print("Seed completado.")
    print("  superadmin@fincaraiz-demo.co / SuperAdmin123!")
    print("  admin@fincaraiz-demo.co / Admin123!")
    print("  asesor@fincaraiz-demo.co / Asesor123!")
    print("  solicitante@fincaraiz-demo.co / Demo123!")


def main() -> None:
    db = SessionLocal()
    try:
        run(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
