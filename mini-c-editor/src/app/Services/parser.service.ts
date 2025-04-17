import { Injectable } from '@angular/core';
import * as peggy from 'peggy';

@Injectable({
  providedIn: 'root'
})
export class ParserService {

  private parser: peggy.Parser | null = null;
  public parserCargado = false;

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
      const ast = this.parser.parse(codigo);
      const salida = JSON.stringify(ast, null, 2); // AST visual
      return { salida, errores: [] };
    } catch (error: any) {
      return {
        salida: '',
        errores: [error.message]
      };
    }
  }
}
