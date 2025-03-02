export default class StateChangeEvent extends Event {
  constructor (type, initDict) {
    super(type)
    this.newState = initDict.newState
    this.oldState = initDict.oldState
    this.originalEvent = initDict.originalEvent
  }
}