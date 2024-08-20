/*
  tokenize takes a string of code and returns an array of tokens.
  each token is a "piece" of the code. this makes processing the code easier.
*/
let tokenize = (code) => {
  let pos = 0; // Current position in the code
  let tokens = []; // Array of tokens

  // Iterate through the input code
  while (pos < code.length) {
    switch (code[pos]) {
      // Characters to ignore
      case " ":
      case "\n":
      case "\t":
        pos++; // Move to the next character
        continue;

      // Our single-character tokens
      case "+":
      case "-":
      case "*":
      case "/":
      case "(":
      case ")":
      case "=":
      case "<":
      case ">":
        tokens.push(code[pos]); // Add the token to the array
        pos++;
        continue;

      // A possible multi-character token
      case "!":
        if (code[pos + 1] === "=") {
          tokens.push("!=");
          pos += 2;
          continue;
        } else {
          // We don't have a token for just "!"
          throw new Error("Unknown token: '" + code[pos] + "'");
        }

      // A label (prefix colon for simplicity)
      case ":":
        let label = "";
        pos++; // Skip the colon
        // Keep adding characters to the label until we reach a non-alphanumeric character
        while (code[pos]?.match(/[a-zA-Z0-9]/)) {
          // Use ? to stop incase we reach the end of the input
          // Alphanumeric characters
          label += code[pos]; // Keep adding characters to the label
          pos++;
        }
        tokens.push(":" + label); // Pre-pend the colon to the label to signify it's a label
        continue;

      // A string
      case '"':
        let str = "";
        pos++; // Skip the opening quote
        while (code[pos] !== '"') {
          str += code[pos]; // Keep adding characters until we reach the closing quote
          pos++;
        }
        tokens.push('"' + str + '"'); // Add quotes to the string to signify it's a string token
        pos++;
        continue;

      // Everything else
      default:
        // Is it a number?
        if (code[pos].match(/[0-9]/)) {
          let num = "";
          while (code[pos]?.match(/[0-9]/)) {
            num += code[pos];
            pos++;
          }
          tokens.push(parseInt(num));
          continue;
        }

        // Is it a variable or a keyword?
        if (code[pos].match(/[a-zA-Z]/)) {
          let word = "";
          while (code[pos]?.match(/[a-zA-Z0-9]/)) {
            word += code[pos];
            pos++;
          }
          tokens.push(word);
          continue;
        }
        // If we reach this point, we have an unknown token
        throw new Error("Unknown token: '" + code[pos] + "'");
    }
  }

  return tokens;
};

/*
  parse takes an array of tokens and returns an abstract syntax tree (AST) representing the code.
  the AST is a set of objects that describe what a program does.
*/
let parse = (tokens) => {
  let pos = 0; // Current position in the tokens
  let currentToken = tokens[pos]; // The current token

  // Helper function to move to the next token
  let next = () => {
    currentToken = tokens[++pos]; // Move to the next token
  };

  // Helper function to check if the current token is of a certain type
  let check = (type) => {
    switch (type) {
      case "number":
        return typeof currentToken === "number"; // Numbers are JavaScript numbers
      case "identifier":
        return (
          typeof currentToken === "string" && currentToken.match(/[a-zA-Z]/)
        ); // Identifiers start with a letter
      case "string":
        return typeof currentToken === "string" && currentToken[0] === '"'; // Strings start with a quote
      case "label":
        return typeof currentToken === "string" && currentToken[0] === ":"; // Labels start with a colon
      case "operator":
        return [">", "<", "=", "!="].includes(currentToken); // Binary operators are >, <, =, and !
      default:
        return currentToken === type;
    }
  };

  // Helper function to consume a token of a certain type
  let consume = (type) => {
    if (check(type)) {
      let token = currentToken;
      next();
      return token;
    } else {
      throw new Error("Unexpected token: " + currentToken);
    }
  };

  // Helper function to parse an expression
  // An expression is a term followed by zero or more + or - and another term
  let parseExpression = () => {
    let left = parseTerm(); // Parse the first term
    while (check("+") || check("-")) {
      let operator = consume(currentToken); // Consume the operator
      let right = parseTerm(); // Parse the right-hand term
      left = { type: "binary", operator, left, right }; // Create a binary node
    }
    return left;
  };

  // Helper function to parse a term
  // A term is a factor followed by zero or more * or / and another factor
  let parseTerm = () => {
    let left = parseFactor(); // Parse the first factor
    while (check("*") || check("/")) {
      let operator = consume(currentToken); // Consume the operator
      let right = parseFactor(); // Parse the right-hand factor
      left = { type: "binary", operator, left, right }; // Create a binary node
    }
    return left;
  };

  // Helper function to parse a factor
  // A factor is a number, a string, a variable, or an expression in parentheses
  let parseFactor = () => {
    if (check("number")) {
      return { type: "number", value: consume("number") }; // Return a number node
    } else if (check("string")) {
      return { type: "string", value: consume("string") }; // Return a string node
    } else if (check("identifier")) {
      return { type: "identifier", name: consume("identifier") }; // Return a variable node
    } else if (check("(")) {
      consume("("); // Consume the opening parenthesis
      let expression = parseExpression(); // Parse the expression
      consume(")"); // Consume the closing parenthesis
      return expression;
    } else if (check("+") || check("-")) {
      // Check for unary + or -
      let operator = consume(currentToken); // Consume the operator
      let right = parseFactor(); // Parse the factor
      return { type: "unary", operator, right }; // Create a unary node
    } else {
      throw new Error("Unexpected token: " + currentToken);
    }
  };

  // Helper function to parse a statement
  // A statement can be an assignment, if/then/else, a goto, a print, or a label
  let parseStatement = () => {
    // Print statement
    if (check("print")) {
      consume("print"); // Consume the print keyword
      let expression = parseExpression(); // Parse the expression
      return { type: "print", expression }; // Return a print node
    }

    // Goto statement
    if (check("goto")) {
      consume("goto"); // Consume the goto keyword
      let label = consume("label"); // Consume the label
      return { type: "goto", label }; // Return a goto node
    }

    // If/then/else statement
    if (check("if")) {
      consume("if"); // Consume the if keyword
      let left = parseExpression(); // Parse the left-hand side of the condition
      let operator = consume("operator"); // Consume the equality operator
      let right = parseExpression(); // Parse the right-hand side of the condition
      consume("then"); // Consume the then keyword
      let trueBranch = parseStatement(); // Parse the true branch
      if (check("else")) {
        // Check for an else branch
        consume("else"); // Consume the else keyword
        let falseBranch = parseStatement(); // Parse the false branch
        return {
          type: "if",
          condition: { left, operator, right },
          trueBranch,
          falseBranch,
        }; // Return an if node
      }
      return { type: "if", condition: { left, operator, right }, trueBranch }; // Return an if node
    }

    // Label statement
    if (check("label")) {
      let label = consume("label"); // Consume the label
      return { type: "label", label }; // Return a label node
    }

    // We've exhausted all other possibilities, so it must be an assignment
    let identifier = consume("identifier"); // Consume the identifier
    consume("="); // Consume the equals sign
    let expression = parseExpression(); // Parse the expression
    return { type: "assignment", identifier, expression }; // Return an assignment node
  };

  let statements = [];
  // Parse all the statements in the program
  while (pos < tokens.length) {
    statements.push(parseStatement());
  }

  return statements;
};

/*
  interpret "crawls" (operates on) the AST and executes the program
  it takes the AST and performs the actions that the AST describes
*/
let interpret = (ast) => {
  let variables = {}; // Variables are stored in an object
  let pos = 0; // The current position in the program

  // Helper function to evaluate an expression
  // An expression can be a number, a string, a variable, or a binary/unary operation
  let evaluate = (node) => {
    switch (node.type) {
      // Numbers
      case "number":
        return node.value; // Return the number value

      // Strings
      case "string":
        return node.value.slice(1, -1); // Return the string (removing the quotes)

      // Unary expressions
      case "unary":
        switch (node.operator) {
          case "+": // Plus operator
            return +evaluate(node.right);
          case "-": // Negation operator
            return -evaluate(node.right);
        }

      // Binary expressions
      case "binary":
        switch (node.operator) {
          case "+":
            return evaluate(node.left) + evaluate(node.right);
          case "-":
            return evaluate(node.left) - evaluate(node.right);
          case "*":
            return evaluate(node.left) * evaluate(node.right);
          case "/":
            return evaluate(node.left) / evaluate(node.right);
        }

      // Variables
      case "identifier":
        if (variables[node.name] === undefined) {
          throw new Error(`Variable ${node.name} is not defined`);
        }
        return variables[node.name];
    }
  };

  // Helper function to execute a statement
  // A statement can be an assignment, if/then/else, a goto, a print, or a label
  let execute = (node) => {
    switch (node.type) {
      // Assignment
      case "assignment":
        variables[node.identifier] = evaluate(node.expression); // Evaluate the expression and assign it to the variable
        return pos + 1; // Move to the next statement

      // If/then/else
      case "if":
        let { left, operator, right } = node.condition;
        let condition; // The result of the condition
        switch (operator) {
          case ">":
            condition = evaluate(left) > evaluate(right); // Greater than
            break;
          case "<":
            condition = evaluate(left) < evaluate(right); // Less than
            break;
          case "=":
            condition = evaluate(left) === evaluate(right); // Equal to
            break;
          case "!=":
            condition = evaluate(left) !== evaluate(right); // Not equal to
            break;
        }

        if (condition) {
          return execute(node.trueBranch); // Execute the true branch
        } else {
          return node.falseBranch ? execute(node.falseBranch) : pos + 1; // Execute the false branch if it exists
        }

      // Goto
      case "goto":
        return variables[node.label]; // Return the position of the label

      // Print
      case "print":
        console.log(evaluate(node.expression)); // Evaluate the expression and print the result
        return pos + 1; // Move to the next statement

      // Label
      case "label":
        variables[node.label] = pos; // Store the position of the label in the variables object
        return pos + 1; // Move to the next statement

      // Assignment
      case "assignment":
        variables[node.identifier] = evaluate(node.expression); // Evaluate the expression and assign it to the variable
    }
  };

  // Execute the statements in the program
  // The program ends when the position is equal to the number of statements
  while (pos != ast.length) {
    pos = execute(ast[pos]);
  }
};

// test program
let code = `
  a = 0
  b = 1
  n = 10
  :loop
  c = a + b
  a = b
  b = c
  n = n - 1
  print a
  if n > 0 then
    goto :loop
  else
    print "Done!"
`;

// here we see the final pipeline: tokenize, parse, interpret.
// each stage feeds the next, and the final result is the executed program.
let tokens = tokenize(code);
let ast = parse(tokens);
interpret(ast);
