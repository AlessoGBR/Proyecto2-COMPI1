class SymbolTableReporter {
    constructor() {
        this.symbolTable = {};
    }

    generateReport(sourceCode) {
        try {
            const variables = this.extractVariables(sourceCode);
            return this.generateHTML(variables);
        } catch (error) {
            return this.generateErrorHTML(error);
        }
    }

    extractVariables(sourceCode) {
        const variables = {};
        const lines = sourceCode.split('\n');
        
        lines.forEach((line, lineNum) => {
            // Detectar declaraciones de variables
            const varDeclaration = line.match(/\b(int|string|boolean|double)\s+(\w+)\s*=?\s*([^;]*);/);
            if (varDeclaration) {
                const [_, type, name, value] = varDeclaration;
                variables[name] = {
                    name,
                    type,
                    value: value.trim() || 'undefined',
                    initialValue: value.trim() || 'undefined',
                    line: lineNum + 1,
                    column: line.indexOf(name),
                    scope: 'global'
                };
            }

            // Detectar funciones
            const funcDeclaration = line.match(/\b(void|int|string|boolean|double)\s+(\w+)\s*\(/);
            if (funcDeclaration) {
                const currentScope = `función ${funcDeclaration[2]}`;
                // Buscar parámetros de la función
                const params = line.match(/\((.*?)\)/);
                if (params && params[1]) {
                    params[1].split(',').forEach((param, index) => {
                        const paramParts = param.trim().split(' ');
                        if (paramParts.length >= 2) {
                            const paramName = paramParts[1];
                            variables[paramName] = {
                                name: paramName,
                                type: paramParts[0],
                                value: 'parámetro',
                                initialValue: 'parámetro',
                                line: lineNum + 1,
                                column: line.indexOf(paramName),
                                scope: currentScope
                            };
                        }
                    });
                }
            }
        });

        return variables;
    }

    generateHTML(variables) {
        const variablesArray = Object.values(variables);
        
        let html = `
        <div class="table-responsive">
            <table class="table table-striped table-bordered">
                <thead class="thead-dark">
                    <tr>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>Ámbito</th>
                        <th>Valor Inicial</th>
                        <th>Valor Final</th>
                        <th>Línea</th>
                        <th>Columna</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let currentScope = "";
        variablesArray.forEach(variable => {
            if (variable.scope !== currentScope) {
                currentScope = variable.scope;
                html += `
                    <tr class="table-info">
                        <td colspan="7"><strong>Ámbito: ${currentScope}</strong></td>
                    </tr>
                `;
            }

            html += `
                <tr>
                    <td>${variable.name}</td>
                    <td>${variable.type}</td>
                    <td>${variable.scope}</td>
                    <td>${this.formatValue(variable.initialValue)}</td>
                    <td>${this.formatValue(variable.value)}</td>
                    <td>${variable.line}</td>
                    <td>${variable.column}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        </div>
        `;

        return html;
    }

    generateErrorHTML(error) {
        return `
            <div class="alert alert-danger" role="alert">
                <h4 class="alert-heading">Error al generar el reporte</h4>
                <p>${error.message}</p>
            </div>
        `;
    }

    formatValue(value) {
        if (value === undefined || value === '') {
            return '<span class="text-muted">undefined</span>';
        }
        if (typeof value === 'string') {
            return `"${value}"`;
        }
        return String(value);
    }
}

export function generarTablaSimbolos(sourceCode) {
    if (typeof sourceCode !== 'string') {
        return '<div class="alert alert-danger">Error: El código fuente debe ser una cadena de texto</div>';
    }
    const reporter = new SymbolTableReporter();
    return reporter.generateReport(sourceCode);
}