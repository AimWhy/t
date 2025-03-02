let execution = null;
let current = null;
let context = null;
let args = null;

const hooked = callback => {
  const details = { i: 0, stack: [] };

  return function hook() {
    details.i = 0;

    execution = details;
    current = hook;
    context = this;
    args = arguments;

    return callback.apply(context, args);
  };
};

const useState = value => {
  const { i, stack } = execution;
  const hook = current;
  const ctx = context;
  const rest = args;
  
  execution.i++;

  if (i === stack.length) {
    stack.push(value);
  }

  return [
    stack[i],
    value => {
      stack[i] = value;
      hook.apply(ctx, rest);
    }
  ];
};

const toBeWrapped = start => {
  const [num, update] = useState(start);
  console.log(`Counting: ${num}`);
  setTimeout(update, 1000, num + 1);
};

function Counter() {
  return hooked(toBeWrapped).apply(this, arguments);
}

Counter(0);
