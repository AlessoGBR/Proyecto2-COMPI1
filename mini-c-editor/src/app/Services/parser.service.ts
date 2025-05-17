import { Injectable } from '@angular/core';
import { parse as parseYAML } from 'yaml';
import * as peggy from 'peggy';
import { generarTablaSimbolos } from '../../assets/tableReportes';
import { generarReporteAST } from '../../assets/reporteAST';
import { Subject } from 'rxjs';
import { ArchivoProyecto } from './file.service';
import { executeStatement } from '../../assets/interpreter';

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

  constructor() {}

  async cargarParser() {
    try {
      const response = await fetch('assets/parser-prueba.pegjs');
      const grammar = await response.text();
      this.parser = peggy.generate(grammar);
      this.parserCargado = true;
    } catch (error) {
      console.error('Error al cargar el parser:', error);
      this.parserCargado = false;
    }
  }

  analizar(archivoPrincipal: ArchivoProyecto, archivos: ArchivoProyecto[]): { salida: string; errores: string[] } {
    if (!this.parser) {
      return { salida: '', errores: ['El parser aún no está cargado.'] };
    }

    const archivosMap: { [nombre: string]: string } = {};
    for (const archivo of archivos) {
      archivosMap[archivo.nombre] = archivo.contenido;
    }

    const configContent = archivosMap['configuracion.yml'];
    if (!configContent) {
      return { salida: '', errores: ['Falta configuracion.yml'] };
    }

    try {
      
      const config = parseYAML(configContent) as Record<string, { [key: string]: string }[]>;
      const mainAst = this.parser.parse(archivoPrincipal.contenido) as any[];
      const context = {
        variables: {},
        functions: {} as Record<string, any>,
        structs: {} as Record<string, any>,
        mainDefined: false,
        importedModules: new Set()
      };

      const outputs: string[] = [];

      for (const stmt of mainAst) {
        if (stmt.type === 'Import') {
          const modulo = stmt.name;
          if (context.importedModules.has(modulo)) continue;
          context.importedModules.add(modulo);

          const archivoModulo = buscarArchivoDeModulo(modulo, config);
          if (!archivoModulo) {
            return { salida: '', errores: [`Módulo '${modulo}' no está en configuracion.yml`] };
          }

          const codigo = archivosMap[archivoModulo];
          if (!codigo) {
            return { salida: '', errores: [`Archivo '${archivoModulo}' del módulo '${modulo}' no fue cargado`] };
          }

          const astModulo = this.parser.parse(codigo) as any[];
            for (const stmtMod of astModulo) {
              if (stmtMod.type === 'Function') {
                if (stmtMod.name === 'main') {
                  return { salida: '', errores: ['main() solo puede estar en el archivo principal'] };
                }
                context.functions[stmtMod.name] = stmtMod;
              } else if (stmtMod.type === 'Struct') {
                context.structs[stmtMod.name] = stmtMod;
              }
            }
        }
      }

      for (const stmt of mainAst) {
        if (stmt.type === 'Function') {
          if (stmt.name === 'main') context.mainDefined = true;
          context.functions[stmt.name] = stmt;
        } else if (stmt.type === 'Struct') {
          context.structs[stmt.name] = stmt;
        }
      }

      for (const stmt of mainAst) {
        if (stmt.type !== 'Function' && stmt.type !== 'Struct' && stmt.type !== 'Import') {
          executeStatement(stmt, context, outputs);
        }
      }

      if (context.functions['main']) {
        const mainCtx = {
          variables: {},
          functions: context.functions,
          structs: context.structs,
          mainDefined: true
        };

        for (const stmt of context.functions['main'].body) {
          const result = executeStatement(stmt, mainCtx, outputs);
          if (result?.return) break;
        }
      }

      const tablaSimbolos = generarTablaSimbolos(archivoPrincipal.contenido);
      this.tablaSimbolosSubject.next(tablaSimbolos);

      const reporteAST = generarReporteAST(archivoPrincipal.contenido);
      this.reporteASTSubjet.next(reporteAST);
      
      return {
        salida: outputs.join('\n'),
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

function buscarArchivoDeModulo(modulo: string, config: any): string | null {
  const moduloNombre = modulo.replace(/\.cmm$/, '');

  for (const key of Object.keys(config)) {
    const posibleLista = config[key];
    if (Array.isArray(posibleLista)) {
      for (const entrada of posibleLista) {
        if (moduloNombre in entrada) {
          return entrada[moduloNombre];
        }
      }
    }
  }

  return null;
}

