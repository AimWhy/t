import { ref } from "vue";

export function useCompRef<T extends abstract new (...args: any) => any>(
  _comp: T
) {
  return ref<InstanceType<T>>();
}


// 不能是 E 类型
type BanType<T, E> = T extends E ? never : T

function log<T>(x: BanType<T, Function>) {
  console.log(x)
}