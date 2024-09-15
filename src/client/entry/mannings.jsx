import { render } from 'react-dom'
import zh_CN from 'antd/lib/locale-provider/zh_CN'
import { ConfigProvider } from 'antd'
import SelfView from '../components/Report/selfView'

const rootElement = document.getElementById('container')

render(
  <ConfigProvider locale={zh_CN}>
    <SelfView />
  </ConfigProvider>,
  rootElement
)
