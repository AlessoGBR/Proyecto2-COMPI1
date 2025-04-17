import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FileService } from '../../../Services/file.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  constructor(
    private router: Router,
    private fileService: FileService
  ) {}

  crearProyecto() {
    const yaml = this.fileService.generarConfig('NuevoProyecto', {
      modulo1: [
        { archivo1: 'main.cmm' },
        { archivo2: 'util.cmm' }
      ]
    });

    this.fileService.descargarArchivo('config.yml', yaml);
    Swal.fire({
      title: 'Proyecto creado',
      text: 'El archivo config.yml ha sido generado. Ahora puedes abrir el proyecto.',
      icon: 'success',
      confirmButtonText: 'Aceptar'
    });
  }

  async abrirProyecto() {
    const directorio = await this.fileService.seleccionarDirectorio();
    if (!directorio) return;

    try {
      const configHandle = await directorio.getFileHandle('config.yml');
      const configFile = await configHandle.getFile();
      const config = await this.fileService.cargarConfig(configFile);

      this.router.navigate(['/editor']);
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: 'No se encontró un archivo config.yml en la carpeta seleccionada.',
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
      console.error(error);
    }
  }
}
