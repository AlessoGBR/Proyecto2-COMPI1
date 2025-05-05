{
  function executeStatement(stmt, context, outputs) {
    switch (stmt.type) {
      case 'VarDecl':
        context.variables[stmt.name] = evaluateExpression(stmt.value, context, outputs);
        break;

      case 'Assignment':
        if (stmt.field) {
          if (!context.variables.hasOwnProperty(stmt.name)) {
            throw new Error(`Variable no definida: ${stmt.name}`);
          }
          const structVar = context.variables[stmt.name];
          if (typeof structVar !== 'object' || !structVar.__isStruct) {
            throw new Error(`${stmt.name} no es un struct`);
          }
          if (!(stmt.field in structVar)) {
            throw new Error(`El campo ${stmt.field} no existe en el struct ${stmt.name}`);
          }
          structVar[stmt.field] = evaluateExpression(stmt.value, context, outputs);
        } else {
          context.variables[stmt.name] = evaluateExpression(stmt.value, context, outputs);
        }
        break;

      case 'Print':
        let value = evaluateExpression(stmt.value, context, outputs);
        
        if (stmt.value.type === 'StringInterpolation') {
          value = evaluateInterpolatedString(stmt.value, context);
        }
        
        outputs.push(value !== undefined ? value.toString() : "undefined");
        break;

      case 'Function':
        context.functions[stmt.name] = stmt;
        break;

      case 'Struct':
        context.structs[stmt.name] = stmt;
        break;

      case 'StructDecl':
        if (!context.structs.hasOwnProperty(stmt.structType)) {
          throw new Error(`Struct no definido: ${stmt.structType}`);
        }
        
        const structDef = context.structs[stmt.structType];
        const structInstance = { __isStruct: true, __type: stmt.structType };
        
        for (const field of structDef.fields) {
          structInstance[field.name] = null;
        }
        
        if (stmt.values) {
          if (stmt.values.length !== structDef.fields.length) {
            throw new Error(`Número incorrecto de valores para struct ${stmt.structType}. Se esperaban ${structDef.fields.length}, se recibieron ${stmt.values.length}`);
          }
          
          for (let i = 0; i < structDef.fields.length; i++) {
            structInstance[structDef.fields[i].name] = evaluateExpression(stmt.values[i], context, outputs);
          }
        }
        
        context.variables[stmt.name] = structInstance;
        break;

      case 'If':
        const cond = evaluateExpression(stmt.condition, context, outputs);
        let executed = false;
        
        if (cond) {
          stmt.thenBranch.forEach(subStmt => executeStatement(subStmt, context, outputs));
          executed = true;
        } else if (stmt.elseIfBranches && stmt.elseIfBranches.length > 0) {
          for (const branch of stmt.elseIfBranches) {
            const branchCond = evaluateExpression(branch.condition, context, outputs);
            if (branchCond) {
              branch.body.forEach(subStmt => executeStatement(subStmt, context, outputs));
              executed = true;
              break;
            }
          }
        }
        
        if (!executed && stmt.elseBranch && stmt.elseBranch.length > 0) {
          stmt.elseBranch.forEach(subStmt => executeStatement(subStmt, context, outputs));
        }
        break;

      case 'For':
        executeStatement(stmt.init, context, outputs);
        while (toBooleanValue(evaluateExpression(stmt.condition, context, outputs))) {
          for (const subStmt of stmt.body) {
            const result = executeStatement(subStmt, context, outputs);
            if (result && result.return) return result;
          }
          evaluateExpression(stmt.update, context, outputs);
        }
        break;

      case 'Block':
        const blockContext = createBlockContext(context);
        for (const subStmt of stmt.body) {
          const result = executeStatement(subStmt, blockContext, outputs);
          if (result && result.return) return result;
        }
        break;

      case 'ExpressionStatement':
        evaluateExpression(stmt.expression, context, outputs);
        break;

      case 'Return':
        return { 
          return: true, 
          value: stmt.value ? evaluateExpression(stmt.value, context, outputs) : undefined 
        };

      default:
        throw new Error(`Sentencia no reconocida: ${stmt.type}`);
    }
    return null;
  }

  function toBooleanValue(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    return !!value; 
  }

  function createBlockContext(parentContext) {
   
    return {
      variables: Object.create(parentContext.variables), 
      functions: parentContext.functions, 
      structs: parentContext.structs 
    };
  }

  function evaluateInterpolatedString(expr, context) {
    if (!expr.parts) return "";
    
    return expr.parts.map(part => {
      if (typeof part === 'string') {
        return part;
      } else {
        const value = evaluateExpression(part, context, []);
        return value !== undefined ? value.toString() : "undefined";
      }
    }).join('');
  }

  function evaluateExpression(expr, context, outputs) {
    if (!expr) return undefined;

    switch (expr.type) {
      case 'Number':
        return expr.value;

      case 'Boolean':
        return expr.value;

      case 'String':
        return expr.value;
        
      case 'Character':
        return expr.value;

      case 'StringInterpolation':
        return evaluateInterpolatedString(expr, context);

      case 'Identifier':
        if (!context.variables.hasOwnProperty(expr.name)) {
          throw new Error(`Variable no definida: ${expr.name}`);
        }
        return context.variables[expr.name];

      case 'StructFieldAccess':
        if (!context.variables.hasOwnProperty(expr.struct)) {
          throw new Error(`Variable no definida: ${expr.struct}`);
        }
        const structVar = context.variables[expr.struct];
        if (typeof structVar !== 'object' || !structVar.__isStruct) {
          throw new Error(`${expr.struct} no es un struct`);
        }
        if (!(expr.field in structVar)) {
          throw new Error(`El campo ${expr.field} no existe en el struct ${expr.struct} de tipo ${structVar.__type}`);
        }
        return structVar[expr.field];

      case 'BinaryExpr':
        const left = evaluateExpression(expr.left, context, outputs);
        const right = evaluateExpression(expr.right, context, outputs);
        return applyOperator(expr.op, left, right);

      case 'UnaryExpr':
        const val = evaluateExpression(expr.expr, context, outputs);
        return applyUnaryOperator(expr.op, val);

      case 'Assignment':
        if (expr.field) {
          if (!context.variables.hasOwnProperty(expr.name)) {
            throw new Error(`Variable no definida: ${expr.name}`);
          }
          const structVarAssign = context.variables[expr.name];
          if (typeof structVarAssign !== 'object' || !structVarAssign.__isStruct) {
            throw new Error(`${expr.name} no es un struct`);
          }
          if (!(expr.field in structVarAssign)) {
            throw new Error(`El campo ${expr.field} no existe en el struct ${expr.name} de tipo ${structVarAssign.__type}`);
          }
          const fieldValue = evaluateExpression(expr.value, context, outputs);
          structVarAssign[expr.field] = fieldValue;
          return fieldValue;
        } else {
          if (!context.variables.hasOwnProperty(expr.name)) {
            throw new Error(`Variable no definida: ${expr.name}`);
          }
          const assignValue = evaluateExpression(expr.value, context, outputs);
          context.variables[expr.name] = assignValue;
          return assignValue;
        }

      case 'FunctionCall':
        if (!context.functions.hasOwnProperty(expr.name)) {
          throw new Error(`Función no definida: ${expr.name}`);
        }
        const func = context.functions[expr.name];
        
        if (func.params.length !== expr.args.length) {
          throw new Error(`Número incorrecto de argumentos para ${expr.name}. Se esperaban ${func.params.length}, se recibieron ${expr.args.length}`);
        }
        
        const localContext = {
          variables: {},
          functions: context.functions,
          structs: context.structs
        };
        
        for (let i = 0; i < func.params.length; i++) {
          const param = func.params[i];
          const argExpr = expr.args[i];
          
          if (param.byReference) {
            if (argExpr.type !== 'Identifier') {
              throw new Error(`El parámetro ${param.name} es por referencia y requiere una variable como argumento`);
            }
            
            const argName = argExpr.name;
            if (!context.variables.hasOwnProperty(argName)) {
              throw new Error(`Variable no definida para parámetro por referencia: ${argName}`);
            }
            
            Object.defineProperty(localContext.variables, param.name, {
              get: () => context.variables[argName],
              set: (value) => { context.variables[argName] = value }
            });
          } else {
            const argValue = evaluateExpression(argExpr, context, outputs);
            localContext.variables[param.name] = argValue;
          }
        }
        
        let returnValue = undefined;
        for (const stmt of func.body) {
          const result = executeStatement(stmt, localContext, outputs);
          if (result && result.return) {
            if (func.returnType === 'void' && result.value !== undefined) {
              throw new Error(`La función ${expr.name} es void y no debería retornar un valor`);
            }
            returnValue = result.value;
            break;
          }
        }
        
        if (returnValue === undefined && func.returnType !== 'void') {
          throw new Error(`La función ${expr.name} debe retornar un valor de tipo ${func.returnType}`);
        }
        
        return returnValue;

      case 'Inc':
        if (!context.variables.hasOwnProperty(expr.name)) {
          throw new Error(`Variable no definida: ${expr.name}`);
        }
        const incValue = context.variables[expr.name];
        if (typeof incValue !== 'number') {
          throw new Error(`Incremento solo es válido para valores numéricos`);
        }
        return ++context.variables[expr.name];

      case 'Dec':
        if (!context.variables.hasOwnProperty(expr.name)) {
          throw new Error(`Variable no definida: ${expr.name}`);
        }
        const decValue = context.variables[expr.name];
        if (typeof decValue !== 'number') {
          throw new Error(`Decremento solo es válido para valores numéricos`);
        }
        return --context.variables[expr.name];

      default:
        throw new Error(`Expresión no reconocida: ${expr.type}`);
    }
  }

  function applyUnaryOperator(op, val) {
    switch (op) {
      case '!':
        return !toBooleanValue(val);
      case '-':
        if (typeof val !== 'number') {
          throw new Error(`Operador unario '-' solo es válido para números`);
        }
        return -val;
      default:
        throw new Error(`Operador unario no soportado: ${op}`);
    }
  }

  function applyOperator(op, left, right) {
    let numLeft, numRight;
    
    if (['+', '-', '*', '/', '%', '>', '<', '>=', '<=', '^'].includes(op)) {
      numLeft = typeof left === 'string' ? parseFloat(left) : left;
      numRight = typeof right === 'string' ? parseFloat(right) : right;
      
      if ((op !== '+' || (typeof left !== 'string' && typeof right !== 'string')) && 
          (isNaN(numLeft) || isNaN(numRight))) {
        throw new Error(`Operación numérica inválida usando operador '${op}'`);
      }
    }

    switch (op) {
      case '+':
        if (typeof left === 'string' || typeof right === 'string') {
          return String(left) + String(right);
        }
        return numLeft + numRight;
      case '-': 
        return numLeft - numRight;
      case '*': 
        return numLeft * numRight;
      case '/': 
        if (numRight === 0) {
          throw new Error("División por cero");
        }
        return numLeft / numRight;
      case '%': 
        if (numRight === 0) {
          throw new Error("Módulo por cero");
        }
        return numLeft % numRight;
      case '^': 
        return Math.pow(numLeft, numRight);
      case '==': 
        return left == right;
      case '!=': 
        return left != right;
      case '>': 
        return numLeft > numRight;
      case '<': 
        return numLeft < numRight;
      case '>=': 
        return numLeft >= numRight;
      case '<=': 
        return numLeft <= numRight;
      case '&&': 
        return toBooleanValue(left) && toBooleanValue(right);
      case '||': 
        return toBooleanValue(left) || toBooleanValue(right);
      default: 
        throw new Error(`Operador no soportado: ${op}`);
    }
  }

  function executeFunction(func, args, context, outputs) {
    const localContext = {
      variables: {},
      functions: context.functions,
      structs: context.structs
    };
    if (args && func.params) {
      if (args.length !== func.params.length) {
        throw new Error(`Número incorrecto de argumentos para la función ${func.name}. Se esperaban ${func.params.length}, se recibieron ${args.length}`);
      }
      
      for (let i = 0; i < func.params.length; i++) {
        const param = func.params[i];
        
        if (param.byReference) {
          if (args[i].type !== 'Identifier') {
            throw new Error(`El parámetro ${param.name} es por referencia y requiere una variable como argumento`);
          }
          const argName = args[i].name;
          if (!context.variables.hasOwnProperty(argName)) {
            throw new Error(`Variable no definida para parámetro por referencia: ${argName}`);
          }
          
          Object.defineProperty(localContext.variables, param.name, {
            get: () => context.variables[argName],
            set: (value) => { context.variables[argName] = value }
          });
        } else {
          localContext.variables[param.name] = evaluateExpression(args[i], context, outputs);
        }
      }
    }
    
    let returnValue = undefined;
    for (const stmt of func.body) {
      const result = executeStatement(stmt, localContext, outputs);
      if (result && result.return) {
        if (func.returnType === 'void' && result.value !== undefined) {
          throw new Error(`La función ${func.name} es void y no debería retornar un valor`);
        }
        returnValue = result.value;
        break;
      }
    }
    
    if (returnValue === undefined && func.returnType !== 'void') {
      throw new Error(`La función ${func.name} debe retornar un valor de tipo ${func.returnType}`);
    }
    
    return returnValue;
  }
}

start
  = _ program:statements _ {
      const outputs = [];
      const context = {
        variables: {},
        functions: {},
        structs: {},
      };

      try {
        for (const stmt of program) {
          if (stmt.type === 'Function') {
            context.functions[stmt.name] = stmt;
          } else if (stmt.type === 'Struct') {
            context.structs[stmt.name] = stmt;
          }
        }

        for (const stmt of program) {
          if (stmt.type !== 'Function' && stmt.type !== 'Struct') {
            executeStatement(stmt, context, outputs);
          }
        }

        if (context.functions['main']) {
          executeFunction(context.functions['main'], [], context, outputs);
        }

        return outputs.length > 0 ? outputs.join('\n') : "Programa ejecutado";

      } catch (error) {
        const location = error.location || {};
        throw {
          message: error.message,
          location: {
            start: {
              line: location.start ? location.start.line : 1,
              column: location.start ? location.start.column : 1
            }
          }
        };
      }
    }

statements
  = stmts:(statement _)* {
      return stmts.map(([stmt]) => stmt);
    }

statement
  = importStmt
  / varDecl
  / structDecl
  / assignment
  / printStmt
  / funcDecl
  / structDefDecl
  / ifStmt
  / forStmt
  / returnStmt
  / exprStmt
  / block

importStmt
  = "#import" __ name:identifier _ {
      return { type: "Import", name };
    }

block
  = "{" _ body:statements _ "}" {
      return { type: "Block", body };
    }

returnStmt
  = "return" _ value:expression? _ ";" {
      return { type: "Return", value };
    }

varDecl
  = type:dataType __ name:identifier __? "=" __? value:expression __? ";" {
      return { type: "VarDecl", varType: type, name, value };
    }

dataType
  = "int" / "float" / "string" / "char" / "bool" / structType

structType
  = "struct" __ name:identifier {
      return `struct_${name}`;
    }

structDecl
  = type:structType __ name:identifier __ "=" __ "{" _ values:expressionList _ "}" _ ";" {
      return { 
        type: "StructDecl", 
        structType: type.substring(7), 
        name,
        values 
      };
    }
  / type:structType __ name:identifier _ ";" {
      return { 
        type: "StructDecl", 
        structType: type.substring(7),
        name,
        values: null
      };
    }

assignment
  = name:identifier "." field:identifier _ "=" _ value:expression _ ";" {
      return { type: "Assignment", name, field, value };
    }
  / name:identifier _ "=" _ value:expression _ ";" {
      return { type: "Assignment", name, value };
    }

printStmt
  = "print" _ "(" _ val:expression _ ")" _ ";" {
      return { type: "Print", value: val };
    }

funcDecl
  = ret:("void" / "int" / "float" / "string" / "bool" / "char" / structType) _ name:identifier _ "(" _ params:parameterList? _ ")" _ "{" __? body:statements __? "}" {
      return { 
        type: "Function", 
        returnType: ret, 
        name, 
        params: params || [], 
        body
      };
    }

parameterList
  = head:parameter tail:(_ "," _ parameter)* {
      return [head, ...tail.map(t => t[3])];
    }

parameter
  = type:dataType _ name:identifier _ "*" {
      return { type: "Parameter", varType: type, name, byReference: true };
    }
  / type:dataType _ name:identifier {
      return { type: "Parameter", varType: type, name, byReference: false };
    }

structDefDecl
  = "struct" _ name:identifier _ "{" __ fields:structField* __ "}" _ ";" {
      return { type: "Struct", name, fields };
    }

structField
  = type:dataType __ name:identifier _ ";" {
      return { type: "Field", varType: type, name };
    }

ifStmt
  = "if" _ "(" _ cond:expression _ ")" _ "{" _ thenBranch:(statement _)* _ "}" _
    elseIfBranches:elseIfBranch*
    elseBranch:("else" _ "{" _ stmts:(statement _)* _ "}")? {
      return {
        type: "If",
        condition: cond,
        thenBranch: thenBranch.map(([s]) => s),
        elseIfBranches: elseIfBranches,
        elseBranch: elseBranch ? elseBranch[4].map(([s]) => s) : []
      };
    }

elseIfBranch
  = "else" __ "if" _ "(" _ cond:expression _ ")" _ "{" _ body:(statement _)* _ "}" _ {
      return {
        condition: cond,
        body: body.map(([s]) => s)
      };
    }

forStmt
  = "for" _ "(" _ init:(varDecl / assignment) _ cond:expression _ ";" _ update:forUpdate _ ")" _ "{" _ body:statements _ "}" {
      return {
        type: "For",
        init,
        condition: cond,
        update,
        body
      };
    }

forUpdate
  = inc:increment { return inc; }
  / dec:decrement { return dec; }
  / expr:expression { return expr; }

increment
  = name:identifier "++" {
      return { type: "Inc", name };
    }

decrement
  = name:identifier "--" {
      return { type: "Dec", name };
    }

exprStmt
  = expr:expression _ ";" {
      return { type: "ExpressionStatement", expression: expr };
    }

expression
  = logicOrExpr
  / assignmentExpr 

assignmentExpr
  = struct:identifier "." field:identifier _ "=" _ expr:expression {
      return {
        type: "Assignment",
        name: struct,
        field,
        value: expr
      };
    }
  / id:identifier _ "=" _ expr:expression {
      return {
        type: "Assignment",
        name: id,
        value: expr
      };
    }

logicOrExpr
  = left:logicAndExpr _ "||" _ right:logicOrExpr {
      return { type: "BinaryExpr", op: "||", left, right };
    }
  / logicAndExpr

logicAndExpr
  = left:equalityExpr _ "&&" _ right:logicAndExpr {
      return { type: "BinaryExpr", op: "&&", left, right };
    }
  / equalityExpr

equalityExpr
  = left:relationalExpr _ op:("==" / "!=") _ right:equalityExpr {
      return { type: "BinaryExpr", op, left, right };
    }
  / relationalExpr

relationalExpr
  = left:additiveExpr _ op:("<=" / ">=" / "<" / ">") _ right:relationalExpr {
      return { type: "BinaryExpr", op, left, right };
    }
  / additiveExpr

additiveExpr
  = left:multiplicativeExpr _ op:("+" / "-") _ right:additiveExpr {
      return { type: "BinaryExpr", op, left, right };
    }
  / multiplicativeExpr

multiplicativeExpr
  = left:exponentialExpr _ op:("*" / "/") _ right:multiplicativeExpr {
      return { type: "BinaryExpr", op, left, right };
    }
  / exponentialExpr

exponentialExpr
  = left:unaryExpr _ "^" _ right:exponentialExpr {
      return { type: "BinaryExpr", op: "^", left, right };
    }
  / unaryExpr

unaryExpr
  = op:("!" / "-") _ expr:unaryExpr {
      return { type: "UnaryExpr", operator: op, operand: expr };
    }
  / primary

primary
  = number
  / boolean
  / interpolatedString
  / string
  / character
  / structFieldAccess
  / funcCall
  / id:identifier { return { type: "Identifier", name: id }; }
  / "(" _ expr:expression _ ")" { return expr; }

structFieldAccess
  = struct:identifier "." field:identifier {
      return { type: "StructFieldAccess", struct, field };
    }

funcCall
  = name:identifier _ "(" _ args:expressionList? _ ")" {
      return { type: "FunctionCall", name, args: args || [] };
    }

expressionList
  = head:expression tail:(_ "," _ expression)* {
      return [head, ...tail.map(t => t[3])];
    }

interpolation
  = "${" _ expr:expression _ "}" {
      return expr;
    }

interpolatedString
  = '"' parts:(textPart / interpolation)* '"' {
      return {
        type: "StringInterpolation",
        parts
      };
    }

textPart
  = chars:$([^"$\\]+ / "\\" .) {
      return chars;
    }

identifier
  = !keyword $([a-zA-Z_][a-zA-Z0-9_]*) {
      return text();
    }

keyword
  = ("int" / "float" / "string" / "char" / "bool" / "void" / "struct" / "if" / "else" / "for" / "return" / "print" / "true" / "false") !identifierPart

identifierPart
  = [a-zA-Z0-9_]

string
  = '"' chars:[^"]* '"' { return { type: "String", value: chars.join("") }; }

character
  = "'" char:[^'] "'" { return { type: "Character", value: char }; }

boolean
  = value:("true" / "false") { return { type: "Boolean", value: value === "true" }; }

number
  = value:[0-9]+("."[0-9]+)? { return { type: "Number", value: parseFloat(text()) }; }

_ = [ \t\n\r]*
__ = [ \t\n\r]+