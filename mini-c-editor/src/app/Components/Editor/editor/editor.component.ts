import {Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConsoleComponent } from '../../Console/console/console.component';
import { FileService,ArchivoProyecto } from '../../../Services/file.service';
import { ParserService } from '../../../Services/parser.service';
import { FormsModule } from '@angular/forms';
import { ExploradorComponent } from '../explorador/explorador.component';
import { TablaSimbolosComponent } from '../../Console/tabla-simbolos/tabla-simbolos.component';
import { ReporteAstComponent } from '../../Console/reporte-ast/reporte-ast.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [ConsoleComponent, CommonModule, FormsModule, ExploradorComponent, TablaSimbolosComponent, ReporteAstComponent],
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
      if (result.isConfirmed) {
        if (this.archivoActual) {
          this.archivoActual.contenido = this.contenidoArchivo;
          this.fileService.actualizarArchivo(this.archivoActual);
          Swal.fire('Guardado', 'El archivo ha sido guardado.', 'success');
        }
      } else {
        Swal.fire('Cancelado', 'Los cambios no se han guardado.', 'info');
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
    
    const { salida, errores } = this.parserService.analizar(this.contenidoArchivo);
    
    this.salida = salida;
    this.errores = errores.map(e => {
      const archivo = this.archivoActual?.nombre || 'código';
      return `Error en ${archivo}: ${e}`;
    });
    
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

