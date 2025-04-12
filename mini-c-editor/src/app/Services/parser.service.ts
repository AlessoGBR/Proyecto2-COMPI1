import { Injectable } from '@angular/core';
import * as peggy from 'peggy';

@Injectable({
  providedIn: 'root'
})
export class ParserService {

  private parser: peggy.Parser | null = null;

  constructor() {
    this.cargarParser();
   }

   async cargarParser() {
    const response = await fetch('assets/mini-c.pegjs');
    const grammar = await response.text();
    this.parser = peggy.generate(grammar);
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
