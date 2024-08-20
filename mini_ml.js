let tokenize = (code) => {
  let types = {
    if: /^if\b/,
    then: /^then\b/,
    else: /^else\b/,
    let: /^let\b/,
    in: /^in\b/,
    fun: /^fun\b/,
    raise: /^raise\b/,
    id: /^[a-zA-Z_][a-zA-Z0-9_]*/,
    number: /^[0-9]+/,
    arrow: /^->/,
    lparen: /^\(/,
    rparen: /^\)/,
    plus: /^\+/,
    minus: /^-/,
    times: /^\*/,
    divide: /^\//,
    eq: /^=/,
    lt: /^</,
    gt: /^>/,
    not: /^!/,
    newline: /^\n/,
  };

  let tokens = [];
  let pos = 0;

  while (pos < code.length) {
    while (/\s/.test(code[pos]) && code[pos] !== "\n") pos++; // skip whitespace
    if (pos >= code.length) break; // end of code

    let match;
    for (let type in types) {
      if ((match = types[type].exec(code.slice(pos)))) {
        // we found a match
        if (type !== "newline") {
          // skip newline tokens
          tokens.push({ type, value: match[0] });
        }
        // continue from the end of the match
        pos += match[0].length;
        break;
      }
    }

    if (!match) {
      // no match found; unexpected character
      throw new Error("Unexpected character: " + code[pos]);
    }
  }

  return tokens;
};

let parse = (tokens) => {
  let current = 0;
  let peek = () => tokens[current]; // peek at the current token
  let consume = () => tokens[current++]; // consume a token
  let consumeType = (type) => {
    // consume a token of a specific type
    let token = peek();
    if (token.type !== type) {
      throw new SyntaxError(`Expected ${type}, got ${token.type}`);
    }
    return consume();
  };

  let parseAtom = () => {
    // parse an atom (a non-application expression)
    let token = consume();
    switch (token.type) {
      case "number":
        return { type: "int", value: token.value };

      case "id":
        return { type: "id", value: token.value };

      case "true":
        return { type: "true" };

      case "false":
        return { type: "false" };

      case "if":
        let condition = parseExp();
        consumeType("then");
        let trueExpr = parseExp();
        consumeType("else");
        let falseExpr = parseExp();
        return { type: "if", condition, trueExpr, falseExpr };

      case "let":
        let id = consumeType("id").value;
        consumeType("eq");
        let value = parseExp();
        consumeType("in");
        let body = parseExp();
        return { type: "let", id, value, body };

      case "fun":
        let funId = consumeType("id").value;
        consumeType("arrow");
        let funBody = parseExp();
        return { type: "fun", id: funId, body: funBody };

      case "raise":
        return { type: "raise" };

      case "lparen":
        let exp = parseExp();
        consumeType("rparen");
        return exp;

      default:
        throw new Error("Unexpected token: " + token.value);
    }
  };

  let peekAtom = () =>
    // check if the next token indicates the beginning of an atom
    [
      "number",
      "id",
      "true",
      "false",
      "if",
      "let",
      "fun",
      "raise",
      "lparen",
    ].includes(peek()?.type);

  let peekOp = () =>
    ["plus", "minus", "times", "divide", "eq", "lt", "gt"].includes(
      peek()?.type,
    );

  let parseExp = () => {
    // parse an expression (possibly an application)
    let exp = parseAtom();
    while (peekAtom()) {
      exp = { type: "app", left: exp, right: parseAtom() };
    }
    while (peekOp()) {
      // binary operators
      let op = consume().value;
      let right = parseExp();
      exp = { type: op, value: exp, right };
    }
    return exp;
  };

  return parseExp();
};

let compile = (ast) => {
  switch (ast.type) {
    case "int": // integer
      return ast.value.toString();

    case "id": // variable
      return ast.value;

    case "true": // boolean
      return "true";

    case "false": // boolean
      return "false";

    case "if": // conditional
      return `(${compile(ast.condition)} ? ${compile(ast.trueExpr)} : ${compile(ast.falseExpr)})`;

    case "let": // variable binding
      return `((${ast.id} = ${compile(ast.value)}) => ${compile(ast.body)})()`;

    case "fun": // lambda
      return `(${ast.id} => ${compile(ast.body)})`;

    case "raise": // exception
      return "(() => { throw new Error(); })()";

    case "app": // function application
      return `${compile(ast.left)}(${compile(ast.right)})`;

    default: // binary operators
      return `${compile(ast.value)} ${ast.type} ${compile(ast.right)}`;
  }
};

let miniML = (code) => {
  // main function
  let tokens = tokenize(code);
  let ast = parse(tokens);
  return compile(ast);
};

let code = `
  let fib = fun n ->
    if n < 2 then
      n
    else
      fib (n - 1) + fib (n - 2)
  in
    fib 10
`;

let result = miniML(code);
console.log(result, "=>", eval(result));
