// runner.js
const fs = require("fs");
const yaml = require("js-yaml");
const parser = require("./parser"); // Asegúrate de exportar solo el AST en el parser
const {
  executeStatement,
  inferType,
  evaluateExpression,
  toBooleanValue,
  createBlockContext,
  getVariable,
  variableExists,
  evaluateInterpolatedString,
  applyOperator,
  applyUnaryOperator
} = require("./interpreter");

function loadConfig() {
  return yaml.load(fs.readFileSync("configuracion.yml", "utf8"));
}

function parseAndExtract(filePath, context) {
  const code = fs.readFileSync(filePath, 'utf8');
  const ast = parser.parse(code);

  for (const stmt of ast) {
    if (stmt.type === 'Function') {
      if (stmt.name === 'main') {
        throw new Error(`La función main() solo puede estar en el archivo principal`);
      }
      context.functions[stmt.name] = stmt;
    } else if (stmt.type === 'Struct') {
      context.structs[stmt.name] = stmt;
    }
  }
}

function executeMain(mainAst, context) {
  const outputs = [];

  for (const stmt of mainAst) {
    if (stmt.type === 'Import') continue;
    if (stmt.type === 'Function' || stmt.type === 'Struct') continue;

    executeStatement(stmt, context, outputs);
  }

  const mainFunc = context.functions['main'];
  if (!mainFunc) throw new Error("No se encontró función main");

  const mainContext = {
    variables: {},
    functions: context.functions,
    structs: context.structs,
    mainDefined: true
  };

  for (const stmt of mainFunc.body) {
    const result = executeStatement(stmt, mainContext, outputs);
    if (result?.return) break;
  }

  return outputs.join('\n');
}

function run() {
  const config = loadConfig();
  const context = {
    variables: {},
    functions: {},
    structs: {},
    mainDefined: false,
    importedModules: new Set()
  };

  const mainFile = config.main;
  const mainCode = fs.readFileSync(mainFile, 'utf8');
  const mainAst = parser.parse(mainCode);

  for (const stmt of mainAst) {
    if (stmt.type === 'Import') {
      const moduleName = stmt.name;
      if (context.importedModules.has(moduleName)) continue;

      context.importedModules.add(moduleName);

      const files = config[moduleName];
      if (!files) throw new Error(`Módulo ${moduleName} no existe en config.yml`);

      for (const entry of files) {
        const file = Object.values(entry)[0];
        parseAndExtract(file, context);
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

  const output = executeMain(mainAst, context);
  console.log(output);
}

run();