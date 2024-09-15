import React, {useEffect} from 'react'
import _ from 'lodash'
import PubSub from 'pubsub-js'

export function getSagaState(ns) {
  return _.get(window.store.getState(), ns)
}

/**
 * 动态 saga model 绑定工具，用法：
 * @@withRuntimeSagaModel(props => ({
 *   namespace: '',
 *   state: {},
 *   reducers: {},
 *   ...
 * })
 * class XXX extends React.Component {
 *   ...
 * }
 *
 * <XXX key={xxxId} /> 使用 key 来实现切换 model
 *
 * 特殊用法：
 * model 设置属性 reusable: true 时，表示 saga model 全局唯一，可重复使用
 *
 * @param sagaModelGenerators: props => sagaModel
 * @returns function(*): {new(*=): ComponentWithRuntimeSagaModel, sagaModelInst: *, new<P, S>(props: Readonly<P>): ComponentWithRuntimeSagaModel, new<P, S>(props: P, context?: any): ComponentWithRuntimeSagaModel, prototype: ComponentWithRuntimeSagaModel} 高阶组件
 */
export default function withRuntimeSagaModel(sagaModelGenerators) {
  return WrappedComponent => {
    return class ComponentWithRuntimeSagaModel extends React.Component {
      constructor(props) {
        super(props)
        let sagaModelGeneratorArr = _.isArray(sagaModelGenerators)
          ? sagaModelGenerators
          : [sagaModelGenerators]
        let sagaModelInstArr = sagaModelGeneratorArr.map(gen => gen(props)).filter(_.identity)
        sagaModelInstArr.forEach(inst => {
          // reusable 表示 saga model 全局唯一，可重复使用
          if (inst.reusable && getSagaState(inst.namespace)) {
            return
          }
          window.store.register(inst, true)
        })
        this.nsArr = sagaModelInstArr.map(inst => inst.namespace)
        
        const reusableNsArr = sagaModelInstArr.filter(inst => inst.reusable).map(inst => inst.namespace)
        this.pubsubToken = PubSub.subscribe('runtime-saga-model-query-reusable', (msg, cb) => {
          if (_.isFunction(cb) && !_.isEmpty(reusableNsArr)) {
            cb(reusableNsArr)
          }
        })
      }
    
      componentWillUnmount() {
        PubSub.unsubscribe(this.pubsubToken)
        let allNsRegisterByRuntimeSagaHelper = []
        PubSub.publishSync('runtime-saga-model-query-reusable', nsArr => {
          allNsRegisterByRuntimeSagaHelper.push(...(nsArr || []))
        })
        /* let reusableNsSet = new Set(allNsRegisterByRuntimeSagaHelper)
        this.nsArr.forEach(ns => {
          if (reusableNsSet.has(ns)) {
            // 此命名空间仍被其他 helper 使用，无法卸载
            return
          }
          // modify by WuQic 可以不用每次都卸载model
          // window.store.dump(ns)
        }) */
      }
    
      render() {
        return (
          <WrappedComponent {...this.props} />
        )
      }
    }
  }
}

export function useRuntimeSagaModels(props, sagaModelGenerators, deps = []) {
  useEffect(() => {
    let sagaModelGeneratorArr = _.isArray(sagaModelGenerators) ? sagaModelGenerators : [sagaModelGenerators]
    let sagaModelInstArr = sagaModelGeneratorArr.map(gen => gen(props)).filter(_.identity)
    sagaModelInstArr.forEach(inst => {
      // reusable 表示 saga model 全局唯一，可重复使用
      if (inst.reusable && getSagaState(inst.namespace)) {
        return
      }
      window.store.register(inst, true)
    })
    const nsArr = sagaModelInstArr.map(inst => inst.namespace)
    
    const reusableNsArr = sagaModelInstArr.filter(inst => inst.reusable).map(inst => inst.namespace)
    const pubsubToken = PubSub.subscribe('runtime-saga-model-query-reusable', (msg, cb) => {
      if (_.isFunction(cb) && !_.isEmpty(reusableNsArr)) {
        cb(reusableNsArr)
      }
    })
    
    return () => {
      PubSub.unsubscribe(pubsubToken)
      const allNsRegisterByRuntimeSagaHelper = []
      PubSub.publishSync('runtime-saga-model-query-reusable', nsArr => {
        allNsRegisterByRuntimeSagaHelper.push(...(nsArr || []))
      })
      // const reusableNsSet = new Set(allNsRegisterByRuntimeSagaHelper)
      // nsArr.forEach(ns => {
      //   if (reusableNsSet.has(ns)) {
      //     // 此命名空间仍被其他 helper 使用，无法卸载
      //     return
      //   }
      //   window.store.dump(ns)
      // })
    }
  }, deps)
}
