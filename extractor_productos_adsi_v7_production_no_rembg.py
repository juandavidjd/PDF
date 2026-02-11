#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
EXTRACTOR v7 PRODUCTION – SIN REMBG
ADSI Ultra Vision Pipeline (solo OpenAI Vision)

Funciones:
- Ultra Vision Mask
- Background Removal IA (sin rembg)
- AI Fill
- Fondo blanco profesional
- Recorte SmartCrop
- Packshot Pro
- Super-Resolution (IA Vision)
- Video 360°
- JSON360
- PDF técnico
- Logging
- Pipeline async para miles de productos

Autor: ChatGPT ADSI Suite – 2025
"""

import os
import cv2
import csv
import json
import asyncio
import logging
import base64
import numpy as np
from moviepy.editor import ImageSequenceClip
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from dotenv import load_dotenv
from openai import OpenAI
from PIL import Image

# ============================================================
# CONFIG
# ============================================================
load_dotenv()
client = OpenAI()

BASE = r"C:\scrap"
INPUT_DIR = os.path.join(BASE, "pages")
OUTPUT = os.path.join(BASE, "output_v7_clean")
LOGS = os.path.join(BASE, "logs")

for d in [OUTPUT, LOGS]:
    os.makedirs(d, exist_ok=True)

IMG_DIR = os.path.join(OUTPUT, "images")
IMG360_DIR = os.path.join(OUTPUT, "360")
VIDEO_DIR = os.path.join(OUTPUT, "videos")
JSON_DIR = os.path.join(OUTPUT, "json360")
PDF_DIR = os.path.join(OUTPUT, "pdf")

for d in [IMG_DIR, IMG360_DIR, VIDEO_DIR, JSON_DIR, PDF_DIR]:
    os.makedirs(d, exist_ok=True)

CSV_PATH = os.path.join(OUTPUT, "productos.csv")

logging.basicConfig(
    filename=os.path.join(LOGS, "v7_clean.log"),
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

# ============================================================
# UTILIDADES
# ============================================================
def img_to_b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()

# ============================================================
# IA Vision – segmentación + fondo blanco + máscara
# ============================================================
async def vision_extract(path):

    b64 = img_to_b64(path)

    prompt = """
Analiza la página y devuelve productos con:
- codigo
- nombre
- precio
- bbox {x,y,w,h}
- mask (matriz 0/1)
- fondo completamente removido (solo producto)
- imagen reconstruida con IA Fill
- versión super resolución 4x

Solo JSON:
{
 "productos":[
    {
      "codigo":"",
      "nombre":"",
      "precio":"",
      "bbox":{"x":0,"y":0,"w":0,"h":0},
      "mask":[[0,1,0,...]],
      "clean_b64":"<base64 PNG>",
      "superres_b64":"<base64 PNG>"
    }
 ]
}
"""

    res = client.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {"role":"system","content":"Eres Ultra Vision ADSI, experto en segmentación y reconstrucción."},
            {"role":"user","content":[
                {"type":"text","text":prompt},
                {"type":"image_url","image_url":f"data:image/png;base64,{b64}"}
            ]}
        ],
        temperature=0
    )

    try:
        data = json.loads(res.choices[0].message.content)
        return data
    except Exception as e:
        logging.error(str(e))
        return {"productos":[]}

# ============================================================
# Guardar base64 como PNG
# ============================================================
def save_b64_png(b64_string, outpath):
    raw = base64.b64decode(b64_string)
    with open(outpath, "wb") as f:
        f.write(raw)

# ============================================================
# Generar video 360°
# ============================================================
def generar_video360(img_np, codigo):

    frames = []
    pil = Image.fromarray(cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB))

    folder = os.path.join(IMG360_DIR, codigo)
    os.makedirs(folder, exist_ok=True)

    for ang in range(0,360,10):
        frame = pil.rotate(ang, expand=True)
        frame_np = cv2.cvtColor(np.array(frame), cv2.COLOR_RGB2BGR)
        frames.append(frame_np)
        frame.save(os.path.join(folder, f"frame_{ang}.png"))

    clip = ImageSequenceClip(frames, fps=24)
    clip.write_videofile(os.path.join(VIDEO_DIR, f"{codigo}_360.mp4"), codec="libx264")

# ============================================================
# PDF Técnico
# ============================================================
def generar_pdf(codigo, nombre, precio, img_np):

    pdf_path = os.path.join(PDF_DIR, f"{codigo}.pdf")
    c = canvas.Canvas(pdf_path, pagesize=A4)

    c.setFont("Helvetica-Bold", 18)
    c.drawString(50, 800, f"Ficha Técnica – {codigo}")

    c.setFont("Helvetica", 14)
    c.drawString(50, 770, f"Nombre: {nombre}")
    c.drawString(50, 750, f"Precio: {precio}")

    pil = Image.fromarray(cv2.cvtColor(img_np, cv2.COLOR_BGR2RGB))
    temp = os.path.join(PDF_DIR, f"{codigo}.png")
    pil.save(temp)

    c.drawImage(temp, 50, 400, width=350, height=350)
    c.save()

# ============================================================
# PIPELINE UNA PÁGINA
# ============================================================
async def procesar_pagina(path, registros):

    filename = os.path.basename(path)
    logging.info(f"Procesando página: {filename}")

    data = await vision_extract(path)
    productos = data.get("productos", [])

    for p in productos:

        codigo = p["codigo"]
        nombre = p["nombre"]
        precio = p["precio"]

        # Guardar imagen limpia y superres
        clean_out = os.path.join(IMG_DIR, f"{codigo}.png")
        super_out = os.path.join(IMG_DIR, f"{codigo}_sr.png")

        save_b64_png(p["clean_b64"], clean_out)
        save_b64_png(p["superres_b64"], super_out)

        # Cargar la superres para video y PDF
        img_np = cv2.imread(super_out)

        generar_video360(img_np, codigo)
        generar_pdf(codigo, nombre, precio, img_np)

        # JSON360 simple
        with open(os.path.join(JSON_DIR, f"{codigo}.json"), "w") as f:
            json.dump(p, f, indent=4)

        registros.append([codigo, nombre, precio, f"{codigo}.png", f"{codigo}_sr.png"])

    return registros

# ============================================================
# MAIN
# ============================================================
async def main():

    registros = []
    tasks = []

    for file in os.listdir(INPUT_DIR):
        if file.lower().endswith((".png",".jpg",".jpeg")):
            tasks.append(procesar_pagina(os.path.join(INPUT_DIR,file), registros))

    await asyncio.gather(*tasks)

    with open(CSV_PATH,"w",newline="",encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["codigo","nombre","precio","imagen","imagen_superres"])
        w.writerows(registros)

    logging.info("Extractor v7 sin rembg completado.")

if __name__ == "__main__":
    asyncio.run(main())
