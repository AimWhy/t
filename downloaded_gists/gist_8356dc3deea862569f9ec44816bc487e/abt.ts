type User = {
  id: number
  name: string
  age: number
}

type PartialByKeys<T, K extends keyof T> = {
  [P in K]?: T[P]
} & Pick<T, Exclude<keyof T, K>>

type Simplify<T> = {
  [P in keyof T]: T[P]
}

type U1 = Simplify<PartialByKeys<User, "id">>