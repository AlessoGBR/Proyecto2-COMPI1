import { Component, OnInit } from '@angular/core';
import { ParserService } from '../../../Services/parser.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-tabla-simbolos',
  standalone: true,
  imports: [],
  templateUrl: './tabla-simbolos.component.html',
  styleUrl: './tabla-simbolos.component.scss'
})
export class TablaSimbolosComponent implements OnInit{
  tablaHtml: SafeHtml = '';

  constructor(
    private parserService: ParserService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.parserService.tablaSimbolos$.subscribe(html => {
      this.tablaHtml = this.sanitizer.bypassSecurityTrustHtml(html);
    });
  }
}
