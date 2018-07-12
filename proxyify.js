const ALLOWS_CN = { String: 1, Number: 1, Boolean: 1, Array: 1, Object: 1 }

function isDataObject (obj, parents = new Set()) {
  // 不允许嵌套
  if (parents.has(obj)) return false
  if (obj == null) return true
  // 不正常的
  if (!obj.constructor) return false
  const constructorName = obj.constructor.name
  if (!ALLOWS_CN[constructorName]) return false
  if (constructorName === 'Array' || constructorName === 'Object') {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = Reflect.get(obj, key)
        parents.add(obj)
        const result = isDataObject(value, parents)
        if (result === false) return false
      }
    }
  }
  return true
}

function returnResult (result, log, newPaths, callback = () => {
}) {
  const isData = isDataObject(result)
  if (isData) {
    callback(null, {result, isData})
    return result
  }
  if (result instanceof Promise) {
    result = result.then(result => {
      return returnResult(result, log, newPaths, callback)
    }, result => {
      callback(result)
      throw result
    })
    return result
  }
  callback(null, {result, isData})
  return proxyify(result, log, newPaths)
}

function proxyify (target, log, paths = []) {
  let handler = {}
  if (typeof target === 'function') {
    handler.apply = (target, thisArg, args) => {
      const newPaths = [...paths]
      let result
      try {
        result = Reflect.apply(target, thisArg, args)
      } catch (error) {
        log({
          type: 'apply',
          args,
          paths: newPaths,
          error,
          result})
        throw error
      }
      return returnResult(result, log, newPaths, (error, {result, isData} = {}) => {
        log({
          type: 'apply',
          args,
          paths: newPaths,
          error,
          result: isData ? result : void 0
        })
      })
    }
    handler.construct = (target, argumentsList, newTarget) => {
      const newPaths = [...paths]
      let error = null
      let result
      try {
        result = Reflect.construct(target, argumentsList, newTarget)
      } catch (ex) {
        error = ex
      }
      log({
        type: 'construct',
        args: argumentsList,
        paths: newPaths,
        error,
        result: void 0
      })
      if (error) throw error
      return returnResult(result, log, newPaths)
    }
  } else {
    handler.get = (target, prop, receiver) => {
      const newPaths = [...paths, prop]
      let result = Reflect.get(target, prop, receiver)
      return returnResult(result, log, newPaths, (error, {result, isData}) => {
        if (isData) {
          log({
            type: 'get',
            args: null,
            paths: newPaths,
            error,
            result})
        }
      })
    }
    handler.set = (target, prop, value) => {
      const newPaths = [...paths, prop]
      let result = Reflect.set(target, prop, value)
      return returnResult(result, log, newPaths, (error, {result, isData}) => {
        if (isData) {
          log({
            type: 'set',
            args: value,
            paths: newPaths,
            error,
            result})
        }
      })
    }
  }
  return new Proxy(target, handler)
}

module.exports = proxyify
