import { Injectable } from '@angular/core';
import * as yaml from 'js-yaml';

export interface ArchivoProyecto {
  nombre: string;
  contenido: string;
  handler: FileSystemFileHandle;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {

  config: any = null;
  directorioHandle: FileSystemDirectoryHandle | null = null;

  constructor() { }

  leerArchivo(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  async cargarConfig(file: File): Promise<any> {
    const content = await file.text();
    this.config = yaml.load(content);
    return this.config;
  }

  generarConfig(nombreProyecto: string, archivos: any): string {
    const config = {
      nombre_proyecto: nombreProyecto,
      main: 'main.cmm',
      ...archivos
    };
    return yaml.dump(config);
  }

  descargarArchivo(nombre: string, contenido: string) {
    const blob = new Blob([contenido], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nombre;
    link.click();
  }

  getConfig(): any {
    return this.config;
  }

  async seleccionarDirectorio(): Promise<FileSystemDirectoryHandle | null> {
    try {
      const handle = await (window as any).showDirectoryPicker();
      this.directorioHandle = handle;
      return handle;
    } catch (error) {
      console.error('Directorio no seleccionado', error);
      return null;
    }
  }

  async leerArchivosDesdeConfig(config: any): Promise<ArchivoProyecto[]> {
    const archivos: ArchivoProyecto[] = [];
    if (!this.directorioHandle) return [];

    for (const key in config) {
      if (key !== 'nombre_proyecto' && key !== 'main') {
        const modulo = config[key];
        for (const archivoItem of modulo) {
          const nombreArchivo = Object.values(archivoItem)[0] as string;

          try {
            const fileHandle = await this.directorioHandle.getFileHandle(nombreArchivo);
            const file = await fileHandle.getFile();
            const contenido = await file.text();

            archivos.push({
              nombre: nombreArchivo,
              contenido,
              handler: fileHandle
            });
          } catch (error) {
            console.warn(`No se pudo cargar el archivo: ${nombreArchivo}`, error);
          }
        }
      }
    }

    return archivos;
  }
}