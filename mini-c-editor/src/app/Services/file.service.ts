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

  constructor() {}

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

  generarConfig(nombreProyecto: string, modulos: { nombre: string; archivos: ArchivoProyecto[] }[]): string {
    const archivosYaml: any = {};
    for (const modulo of modulos) {
      archivosYaml[modulo.nombre] = modulo.archivos.map(archivo => {
        const obj: any = {};
        obj[archivo.nombre.split('.')[0]] = archivo.nombre;
        return obj;
      });
    }

    const config = {
      nombre_proyecto: nombreProyecto,
      main: 'main.cmm',
      ...archivosYaml
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

  async leerArchivosDesdeConfig(config: any): Promise<{ nombre: string; archivos: { archivo: ArchivoProyecto }[] }[]> {
    const modulos: { nombre: string; archivos: { archivo: ArchivoProyecto }[] }[] = [];
  
    if (!this.directorioHandle) {
      throw new Error('No se ha seleccionado un directorio');
    }
  
    const raizArchivos: { archivo: ArchivoProyecto }[] = [];
    const archivosRaiz = ['main.cmm', 'configuracion.yml'];
  
    for (const nombreArchivo of archivosRaiz) {
      try {
        const fileHandle = await this.directorioHandle.getFileHandle(nombreArchivo);
        const file = await fileHandle.getFile();
        const contenido = await this.leerArchivo(file);
  
        raizArchivos.push({
          archivo: {
            nombre: nombreArchivo,
            contenido,
            handler: fileHandle
          }
        });
      } catch (err) {
        console.warn(`Archivo raíz no encontrado: ${nombreArchivo}`);
      }
    }
  
    if (raizArchivos.length > 0) {
      modulos.push({ nombre: 'Principal', archivos: raizArchivos });
    }
  
    for (const key of Object.keys(config)) {
      if (key === 'nombre_proyecto' || key === 'main') continue;
  
      const archivosModulo: { archivo: ArchivoProyecto }[] = [];
  
      for (const archivoDef of config[key]) {
        const nombreArchivo = Object.values(archivoDef)[0] as string;
  
        try {
          const fileHandle = await this.directorioHandle.getFileHandle(nombreArchivo);
          const file = await fileHandle.getFile();
          const contenido = await this.leerArchivo(file);
  
          archivosModulo.push({
            archivo: {
              nombre: nombreArchivo,
              contenido,
              handler: fileHandle
            }
          });
        } catch (err) {
          console.error(`No se pudo cargar el archivo: ${nombreArchivo}`, err);
        }
      }
  
      modulos.push({ nombre: key, archivos: archivosModulo });
    }
  
    return modulos;
  }
  

  async crearModulo(nombreModulo: string): Promise<void> {
    if (!this.directorioHandle) throw new Error('Directorio no seleccionado');

    if (!this.config[nombreModulo]) {
      this.config[nombreModulo] = [];
      await this.actualizarYML();
    }
  }

  async crearArchivoEnModulo(nombreModulo: string, nombreArchivo: string, contenido: string): Promise<void> {
    if (!this.directorioHandle) throw new Error('Directorio no seleccionado');

    const fileHandle = await this.directorioHandle.getFileHandle(nombreArchivo, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(contenido);
    await writable.close();

    const nuevoArchivo = { [nombreArchivo.split('.')[0]]: nombreArchivo };

    this.config[nombreModulo] = this.config[nombreModulo] || [];
    this.config[nombreModulo].push(nuevoArchivo);

    await this.actualizarYML();
  }

  async actualizarYML(): Promise<void> {
    if (!this.directorioHandle) throw new Error('Directorio no seleccionado');

    const configYml = yaml.dump(this.config);
    const fileHandle = await this.directorioHandle.getFileHandle('configuracion.yml', { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(configYml);
    await writable.close();
  }

  async actualizarArchivo(archivo: ArchivoProyecto): Promise<void> {
    if (!archivo.handler) {
      if (!this.directorioHandle) return;
      archivo.handler = await this.directorioHandle.getFileHandle(archivo.nombre, { create: true });
    }

    const writable = await archivo.handler.createWritable();
    await writable.write(archivo.contenido);
    await writable.close();
  }

  async crearNuevoProyecto(nombreProyecto: string): Promise<boolean> {
    try {
      const parentHandle = await (window as any).showDirectoryPicker();
      
      this.directorioHandle = await parentHandle.getDirectoryHandle(nombreProyecto, { create: true });
      
      const configInicial = {
        nombre_proyecto: nombreProyecto,
        main: "main.cmm"
      };
      
      const configYmlHandle = await this.directorioHandle?.getFileHandle('configuracion.yml', { create: true });
      const configWritable = await configYmlHandle?.createWritable();
      await configWritable?.write(yaml.dump(configInicial));
      await configWritable?.close();
      
      const mainHandle = await this.directorioHandle?.getFileHandle('main.cmm', { create: true });
      const mainWritable = await mainHandle?.createWritable();
      const contenidoInicial = 'void main(){\n print("Hola Mundo");\n}';
      await mainWritable?.write(contenidoInicial);
      await mainWritable?.close();
      
      this.config = configInicial;
      
      return true;
    } catch (error) {
      console.error('Error al crear el proyecto:', error);
      return false;
    }
  }
}