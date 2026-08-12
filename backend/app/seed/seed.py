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
    Propietario,
    Propiedad,
    ImagenPropiedad,
    Proyecto,
    PoliticaCredito,
    Solicitud,
    DocumentoSolicitud,
    Evaluacion,
    DecisionManual,
    Lead,
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
    EstadoLead,
    TipoLead,
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
    # -- ampliacion para dar mas variedad visual al catalogo de 40 propiedades --
    "1502005229762-cf1b2da7c5d6", "1494526585095-c41746248156", "1505843513577-22bb7d21e455",
    "1512918728675-ed5a9ecdebfd", "1523758576459-8ba22e6b8b90", "1531835551805-16d864c8d311",
    "1554995207-c18c203602cb", "1560184897-ae75f418493e", "1570129477492-45c003edd2be",
    "1576941089067-2de3c901e126", "1583608205776-bfd35f0d9f83", "1600566753086-00f18fb6b3ea",
    "1600607688969-a5bfcd646154", "1605276374104-dee2a0ed3cd6", "1613490493576-7fde63acd811",
]


def img_url(seed_id: str, w: int = 1200, h: int = 800) -> str:
    return f"https://images.unsplash.com/photo-{seed_id}?w={w}&h={h}&fit=crop"


PROYECTO_UNSPLASH_IDS = [
    "1600585154526-990dced4db0d", "1600566752355-35792bedcfea", "1600607687920-4e2a09cf159d",
    "1512917774080-9991f1c4c750", "1523192193543-6e7296d960e4", "1580587771525-78b9dba3b914",
    "1494526585095-c41746248156", "1554995207-c18c203602cb",
]


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
        Anunciante(id=uuid.uuid4(), tipo=TipoAnunciante.inmobiliaria, nombre="Inmobiliaria Elite",
                   telefono_contacto="6017778899", email="contacto@inmobiliariaelite.co", inmobiliaria_id=DEFAULT_TENANT_ID),
        Anunciante(id=uuid.uuid4(), tipo=TipoAnunciante.constructora, nombre="Constructora Andes",
                   telefono_contacto="6044456789", email="ventas@constructoraandes.co", inmobiliaria_id=DEFAULT_TENANT_ID),
        Anunciante(id=uuid.uuid4(), tipo=TipoAnunciante.inmobiliaria, nombre="Grupo Valor",
                   telefono_contacto="6076543210", email="info@grupovalor.co", inmobiliaria_id=DEFAULT_TENANT_ID),
        Anunciante(id=uuid.uuid4(), tipo=TipoAnunciante.inmobiliaria, nombre="Finca Raíz Premium",
                   telefono_contacto="6018889900", email="contacto@fincaraizpremium.co", inmobiliaria_id=DEFAULT_TENANT_ID),
    ]
    db.add_all(anunciantes)
    db.flush()

    # --- propietarios (F2-B3: propietarios del inmueble, con scoring de riesgo) ---
    from motor_decision.robusto import OWNER_COMPS, nivel_riesgo, score_componentes

    propietarios_datos = [
        ("Jorge Iván Salazar", "CC", "79.845.212", "jorge.salazar@gmail.com", "3101234567", "Bogotá",
         {"titularidad": 95, "juridica": 90, "documentacion": 88, "identidad": 100, "fraude": 95, "historial": 80, "cumplimiento": 90}),
        ("Constructora Prisma S.A.S.", "NIT", "900.123.456-7", "legal@prisma.co", "6042345678", "Medellín",
         {"titularidad": 90, "juridica": 85, "documentacion": 92, "identidad": 100, "fraude": 90, "historial": 70, "cumplimiento": 95}),
        ("María Fernanda Osorio", "CC", "43.556.789", "mfosorio@gmail.com", "3151112233", "Cali",
         {"titularidad": 70, "juridica": 65, "documentacion": 60, "identidad": 85, "fraude": 75, "historial": 50, "cumplimiento": 60}),
        ("Habitat Inmobiliaria", "NIT", "901.234.567-1", "contacto@habitatinmobiliaria.co", "6013456789", "Bogotá",
         {"titularidad": 85, "juridica": 88, "documentacion": 80, "identidad": 95, "fraude": 88, "historial": 75, "cumplimiento": 85}),
        ("Luis Alberto Peña", "CC", "10.234.567", "luis.pena@hotmail.com", "3009998877", "Barranquilla",
         {"titularidad": 45, "juridica": 40, "documentacion": 35, "identidad": 60, "fraude": 50, "historial": 30, "cumplimiento": 40}),
        ("Ana Milena Ríos", "CE", "E-1234567", "ana.rios@outlook.com", "3187654321", "Cartagena",
         {"titularidad": 60, "juridica": 55, "documentacion": 58, "identidad": 70, "fraude": 65, "historial": 40, "cumplimiento": 55}),
        ("Zona Urbana Propiedades", "NIT", "900.876.543-2", "info@zonaurbana.co", "6053456123", "Cali",
         {"titularidad": 92, "juridica": 90, "documentacion": 85, "identidad": 100, "fraude": 92, "historial": 85, "cumplimiento": 90}),
        ("Carlos Eduardo Mejía", "PA", "AB1234567", "carlos.mejia@yahoo.com", "3126665544", "Medellín",
         {"titularidad": 25, "juridica": 20, "documentacion": 30, "identidad": 40, "fraude": 20, "historial": 15, "cumplimiento": 25}),
        ("Inmobiliaria Elite", "NIT", "901.345.678-2", "contacto@inmobiliariaelite.co", "6017778899", "Bogotá",
         {"titularidad": 93, "juridica": 91, "documentacion": 90, "identidad": 100, "fraude": 94, "historial": 88, "cumplimiento": 92}),
        ("Constructora Andes", "NIT", "900.456.789-3", "ventas@constructoraandes.co", "6044456789", "Medellín",
         {"titularidad": 88, "juridica": 84, "documentacion": 86, "identidad": 100, "fraude": 85, "historial": 78, "cumplimiento": 87}),
        ("Grupo Valor", "NIT", "901.567.890-4", "info@grupovalor.co", "6076543210", "Barranquilla",
         {"titularidad": 72, "juridica": 68, "documentacion": 70, "identidad": 90, "fraude": 74, "historial": 60, "cumplimiento": 65}),
        ("Finca Raíz Premium", "NIT", "900.678.901-5", "contacto@fincaraizpremium.co", "6018889900", "Bogotá",
         {"titularidad": 80, "juridica": 78, "documentacion": 75, "identidad": 95, "fraude": 82, "historial": 70, "cumplimiento": 76}),
        ("Ricardo Alfonso Vargas", "CC", "80.123.456", "ricardo.vargas@gmail.com", "3112223344", "Bucaramanga",
         {"titularidad": 65, "juridica": 60, "documentacion": 62, "identidad": 80, "fraude": 68, "historial": 55, "cumplimiento": 58}),
        ("Diana Carolina Muñoz", "CC", "52.987.654", "diana.munoz@hotmail.com", "3145556677", "Santa Marta",
         {"titularidad": 55, "juridica": 50, "documentacion": 48, "identidad": 70, "fraude": 60, "historial": 42, "cumplimiento": 50}),
        ("Fernando José Castro", "CC", "91.234.567", "fernando.castro@yahoo.com", "3167778899", "Pereira",
         {"titularidad": 40, "juridica": 35, "documentacion": 38, "identidad": 55, "fraude": 45, "historial": 28, "cumplimiento": 33}),
        ("Patricia Elena Gómez", "CC", "41.876.543", "patricia.gomez@gmail.com", "3178889900", "Manizales",
         {"titularidad": 78, "juridica": 75, "documentacion": 72, "identidad": 92, "fraude": 80, "historial": 65, "cumplimiento": 74}),
        ("Sandra Milena Herrera", "CE", "E-2345678", "sandra.herrera@outlook.com", "3189990011", "Bogotá",
         {"titularidad": 30, "juridica": 28, "documentacion": 25, "identidad": 45, "fraude": 35, "historial": 20, "cumplimiento": 30}),
        ("Julián Andrés Restrepo", "CC", "71.345.678", "julian.restrepo@gmail.com", "3201112233", "Medellín",
         {"titularidad": 98, "juridica": 95, "documentacion": 96, "identidad": 100, "fraude": 97, "historial": 90, "cumplimiento": 95}),
        ("Camila Andrea Torres", "CC", "63.456.789", "camila.torres@hotmail.com", "3212223344", "Cali",
         {"titularidad": 50, "juridica": 45, "documentacion": 47, "identidad": 65, "fraude": 55, "historial": 38, "cumplimiento": 44}),
        ("Grupo Habitar S.A.S.", "NIT", "901.789.012-6", "info@grupohabitar.co", "6053334455", "Cartagena",
         {"titularidad": 85, "juridica": 82, "documentacion": 80, "identidad": 98, "fraude": 86, "historial": 72, "cumplimiento": 80}),
    ]
    propietarios = []
    for nombre, tipo_doc, documento, email, telefono, ciudad, componentes in propietarios_datos:
        score = score_componentes(componentes, OWNER_COMPS)
        propietarios.append(Propietario(
            id=uuid.uuid4(), inmobiliaria_id=DEFAULT_TENANT_ID, nombre=nombre, tipo_documento=tipo_doc,
            documento=documento, email=email, telefono=telefono, ciudad=ciudad,
            componentes_riesgo=componentes, score_riesgo=score, nivel_riesgo=nivel_riesgo(score),
        ))
    db.add_all(propietarios)
    db.flush()

    # --- propiedades ---
    ciudades = [
        ("Bogotá", ["Chapinero", "Usaquén", "Suba", "Chicó"]),
        ("Medellín", ["El Poblado", "Laureles", "Envigado"]),
        ("Cali", ["Ciudad Jardín", "Granada"]),
        ("Barranquilla", ["El Prado", "Alto Prado"]),
        ("Cartagena", ["Bocagrande", "Manga"]),
        ("Bucaramanga", ["Cabecera", "Cañaveral"]),
        ("Santa Marta", ["El Rodadero", "Bello Horizonte"]),
        ("Pereira", ["Pinares", "Circunvalar"]),
        ("Manizales", ["Palermo", "Cable"]),
    ]
    # Ciclo ponderado: apartamento/casa siguen siendo los mas comunes, pero oficina, local,
    # lote y bodega aparecen con mas frecuencia que en el seed original (donde bodega/lote
    # ni siquiera existian).
    tipos_ciclo = [
        TipoPropiedad.apartamento, TipoPropiedad.casa, TipoPropiedad.apartamento, TipoPropiedad.oficina,
        TipoPropiedad.apartaestudio, TipoPropiedad.local, TipoPropiedad.casa, TipoPropiedad.bodega,
        TipoPropiedad.apartamento, TipoPropiedad.lote, TipoPropiedad.oficina, TipoPropiedad.casa,
        TipoPropiedad.apartaestudio, TipoPropiedad.bodega,
    ]
    caracteristicas = [
        "piscina", "gimnasio", "terraza panorámica", "chimenea", "zona de BBQ",
        "seguridad 24/7 con circuito cerrado", "jardín privado", "walk-in closet",
        "cocina integral tipo isla", "balcón con vista a la ciudad", "salón social",
        "cancha múltiple", "aires acondicionados en todas las habitaciones",
        "domótica integrada", "vista panorámica a las montañas", "cuarto útil",
        "sistema de paneles solares", "acceso controlado con portería", "estudio independiente",
        "zonas verdes comunes",
    ]

    propiedades = []
    for i in range(40):
        ciudad, barrios = ciudades[i % len(ciudades)]
        barrio = barrios[i % len(barrios)]
        tipo = tipos_ciclo[i % len(tipos_ciclo)]
        operacion = OperacionPropiedad.venta if i % 3 != 0 else OperacionPropiedad.arriendo

        # Areas por tipo: apartaestudio compacto, casas campestres/bodegas amplias, resto general.
        if tipo == TipoPropiedad.apartaestudio:
            area = 30 + (i * 3) % 25  # 30 - 55 m2
        elif tipo in (TipoPropiedad.bodega, TipoPropiedad.lote):
            area = 200 + (i * 23) % 300  # 200 - 500 m2
        elif tipo == TipoPropiedad.casa and i % 4 == 0:
            area = 220 + (i * 11) % 280  # casas campestres amplias
        else:
            area = 45 + (i * 13) % 175  # 45 - 220 m2
        area = min(area, 500)

        habitaciones = 0 if tipo in (TipoPropiedad.lote, TipoPropiedad.bodega, TipoPropiedad.oficina, TipoPropiedad.local) else 1 + (i % 5)
        estrato = 1 + (i % 6)

        if operacion == OperacionPropiedad.venta:
            precio = float(85_000_000 + (i * 53_000_000) % 1_115_000_000)
        else:
            precio = float(800_000 + (i * 730_000) % 11_200_000)

        feat_a = caracteristicas[i % len(caracteristicas)]
        feat_b = caracteristicas[(i * 5 + 3) % len(caracteristicas)]

        prop = Propiedad(
            id=uuid.uuid4(),
            titulo=f"{tipo.value.capitalize()} en {barrio}, {ciudad}",
            descripcion=(
                f"{tipo.value.capitalize()} de {area} m² ubicado en {barrio}, {ciudad}, con {feat_a} "
                f"y {feat_b}. Excelente iluminación natural, acabados de alta calidad, cerca a zonas "
                "comerciales y transporte público. Ideal para "
                + ("empresas y emprendedores." if tipo in (TipoPropiedad.oficina, TipoPropiedad.local, TipoPropiedad.bodega)
                   else "inversión y desarrollo." if tipo == TipoPropiedad.lote
                   else "familias o profesionales.")
            ),
            tipo=tipo,
            operacion=operacion,
            precio=precio,
            valor_admin=float(150_000 + (i * 15_000) % 400_000) if tipo == TipoPropiedad.apartamento else None,
            area_m2=float(area),
            habitaciones=habitaciones,
            banos=max(1, habitaciones - 1) if habitaciones else (1 if tipo in (TipoPropiedad.oficina, TipoPropiedad.local) else 0),
            parqueaderos=i % 4,
            ciudad=ciudad,
            zona=barrio,
            barrio=barrio,
            direccion=f"Calle {10 + i} # {20 + i}-{30 + i}",
            estrato=estrato,
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

    # --- proyectos (nuevos desarrollos, no son unidades individuales) ---
    proyectos_datos = [
        dict(
            nombre="Torres del Parque Central", constructora="Constructora Andes",
            ciudad="Bogotá", zona="Chapinero", tipo=TipoPropiedad.apartamento,
            precio_desde=380_000_000, precio_hasta=720_000_000, area_desde=52, area_hasta=110,
            habitaciones_desde=1, habitaciones_hasta=3, fecha_entrega="Q2 2027", estado="preventa",
            descripcion=(
                "Desarrollo de torres residenciales en el corazón de Chapinero, con vista panorámica "
                "a los cerros orientales y acceso directo a las principales vías de la ciudad."
            ),
            amenidades=["Piscina", "Gimnasio", "Zonas verdes", "Parqueadero cubierto", "Salón comunal", "Juegos infantiles"],
            financiacion_directa=True, subsidio_aplicable=False,
        ),
        dict(
            nombre="Reserva del Bosque", constructora="Constructora Andes",
            ciudad="Medellín", zona="El Poblado", tipo=TipoPropiedad.casa,
            precio_desde=850_000_000, precio_hasta=1_200_000_000, area_desde=220, area_hasta=380,
            habitaciones_desde=3, habitaciones_hasta=5, fecha_entrega="Q4 2027", estado="preventa",
            descripcion=(
                "Conjunto cerrado de casas campestres rodeado de naturaleza en El Poblado, con "
                "senderos ecológicos y diseño arquitectónico contemporáneo."
            ),
            amenidades=["Piscina", "Gimnasio", "Zonas verdes", "Senderos ecológicos", "Salón comunal", "Zona BBQ", "Seguridad 24/7"],
            financiacion_directa=True, subsidio_aplicable=False,
        ),
        dict(
            nombre="Mirador del Caribe", constructora="Habitat Inmobiliaria",
            ciudad="Cartagena", zona="Bocagrande", tipo=TipoPropiedad.apartamento,
            precio_desde=290_000_000, precio_hasta=550_000_000, area_desde=60, area_hasta=130,
            habitaciones_desde=2, habitaciones_hasta=3, fecha_entrega="Inmediata", estado="entrega_inmediata",
            descripcion=(
                "Torre frente al mar en Bocagrande con apartamentos listos para entrega inmediata, "
                "vista panorámica al Caribe y acabados de lujo."
            ),
            amenidades=["Piscina", "Gimnasio", "Terraza panorámica", "Salón social", "Parqueadero cubierto", "Seguridad 24/7"],
            financiacion_directa=False, subsidio_aplicable=False,
        ),
        dict(
            nombre="Cittá Living", constructora="Grupo Valor",
            ciudad="Bogotá", zona="Usaquén", tipo=TipoPropiedad.apartaestudio,
            precio_desde=180_000_000, precio_hasta=280_000_000, area_desde=28, area_hasta=48,
            habitaciones_desde=1, habitaciones_hasta=1, fecha_entrega="Q1 2027", estado="en_construccion",
            descripcion=(
                "Apartaestudios inteligentes en Usaquén, pensados para jóvenes profesionales, "
                "con espacios optimizados y coworking en el primer piso."
            ),
            amenidades=["Gimnasio", "Coworking", "Zona BBQ", "Domótica", "Seguridad 24/7"],
            financiacion_directa=True, subsidio_aplicable=True,
        ),
        dict(
            nombre="Eco Village", constructora="Finca Raíz Premium",
            ciudad="Cali", zona="Ciudad Jardín", tipo=TipoPropiedad.casa,
            precio_desde=650_000_000, precio_hasta=950_000_000, area_desde=180, area_hasta=300,
            habitaciones_desde=3, habitaciones_hasta=4, fecha_entrega="Q3 2028", estado="preventa",
            descripcion=(
                "Proyecto de vivienda sostenible con paneles solares y sistemas de recolección "
                "de aguas lluvias, en una de las zonas más verdes de Cali."
            ),
            amenidades=["Zonas verdes", "Paneles solares", "Piscina", "Salón comunal", "Cancha múltiple", "Juegos infantiles"],
            financiacion_directa=False, subsidio_aplicable=True,
        ),
        dict(
            nombre="Sky Towers", constructora="Inmobiliaria Elite",
            ciudad="Barranquilla", zona="Alto Prado", tipo=TipoPropiedad.apartamento,
            precio_desde=320_000_000, precio_hasta=480_000_000, area_desde=65, area_hasta=105,
            habitaciones_desde=2, habitaciones_hasta=3, fecha_entrega="Q2 2027", estado="en_construccion",
            descripcion=(
                "Torres de altura en Alto Prado con vista a la ciudad, gimnasio panorámico y "
                "terraza con zona social en el último piso."
            ),
            amenidades=["Piscina", "Gimnasio", "Terraza panorámica", "Salón social", "Parqueadero cubierto"],
            financiacion_directa=True, subsidio_aplicable=False,
        ),
        dict(
            nombre="Montaña Viva", constructora="Constructora Andes",
            ciudad="Pereira", zona="Pinares", tipo=TipoPropiedad.casa,
            precio_desde=420_000_000, precio_hasta=680_000_000, area_desde=160, area_hasta=260,
            habitaciones_desde=3, habitaciones_hasta=4, fecha_entrega="Q1 2028", estado="preventa",
            descripcion=(
                "Casas de montaña en Pinares con chimenea, vista panorámica al valle del "
                "Otún y diseño bioclimático."
            ),
            amenidades=["Chimenea", "Zonas verdes", "Senderos ecológicos", "Salón comunal", "Zona BBQ", "Vista panorámica"],
            financiacion_directa=True, subsidio_aplicable=False,
        ),
        dict(
            nombre="Playa Dorada", constructora="Habitat Inmobiliaria",
            ciudad="Santa Marta", zona="El Rodadero", tipo=TipoPropiedad.apartamento,
            precio_desde=250_000_000, precio_hasta=450_000_000, area_desde=55, area_hasta=95,
            habitaciones_desde=1, habitaciones_hasta=3, fecha_entrega="Inmediata", estado="entrega_inmediata",
            descripcion=(
                "Apartamentos frente a la playa en El Rodadero, listos para entrega inmediata, "
                "ideales para vivienda vacacional o renta turística."
            ),
            amenidades=["Piscina", "Terraza panorámica", "Gimnasio", "Salón social", "Seguridad 24/7", "Parqueadero cubierto"],
            financiacion_directa=False, subsidio_aplicable=False,
        ),
    ]
    for idx, pdata in enumerate(proyectos_datos):
        imagenes = [
            img_url(PROYECTO_UNSPLASH_IDS[(idx + k) % len(PROYECTO_UNSPLASH_IDS)])
            for k in range(3)
        ]
        db.add(Proyecto(
            id=uuid.uuid4(), inmobiliaria_id=DEFAULT_TENANT_ID,
            imagen_url=imagenes[0], imagenes=imagenes, activo=True,
            **pdata,
        ))
    db.flush()

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
        # -- ampliacion: mas variedad de estados para que el dashboard y los reportes
        # tengan mas volumen y distribucion realista --
        dict(estado=EstadoSolicitud.con_ruta_alterna, vertical=Vertical.arriendo, score=48.0,
             decision=DecisionEvaluacion.revision_manual, nombre="Mónica Alejandra Rueda"),
        dict(estado=EstadoSolicitud.con_ruta_alterna, vertical=Vertical.compra, score=55.5,
             decision=DecisionEvaluacion.revision_manual, nombre="Camilo Ernesto Duarte"),
        dict(estado=EstadoSolicitud.borrador, vertical=Vertical.compra, score=None,
             decision=None, nombre="Natalia Andrea Prieto"),
        dict(estado=EstadoSolicitud.enviada, vertical=Vertical.compra, score=None,
             decision=None, nombre="Óscar Iván Beltrán"),
        dict(estado=EstadoSolicitud.enviada, vertical=Vertical.arriendo, score=None,
             decision=None, nombre="Valentina Zapata"),
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

    # --- leads de ejemplo (los reales entran por la landing, POST /api/leads) ---
    # Uno queda sin inmobiliaria a proposito: es la bandeja compartida de la plataforma,
    # visible para todos los tenants hasta que alguien lo gestione.
    ahora = datetime.now(timezone.utc)
    db.add_all([
        Lead(
            id=uuid.uuid4(), codigo="LD-A1B2C3D4", inmobiliaria_id=DEFAULT_TENANT_ID,
            tipo=TipoLead.inmobiliaria, nombre="Carolina Restrepo",
            correo="carolina@arrendamientosdelsur.co", telefono="3009998877",
            empresa="Arrendamientos del Sur", ciudad="Cali", inmuebles="101 - 500",
            mensaje="Administramos 300 inmuebles y el estudio nos toma 4 días.",
            origen="landing-inmobiliaria", utm_source="google", utm_campaign="agosto",
            pagina="/landing", estado=EstadoLead.en_gestion, asesor="Pedro Ríos (Asesor comercial)",
            nota="Enviada propuesta comercial, pendiente de respuesta.",
            agendado_en=ahora - timedelta(days=1),
            creado_en=ahora - timedelta(days=3), ultima_gestion=ahora - timedelta(days=1),
        ),
        Lead(
            id=uuid.uuid4(), codigo="LD-B2C3D4E5", inmobiliaria_id=DEFAULT_TENANT_ID,
            tipo=TipoLead.arrendatario, nombre="Andrés Felipe Muñoz",
            correo="af.munoz@correo.com", telefono="3001122334", ciudad="Bogotá",
            interes="Tomar un inmueble en arriendo",
            mensaje="Soy independiente, quiero saber si califico.",
            origen="landing-persona", utm_source="meta", utm_campaign="agosto-arriendo",
            pagina="/landing", estado=EstadoLead.contactado, asesor="Pedro Ríos (Asesor comercial)",
            nota="Se le explicó la ruta con codeudor.",
            creado_en=ahora - timedelta(days=2), ultima_gestion=ahora - timedelta(days=1),
        ),
        Lead(
            id=uuid.uuid4(), codigo="LD-C3D4E5F6", inmobiliaria_id=None,
            tipo=TipoLead.propietario, nombre="Gloria Elena Sáenz",
            correo="gsaenz@correo.com", telefono="3189900112", ciudad="Medellín",
            interes="Poner mi inmueble en arriendo",
            origen="landing-persona", utm_campaign="agosto-arriendo", pagina="/landing",
            estado=EstadoLead.nuevo,
            creado_en=ahora - timedelta(hours=6), ultima_gestion=ahora - timedelta(hours=6),
        ),
    ])

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
