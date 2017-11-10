const ethUtil = require('ethereumjs-util')
const assert = require('assert');

exports.defineProperties = function (self, fields, data) {
    self.raw = []
    self._fields = []
  
    // attach the `toJSON`
    self.toJSON = function (label) {
      if (label) {
        var obj = {}
        self._fields.forEach(function (field) {
          if (!self[field] || typeof self[field] === "undefined"){
            return;
          }
          obj[field] = '0x' + self[field].toString('hex')
        })
        return obj
      }
      return ethUtil.baToJSON(this.raw)
    }
  
    self.serialize = function serialize () {
      return Buffer.concat(this.raw)
    }
  
    fields.forEach(function (field, i) {
      self._fields.push(field.name)
      function getter () {
        return self.raw[i]
      }
      function setter (v) {
        v = ethUtil.toBuffer(v)
  
        if (v.toString('hex') === '00' && !field.allowZero) {
          v = Buffer.allocUnsafe(0)
        }
  
        if (field.allowLess && field.length) {
          v = ethUtil.stripZeros(v)
          assert(field.length >= v.length, 'The field ' + field.name + ' must not have more ' + field.length + ' bytes')
        } else if (!(field.allowZero && v.length === 0) && field.length) {
          assert(field.length === v.length, 'The field ' + field.name + ' must have byte length of ' + field.length)
        }
  
        self.raw[i] = v
      }
  
      Object.defineProperty(self, field.name, {
        enumerable: true,
        configurable: true,
        get: getter,
        set: setter
      })
  
      if (field.default) {
        self[field.name] = field.default
      }
  
      // attach alias
      if (field.alias) {
        Object.defineProperty(self, field.alias, {
          enumerable: false,
          configurable: true,
          set: setter,
          get: getter
        })
      }
    })
  
    // if the constuctor is passed data
    if (data) {
      if (typeof data === 'string') {
        data = Buffer.from(ethUtil.stripHexPrefix(data), 'hex')
      }
 
      if (Array.isArray(data)) {
        if (data.length > self._fields.length) {
          throw (new Error('wrong number of fields in data'))
        }
  
        // make sure all the items are buffers
        data.forEach(function (d, i) {
          self[self._fields[i]] = ethUtil.toBuffer(d)
        })
      } else if (typeof data === 'object') {
        const keys = Object.keys(data)
        fields.forEach(function (field) {
          if (keys.indexOf(field.name) !== -1) self[field.name] = data[field.name]
          if (keys.indexOf(field.alias) !== -1) self[field.alias] = data[field.alias]
        })
      } else {
        throw new Error('invalid data')
      }
    }
  }