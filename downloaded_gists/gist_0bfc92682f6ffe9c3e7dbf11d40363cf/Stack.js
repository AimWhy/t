class Stack {
  constructor() {
    this.stack = [];
    this.top = 0;
  }
  push(newValue) {
    this.stack.push(newValue);
    this.top += 1;
  }
  pop() {
    if (this.top !== 0) {
      this.top -= 1;
      return this.stack.pop();
    }
    throw new Error('Stack Underflow');
  }
  get length() {
    return this.top;
  }
  get isEmpty() {
    return this.top === 0;
  }
  get last() {
    if (this.top !== 0) {
      return this.stack[this.stack.length - 1];
    }
    return null;
  }
  static isStack(el) {
    return el instanceof Stack;
  }
}
export { Stack };
