#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
run_pipeline_srm_v26.py
Orquestador oficial SRM–QK–ADSI (Producción)
-------------------------------------------------------
Ejecuta en orden:

PASO 0 — normalizador_csv_v1.py
PASO 1 — generar_taxonomia_srm_qk_adsi_v1.py
PASO 2 — extractor_v1.py
PASO 3 — unificador_v1.py
PASO 4 — renombrador_v26.py
PASO 5 — generador_360_v1.py
PASO 6 — compilador_shopify_v1.py
PASO 7 — generador_json_lovely_v1.py
PASO 8 — lovely_installer_v1.py
"""

import subprocess
import os
import time

BASE = r"C:/SRM_ADSI"
PIPELINE_DIR = os.path.join(BASE, "05_pipeline")

STEPS = [
    ("PASO 0 — Normalizador CSV v1", "normalizador_csv_v1.py"),
    ("PASO 1 — Taxonomía SRM-QK-ADSI", "generar_taxonomia_srm_qk_adsi_v1.py"),
    ("PASO 2 — Extractor v1", "extractor_v1.py"),
    ("PASO 3 — Unificador v1", "unificador_v1.py"),
    ("PASO 4 — Renombrador v26", "renombrador_v26.py"),
    ("PASO 5 — Generador 360° v1", "generador_360_v1.py"),
    ("PASO 6 — Compilador Shopify v1", "compilador_shopify_v1.py"),
    ("PASO 7 — Generador JSON Lovely v1", "generador_json_lovely_v1.py"),
    ("PASO 8 — Lovely Installer v1", "lovely_installer_v1.py"),
]


def ejecutar_paso(nombre, script):
    """Ejecuta un paso del pipeline con manejo de errores."""
    print("\n===================================================")
    print(f"▶ {nombre}")
    print("===================================================\n")

    path_script = os.path.join(PIPELINE_DIR, script)

    if not os.path.exists(path_script):
        print(f"❌ ERROR: Script no encontrado → {path_script}")
        return False

    inicio = time.time()

    try:
        subprocess.run(["python", path_script], check=True)
        dur = round(time.time() - inicio, 2)
        print(f"\n✔ OK: {nombre} completado ({dur}s)")
        return True

    except subprocess.CalledProcessError as e:
        dur = round(time.time() - inicio, 2)
        print(f"\n❌ ERROR ejecutando {script} ({dur}s)")
        print("   →", e)
        print("⚠ El pipeline continuará.")
        return False


def resumen_final(resultados):
    print("\n===================================================")
    print("                 RESUMEN FINAL PIPELINE")
    print("===================================================\n")

    for (nombre, _), ok in zip(STEPS, resultados):
        status = "✔ COMPLETADO" if ok else "❌ ERROR"
        print(f"{nombre}: {status}")

    print("\n===================================================")
    print("        🏁 PIPELINE SRM–QK–ADSI v26 FINALIZADO")
    print("===================================================\n")


def main():
    print("\n===================================================")
    print("        🚀 SRM–QK–ADSI PIPELINE ORQUESTADOR v26")
    print("===================================================\n")

    resultados = []

    for nombre, script in STEPS:
        ok = ejecutar_paso(nombre, script)
        resultados.append(ok)

    resumen_final(resultados)


if __name__ == "__main__":
    main()
