function getTrue () { return true }
function getSelf (item) { return item }

export default {
  data () {
    return {
      queryCount: 0,
      queryLinq: {}
    }
  },
  beforeCreate () {
    const syncQuery = this.$options.syncQuery
    if (syncQuery) {
      this.$options.computed = this.$options.computed || {}
      Object.keys(syncQuery).forEach(key => {
        let itemInfo = syncQuery[key]
        if (!itemInfo || (typeof itemInfo !== 'object')) {
          itemInfo = { default: itemInfo }
        }
        const queryKey = itemInfo.alias || key
        const convertVal = itemInfo.type || getSelf
        const beforeSet = itemInfo.beforeSet || getTrue
        this.$options.computed[key] = {
          get () {
            return convertVal(this.$route.query[queryKey] || itemInfo.default)
          },
          set (v1) {
            const checkResult = beforeSet.call(this, v1, this[key])
            this.queryCount ++
            Promise.resolve(checkResult).then(v => {
              if (v !== false) {
                this.queryLinq[queryKey] = v1
              }
              this.queryCount --
              if (!this.queryCount) {
                var p = this.queryLinq
                this.queryLinq = {}
                this.$router.replace({
                  name: this.$route.name,
                  query: { ...this.$route.query,
                    ...p
                  },
                  params: this.$route.params,
                  meta: this.$route.meta
                })
              }
            })
          }
        }
      })
    }
  }
}