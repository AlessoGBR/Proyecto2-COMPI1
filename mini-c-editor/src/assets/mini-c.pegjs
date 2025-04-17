  start
    = _ statements:(statement _)* {
        return { type: "Program", body: statements.map(([stmt]) => stmt) };
      }

  statement
    = varDecl
    / printStmt
    / funcDecl
    / structDecl
    / ifStmt
    / forStmt
    / exprStmt

  varDecl
    = type:("int" / "float" / "string" / "char" / "bool") _ name:identifier _ "=" _ value:expression _ ";" {
        return { type: "VarDecl", varType: type, name, value };
      }

  printStmt
    = "print" _ "(" _ val:expression _ ")" _ ";" {
        return { type: "Print", value: val };
      }

  funcDecl
    = ret:("void" / "int" / "float" / "string") _ name:identifier _ "(" _ params:parameterList? _ ")" _ "{" _ body:(statement _)* _ "}" {
        return { type: "Function", returnType: ret, name, params: params || [], body: body.map(([s]) => s) };
      }

  parameterList
    = head:parameter tail:(_ "," _ parameter)* {
        return [head, ...tail.map(t => t[3])];
      }

  parameter
    = type:("int" / "float" / "string") _ name:identifier {
        return { type: "Parameter", varType: type, name };
      }

  structDecl
    = "struct" _ name:identifier _ "{" _ fields:structField* _ "}" {
        return { type: "Struct", name, fields };
      }

  structField
    = type:("int" / "float" / "string") _ name:identifier _ ";" {
        return { type: "Field", varType: type, name };
      }

  ifStmt
    = "if" _ "(" _ cond:expression _ ")" _ "{" _ thenBranch:statement* _ "}" _ ("else" _ "{" _ elseBranch:statement* _ "}")? {
        return { type: "If", condition: cond, thenBranch, elseBranch: elseBranch ? elseBranch[3] : [] };
      }

  forStmt
    = "for" _ "(" _ init:varDecl _ cond:expression _ ";" _ update:expression _ ")" _ "{" _ body:(statement _)* _ "}" {
        return { type: "For", init, condition: cond, update, body: body.map(([s]) => s) };
      }


  exprStmt
    = expr:expression _ ";" {
        return { type: "ExpressionStatement", expression: expr };
      }

  expression
    = interpolatedString
    / logicExpr

  interpolatedString
    = "\"" chars:([^\"] / interpolation)* "\"" {
        return { type: "StringLiteral", value: chars.map(c => typeof c === 'string' ? c : c.expr).join('') };
      }

  interpolation
    = "${" expr:identifier "}" { return { expr }; }

  logicExpr
    = left:arithExpr _ op:("==" / "!=" / ">" / "<" / ">=" / "<=") _ right:arithExpr {
        return { type: "BinaryExpr", op, left, right };
      }
    / arithExpr

  arithExpr
    = left:term _ op:("+" / "-") _ right:term {
        return { type: "BinaryExpr", op, left, right };
      }
    / term

  term
    = left:factor _ op:("*" / "/") _ right:factor {
        return { type: "BinaryExpr", op, left, right };
      }
    / factor

  factor
    = number / string / identifier / "(" _ expression _ ")"

  identifier
    = $([a-zA-Z_][a-zA-Z0-9_]*)

  string
    = "\"" chars:[^\"]* "\"" { return { type: "String", value: chars.join("") }; }

  number
    = value:[0-9]+ ("." [0-9]+)? { return { type: "Number", value: parseFloat(text()) }; }

  _ "whitespace"
    = [ \t\n\r]*  
