import { computed, Ref, ref } from 'vue'

export const reactiveNow = ref(Date.now())

setInterval(() => {
  reactiveNow.value = Date.now()
}, 100)

export function useTimeAgo (time: Ref<number>) {
  return {
    timeAgo: computed(() => {
      const diff = reactiveNow.value - time.value
      return `${Math.round(diff / 1000)}s ago`
    }),
  }
}



import { getCurrentInstance, computed } from 'vue'

export function useRouter () {
  return getCurrentInstance().proxy.$router
}

export function useRoute () {
  const vm = getCurrentInstance()
  return computed(() => vm.proxy.$route)
}