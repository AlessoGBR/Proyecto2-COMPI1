import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FileService, ArchivoProyecto } from '../../../Services/file.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-explorador',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './explorador.component.html',
  styleUrl: './explorador.component.scss'
})
export class ExploradorComponent implements OnInit {

  @Output() archivoSeleccionado = new EventEmitter<{
  archivoPrincipal: ArchivoProyecto;
  archivosProyecto: ArchivoProyecto[];
  }>();
  nuevoModuloNombre: string = '';
  moduloSeleccionado: string = '';
  modulos: Array<{ nombre: string; archivos: Array<{ archivo: ArchivoProyecto }>; nuevoArchivoNombre?: string }> = [];
  constructor(private fileService: FileService) {}

  async ngOnInit(): Promise<void> {
    const handle = await this.fileService.seleccionarDirectorio();
    if (handle) {
      const config = await this.fileService.cargarConfig(await handle.getFileHandle('configuracion.yml').then(h => h.getFile()));
      this.modulos = await this.fileService.leerArchivosDesdeConfig(config);
    }
  }

  async crearModulo(): Promise<void> {
    if (!this.nuevoModuloNombre.trim()) return;

    await this.fileService.crearModulo(this.nuevoModuloNombre);
    this.modulos.push({ nombre: this.nuevoModuloNombre, archivos: [] });
    this.nuevoModuloNombre = '';
  }

  async crearArchivo(modulo: string, archivoNombre?: string): Promise<void> {
    const mod = this.modulos.find(m => m.nombre === modulo);
    if (!mod || !archivoNombre?.trim()) return;
  
    const nombreArchivo = archivoNombre.endsWith('.cmm') ? archivoNombre : `${archivoNombre}.cmm`;
  
    await this.fileService.crearArchivoEnModulo(modulo, nombreArchivo, '');
    const nuevoArchivo: ArchivoProyecto = { nombre: nombreArchivo, contenido: '', handler: null };
  
    mod.archivos.push({ archivo: nuevoArchivo });
  
    mod.nuevoArchivoNombre = '';
  }

  async eliminarModulo(nombreModulo: string): Promise<void> {
    const confirmacion = await Swal.fire({
      title: `¿Estás seguro?`,
      text: `¿Seguro que deseas eliminar el módulo "${nombreModulo}"? Esta acción es irreversible.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(result => result.isConfirmed);

    if (!confirmacion) return;

    this.modulos = this.modulos.filter(m => m.nombre !== nombreModulo);
    delete this.fileService.config[nombreModulo];
    await this.fileService.actualizarYML();
  }

  async eliminarArchivo(modulo: string, nombreArchivo: string): Promise<void> {
    const mod = this.modulos.find(m => m.nombre === modulo);
    if (!mod) return;
    mod.archivos = mod.archivos.filter(a => a.archivo.nombre !== nombreArchivo);
    this.fileService.config[modulo] = this.fileService.config[modulo].filter((entry: any) =>
      Object.values(entry)[0] !== nombreArchivo
    );
  
    await this.fileService.actualizarYML();
  }

  get todosLosArchivos(): ArchivoProyecto[] {
  const archivos: ArchivoProyecto[] = [];

  for (const mod of this.modulos) {
    for (const archivoWrap of mod.archivos) {
      archivos.push(archivoWrap.archivo);
    }
  }

  const archivoConfig = this.fileService.archivoConfig;
  if (archivoConfig) {
    archivos.push(archivoConfig);
  }

  return archivos;
}

  seleccionarArchivo(archivo: ArchivoProyecto) {
    this.archivoSeleccionado.emit({
      archivoPrincipal: archivo,
      archivosProyecto: this.todosLosArchivos
    });
  }
  
}
