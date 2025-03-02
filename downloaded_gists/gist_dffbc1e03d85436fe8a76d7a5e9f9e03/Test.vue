<template>
  <div>
    <pre>
      count is ValueWrap &#9; &#9; countWrap is Object &#9;&#9; vCountWrap is ValueWrap &#9;&#9; sCountWrap is State
    </pre> <br />

    <div>countWrap 内的 count 值为: {{countWrap.count}}</div><br />

    <div>vCountWrap 内的 count 值为: {{vCountWrap.count}}</div><br />

    <div>sCountWrap 内的 count 值为: {{sCountWrap.count}}</div><br />

    <div>count 值为: {{ count }}</div><br />

    <div>plusOne is {{ plusOne }}</div><br />

    {{x}}, {{y}}

    <button @click="increment">count++</button>
  </div>
</template>

<script>
import { value, computed, watch, onMounted, state } from '../utils/vue-function-api'
import { useMouse } from '../utils/test'

/**
 * 在console中进行如下测试:
 * vCountWrap.value.count = 10
 * vCountWrap.value.count
 * sCountWrap.count = 100
 * sCountWrap.count
 * count.value = 99
 * count.value
*/

export default {
  setup (props, ctx) {
    const count = value(0);
    const sCount = state({ count2: 1 });
    const vCountWrap = value({ count })
    const sCountWrap = state({ count })
    const plusOne = computed(() => count.value + 1, v => { count.value = v -1 });
    const increment = () => {
      count.value++;
      sCount.count2 = sCount.count2 + 4
    }

    const { x, y } = useMouse()

    window.why = ctx.vm
    window.sCount = sCount
    window.count = count
    window.vCountWrap = vCountWrap
    window.sCountWrap = sCountWrap

    watch(() => count.value * 2, val => console.log(`count * 2 is ${val}`));
    watch(plusOne, value => { console.log('plusOne is: ', value) })
    watch([ () => sCount.count2, count ], ([a, b], [prevA, prevB], setClean) => {
      setClean(function () {
        window.clearTimeout(window.timerId)
      })

      window.timerId = window.setTimeout(function () {
        console.log(`a is: ${prevA} -> ${a}`)
        console.log(`b is: ${prevB} -> ${b}`)
      }, 1000)
    })

    onMounted(() => { console.log(`mounted`); });

    return {
      count,
      countWrap: { count },
      vCountWrap,
      sCountWrap,
      plusOne,
      increment,
      x,
      y
    };

    // return function (props, slots, attrs) {
    //   return ctx.vm.$createElement('button', { on: { click: increment } }, count.value )
    // }
  },
};
</script>
