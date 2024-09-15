import thunk from 'redux-thunk'
import logger from 'redux-logger'
// import { createStore, applyMiddleware, compose } from 'redux'
import configureReducers from '../reducers/configureReducers'
import { SagaModel } from 'redux-saga-model'
import _ from 'lodash'
import { browserHistory as history } from 'react-router'
import { notification } from 'antd'
import loading from 'redux-saga-model-loading'

const isDevelopment = process.env.NODE_ENV !== 'production'

const configureStore = (initialState = {}, reducerRegistry) => {
  // const enhancers = compose(
  //   applyMiddleware(thunk),
  //   isDevelopment ? applyMiddleware(logger) : f => f,
  //   isDevelopment && window.devToolsExtension ? window.devToolsExtension() : f => f
  // )

  // const rootReducers = configureReducers(reducerRegistry.getReducers())
  // const store = createStore(rootReducers, initialState, enhancers)

  const sagaModel = new SagaModel({
    initialState,
    initialMiddleware: [
      thunk
      // isDevelopment ? logger : null
    ].filter(_.identity),
    history
  })

  // loading plugin https://github.com/tomsonTang/redux-saga-model-loading
  sagaModel.use(loading)

  // 插件方式注入thunk相关reducers
  sagaModel.use({
    extraReducers: reducerRegistry.getReducers(),
    extraEnhancers: [isDevelopment && window.__REDUX_DEVTOOLS_EXTENSION__ ? window.__REDUX_DEVTOOLS_EXTENSION__() : null].filter(_.identity),
    onError: error => {
      // 统一捕获所有异常
      console.error(error.stack)
      notification.warn({
        message: '提示',
        key: error,
        description: <div className='mw300 common-err-msg animate wordbreak' dangerouslySetInnerHTML={{ __html: error.message }} />,
        duration: 20
      })
    }
  })

  const store = sagaModel.store()
  // 可以通过reducerRegistry.model动态注入model
  reducerRegistry.model = model => {
    const regster = _model => {
      store.register(_model, true) // register
    }
    if (_.isArray(model)) {
      for (const m of model) {
        regster(m)
      }
      return
    }
    regster(model)
  }

  store.model = reducerRegistry.model

  reducerRegistry.prefix = () => store.prefix()
  // reducerRegistry.models = () => sagaModel.models()

  // 重写 replaceReducer，使得调用 replaceReducer 的时候带上 redux 原生的 reducer
  const bakReplaceReducer = store.replaceReducer.bind(store)
  store.replaceReducer = (combinedSagaReducer, combinedReduxReducer = configureReducers(reducerRegistry.getReducers())) => {
    const combination = function () {
      const state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {}
      const action = arguments[1]
      const extraReducerKeys = _.keys(reducerRegistry.getReducers())
      const sagaReducerKeys = _.keys(state)
        .filter(k => !extraReducerKeys.includes(k))
        .concat(_.keys(loading.extraReducers))
      const sagaState = combinedSagaReducer(_.pick(state, sagaReducerKeys), action)
      const extraState = combinedReduxReducer(_.pick(state, extraReducerKeys), action)
      return { ...sagaState, ...extraState }
    }
    return bakReplaceReducer(combination)
  }

  // reducers 热更新配置
  if (isDevelopment && module.hot) {
    module.hot.accept('../reducers', () => {
      const nextRootReducer = require('../reducers')
      reducerRegistry.register(nextRootReducer)
      // store.replaceReducer(nextRootReducer)
    })
  }

  reducerRegistry.setChangeListener(reducers => {
    store.replaceReducer(
      configureReducers({
        ...loading.extraReducers,
        ...store.asyncReducers
      }),
      configureReducers(reducers)
    )
  })

  return store
}

export default configureStore

// const createStoreWithMiddleware = applyMiddleware(thunk)(createStore);

// 之所以不直接返回 store 而是返回 createStore 是为了让外界可以传递initialState。
// export default initialState => createStoreWithMiddleware(rootReducers, initialState);
