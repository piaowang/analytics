import { render } from 'react-dom'
import Live from '../components/LiveScreen/livescreen-view.jsx'
import '../components/LiveScreen/livescreen-view.styl'
import '../components/Charts/MapChart/map-chart.styl'
import zh_CN from 'antd/lib/locale-provider/zh_CN'
import {Provider} from 'react-redux'
import { ConfigProvider } from 'antd'
import ReducerRegistry from '../reducers/reducer-registry'
import createStore from '../store'

const rootElement = document.getElementById('container')

const reducerRegistry = new ReducerRegistry({
  livescreen_workbench: require('../components/LiveScreen/reducers/workbench').default
})
const store = createStore({}, reducerRegistry)
window.store = store

render(
  <ConfigProvider locale={zh_CN}>
    <Provider store={store}>
      <Live mountTo={rootElement} />
    </Provider>
  </ConfigProvider>,
  rootElement
)
