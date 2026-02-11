#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
===============================================================================
 PASO 8 — Lovely Installer v1
 SRM–QK–ADSI · Ecosistema SRM–ADSI · Installer para lovable.dev
===============================================================================

Este script construye un JSON instalador para Lovely.dev con:

- Metadatos del ecosistema SRM–QK–ADSI
- Referencias al modelo maestro lovely_model_srm_v1.json
- Rutas relativas por cliente a:
    - CSV de Shopify
    - JSON 360°
    - JSON rico
    - productos.json

Salida principal:
    C:/SRM_ADSI/10_deploy/installers/lovely_installer_v1.json
===============================================================================
"""

import os
import json
from datetime import datetime

BASE_ROOT = r"C:\SRM_ADSI"

# Carpetas clave
DIR_MODELS     = os.path.join(BASE_ROOT, "08_lovely_models")
DIR_SHOPIFY    = os.path.join(BASE_ROOT, "06_shopify")
DIR_JSON_360   = os.path.join(BASE_ROOT, "07_json_360")
DIR_DEPLOY     = os.path.join(BASE_ROOT, "10_deploy")
DIR_INSTALLERS = os.path.join(DIR_DEPLOY, "installers")

# Archivo modelo maestro
MASTER_MODEL_FILE = os.path.join(DIR_MODELS, "lovely_model_srm_v1.json")

# Salida instalador
INSTALLER_OUT = os.path.join(DIR_INSTALLERS, "lovely_installer_v1.json")

CLIENTES = [
    "Bara",
    "DFG",
    "Duna",
    "Japan",
    "Kaiqi",
    "Leo",
    "Store",
    "Vaisand",
    "Yokomar",
]


def load_master_model():
    """
    Carga lovely_model_srm_v1.json si existe.
    Si no existe, devuelve un stub mínimo.
    """
    if os.path.exists(MASTER_MODEL_FILE):
        try:
            with open(MASTER_MODEL_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            print(f"✔ Modelo maestro encontrado: {MASTER_MODEL_FILE}")
            return data
        except Exception as e:
            print(f"⚠ No se pudo leer lovely_model_srm_v1.json: {e}")
    else:
        print(f"⚠ No se encontró lovely_model_srm_v1.json en {DIR_MODELS}")

    # Stub mínimo
    print("→ Usando stub mínimo para modelo maestro.")
    return {
        "model_name": "SRM-ADSI Base Stub",
        "version": "1.0.0",
        "description": "Stub mínimo usado porque lovely_model_srm_v1.json no está disponible.",
        "ui_blocks": [],
        "routes": [],
    }


def rel(path):
    """
    Convierte ruta absoluta a relativa respecto a BASE_ROOT,
    para que Lovely.dev pueda importar por rutas lógicas de proyecto.
    """
    try:
        return os.path.relpath(path, BASE_ROOT).replace("\\", "/")
    except Exception:
        return path


def build_client_entry(cliente):
    """
    Construye la sección de configuración para un cliente específico.
    No falla si algo no existe: deja flags de existencia y rutas relativas.
    """
    # Shopify CSV
    shopify_csv = os.path.join(DIR_SHOPIFY, cliente, "shopify_import.csv")

    # JSONs 360 / rico / productos
    json_dir = os.path.join(DIR_JSON_360, cliente)
    json_360      = os.path.join(json_dir, "catalogo_360.json")
    json_rico     = os.path.join(json_dir, "catalogo_rico.json")
    json_prod     = os.path.join(json_dir, "productos.json")

    return {
        "cliente": cliente,
        "paths": {
            "shopify_import_csv": {
                "path": rel(shopify_csv),
                "exists": os.path.exists(shopify_csv),
            },
            "json_360": {
                "path": rel(json_360),
                "exists": os.path.exists(json_360),
            },
            "json_rico": {
                "path": rel(json_rico),
                "exists": os.path.exists(json_rico),
            },
            "json_productos": {
                "path": rel(json_prod),
                "exists": os.path.exists(json_prod),
            },
        },
        # Campos pensados para ser llenados a mano o por otro proceso:
        "lovely_config": {
            "project_name": f"SRM–ADSI · {cliente}",
            "shopify_domain": "",
            "shopify_api_key": "",
            "shopify_api_secret": "",
            "notes": f"Configurar credenciales y conexiones específicas para el cliente {cliente}."
        }
    }


def build_installer_payload():
    """
    Construye el payload completo del instalador.
    """
    master_model = load_master_model()

    clientes_cfg = [build_client_entry(c) for c in CLIENTES]

    payload = {
        "installer_name": "SRM–QK–ADSI Lovely Installer v1",
        "version": "1.0.0",
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "base_root": BASE_ROOT.replace("\\", "/"),
        "description": (
            "Instalador maestro para conectar el ecosistema SRM–QK–ADSI "
            "con Lovely.dev (lovable.dev), usando modelos UI preconfigurados "
            "y catálogos 360° por cliente."
        ),
        "master_model": {
            "path": rel(MASTER_MODEL_FILE),
            "exists": os.path.exists(MASTER_MODEL_FILE),
            "data_preview": {
                "model_name": master_model.get("model_name", "SRM-ADSI"),
                "version": master_model.get("version", "1.0.0"),
                "description": master_model.get("description", "")[:300],
            },
        },
        "clientes": clientes_cfg,
        # Campo reservado para futuros conectores (Systeme.io, pasarelas, etc.)
        "integrations": {
            "systeme_io": {
                "enabled": False,
                "notes": "Configurar integraciones y webhooks en una fase posterior."
            },
            "whatsapp": {
                "enabled": False,
                "notes": "Definir números, plantillas y automatizaciones."
            }
        },
    }

    return payload


def ensure_directories():
    """
    Asegura la existencia de las carpetas de deploy e installers.
    """
    os.makedirs(DIR_DEPLOY, exist_ok=True)
    os.makedirs(DIR_INSTALLERS, exist_ok=True)


def main():
    print("\n===================================================")
    print("   PASO 8 — Generando Lovely Installer v1")
    print("===================================================\n")

    ensure_directories()

    payload = build_installer_payload()

    try:
        with open(INSTALLER_OUT, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        print(f"✔ lovely_installer_v1.json generado en:\n   {INSTALLER_OUT}")
    except Exception as e:
        print(f"❌ Error al escribir lovely_installer_v1.json: {e}")
        return

    print("\nResumen:")
    print(f"  - Base root: {BASE_ROOT}")
    print(f"  - Installer: {INSTALLER_OUT}")
    print("  - Clientes incluidos:")
    for c in CLIENTES:
        print(f"    · {c}")

    print("\n===================================================")
    print("   ✅ PASO 8 COMPLETADO — Lovely Installer v1 listo")
    print("===================================================\n")


if __name__ == "__main__":
    main()
