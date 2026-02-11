import os

def listar_archivos_infraestructura(ruta):
    """
    Lee el contenido de una ruta y devuelve una lista con los nombres 
    de los archivos, excluyendo directorios.
    """
    try:
        # Verificamos si la ruta existe
        if not os.path.exists(ruta):
            return f"Error: La ruta '{ruta}' no existe."

        # Obtenemos el contenido del directorio
        contenido = os.listdir(ruta)
        
        # Filtramos para obtener solo archivos (no carpetas)
        archivos = [f for f in contenido if os.path.isfile(os.path.join(ruta, f))]
        
        return archivos

    except PermissionError:
        return "Error: Permisos insuficientes para acceder a la carpeta."
    except Exception as e:
        return f"Ocurrió un error inesperado: {e}"

if __name__ == "__main__":
    # Definimos la ruta de la infraestructura
    directorio_objetivo = r"C:\adsiweb"
    
    lista = listar_archivos_infraestructura(directorio_objetivo)
    
    if isinstance(lista, list):
        print(f"--- Infraestructura encontrada en {directorio_objetivo} ---")
        if not lista:
            print("No se encontraron archivos en esta carpeta.")
        for nombre in lista:
            print(f"Archivo: {nombre}")
    else:
        print(lista)