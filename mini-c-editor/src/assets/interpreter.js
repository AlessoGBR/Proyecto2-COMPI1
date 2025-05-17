function executeStatement(stmt, context, outputs) {  
  if (!stmt || typeof stmt.type !== 'string') {
    throw new Error(`Sentencia no reconocida: ${JSON.stringify(stmt)}`);
  }

  switch (stmt.type) {
    case 'VarDecl':
      if (Object.prototype.hasOwnProperty.call(context.variables, stmt.name)) {
          throw new Error(`Variable ya definida en este ámbito: ${stmt.name}`);
        }
        const varValue = evaluateExpression(stmt.value, context, outputs);
        const varType = stmt.varType || inferType(varValue);

        const valueType = inferType(varValue);
        if (stmt.varType && stmt.varType !== 'any') {
          if (
            stmt.varType !== valueType &&
            !(valueType === 'int' && stmt.varType === 'float')
          ) {
            throw new Error(
              `Error de tipo: No se puede asignar ${valueType} a una variable de tipo ${stmt.varType}`
            );
          }
        }

        context.variables[stmt.name] = {
          value: varValue,
          type: varType
        };
      break;

    case 'Assignment':
      if (stmt.field) {
        if (!variableExists(context, stmt.name)) {
            throw new Error(`Variable no definida: ${stmt.name}`);
        }
        const structVar = context.variables[stmt.name].value;
        if (typeof structVar !== 'object' || !structVar.__isStruct) {
            throw new Error(`${stmt.name} no es un struct`);
        }
        if (!(stmt.field in structVar)) {
            throw new Error(`El campo ${stmt.field} no existe en el struct ${stmt.name}`);
        }
        const newValue = evaluateExpression(stmt.value, context, outputs);
        structVar[stmt.field] = newValue;
        } else {
        if (!variableExists(context, stmt.name)) {
            throw new Error(`Variable no definida: ${stmt.name}`);
        }
        const newValue = evaluateExpression(stmt.value, context, outputs);
        const varInfo = getVariable(context, stmt.name);
        
        if (varInfo.type && varInfo.type !== 'any') {
            const valueType = inferType(newValue);
            if (varInfo.type !== valueType && 
                !(valueType === 'int' && varInfo.type === 'float')) {
            throw new Error(`Error de tipo: No se puede asignar ${valueType} a una variable de tipo ${varInfo.type}`);
            }
        }
        
        varInfo.value = newValue;
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
      if (stmt.name === 'main' && context.mainDefined) {
        throw new Error("Solo se puede definir una función main");
      }
      
      if (stmt.name === 'main') {
        context.mainDefined = true;
      }
      
      context.functions[stmt.name] = stmt;
      break;

    case 'Struct':
      context.structs[stmt.name] = {
        type: "Struct",
        name: stmt.name,
        fields: stmt.fields
      };
      break;

    case 'StructDecl':
      if (!context.structs.hasOwnProperty(stmt.structType)) {
        throw new Error(`Struct no definido: ${stmt.structType}`);
      }   
      
      const structDef = context.structs[stmt.structType];
      const structInstance = { 
        __isStruct: true, 
        __type: stmt.structType 
      };
      
      for (const field of structDef.fields) {
        structInstance[field.name] = null;
      }

      if (stmt.values && stmt.values.length > 0) {
        if (stmt.values.length !== structDef.fields.length) {
          throw new Error(
            `Número incorrecto de valores para struct ${stmt.structType}. ` +
            `Se esperaban ${structDef.fields.length}, se recibieron ${stmt.values.length}`
          );
        }
        
        for (let i = 0; i < structDef.fields.length; i++) {
          const fieldValue = evaluateExpression(stmt.values[i], context, outputs);
          const fieldType = structDef.fields[i].varType;
          const valueType = inferType(fieldValue);
          
          if (fieldType !== valueType && !(valueType === 'int' && fieldType === 'float')) {
            throw new Error(
              `Tipo incorrecto para el campo ${structDef.fields[i].name}. ` +
              `Se esperaba ${fieldType}, se recibió ${valueType}`
            );
          }
          
          structInstance[structDef.fields[i].name] = fieldValue;
        }
      }
      
      context.variables[stmt.name] = {
        value: structInstance,
        type: stmt.structType
      };
      break;

    case 'If':
      const cond = evaluateExpression(stmt.condition, context, outputs);
      let executed = false;
      
      if (cond) {
        const blockContext = createBlockContext(context);
        stmt.thenBranch.forEach(subStmt => executeStatement(subStmt, blockContext, outputs));
        executed = true;
      } else if (stmt.elseIfBranches && stmt.elseIfBranches.length > 0) {
        for (const branch of stmt.elseIfBranches) {
          const branchCond = evaluateExpression(branch.condition, context, outputs);
          if (branchCond) {
            const blockContext = createBlockContext(context);
            branch.body.forEach(subStmt => executeStatement(subStmt, blockContext, outputs));
            executed = true;
            break;
          }
        }
      }
      
      if (!executed && stmt.elseBranch && stmt.elseBranch.length > 0) {
        const blockContext = createBlockContext(context);
        stmt.elseBranch.forEach(subStmt => executeStatement(subStmt, blockContext, outputs));
      }
      break;

    case 'For':
      const forContext = createBlockContext(context);
      executeStatement(stmt.init, forContext, outputs);
      while (toBooleanValue(evaluateExpression(stmt.condition, forContext, outputs))) {
        for (const subStmt of stmt.body) {
          const result = executeStatement(subStmt, forContext, outputs);
          if (result && result.return) return result;
        }
        evaluateExpression(stmt.update, forContext, outputs);
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
  if (value && typeof value === 'object' && 'value' in value) {
    value = value.value; 
  }
  
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.length > 0;
  return !!value; 
}

function createBlockContext(parentContext) {
  return {
    variables: Object.create(parentContext.variables),
    functions: parentContext.functions, 
    structs: parentContext.structs,
    mainDefined: parentContext.mainDefined
  };
}

function inferType(value) {
  if (value === null || value === undefined) return 'any';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'object' && value.type === 'Boolean') return 'bool';
  if (typeof value === 'object' && value.type === 'Number') {
    return value.numberType; 
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'int' : 'float';
  }
  if (typeof value === 'object' && value.type === 'Character') return 'char';
  if (typeof value === 'object' && value.type === 'String') return 'string';
  if (typeof value === 'string') {
    if (value.length === 1) return 'char';
    return 'string';
  }
  if (typeof value === 'object') {
    if (value.__isStruct) return value.__type;
    return 'object';
  }
  return 'any';
}

function variableExists(context, name) {
  return name in context.variables;
}

function getVariable(context, name) {
  if (name in context.variables) {
    return context.variables[name];
  }
  throw new Error(`Variable no definida: ${name}`);
}

function evaluateInterpolatedString(expr, context) {
  if (!expr.parts) return "";
  
  return expr.parts.map(part => {
    if (typeof part === 'string') {
      return part;
    } else {
      const value = evaluateExpression(part, context, []);
      return value !== undefined ? (typeof value === 'object' && 'value' in value ? value.value.toString() : value.toString()) : "undefined";
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
      if (!variableExists(context, expr.name)) {
        throw new Error(`Variable no definida: ${expr.name}`);
      }
      return context.variables[expr.name].value;

    case 'StructFieldAccess':
      if (!variableExists(context, expr.struct)) {
        throw new Error(`Variable no definida: ${expr.struct}`);
      }
      const structVar = context.variables[expr.struct].value;
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
      
      const leftValue = typeof left === 'object' && 'value' in left ? left.value : left;
      const rightValue = typeof right === 'object' && 'value' in right ? right.value : right;
      
      return applyOperator(expr.op, leftValue, rightValue);

    case 'UnaryExpr':
      const val = evaluateExpression(expr.expr, context, outputs);
      const actualVal = typeof val === 'object' && 'value' in val ? val.value : val;
      return applyUnaryOperator(expr.op, actualVal);

    case 'Assignment':
      if (expr.field) {
        if (!variableExists(context, expr.name)) {
          throw new Error(`Variable no definida: ${expr.name}`);
        }
        const structVarAssign = context.variables[expr.name].value;
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
        if (!variableExists(context, expr.name)) {
          throw new Error(`Variable no definida: ${expr.name}`);
        }
        const varInfo = getVariable(context, expr.name);
        const assignValue = evaluateExpression(expr.value, context, outputs);
        
        if (varInfo.type && varInfo.type !== 'any') {
          const valueType = inferType(assignValue);
          if (varInfo.type !== valueType) {
            throw new Error(`Error de tipo: No se puede asignar ${valueType} a una variable de tipo ${varInfo.type}`);
          }
        }
        
        varInfo.value = assignValue;
        return assignValue;
      }

    case 'FunctionCall':
      if (expr.name === 'main') {
        throw new Error("La función main no puede ser invocada explícitamente");
      }
      
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
        structs: context.structs,
        mainDefined: context.mainDefined
      };
      
      for (let i = 0; i < func.params.length; i++) {
        const param = func.params[i];
        const argExpr = expr.args[i];
        
        if (param.byReference) {
          const argValue = evaluateExpression(argExpr, context, outputs);
          localContext.variables[param.name] = {
            value: argValue,
            type: param.dataType || inferType(argValue)
          };
        } else {
          if (argExpr.type !== 'Identifier') {
            throw new Error(`El parámetro ${param.name} es por referencia y requiere una variable como argumento`);
          }
          
          const argName = argExpr.name;
          if (!variableExists(context, argName)) {
            throw new Error(`Variable no definida para parámetro por referencia: ${argName}`);
          }
          
          Object.defineProperty(localContext.variables, param.name, {
            get: () => context.variables[argName],
            set: (value) => { context.variables[argName] = value }
          });
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
      
      if (func.returnType && func.returnType !== 'void' && func.returnType !== 'any') {
        const returnTypeInferred = inferType(returnValue);
        if (returnTypeInferred !== func.returnType && 
            !(returnTypeInferred === 'int' && func.returnType === 'float')) {
          throw new Error(`Error de tipo: La función ${expr.name} debe retornar ${func.returnType}, pero retorna ${returnTypeInferred}`);
        }
      }
      
      return returnValue;

    case 'Inc':
      if (!variableExists(context, expr.name)) {
        throw new Error(`Variable no definida: ${expr.name}`);
      }
      const incVar = getVariable(context, expr.name);
      if (typeof incVar.value !== 'number') {
        throw new Error(`Incremento solo es válido para valores numéricos`);
      }
      return ++incVar.value;

    case 'Dec':
      if (!variableExists(context, expr.name)) {
        throw new Error(`Variable no definida: ${expr.name}`);
      }
      const decVar = getVariable(context, expr.name);
      if (typeof decVar.value !== 'number') {
        throw new Error(`Decremento solo es válido para valores numéricos`);
      }
      return --decVar.value;

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

function executeProgram(ast, context = null) {
  const outputs = [];
  
  if (!context) {
    context = {
      variables: {},
      functions: {},
      structs: {},
      mainDefined: false
    };
  }
  
  for (const stmt of ast) {
    if (stmt.type === 'Function') {
      if (stmt.name === 'main' && context.mainDefined) {
        throw new Error("Solo se puede definir una función main");
      }
      
      if (stmt.name === 'main') {
        context.mainDefined = true;
      }
      
      context.functions[stmt.name] = stmt;
    } else if (stmt.type === 'Struct') {
      context.structs[stmt.name] = stmt;
    }
  }
  
  for (const stmt of ast) {
    if (stmt.type !== 'Function' && stmt.type !== 'Struct') {
      executeStatement(stmt, context, outputs);
    }
  }
  
  if (context.mainDefined && context.functions['main']) {
    const mainFunc = context.functions['main'];
    if (mainFunc.params.length > 0) {
      throw new Error("La función main no debe tener parámetros");
    }
    
    const mainContext = {
      variables: {},
      functions: context.functions,
      structs: context.structs,
      mainDefined: true
    };
    
    for (const stmt of mainFunc.body) {
      const result = executeStatement(stmt, mainContext, outputs);
      if (result && result.return) {
        break;
      }
    }
  }

    return outputs;
}

module.exports = {
  executeStatement,
  evaluateExpression,
  toBooleanValue,
  createBlockContext,
  inferType,
  getVariable,
  variableExists,
  evaluateInterpolatedString,
  applyOperator,
  applyUnaryOperator
};
