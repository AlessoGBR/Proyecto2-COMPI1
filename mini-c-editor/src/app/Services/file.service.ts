import { Injectable } from '@angular/core';
import * as yaml from 'js-yaml';

export interface ArchivoProyecto {
  nombre: string;
  contenido: string;
  handler: FileSystemFileHandle | null;
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

  async leerArchivosDesdeConfig(config: any): Promise<{ nombre: string; archivos: ArchivoProyecto[] }[]> {
    const modulos: { nombre: string; archivos: ArchivoProyecto[] }[] = [];
  
    if (!this.directorioHandle) {
      throw new Error('No se ha seleccionado un directorio');
    }
  
    for (const key of Object.keys(config)) {
      if (key === 'nombre_proyecto' || key === 'main') continue;
  
      const modulo = config[key]; 
      const archivosModulo: ArchivoProyecto[] = [];
  
      for (const archivoDef of modulo) {
        const nombreArchivo = Object.values(archivoDef)[0] as string;
  
        try {
          const fileHandle = await this.directorioHandle.getFileHandle(nombreArchivo);
          const file = await fileHandle.getFile();
          const contenido = await this.leerArchivo(file); 
          archivosModulo.push({
            nombre: nombreArchivo,
            contenido,
            handler: fileHandle
          });
        } catch (err) {
          console.error(`No se pudo cargar el archivo: ${nombreArchivo}`, err);
        }
      }
  
      modulos.push({ nombre: key, archivos: archivosModulo });
    }
  
    return modulos;
  }
  

  async actualizarArchivo(archivo: ArchivoProyecto): Promise<void> {
    if (!this.directorioHandle) return;
    try {
      const fileHandle = await this.directorioHandle.getFileHandle(archivo.nombre, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(archivo.contenido);
      await writable.close();
    } catch (error) {
      console.error('Error al guardar el archivo', error);
    }
  }
}