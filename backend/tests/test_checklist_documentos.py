from app.services.checklist_documentos import documentos_requeridos


def test_empleado_indefinido_requiere_desprendibles():
    requeridos = documentos_requeridos({"tipo_ocupacion": "indefinido"}, {}, "compra")
    assert "desprendibles_pago_o_certificacion_laboral" in requeridos
    assert "extractos_bancarios_3_meses" not in requeridos


def test_independiente_requiere_extractos_rut_y_declaracion_renta():
    requeridos = documentos_requeridos({"tipo_ocupacion": "independiente"}, {}, "arriendo")
    assert set(["extractos_bancarios_3_meses", "rut", "declaracion_renta"]).issubset(requeridos)


def test_pensionado_requiere_certificado_pension():
    requeridos = documentos_requeridos({"tipo_ocupacion": "pensionado"}, {}, "arriendo")
    assert "certificado_pension_vigente" in requeridos


def test_con_codeudor_agrega_documentos_del_codeudor():
    requeridos = documentos_requeridos({"tipo_ocupacion": "indefinido"}, {"tiene_codeudor": True}, "compra")
    assert "cedula_codeudor" in requeridos
    assert "soporte_ingresos_codeudor" in requeridos


def test_compra_requiere_certificado_tradicion_libertad_y_arriendo_no():
    req_compra = documentos_requeridos({"tipo_ocupacion": "indefinido"}, {}, "compra")
    req_arriendo = documentos_requeridos({"tipo_ocupacion": "indefinido"}, {}, "arriendo")
    assert "certificado_tradicion_libertad" in req_compra
    assert "certificado_tradicion_libertad" not in req_arriendo


def test_cedula_ciudadania_siempre_requerida():
    assert "cedula_ciudadania" in documentos_requeridos({}, {}, "arriendo")
