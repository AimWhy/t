class ESTreeWalker {
  constructor(beforeVisit, afterVisit) {
    this._beforeVisit = beforeVisit;
    this._afterVisit = afterVisit || new Function();
  }

  walk(ast) {
    this._innerWalk(ast, null);
  }

  _innerWalk(node, parent) {
    if (!node) return;
    node.parent = parent;

    if (this._beforeVisit.call(null, node) === ESTreeWalker.SkipSubtree) {
      this._afterVisit.call(null, node);
      return;
    }

    const walkOrder = ESTreeWalker._walkOrder[node.type];
    if (!walkOrder) return;

    if (node.type === 'TemplateLiteral') {
      const templateLiteral = node;
      const expressionsLength = templateLiteral.expressions.length;
      for (let i = 0; i < expressionsLength; ++i) {
        this._innerWalk(templateLiteral.quasis[i], templateLiteral);
        this._innerWalk(templateLiteral.expressions[i], templateLiteral);
      }
      this._innerWalk(
        templateLiteral.quasis[expressionsLength],
        templateLiteral
      );
    } else {
      for (let i = 0; i < walkOrder.length; ++i) {
        const entity = node[walkOrder[i]];
        if (Array.isArray(entity)) {
          this._walkArray(entity, node);
        } else {
          this._innerWalk(entity, node);
        }
      }
    }

    this._afterVisit.call(null, node);
  }

  _walkArray(nodeArray, parentNode) {
    for (let i = 0; i < nodeArray.length; ++i) {
      this._innerWalk(nodeArray[i], parentNode);
    } 
  }
}

ESTreeWalker.SkipSubtree = {};

ESTreeWalker._walkOrder = {
  AwaitExpression: ['argument'],
  ArrayExpression: ['elements'],
  ArrowFunctionExpression: ['params', 'body'],
  AssignmentExpression: ['left', 'right'],
  AssignmentPattern: ['left', 'right'],
  BinaryExpression: ['left', 'right'],
  BlockStatement: ['body'],
  BreakStatement: ['label'],
  CallExpression: ['callee', 'arguments'],
  CatchClause: ['param', 'body'],
  ClassBody: ['body'],
  ClassDeclaration: ['id', 'superClass', 'body'],
  ClassExpression: ['id', 'superClass', 'body'],
  ConditionalExpression: ['test', 'consequent', 'alternate'],
  ContinueStatement: ['label'],
  DebuggerStatement: [],
  DoWhileStatement: ['body', 'test'],
  EmptyStatement: [],
  ExpressionStatement: ['expression'],
  ForInStatement: ['left', 'right', 'body'],
  ForOfStatement: ['left', 'right', 'body'],
  ForStatement: ['init', 'test', 'update', 'body'],
  FunctionDeclaration: ['id', 'params', 'body'],
  FunctionExpression: ['id', 'params', 'body'],
  Identifier: [],
  IfStatement: ['test', 'consequent', 'alternate'],
  LabeledStatement: ['label', 'body'],
  Literal: [],
  LogicalExpression: ['left', 'right'],
  MemberExpression: ['object', 'property'],
  MethodDefinition: ['key', 'value'],
  NewExpression: ['callee', 'arguments'],
  ObjectExpression: ['properties'],
  ObjectPattern: ['properties'],
  ParenthesizedExpression: ['expression'],
  Program: ['body'],
  Property: ['key', 'value'],
  ReturnStatement: ['argument'],
  SequenceExpression: ['expressions'],
  Super: [],
  SwitchCase: ['test', 'consequent'],
  SwitchStatement: ['discriminant', 'cases'],
  TaggedTemplateExpression: ['tag', 'quasi'],
  TemplateElement: [],
  TemplateLiteral: ['quasis', 'expressions'],
  ThisExpression: [],
  ThrowStatement: ['argument'],
  TryStatement: ['block', 'handler', 'finalizer'],
  UnaryExpression: ['argument'],
  UpdateExpression: ['argument'],
  VariableDeclaration: ['declarations'],
  VariableDeclarator: ['id', 'init'],
  WhileStatement: ['test', 'body'],
  WithStatement: ['object', 'body'],
  YieldExpression: ['argument'],
};

module.exports = ESTreeWalker;
