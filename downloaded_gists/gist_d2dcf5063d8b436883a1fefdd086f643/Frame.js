export default {
  name: "Frame",
  functional: true,
  props: {
    selector: {
      type: String,
      default: undefined,
    },
    onMounted: {
      type: Function,
      default: function() {},
    },
    onUpdate: {
      type: Function,
      default: function() {},
    },
    initialContent: {
      type: String,
      default: "<!DOCTYPE html><html><head></head><body></body></html>",
    },
  },
  render(h, { parent, props, slots }) {
    const handleLoad = function handleLoad(e) {
      const slotsMap = slots()
      const Vue = parent.constructor
      const doc = e.target.contentDocument
      const win = doc.defaultView || doc.parentView

      doc.open("text/html", "replace")
      doc.write(props.initialContent)
      doc.close()

      Vue.nextTick(function mountTarget() {
        const headNode = doc.head
        const targetNode = props.selector ? doc.querySelector(props.selector) : doc.body

        const headInstance = new Vue({
          render(h) {
            return h("div", null, slotsMap.head || [])
          },
          methods: {
            init() {
              headNode.appendChild(this.$el)
            },
            destroy() {
              this.$destroy()
              headNode.removeChild(this.$el)
            },
          },
        })
        headInstance.$mount()
        headInstance.init()

        const targetInstance = new Vue({
          provide: { document: doc, window: win },
          render(h) {
            return h("div", null, slotsMap.default || [])
          },
          methods: {
            init() {
              targetNode.appendChild(this.$el)
              props.onMounted()
              props.onUpdate()
            },
            destroy() {
              this.$destroy()
              targetNode.removeChild(this.$el)
            },
          },
        })
        targetInstance.$mount()
        targetInstance.init()
      })
    }
    return h("iframe", {
      style: { height: "100%", width: "100%", border: "0" },
      on: { load: handleLoad },
    })
  },
}
