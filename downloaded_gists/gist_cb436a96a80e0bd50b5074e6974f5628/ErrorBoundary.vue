
/**
<el-table-column label="云服务器" key="serviceNameCol" min-width="20">
  <ErrorBoundary slot-scope="scope">
    <template slot-scope="t"> //重要！！ slot-scope="t" 不可删除
      {{ scope.$index == 1 ? scope.row3.name : scope.row.name }}
    </template>
  </ErrorBoundary>
</el-table-column>
*/

Vue.component('ErrorBoundary', {
  name: 'ErrorBoundary',
  functional: true,
  props: {
    tag: {
      type: String,
      default: 'div'
    },
    boundaryClass: {
      type: String,
      default: 'error-boundary__wrap'
    },
    errorClass: {
      type: String,
      default: 'error-boundary__err'
    },
  },
  render (h, { parent, data, props }) {
    try {
      const defaultSlot = data.scopedSlots.default(props)
      return Array.isArray(defaultSlot) ? h(props.tag, {
        class: ['error-boundary', props.boundaryClass]
      }, defaultSlot) : defaultSlot
    } catch (e) {
      if (parent.$options.errorCaptured) {
        parent.$options.errorCaptured(e, parent, e.message)
      }
      return h(props.tag, {
        style: { display: 'none' },
        class: ['error-boundary', props.errorClass]
      }, [e.message, ':::', e.stack])
    }
  }
})