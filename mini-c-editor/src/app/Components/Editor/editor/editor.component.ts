import { Component, OnInit } from '@angular/core';
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
export class EditorComponent implements OnInit {

  archivos: ArchivoProyecto[] = [];
  archivoActual: ArchivoProyecto | null = null;
  contenidoArchivo: string = '';
  salida: string = '';
  errores: string[] = [];

  constructor(
    private fileService: FileService,
    private parserService: ParserService
  ) {}

  async ngOnInit() {
    await this.cargarArchivosDesdeConfig();
  }

  async cargarArchivosDesdeConfig() {
    const config = this.fileService.getConfig();
    if (!config) {
      alert('No se encontró el archivo de configuración.');
      return;
    }
  
    // Llamamos al servicio para obtener los objetos completos
    this.archivos = await this.fileService.leerArchivosDesdeConfig(config);
  }

  abrirArchivo(archivo: ArchivoProyecto) {
    this.archivoActual = archivo;
    this.contenidoArchivo = `// Simulación de contenido para ${archivo.nombre}\nprint("Hola desde ${archivo.nombre}");`;
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
        this.fileService.descargarArchivo(this.archivoActual?.nombre || 'archivo.cmm', this.contenidoArchivo);
        Swal.fire('Guardado', 'El archivo ha sido guardado.', 'success');
      }
    }
    );
  }

  analizar() {
    const resultado = this.parserService.analizar(this.contenidoArchivo);
    this.salida = resultado.salida;
    this.errores = resultado.errores;
  }
}
