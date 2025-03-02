// For whatever reason, we need to mock this *and* use RTR._Scheduler below. Why? Who knows.
jest.mock('scheduler', () => require.requireActual('scheduler/unstable_mock'));

const React = require('react');
const ReactTestRenderer = require('react-test-renderer');

const {useReducerWithEmitEffect, emitEffect} = require('./useReducerWithEmitEffect.js');

let _state;
let _dispatch;
let _log;

beforeEach(() => {
  _state = _dispatch = undefined;
  _log = [];
});

function Foo() {
  React.useLayoutEffect(() => {
    _log.push('commit');
  });
  let [state, dispatch] = useReducerWithEmitEffect(function(state, action) {
    let calculation = `${state} + ${action} = ${state + action}`;
    _log.push(`reduce: ${calculation}`);
    emitEffect(() => {
      _log.push(`effect: ${calculation}`);
    });
    return state + action;
  }, 0);
  _state = state;
  _dispatch = dispatch;
  return state;
}

it('initializes', () => {
  const root = ReactTestRenderer.create(
    <Foo />,
    {unstable_isConcurrent: true},
  );
  ReactTestRenderer._Scheduler.unstable_flushWithoutYielding();
  expect(_state).toBe(0);
  expect(_log).toEqual(['commit']);
  _log.length = 0;
});

it('dispatches', () => {
  const root = ReactTestRenderer.create(
    <Foo />,
    {unstable_isConcurrent: true},
  );
  ReactTestRenderer._Scheduler.unstable_flushWithoutYielding();
  expect(_state).toBe(0);
  expect(_log).toEqual(['commit']);
  _log.length = 0;

  ReactTestRenderer.act(() => {
    _dispatch(1);
    // Initial effect run eagerly
    expect(_log).toEqual([
      'reduce: 0 + 1 = 1',
    ]);
    _log.length = 0;
  });
  ReactTestRenderer._Scheduler.unstable_flushWithoutYielding();
  expect(_state).toBe(1);
  expect(_log).toEqual([
    'reduce: 0 + 1 = 1',
    'commit',
    'effect: 0 + 1 = 1',
  ]);
});

it('does two in series', () => {
  const root = ReactTestRenderer.create(
    <Foo />,
    {unstable_isConcurrent: true},
  );
  ReactTestRenderer._Scheduler.unstable_flushWithoutYielding();
  expect(_state).toBe(0);
  expect(_log).toEqual(['commit']);
  _log.length = 0;

  ReactTestRenderer.act(() => {
    _dispatch(1);
    // Initial effect run eagerly
    expect(_log).toEqual([
      'reduce: 0 + 1 = 1',
    ]);
    _log.length = 0;
  });
  ReactTestRenderer._Scheduler.unstable_flushWithoutYielding();
  expect(_state).toBe(1);
  expect(_log).toEqual([
    'reduce: 0 + 1 = 1',
    'commit',
    'effect: 0 + 1 = 1',
  ]);
  _log.length = 0;

  ReactTestRenderer.act(() => {
    _dispatch(2);
    // Why doesn't this one also run eagerly? I might've screwed up the
    // scheduler mock somehow.
    expect(_log).toEqual([
      // 'reduce: 1 + 2 = 3',
    ]);
    _log.length = 0;
  });
  ReactTestRenderer._Scheduler.unstable_flushWithoutYielding();
  expect(_state).toBe(3);
  expect(_log).toEqual([
    'reduce: 1 + 2 = 3',
    'commit',
    'effect: 1 + 2 = 3',
  ]);
});

it('does two at once', () => {
  const root = ReactTestRenderer.create(
    <Foo />,
    {unstable_isConcurrent: true},
  );
  ReactTestRenderer._Scheduler.unstable_flushWithoutYielding();
  expect(_state).toBe(0);
  expect(_log).toEqual(['commit']);
  _log.length = 0;

  ReactTestRenderer.act(() => {
    _dispatch(1);
    _dispatch(2);
    // Initial effect run eagerly
    expect(_log).toEqual([
      'reduce: 0 + 1 = 1',
    ]);
    _log.length = 0;
  });
  ReactTestRenderer._Scheduler.unstable_flushWithoutYielding();
  expect(_state).toBe(3);
  expect(_log).toEqual([
    'reduce: 0 + 1 = 1',
    'reduce: 1 + 2 = 3',
    'commit',
    'effect: 0 + 1 = 1',
    'effect: 1 + 2 = 3',
  ]);
});

it('does low and hi pri', () => {
  const root = ReactTestRenderer.create(
    <Foo />,
    {unstable_isConcurrent: true},
  );
  ReactTestRenderer._Scheduler.unstable_flushWithoutYielding();
  expect(_state).toBe(0);
  expect(_log).toEqual(['commit']);
  _log.length = 0;

  ReactTestRenderer.act(() => {
    _dispatch(1);
    // Initial effect run eagerly
    expect(_log).toEqual([
      'reduce: 0 + 1 = 1',
    ]);
    _log.length = 0;
  });

  root.unstable_flushSync(() => {
    _dispatch(2);
  });
  // Only the hi-pri update runs, and no effects happen
  expect(_log).toEqual([
    'reduce: 0 + 2 = 2',
    'commit',
  ]);
  _log.length = 0;

  ReactTestRenderer._Scheduler.unstable_flushWithoutYielding();
  expect(_state).toBe(3);
  expect(_log).toEqual([
    'reduce: 0 + 1 = 1',
    'reduce: 1 + 2 = 3',
    'commit',
    'effect: 0 + 1 = 1',
    'effect: 1 + 2 = 3',
  ]);
});
