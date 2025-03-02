import { ref, onUnmounted } from 'vue'

/*
 * 按照浏览器空闲时间优化性能渲染
 * */
const useDefer = (maxCount = 1000) => {
  let rafId;
  const frameCount = ref(0)
  const refreshFrameCount = () => {
    rafId = requestAnimationFrame(() => {
      frameCount.value++
      if (frameCount.value < maxCount) {
        refreshFrameCount()
      }
    })
  }
  refreshFrameCount()
  onUnmounted => {
    cancelAnimationFrame(rafId);
  })
  return function (showInFrameCount: number) {
    return frameCount.value >= showInFrameCount
  }
}

/*
 * const defer = useDefer()
 * v-if defer(number)
 * */
export default useDefer