import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FileService } from '../../../Services/file.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  constructor(private router: Router, private fileService: FileService) {}

  async abrirProyecto() {
    this.router.navigate(['/editor']);
  }

  async crearProyecto() {
    const { value: nombreProyecto } = await Swal.fire({
      title: 'Crear Nuevo Proyecto',
      input: 'text',
      inputLabel: 'Nombre del Proyecto',
      inputPlaceholder: 'Ingrese el nombre del proyecto',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'Debe ingresar un nombre para el proyecto';
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
          return 'El nombre solo puede contener letras, números, guiones y guiones bajos';
        }
        return null;
      }
    });

    if (nombreProyecto) {
      const resultado = await this.fileService.crearNuevoProyecto(nombreProyecto);

      if (resultado) {
        await Swal.fire({
          icon: 'success',
          title: 'Proyecto creado exitosamente',
          text: `Se ha creado el proyecto "${nombreProyecto}"`,
        });
        this.router.navigate(['/editor']);
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo crear el proyecto',
        });
      }
    }
  }
}
