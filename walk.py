import os
from datetime import datetime

def auditar_densidad_web(ruta_base):
    print(f"--- AUDITORÍA DE ESTRUCTURA WEB: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ---")
    print(f"Ruta: {ruta_base}\n")

    if not os.path.exists(ruta_base):
        print(f"Error: No se encuentra la ruta {ruta_base}")
        return

    total_global_archivos = 0
    total_global_carpetas = 0
    resumen_estructural = []

    # Recorrido jerárquico para mapear la arquitectura de adsiweb
    for raiz, carpetas, archivos in os.walk(ruta_base):
        cantidad_archivos = len(archivos)
        total_global_archivos += cantidad_archivos
        total_global_carpetas += 1
        
        # Calcular sangría para visualización de arquitectura de carpetas
        nivel = raiz.replace(ruta_base, '').count(os.sep)
        sangria = ' ' * 4 * nivel
        nombre_carpeta = os.path.basename(raiz) if os.path.basename(raiz) else ruta_base
        
        # Formatear línea de reporte de densidad
        info_linea = f"{sangria}📁 {nombre_carpeta} -> [Archivos: {cantidad_archivos}]"
        print(info_linea)
        resumen_estructural.append(info_linea)

    # Registro oficial para el historial del Ecosistema ADSI
    with open("auditoria_adsiweb_cantidades.txt", "w", encoding="utf-8") as f:
        f.write("REPORTE DE DENSIDAD DE ACTIVOS WEB - ADSI / C:\\adsiweb\n")
        f.write("="*65 + "\n")
        for linea in resumen_estructural:
            f.write(linea + "\n")
        
        f.write("\n" + "="*65 + "\n")
        f.write(f"RESUMEN DE ARQUITECTURA:\n")
        f.write(f"Nodos de directorio revisados: {total_global_carpetas}\n")
        f.write(f"Volumen total de activos (scripts, imágenes, estilos): {total_global_archivos}\n")
        f.write("="*65)

    print(f"\n✅ Auditoría finalizada. Total de activos encontrados: {total_global_archivos}")
    print("Reporte institucional guardado en: auditoria_adsiweb_cantidades.txt")

if __name__ == "__main__":
    # Ruta definida para el desarrollo del sitio web ADSI
    ruta_web = r"C:\adsiweb"
    auditar_densidad_web(ruta_web)