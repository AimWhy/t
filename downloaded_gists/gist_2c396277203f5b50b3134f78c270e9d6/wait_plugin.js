class VueWait {
  constructor (Vue) {
    this.initialized = false
    this.init(Vue)
  }

  init (Vue) {
    if (!this.initialized) {
      this.stateHandler = new Vue({
        data () {
          return {
            waitingFor: [],
            progresses: {},
          }
        },
        computed: {
          is () {
            return waiter => Array.isArray(waiter) ? this.waitingFor.some(w => waiter.includes(w)) : this.waitingFor.includes(waiter)
          },
          any () {
            return this.waitingFor.length
          },
          percent () {
            return waiter => !this.progresses[waiter] ? 0 : this.progresses[waiter].percent
          }
        },
        methods: {
          start (waiter) {
            if (!this.waitingFor.includes(waiter)) {
              this.waitingFor.push(waiter)
            }
          },
          end (waiter) {
            this.waitingFor = this.waitingFor.filter(function (item) { return item !== waiter })
            this.$delete(this.progresses, waiter)
          },
          progress ({ waiter, current, total }) {
            if (current > total) {
              this.$delete(this.progresses, waiter)
            } else {
              this.$set(this.progresses, waiter, { current, total, percent: (100 * current) / total })
            }
          }
        }
      })
    }
    this.initialized = true
  }

  get any () {
    return this.stateHandler.any
  }

  is (waiter) {
    return this.stateHandler.is(waiter)
  }

  percent (waiter) {
    return this.stateHandler.percent(waiter)
  }

  start (waiter) {
    this.stateHandler.start(waiter)
  }

  end (waiter) {
    this.stateHandler.end(waiter)
  }

  progress (waiter, current, total = 100) {
    if (!this.is(waiter)) {
      this.start(waiter)
    }

    if (current > total) {
      this.end(waiter)
    } else {
      this.stateHandler.progress({
        waiter,
        current,
        total
      })
    }
  }
}

function install (Vue) {
  if (!install.installed && Vue) {
    Vue.mixin({
      beforeCreate () {
        const { wait, parent } = this.$options
        if (wait) {
          this.$wait = (typeof wait === 'function') ? new wait(Vue) : wait  // eslint-disable-line
        } else if (parent && parent.$wait) {
          this.$wait = parent.$wait
        }
      }
    })
  }
  install.installed = true
}

VueWait.install = install
export default VueWait
