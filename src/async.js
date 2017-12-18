import { _, it } from 'param.macro'

import { isKind, isNil, maybeCall } from './util'

export const asyncFactory = (none, syncInterface) => {
  const asyncInterface = (value, predicate = isNil) => {
    const _async = Object.create(null)

    // ensure that the given value is a Promise
    value = Promise.resolve(value)

    // fork is used to attach a `then` and optionally a `catch`
    // callback to the Promise value
    const fork = (...fns) => value.then(...fns)

    // spawnAsync returns a new asyncInterface containing the provided value
    const spawnAsync = asyncInterface(_, predicate)

    _async.isFail = () => fork(() => false, () => true)
    _async.isNone = () => fork(predicate, () => false)
    _async.isSome = () => fork(v => !predicate(v), () => false)

    // any method that's expected to continue the chain (ie. map)
    // should return a new instance of `asyncInterface` containing
    // the transformed Promise, not the Promise itself

    _async.filter = fn =>
      spawnAsync(fork(v => {
        if (predicate(v)) return v
        if (typeof v.filter === 'function') {
          return v.filter(fn)
        }
        if (fn(v)) return v
      }))

    _async.flatMap = fn =>
      spawnAsync(fork(v => !predicate(v) && fn(v)).then(v => {
        if (predicate(v)) return none
        return isKind(v, 'Some') ? v.some() : v
      }))

    _async.forEach = fn => fork(v => {
      if (predicate(v)) return
      if (typeof v.forEach === 'function') {
        v.forEach(fn)
        return
      }
      fn(v)
    })

    _async.includes = other => fork(v => {
      if (predicate(v)) return false
      if (typeof v.includes === 'function') {
        return v.includes(other)
      }
      return v === other
    })

    _async.map = fn => spawnAsync(fork(v => predicate(v) ? v : fn(v)))
    _async.orElse = fn => fork(v => !predicate(v) ? fn(v) : v, it)
    _async.orSome = other => fork(v => predicate(v) ? other : v)

    _async.some = () =>
      fork(
        v => {
          if (!predicate(v)) return v
          throw new Error('Cannot call some() on a None')
        },
        e => {
          throw new Error('Cannot call some() on a Fail')
        }
      )

    _async.try = fn =>
      spawnAsync(fork(fn).then(v => !predicate(v) ? v : none))

    _async.unwrap = (ifSome, ifNone, ifFail) =>
      fork(
        v => !predicate(v) ? maybeCall(ifSome, v) : maybeCall(ifNone, v),
        e => maybeCall(ifFail, e)
      )

    return _async
  }

  return asyncInterface
}
