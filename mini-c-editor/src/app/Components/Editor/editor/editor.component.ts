import {Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConsoleComponent } from '../../Console/console/console.component';
import { FileService,ArchivoProyecto } from '../../../Services/file.service';
import { ParserService } from '../../../Services/parser.service';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [ConsoleComponent, CommonModule, FormsModule],
  templateUrl: './editor.component.html',
  styleUrl: './editor.component.scss'
})
export class EditorComponent implements OnInit, AfterViewInit {

  archivos: ArchivoProyecto[] = [];
  modulos: { nombre: string, archivos: ArchivoProyecto[] }[] = [];
  archivoActual: ArchivoProyecto | null = null;
  contenidoArchivo: string = '';
  salida: string = '';
  errores: string[] = [];
  lines: string[] = ['1'];
  @ViewChild('codeTextArea') codeTextArea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('lineNumbers') lineNumbers!: ElementRef<HTMLDivElement>;

  constructor(
    private fileService: FileService,
    private parserService: ParserService
  ) {}

  ngAfterViewInit(): void {
    this.updateLineNumbers();
  }

  async ngOnInit() {
    await this.cargarArchivosDesdeConfig();
    await this.fileService.seleccionarDirectorio();
  }

  async cargarArchivosDesdeConfig() {
    const config = this.fileService.getConfig();
    if (!config) {
      Swal.fire({
        title: 'Error',
        text: 'No se encontró el archivo de configuración.',
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    this.modulos = [];

    for (const key of Object.keys(config)) {
      if (key === 'nombre_proyecto' || key === 'main') continue;
      const archivosModulo = [];
      const listaArchivos = config[key] || [];
      for (const item of listaArchivos) {
        const [nombreArchivo, nombreRealArchivo] = Object.entries(item)[0] as [string, string];
        const fileHandle = await this.fileService.directorioHandle!.getFileHandle(nombreRealArchivo);
        const file = await fileHandle.getFile();
        const contenido = await this.fileService.leerArchivo(file); 
        archivosModulo.push({ nombre: nombreArchivo, contenido, handler: null });
        this.archivos.push({ nombre: nombreArchivo, contenido, handler: null }); 
      }
      this.modulos.push({ nombre: key, archivos: archivosModulo });
    }
  }

  abrirArchivo(archivo: ArchivoProyecto) {
    this.archivoActual = archivo;
    this.contenidoArchivo = archivo.contenido;
    this.updateLineNumbers();
    this.salida = '';
    this.errores = [];
  }

  guardarArchivo() {
    Swal.fire({
      title: 'Guardar Archivo',
      text: `¿Deseas guardar los cambios en ${this.archivoActual?.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'No, cancelar'
    }).then((result) => {
      if (this.archivoActual) {
        this.archivoActual.contenido = this.contenidoArchivo;
        this.fileService.actualizarArchivo(this.archivoActual);
        Swal.fire('Guardado', 'El archivo ha sido guardado.', 'success');
      }
    });
  }

  async analizar() {
    if (!this.parserService.parserCargado) {
      await this.parserService.cargarParser();
    }
    if (!this.parserService.parserCargado) {
      Swal.fire({
        title: 'Error', 
        text: 'El parser aún no está cargado. Intenta nuevamente.',
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
      return;
    }
    if (!this.contenidoArchivo.trim()) {
      Swal.fire({
        title: 'Error',
        text: 'El contenido del archivo está vacío.',
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
      return;
    }
    const resultado = this.parserService.analizar(this.contenidoArchivo);
    this.salida = resultado.salida;
    this.errores = resultado.errores.map(e => `Error en ${this.archivoActual?.nombre}: ${e}`);
  }

  crearArchivo() {
    const nombre = prompt('Nombre del nuevo archivo (.cmm):', 'nuevo.cmm');
    if (!nombre || !nombre.endsWith('.cmm')) {
      alert('Nombre inválido. Debe terminar en .cmm');
      return;
    }
    if (this.archivos.some(a => a.nombre === nombre)) {
      alert('Ya existe un archivo con ese nombre.');
      return;
    }
    const nuevoArchivo = {
      nombre,
      contenido: '',
      handler: null as any
    };
    this.archivos.push(nuevoArchivo);
    this.abrirArchivo(nuevoArchivo);
  }

  async finalizarModulo(modulo: { nombre: string, archivos: ArchivoProyecto[] }) {
    if (!this.parserService.parserCargado) {
      await this.parserService.cargarParser();
    }

    let salidaModulo = '';
    let erroresModulo: string[] = [];

    for (const archivo of modulo.archivos) {
      const resultado = this.parserService.analizar(archivo.contenido);
      salidaModulo += `📄 ${archivo.nombre}:\n${resultado.salida}\n`;
      const erroresArchivo = resultado.errores.map(e => `Error en ${archivo.nombre}: ${e}`);
      erroresModulo.push(...erroresArchivo);
    }

    this.salida = salidaModulo;
    this.errores = erroresModulo;
  }

  updateLineNumbers() {
    const lineCount = this.contenidoArchivo.split('\n').length;
    this.lines = Array.from({ length: lineCount }, (_, i) => (i + 1).toString());
  }

  syncScroll() {
    const textarea = this.codeTextArea.nativeElement;
    const lineNumbersDiv = this.lineNumbers.nativeElement;
    lineNumbersDiv.scrollTop = textarea.scrollTop;
  }
}

