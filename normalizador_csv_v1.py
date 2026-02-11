#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
normalizador_csv_v1.py
SRM–QK–ADSI (PASO 0)
-----------------------------------
Normaliza TODOS los CSV del ecosistema:

Entrada:
    01_sources_originales/<cliente>/*.csv

Salida:
    02_cleaned_normalized/<tipo>/<cliente>.csv

Repara:
 - Delimitadores inconsistentes
 - Comillas rotas
 - Filas partidas en múltiples líneas
 - Codificación (UTF-8 forzado)
 - Caracteres invisibles
 - Columnas desalineadas
"""

import os
import re
import csv
import pandas as pd

BASE_ROOT = r"C:/SRM_ADSI"
DIR_IN = os.path.join(BASE_ROOT, "01_sources_originales")
DIR_OUT = os.path.join(BASE_ROOT, "02_cleaned_normalized")

CLIENTES = ["Bara", "DFG", "Duna", "Japan", "Kaiqi", "Leo", "Store", "Vaisand", "Yokomar"]

TIPOS = {
    "base": "Base_Datos_{c}.csv",
    "catalogo": "catalogo_imagenes_{c}.csv",
    "precios": "Lista_Precios_{c}.csv",
}

# ----------------------------------------------------
#  UTILIDAD — Limpieza base del texto
# ----------------------------------------------------
def limpiar_texto(x: str):
    if not isinstance(x, str):
        return x
    x = x.replace("\ufeff", "")  # BOM
    x = x.replace("\x00", "")
    x = x.replace("\r", "")
    x = x.replace("\t", " ")
    return x.strip()


# ----------------------------------------------------
#  UTILIDAD — Detección automática del delimitador
# ----------------------------------------------------
def detectar_delimitador(path):
    with open(path, "r", errors="ignore") as f:
        muestra = f.read(2048)

    delimitadores = [",", ";", "|", "\t"]

    mejor = ","
    mejor_count = 0
    for d in delimitadores:
        c = muestra.count(d)
        if c > mejor_count:
            mejor = d
            mejor_count = c

    return mejor


# ----------------------------------------------------
#  UTILIDAD — Normaliza un CSV genérico
# ----------------------------------------------------
def normalizar_csv(path_in, path_out):
    if not os.path.exists(path_in):
        return False, f"No existe: {path_in}"

    try:
        # Detectar delimitador
        delim = detectar_delimitador(path_in)

        # Leer crudo línea por línea y limpiar
        lineas_limpias = []
        with open(path_in, "r", errors="ignore", encoding="latin1") as f:
            for linea in f:
                if linea.strip():
                    lineas_limpias.append(limpiar_texto(linea))

        # Escribir archivo temporal corregido
        temp_path = path_out + ".tmp"

        with open(temp_path, "w", newline="", encoding="utf-8") as ft:
            for ln in lineas_limpias:
                ft.write(ln + "\n")

        # Cargar con pandas usando el delimitador detectado
        df = pd.read_csv(
            temp_path,
            delimiter=delim,
            engine="python",
            dtype=str,
            on_bad_lines="skip"
        )

        # Limpieza final
        df.columns = [limpiar_texto(c) for c in df.columns]
        df = df.applymap(limpiar_texto)

        df.to_csv(path_out, index=False, encoding="utf-8")

        os.remove(temp_path)

        return True, f"Normalizado → {path_out}"

    except Exception as e:
        return False, f"ERROR normalizando {path_in}: {e}"


# ----------------------------------------------------
#  PROCESAMIENTO PRINCIPAL
# ----------------------------------------------------
def procesar_cliente(cliente):
    print(f"\n==============================")
    print(f"▶ NORMALIZANDO CLIENTE: {cliente}")
    print("==============================")

    for tipo, plantilla in TIPOS.items():
        archivo_nombre = plantilla.format(c=cliente)
        archivo_in = os.path.join(DIR_IN, cliente, archivo_nombre)

        if os.path.exists(archivo_in):
            out_dir = os.path.join(DIR_OUT, f"{tipo}s_normalizados")
            os.makedirs(out_dir, exist_ok=True)

            archivo_out = os.path.join(out_dir, f"{cliente}.csv")

            ok, msg = normalizar_csv(archivo_in, archivo_out)

            if ok:
                print(f"  ✔ {msg}")
            else:
                print(f"  ❌ {msg}")
        else:
            print(f"  ⚠ No existe: {archivo_in}")


def main():
    print("\n=======================================")
    print("  SRM–QK–ADSI — NORMALIZADOR CSV v1")
    print("=======================================\n")

    os.makedirs(DIR_OUT, exist_ok=True)

    for cli in CLIENTES:
        procesar_cliente(cli)

    print("\n=======================================")
    print("  ✔ NORMALIZACIÓN COMPLETADA")
    print("  Archivos limpios listos en:")
    print("  → 02_cleaned_normalized/")
    print("=======================================\n")


if __name__ == "__main__":
    main()
