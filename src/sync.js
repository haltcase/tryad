import { _ } from 'param.macro'

import { asyncFactory } from './async'
import { isKind, isNil, isPromise, maybeCall } from './util'

export const syncInterface = (value, predicate = isNil, failError = null) => {
  if (isPromise(value)) {
    return asyncInterface(value, predicate)
  }

  const _sync = Object.create(null)
  const isNone = predicate(value)

  // spawn & spawnAsync return new instances with the given value
  const spawn = syncInterface(_, predicate)
  const spawnAsync = asyncInterface(_, predicate)

  _sync.isFail = () => !isNil(failError)
  _sync.isNone = () => isNone
  _sync.isSome = () => !isNone && isNil(failError)

  _sync.filter = fn => {
    if (!_sync.isSome()) return _sync
    if (typeof value.filter === 'function') {
      return spawn(value.filter(fn))
    }

    const result = fn(value)
    if (isPromise(result)) return spawnAsync(value).filter(fn)
    return result ? _sync : none
  }

  _sync.flatMap = fn => {
    if (!_sync.isSome()) return _sync
    if (typeof value.flatMap === 'function') {
      const result = value.flatMap(fn)
      return isKind(result, 'Some') ? result : spawn(result)
    }

    const result = fn(value)
    if (isPromise(result)) return spawnAsync(result).flatMap(fn)
    if (predicate(result)) return none
    return isKind(result, 'Some') ? result : spawn(result)
  }

  _sync.forEach = fn => {
    if (!_sync.isSome()) return _sync
    if (typeof value.forEach === 'function') {
      value.forEach(fn)
      return
    }

    fn(value)
  }

  _sync.includes = other => {
    if (!_sync.isSome()) return false
    if (typeof value.includes === 'function') {
      return value.includes(other)
    }

    return value === other
  }

  _sync.map = fn => {
    if (!_sync.isSome()) return _sync
    if (typeof value.map === 'function') {
      return spawn(value.map(fn))
    }

    const result = fn(value)
    return isPromise(result)
      ? spawnAsync(result)
      : spawn(result)
  }

  _sync.orElse = fn =>
    _sync.isSome() ? _sync : _sync.isFail() ? fn(failError) : fn()

  _sync.orSome = other => _sync.isSome() ? value : other
  _sync.some = () => {
    if (_sync.isSome()) return value
    const kind = _sync.isFail() ? 'Fail' : 'None'
    throw new Error('Cannot call some() on a ' + kind)
  }

  _sync.try = fn => {
    if (!_sync.isSome()) return _sync

    try {
      const result = fn(value)
      if (isPromise(result)) {
        return spawnAsync(result)
      }

      return isKind(result, 'Some') ? result : spawn(result)
    } catch (e) {
      return syncInterface(null, predicate, e)
    }
  }

  _sync.unwrap = (ifSome, ifNone, ifFail) => {
    if (_sync.isSome()) return maybeCall(ifSome, value)
    if (_sync.isFail()) return maybeCall(ifFail, failError)
    if (_sync.isNone()) return maybeCall(ifNone)
  }

  return Object.freeze(_sync)
}

export const none = Object.freeze(syncInterface())

const asyncInterface = asyncFactory(none, syncInterface)
