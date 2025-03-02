import StateChangeEvent from './StateChangeEvent.mjs'

const ACTIVE = 'active'
const PASSIVE = 'passive'
const HIDDEN = 'hidden'
const FROZEN = 'frozen'
const TERMINATED = 'terminated'

const IS_SAFARI = typeof window.safari === 'object' && window.safari.pushNotification

const SUPPORTS_PAGE_TRANSITION_EVENTS = 'onpageshow' in self

const EVENTS = [
  'focus',
  'blur',
  'visibilitychange',
  'freeze',
  'resume',
  'pageshow',
  SUPPORTS_PAGE_TRANSITION_EVENTS ? 'pagehide' : 'unload',
]

const onbeforeunload = (evt) => {
  evt.preventDefault()
  evt.returnValue = 'Are you sure?'
  return evt.returnValue
}

const toIndexedObject = (arr) => arr.reduce((acc, val, idx) => {
  acc[val] = idx
  return acc
}, {})

const LEGAL_STATE_TRANSITIONS = [
  // The normal unload process (bfcache process is addressed above).
  [ACTIVE, PASSIVE, HIDDEN, TERMINATED],

  // An active page transitioning to frozen,
  // or an unloading page going into the bfcache.
  [ACTIVE, PASSIVE, HIDDEN, FROZEN],

  // A hidden page transitioning back to active.
  [HIDDEN, PASSIVE, ACTIVE],

  // A frozen page being resumed
  [FROZEN, HIDDEN],

  // A frozen (bfcached) page navigated back to
  // Note: [FROZEN, HIDDEN] can happen here, but it's already covered above.
  [FROZEN, ACTIVE],
  [FROZEN, PASSIVE],
].map(toIndexedObject)

const getLegalStateTransitionPath = (oldState, newState) => {
  for (let i = 0; LEGAL_STATE_TRANSITIONS[i]; ++i) {
    const order = LEGAL_STATE_TRANSITIONS[i]
    const oldIndex = order[oldState]
    const newIndex = order[newState]

    if (oldIndex >= 0 && newIndex >= 0 && newIndex > oldIndex) {
      return Object.keys(order).slice(oldIndex, newIndex + 1)
    }
  }
  return []
}

const getCurrentState = () => {
  if (document.visibilityState === HIDDEN) {
    return HIDDEN
  }
  if (document.hasFocus()) {
    return ACTIVE
  }
  return PASSIVE
}

export default class Lifecycle extends EventTarget {
  constructor () {
    super()

    const state = getCurrentState()

    this._state = state
    this._unsavedChanges = []

    this._handleEvents = this._handleEvents.bind(this)

    EVENTS.forEach((evt) => addEventListener(evt, this._handleEvents, true))

    if (IS_SAFARI) {
      addEventListener('beforeunload', (evt) => {
        this._safariBeforeUnloadTimeout = setTimeout(() => {
          if (!(evt.defaultPrevented || evt.returnValue.length > 0)) {
            this._dispatchChangesIfNeeded(evt, HIDDEN)
          }
        }, 0)
      })
    }
  }

  get state () {
    return this._state
  }

  get pageWasDiscarded () {
    return document.wasDiscarded || false
  }

  addUnsavedChanges (id) {
    if (!this._unsavedChanges.indexOf(id) > -1) {
      if (this._unsavedChanges.length === 0) {
        addEventListener('beforeunload', onbeforeunload)
      }
      this._unsavedChanges.push(id)
    }
  }

  removeUnsavedChanges (id) {
    const idIndex = this._unsavedChanges.indexOf(id)

    if (idIndex > -1) {
      this._unsavedChanges.splice(idIndex, 1)
      if (this._unsavedChanges.length === 0) {
        removeEventListener('beforeunload', onbeforeunload)
      }
    }
  }

  _dispatchChangesIfNeeded (originalEvent, newState) {
    if (newState !== this._state) {
      const oldState = this._state
      const path = getLegalStateTransitionPath(oldState, newState)

      for (let i = 0; i < path.length - 1; ++i) {
        const oldState = path[i]
        const newState = path[i + 1]

        this._state = newState
        this.dispatchEvent(new StateChangeEvent('statechange', { oldState, newState, originalEvent }))
      }
    }
  }

  _handleEvents (evt) {
    if (IS_SAFARI) {
      clearTimeout(this._safariBeforeUnloadTimeout)
    }

    switch (evt.type) {
      case 'pageshow':
      case 'resume':
        return this._dispatchChangesIfNeeded(evt, getCurrentState())
      case 'focus':
        return this._dispatchChangesIfNeeded(evt, ACTIVE)
      case 'blur':
        return (this._state === ACTIVE) ? this._dispatchChangesIfNeeded(evt, getCurrentState()) : undefined
      case 'pagehide':
      case 'unload':
        return this._dispatchChangesIfNeeded(evt, evt.persisted ? FROZEN : TERMINATED)
      case 'visibilitychange':
        return (this._state !== FROZEN && this._state !== TERMINATED) ? this._dispatchChangesIfNeeded(evt, getCurrentState()) : undefined
      case 'freeze':
        return this._dispatchChangesIfNeeded(evt, FROZEN)
    }
  }
}
