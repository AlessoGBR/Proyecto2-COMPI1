import { Component, OnInit } from '@angular/core';
import { ParserService } from '../../../Services/parser.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-reporte-ast',
  standalone: true,
  imports: [],
  templateUrl: './reporte-ast.component.html',
  styleUrl: './reporte-ast.component.scss'
})
export class ReporteAstComponent implements OnInit {
  astHtml: SafeHtml = '';

  constructor(
    private parserService: ParserService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.parserService.reporteAST$.subscribe(html => {
      this.astHtml = this.sanitizer.bypassSecurityTrustHtml(html);
    });
  }

}
