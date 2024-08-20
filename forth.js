let env = {
  // the "dictionary": a word and its definition. (a word is a function)
  "+": () => stack.push(stack.pop() + stack.pop()), // pop the last two elements, add them, and push the result.
  "-": () => {
    let a = stack.pop();
    let b = stack.pop();
    stack.push(b - a); // pop the last two elements, subtract the first from the second, and push the result.
  },
  "*": () => stack.push(stack.pop() * stack.pop()),
  "/": () => {
    let a = stack.pop();
    let b = stack.pop();
    stack.push(b / a); // pop the last two elements, divide the second by the first, and push the result.
  },
  ".": () => console.log(stack.pop()), // pop the last element and print it.
  "<": () => stack.push(stack.pop() >= stack.pop()),
  "=": () => stack.push(stack.pop() === stack.pop()),
  ">": () => stack.push(stack.pop() <= stack.pop()),
  "!": () => stack.push(!stack.pop()),
  dup: () => stack.push(stack[stack.length - 1]), // duplicate the last element.
  drop: () => stack.pop(), // remove the last element.
  swap: () => {
    // swap the last two elements.
    let a = stack.pop();
    let b = stack.pop();
    stack.push(a);
    stack.push(b);
  },
};

let stack = []; // the operating stack.

let execute = (tokens) => {
  for (let i = 0; i < tokens.length; i++) {
    // iterate through the tokens
    switch (tokens[i]) {
      // an "immediate" word is executed immediately. it doesn't go on the stack.
      case ":": // define a new word
        let name = tokens[++i]; // the name of the word
        let body = []; // the body of the word
        while (tokens[++i] !== ";") {
          body.push(tokens[i]); // add each token to the body. semicolon ends the word.
        }
        env[name] = () => execute(body); // define the word in the dictionary. we just execute the body.
        break;
      case "if": // <cond> if <true> else <false> then
        let condition = stack.pop();
        let trueBranch = [];
        let falseBranch = [];
        while (tokens[++i] !== "else") {
          trueBranch.push(tokens[i]); // add each token to the true branch
        }
        while (tokens[++i] !== "then") {
          falseBranch.push(tokens[i]); // add each token to the false branch
        }
        execute(condition ? trueBranch : falseBranch);
        break;
      default:
        if (env[tokens[i]]) {
          env[tokens[i]](); // if the token is in the dictionary, execute it.
        } else {
          stack.push(parseFloat(tokens[i])); // numbers are just immediately pushed onto the stack.
        }
    }
  }
};

let code = `
  : fact
    dup 1 > if
      dup 1 - fact
      *
    else
      drop 1
    then ;
  6 fact .
`;

let tokens = code.trim().split(/\s+/); // split the code into tokens. in forth, tokens are separated by whitespace.
execute(tokens);
