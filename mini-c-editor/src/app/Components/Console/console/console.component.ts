import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-console',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './console.component.html',
  styleUrl: './console.component.scss'
})
export class ConsoleComponent {

  @Input() salida: string = '';
  @Input() errores: string[] = [];
}
