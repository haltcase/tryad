export const isNil = value => value == null

export const isPromise = value =>
  !isNil(value) &&
  typeof value.then === 'function' &&
  typeof value.catch === 'function'

export const isKind = (value, kind) =>
  !isNil(value) &&
  typeof value[`is${kind}`] === 'function' &&
  value[`is${kind}`]()

export const maybeCall = (fn, ...args) =>
  typeof fn === 'function' && fn(...args)
