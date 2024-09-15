import { render } from 'react-dom'
import { Provider } from 'react-redux'
import { configureRoutes } from '../routes/nissanmarket-mobile/index'
import {getJwtSign} from '../common/jwt-helper'
import ReducerRegistry from '../reducers/reducer-registry'
import createStore from '../store'
import '../css/market-brain-h5.styl'


const reducerRegistry = new ReducerRegistry({})
const store = createStore({}, reducerRegistry)
const routes = configureRoutes()

const rootElement = document.getElementById('container')
render(
  <Provider store={store}>
    {routes}
  </Provider>,
  rootElement
)

window.getJwtSign = getJwtSign
window.store = store