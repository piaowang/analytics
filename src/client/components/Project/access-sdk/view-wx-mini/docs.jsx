import React from 'react'
import PropTypes from 'prop-types'
import ReactMarkdown from 'react-markdown'
import CodeBlock from '../view-web/code-block'
import { Anchor } from '../../../Common/anchor-custom'

class Docs extends React.Component {
  static propTypes = {
    appid: PropTypes.string.isRequired,
    project_id: PropTypes.string.isRequired
  }

  static defaultProps = {
    appid: '',
    project_id: ''
  }

  generateDocs() {
    const { appid, project_id } = this.props
    const { websdk_js_cdn, cdn, collectGateway, websdk_app_host } = window.sugo
    const websitePath = websdk_js_cdn || cdn.split('//')[1]
    const protocol = `${window.location.protocol}`
    // let hostname = cdn.split('//')[1] + '/_bc/sugo-sdk-js/libs'
    // 注意这里的 xxx.match(/^\\/\\//)是双\\因为 PreCode标签会转义一遍，最终结果要为：xxx.match(/^\/\//)
    //
    const docs = `
# 下载文件


 - 下载地址：
  [sugo-wx-mini.program.min.js](http://${websitePath}/_bc/sugo-sdk-js/libs/sugo-wx-mini.program.min.js) (右键另存为)

# App init参数配置
### 基于原生微信小程序

\`\`\`javascript
const sugoio = require('./util/wx-mini-sdk.js') //引入sugoio

App({
  onLaunch: function () {
    sugoio.App.init({
      project_id: '${project_id}', //项目ID
      token: '${appid}', // 项目TOKEN
      gateway_host: '${collectGateway}', // 数据上报的地址
      api_host: '${protocol}//${websdk_app_host}', // 可视化配置时服务端地址
      track_share_app: false, // 自动上报转发事件
      track_pull_down_fresh: false, // 自动上报下拉刷新事件
      track_reach_bottom: false, // 自动上报上拉触底事件
      track_auto_duration: true // 自动上报提留事件
      debug: false // 是否启用debug
    })
    console.log('App Launch')
  })
\`\`\`

### 基于taro框架微信小程序

\`\`\`js
//在App.js中初始化
import sdkKit from '../../utils/wx-mini-sdk'

 // 初始化采集SDK
sdkKit.App.init({
  project_id: '${project_id}', //项目ID
  token: '${appid}', // 项目TOKEN
  gateway_host: '${collectGateway}', // 数据上报的地址
  api_host: '${protocol}//${websdk_app_host}', // 可视化配置时服务端地址
  track_share_app: false, // 自动上报转发事件
  track_pull_down_fresh: false, // 自动上报下拉刷新事件
  track_reach_bottom: false, // 自动上报上拉触底事件
  track_auto_duration: true // 自动上报提留事件
  debug: false // 是否启用debug
});

class App extends Component {
  ...
}
\`\`\`

* **${appid}：** 为应用TOKEN。
* **${project_id}：** 为项目ID。

## 上报页面浏览事件
### 基于原生微信小程序

\`\`\`js
// 上报页面浏览记录
 Page({
   onLoad: function () {
     sdkKit.Page.init();
     // sdkKit.Page.init({custom1: customVal, ...}); // custom1为页面浏览和停留事件上报自定义字段
     console.log('Page onLoad')
   }
 });
\`\`\`


### 基于taro框架微信小程序
\`\`\`js
import sdkKit from '../../utils/wx-mini-sdk'
//Demo为应用中的某个页面
class Demo extends Component { 
  componentWillMount(){
    sdkKit.Page.init();
    // sdkKit.Page.init({custom1: customVal, ...}); // custom1为页面浏览和停留事件上报自定义字段
  }
}
\`\`\`

## 用户自定义维度

平台的多维分析工具本身提供了例如 “访问来源”，“城市”,“操作系统"，”浏览器“等等这些维度。这些维度都可以和用户创建的指标进行多维的分析。但是往往不能满足用户对数据多维度分析的要求，因为每个公司的产品都有各自的用户维度，比如客户所服务的公司，用户正在使用的产品版本等等。 平台为了能够让数据分析变得更加的灵活，我们在 JS SDK 中提供了用户自定义维度的API接口:

### **自定义事件上报(代码埋点上报)**

第一次接入平台时，建议先追踪 3~5 个关键的事件，只需要几行代码，便能体验平台的分析功能。例如：

* 图片社交产品，可以追踪用户浏览图片和评论事件。
* 电商产品，可以追踪用户注册、浏览商品和下订单等事件。

平台 SDK 初始化成功后，即可以通过 sugoio.track\(event\_name, \[properties\], \[callback\]\) 记录事件：

* **event_name**: string，必选。表示要追踪的事件名。
* **properties**: object，可选。表示这个事件的属性。
* **callback**: function，可选。表示已经发送完数据之后的回调。

\`\`\`javascript
  // 追踪浏览商品事件
  sugoio.track('ViewProduct', {
    'ProductId': 123456，
    'ProductCatalog': "Laptop Computer",
    'ProductName': 'MacBook Pro',
    'ProductPrice': 888.88,
    'ViewDateTime': +new Date()
  });
\`\`\`

### 数据类型说明

* **object:** 上面 properties 是 object 类型，但是里面必须是 key: value 格式。

# 事件公共属性(超级属性)
\`\`\`javascript
  // sugoio.register 提供全局设置为每条上报记录都设置共有属性，在 WxStorage 中永久保存属性，永久有效，如果存在这个属性了则覆盖
  sugoio.register({
    Custom1: 'Custom1',
    Custom2: 'Custom2'
    ...
  });
\`\`\`

## sugoio.register_once(object)

在 WxStorage 中永久保存属性，如果存在这个属性了则不覆盖

# 删除事件公共属性
\`\`\`javascript
  // sugoio.unregister 删除事件公共属性
  sugoio.unregister(key);
\`\`\`

* **key:** 事件公共属性key

`
    return docs
  }

  render() {
    const { appid, project_id } = this.props
    return (
      <div className='markdown-wrap'>
        <div>
          <p className='aligncenter'>请按以下步骤进行 JS SDK 安装,如有问题请联系在线客服</p>
          <p>
            您的项目ID为 : <span className='bold font16'>{project_id}</span>
          </p>
          <p>
            您的应用Token为 : <span className='bold font16'>{appid}</span>
          </p>
        </div>
        <ReactMarkdown
          source={this.generateDocs()}
          className='result'
          skipHtml={false}
          escapeHtml={false}
          renderers={{
            code: CodeBlock,
            link: props => (
              <Anchor href={props.href} target='_blank'>
                {props.children}
              </Anchor>
            )
          }}
        />
      </div>
    )
  }
}

export default Docs
