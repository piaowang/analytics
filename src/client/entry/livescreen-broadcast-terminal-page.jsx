import { render } from 'react-dom'
import React from 'react'
import '../components/LiveScreen/livescreen-view.styl'
import '../components/Charts/MapChart/map-chart.styl'
import LiveScreenBroadCastTerminal from '../components/LivescreenControl/livescreen-broadcast-terminal'
import {browserHistory} from 'react-router'
import {generate} from 'shortid'
import {immutateUpdates, parseQuery} from '../../common/sugo-utils'
import zh_CN from 'antd/lib/locale-provider/zh_CN'
import {Provider} from 'react-redux'
import { ConfigProvider } from 'antd';
import ReducerRegistry from '../reducers/reducer-registry'
import createStore from '../store'

const rootElement = document.getElementById('container')
let {uid} = parseQuery()
if (!uid) {
  const loc = Object.assign({}, browserHistory.getCurrentLocation())
  browserHistory.push(immutateUpdates(loc, 'query.uid', () => generate()))
}

const reducerRegistry = new ReducerRegistry({
  livescreen_workbench: require('../components/LiveScreen/reducers/workbench').default
})
const store = createStore({}, reducerRegistry)
window.store = store

render(
  <ConfigProvider locale={zh_CN}>
    <Provider store={store}>
      <LiveScreenBroadCastTerminal mountTo={rootElement} />
    </Provider>
  </ConfigProvider>,
  rootElement
)
