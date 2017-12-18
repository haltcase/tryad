import { _, it } from 'param.macro'

import { asyncFactory } from './async'
import { none, syncInterface } from './sync'
import { isKind, isNil, isPromise } from './util'

const asyncInterface = asyncFactory(none, syncInterface)

const tryad = value =>
  isNil(value) ? none : syncInterface(value)

tryad.of = value =>
  isPromise(value)
    ? asyncInterface(value, !it)
    : value ? syncInterface(value, !it) : none

tryad.try = (value, fn) =>
  tryad.of(value).try(fn)

tryad.none = none
tryad.async = asyncInterface(_)
tryad.async.of = asyncInterface(_, !it)
tryad.isNoneLike = isKind(_, 'None')
tryad.isSomeLike = isKind(_, 'Some')
tryad.isFailLike = isKind(_, 'Fail')

export default tryad
