import os

def mostrar_arbol(ruta, prefijo=""):
    """
    Genera una representación visual en árbol de la ruta especificada.
    """
    if not os.path.exists(ruta):
        print(f"La ruta {ruta} no existe.")
        return

    # Obtener contenido y filtrar para ignorar carpetas ocultas si se desea (ej. .git)
    contenido = sorted(os.listdir(ruta))
    filtros_ignorar = {'.git', '__pycache__', 'node_modules'}
    contenido = [item for item in contenido if item not in filtros_ignorar]

    for i, item in enumerate(contenido):
        ruta_completa = os.path.join(ruta, item)
        es_ultimo = (i == len(contenido) - 1)
        
        # Carácter de ramificación
        conector = "└── " if es_ultimo else "├── "
        print(f"{prefijo}{conector}{item}")

        # Si es un directorio, llamar recursivamente
        if os.path.isdir(ruta_completa):
            nuevo_prefijo = prefijo + ("    " if es_ultimo else "│   ")
            mostrar_arbol(ruta_completa, nuevo_prefijo)

if __name__ == "__main__":
    directorio = r"C:\adsiweb"
    print(f"ESTRUCTURA DE INFRAESTRUCTURA: {directorio}")
    print(".")
    mostrar_arbol(directorio)