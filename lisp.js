// Turn the code into an S-expression
let parse = (code) => {
  // Split the code into tokens
  let tokens = code
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ");

  // Parse s-expressions
  let parseTokens = (tokens) => {
    if (tokens.length === 0) {
      // If there are no more tokens
      throw new SyntaxError("Unexpected EOF");
    }

    let token = tokens.shift();
    if (token === "(") {
      // Start of a list
      let list = [];
      while (tokens[0] !== ")") {
        list.push(parseTokens(tokens)); // Add each element to the list
      }
      tokens.shift();
      return list;
    } else if (token === ")") {
      // Began parsing a list but found a )
      throw new SyntaxError("Unexpected )");
    } else {
      return isNaN(token) ? token : parseFloat(token); // Return the token as a number or symbol
    }
  };
  return parseTokens(tokens);
};

let env = {
  // Operators
  "+": (a, b) => a + b,
  "-": (a, b) => a - b,
  "*": (a, b) => a * b,
  "/": (a, b) => a / b,
  ">": (a, b) => a > b,
  "<": (a, b) => a < b,
  "=": (a, b) => a === b,

  print: (...args) => console.log(...args),
  begin: (...args) => args[args.length - 1],
};

/*
  x is an expression: it can be a number, a string, or a list.
  env is an object that maps variable names to values.
*/
let evaluate = (x, env) => {
  if (typeof x === "string") {
    // Variable reference
    return env[x];
  } else if (typeof x === "number") {
    return x; // Number literal
  } else if (x[0] === "define") {
    // Variable definition
    let name = x[1];
    let value = x[2];
    env[name] = evaluate(value, env); // Evaluate the value and store it in the environment
  } else if (x[0] === "if") {
    // Conditional
    let condition = x[1];
    let trueExpr = x[2];
    let falseExpr = x[3];
    return evaluate(condition, env) // Evaluate the condition
      ? evaluate(trueExpr, env) // Evaluate the true expression if the condition is true
      : evaluate(falseExpr, env); // Evaluate the false expression otherwise
  } else if (x[0] === "lambda") {
    let args = x[1]; // Arguments
    let body = x[2]; // Body
    return (...argsValues) => {
      let newEnv = { ...env }; // Create a new environment
      args.forEach((arg, index) => {
        newEnv[arg] = argsValues[index]; // Bind the arguments to the values
      });
      return evaluate(body, newEnv); // Evaluate
    };
  } else {
    let [fn, ...args] = x.map((arg) => evaluate(arg, env)); // Evaluate the function and arguments
    return fn(...args); // Apply the function
  }
};

let code = `
  (begin
    (define fib (lambda (n)
      (if (< n 2) n
        (+ (fib (- n 1))
           (fib (- n 2))))))
    (print (fib 10)))
  `;

let ast = parse(code);
evaluate(ast, env);
