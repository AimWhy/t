``` App.vue
<template>
  <component :is="layout" :layout.sync="layout">
    <router-view />
  </component>
</template>

<script>
export default {
  name: `App`,
  data() {
    return {
      layout: `NoneLayout`,
    }
  },
}
</script>
```



```  Layout.vue
<script>
import Vue from 'vue'
export default {
  created () {
    var name = this.$options.layoutName || 'NoneLayout'
    if (!Vue.options.components[name]) {
      Vue.component(name, () => import(`@views/_layouts/${name}.vue`))
    }
    this.$parent.$emit(`update:layout`, name)
  },
}
</script>
```



```  NotFound.vue
<template>
  <div>404</div>
</template>

<script>
import Layout from '@components/Layout.vue';
export default {
  extends: Layout,
  name: 'NotFound',
}
</script>
```

