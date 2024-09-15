/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

import Action from './actions'
import namespace from './namespace'
import map from './map'
import Resources from './resources'
import { LogCodeInterfaceCode } from '../../../common/model-validator/LogCodeInterfaceCode'

const Actions = {

  /**
   * @param {object} payload
   * @param {LogCodeInterfaceCode} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async create(payload, model, done) {
    const res = await Resources.create(
      payload.code,
      payload.name,
      payload.system_id,
      payload.module_id
    )

    if (res.success) {
      model.set(res.body)
      model.set({ message: null })
      done()
      return
    }

    model.set('message', res.message)
    done()
  },

  /**
   * @param {LogCodeInterfaceCode} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async baseCreate(model, done) {
    const res = await Resources.create(
      model.code,
      model.name,
      model.system_id,
      model.module_id
    )

    if (res.success) {
      model.set(res.body)
      model.set({ message: null })
      done()
      return
    }

    model.set('message', res.message)
    done()
  },

  /**
   * @param {String} id
   * @param {LogCodeInterfaceCode} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async findById(id, model, done) {
    const res = await Resources.findById(id)

    if (res.success) {
      model.set(res.body)
      model.set({ message: null })
      done()
      return
    }

    model.set('message', res.message)
    done()
  },

  /**
   * @param {String} system_id
   * @param {String} code
   * @param {LogCodeInterfaceCode} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async findByCode(system_id, code, model, done) {
    const res = await Resources.findByCode(system_id, code)
    
    if (res.success) {
      model.set(res.body)
      model.set({ message: null })
      done()
      return
    }

    model.set('message', res.message)
    done()
  },

  /**
   * @param {String} code
   * @param {String} name
   * @param {LogCodeInterfaceCode} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async update(model, done) {
    if (!model.id) {
      model.set('message', '未初始化')
      done()
      return
    }

    const res = await Resources.update(model.id, model.code, model.name)
    if (res.success) {
      model.set(res.body)
      model.set({ message: null })
      done()
      return
    }

    model.set('message', res.message)
    done()
  },

  /**
   * @param {object} props 
   * @param {LogCodeInterfaceCode} model
   * @param {function} done
   * @return {Promise.<void>} 
   */
  baseUpdate(props, model, done) {
    model.set(props)

    for (let propKey in props) {
      model[propKey] = props[propKey]
    }

    done()
  },

  /**
   * @param {LogCodeInterfaceCode} model
   * @param {function} done
   * @return {Promise.<void>}
   */
  async destroy(model, done) {
    if (!model.id) {
      model.set('message', '未初始化')
      done()
      return
    }

    const res = await Resources.destroy(model.id)
    if (res.success) {
      model.reset()
      done()
      return
    }

    model.set('message', res.message)
    done()
  },

  /**
   * @param {LogCodeInterfaceCode} model
   * @param {object} mod
   * @param {function} done
   */
  reset(model, mod, done) {
    model.reset()
    model.set(mod)
    done()
  }
}


/**
 * @param {{type:String, payload:*}} action
 * @param {LogCodeInterfaceCode} model
 * @param {function} done
 * @return {*}
 */
function scheduler(action, model, done) {
  const { payload, type } = action

  switch (type) {
    case Action.CREATE:
      Actions.create(payload, model, done)
      break

    case Action.BASE_CREATE:
      Actions.baseCreate(model, done)
      break

    case Action.FIND_BY_ID:
      Actions.findById(payload.id, model, done)
      break

    case Action.FIND_BY_CODE:
      Actions.findByCode(payload.system_id, payload.code, model, done)
      break

    case Action.UPDATE:
      Actions.update(model, done)
      break

    case Action.BASE_UPDATE:
      Actions.baseUpdate(payload, model, done)
      break

    case Action.DESTROY:
      Actions.destroy(model, done)
      break

    case Action.RESET:
      Actions.reset(model, payload, done)
      break

    default:
      done()
      return
  }
}

/**
 * @param {String} [name]
 * @return {StoreValidatorDesc<LogCodeInterfaceCodeModel>}
 */
export default function (name) {
  return {
    namespace: name || namespace,
    scheduler,
    model: new LogCodeInterfaceCode(),
    map
  }
}

export {
  Action
}
