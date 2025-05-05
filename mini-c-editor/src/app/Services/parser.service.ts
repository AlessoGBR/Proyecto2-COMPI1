import { Injectable } from '@angular/core';
import * as peggy from 'peggy';
import { generarTablaSimbolos } from '../../assets/tableReportes';
import { generarReporteAST } from '../../assets/reporteAST';
import { Subject } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class ParserService {

  private parser: peggy.Parser | null = null;
  public parserCargado = false;
  private tablaSimbolosSubject = new Subject<string>();
  private reporteASTSubjet = new Subject<string>();
  tablaSimbolos$ = this.tablaSimbolosSubject.asObservable();
  reporteAST$ = this.reporteASTSubjet.asObservable();
  constructor() {
    
  }

  async cargarParser() {
    try {
    const response = await fetch('assets/mini-c.pegjs');
    const grammar = await response.text();
    this.parser = peggy.generate(grammar);
    this.parserCargado = true;
  } catch (error) {
    console.error('Error al cargar el parser:', error);
    this.parserCargado = false;
  }
  }  

  analizar(codigo: string): { salida: string; errores: string[] } {
    if (!this.parser) {
      return { salida: '', errores: ['El parser aún no está cargado.'] };
    }

    try {
      const resultado = this.parser.parse(codigo);
      //tabla de simbolos
      const tablaSimbolos = generarTablaSimbolos(codigo);
      this.tablaSimbolosSubject.next(tablaSimbolos);
      //reporte AST
      const ast = generarReporteAST(codigo);
      this.reporteASTSubjet.next(ast);

      return { 
        salida: resultado,
        errores: []
      };
      
    } catch (error: any) {
      let mensajeError = 'Error de sintaxis';
      if (error.location) {
        mensajeError += ` en línea ${error.location.start.line}: ${error.message}`;
      } else {
        mensajeError += `: ${error.message}`;
      }
      
      return {
        salida: '',
        errores: [mensajeError]
      };
    }

  }

}