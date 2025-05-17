start
  = _ program:statements _ {
        return program;
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
      return name;
    }
// PARA DECLARAR UN STRUCT CON LLAVES
structDecl
  = "struct" __ structName:identifier __ varName:identifier _ "=" _ "{" _ values:expressionList _ "}" _ ";" {
      return { 
        type: "StructDecl", 
        structType: structName, 
        name: varName,
        values: values
      };
    }
  / "struct" __ structName:identifier __ varName:identifier _ ";" {
      return { 
        type: "StructDecl", 
        structType: structName,
        name: varName,
        values: []
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
  = "struct" __ name:identifier _ "{" __ fields:structField* _ "}" {
      return { 
        type: "Struct", 
        name, 
        fields: fields.flat() 
      };
    }

structField
  = type:dataType _ names:identifierList _ ";" {
      return names.map(name => ({
        type: "Field",
        varType: type,
        name
      }));
    }

identifierList
  = head:identifier tail:(_ "," _ identifier)* {
      return [head, ...tail.map(x => x[3])];
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
  / logicOrExpr

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
  = funcCall
  / boolean
  / interpolatedString
  / string
  / character
  / structFieldAccess
  / number
  / id:identifier { return { type: "Identifier", name: id }; }
  / "(" _ expr:expression _ ")" { return expr; }

structFieldAccess
  = struct:identifier "." field:identifier {
      return { type: "StructFieldAccess", struct, field };
    }

funcCall
  = module:identifier "." func:identifier _ "(" _ args:expressionList? _ ")" {
      return { type: "FunctionCall", module, name: func, args: args || [] };
    }
  / name:identifier _ "(" _ args:expressionList? _ ")" {
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
  = value:float { return { type: "Number", value, numberType: "float" }; }
  / value:int { return { type: "Number", value, numberType: "int" }; }

int
  = digits:[0-9]+ { return parseInt(digits.join(""), 10); }

float
  = intPart:[0-9]+ "." fracPart:[0-9]+ {
      return parseFloat(intPart.join("") + "." + fracPart.join(""));
    }

_ = [ \t\n\r]*
__ = [ \t\n\r]