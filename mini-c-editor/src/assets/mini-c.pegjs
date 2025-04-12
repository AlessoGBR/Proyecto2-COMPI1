start
  = _ statements:statement* { return { type: "Program", body: statements }; }

statement
  = variableDeclaration / printStatement

variableDeclaration
  = type:("int" / "float" / "string") _ name:identifier _ "=" _ value:expression _ ";" {
      return { type: "VarDecl", varType: type, name, value };
    }

printStatement
  = "print" _ "(" _ val:expression _ ")" _ ";" {
      return { type: "Print", value: val };
    }

expression
  = value:(number / string / identifier) { return value; }

identifier
  = $([a-zA-Z_][a-zA-Z0-9_]*)

string
  = "\"" chars:[^\"]* "\"" { return { type: "StringLiteral", value: chars.join("") }; }

number
  = value:[0-9]+ ("." [0-9]+)? {
      return { type: "NumberLiteral", value: parseFloat(text()) };
    }

_ "whitespace"
  = [ \t\n\r]*  
