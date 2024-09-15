import React from 'react'
import PropTypes from 'prop-types'
import ReactMarkdown from 'react-markdown'
import _ from 'lodash'
import CodeBlock from './code-block'

export default class Docs extends React.Component {

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
    const { websdk_js_cdn, cdn, collectGateway, websdk_app_host, websdk_decide_host, file_server_token } = window.sugo
    const websitePath = websdk_js_cdn || cdn.split('//')[1]
    const protocol = `${window.location.protocol}`
    // let hostname = cdn.split('//')[1] + '/_bc/sugo-sdk-js/libs'
    // 注意这里的 xxx.match(/^\\/\\//)是双\\因为 PreCode标签会转义一遍，最终结果要为：xxx.match(/^\/\//)

    const docs = `
# 异步载入
\`\`\`javascript
<head>
...
<!-- start sugoio -->
  <script type='text/javascript'>
    // 可视化埋点
    var SUGOIO_LIB_URL="\/\/${websitePath}/_bc/sugo-sdk-js/libs/sugoio-latest.min.js";
    !function(i,n){if(!n.__SV){var e,t,r=window,s="sugoio";r[s]=n;try{!function c(e){var t=r.atob(e),o=JSON.parse(t).state,n={accessToken:o.access_token,accessTokenExpiresAt:Date.now()+1e3*Number(o.expires_in),projectToken:o.token,projectId:o.project_id,userId:o.user_id,choosePage:o.choose_page,trackType:o.trackType};r.sessionStorage.setItem("editorParams",JSON.stringify(n)),o.hash?r.location.hash=o.hash:r.history?r.history.replaceState("",i.title,r.location.pathname+r.location.search):r.location.hash=""}(r.location.hash.replace("#",""))}catch(u){}finally{!function p(r){var s={},t=i,e="blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" ");r.proxy={proxy:function o(e,t){return(s[e]||(s[e]=[])).push(t),r.proxy},off:function c(e,t){var o=s[e]||[],n=[];return a(o,function(e){e!==t&&n.push(e)}),o[e]=n,r.proxy}},a(e,function(e){s[e]=[],function n(e,t,o){return"function"!=typeof e.addEventListener?e.attachEvent("on"+t,o):e.addEventListener(t,o,!0)}(t,e,function(t){try{a(s[e],function(e){e(t)})}catch(u){console&&"function"==typeof console.error&&console.error(u.stack)}})})}(n)}n._i=[],n.init=function(e,t,o){var r=n;void 0!==o?r=n[o]=[]:o=s,r.people=r.people||[],r.toString=function(e){var t=s;return o!==s&&(t+="."+o),e||(t+=" (stub)"),t},r.people.toString=function(){return r.toString(1)+".people (stub)"},a("time_event track track_pageview register register_once unregister set_config".split(" "),function(e){!function n(e,t){var o=t.split(".");2===o.length&&(e=e[o[0]],t=o[1]),e[t]=function(){e.push([t].concat(Array.prototype.slice.call(arguments,0)))}}(r,e)}),n._i.push([e,t,o])},n.__SV=1.2,(e=i.createElement("script")).type="text/javascript",e.async=!0,"undefined"!=typeof SUGOIO_CUSTOM_LIB_URL?e.src=SUGOIO_CUSTOM_LIB_URL:"file:"===r.location.protocol&&SUGOIO_LIB_URL.match(/^\\/\\//)?e.src="https:"+SUGOIO_LIB_URL:e.src=SUGOIO_LIB_URL,(t=i.getElementsByTagName("script")[0]).parentNode.insertBefore(e,t)}function a(e,t){for(var o=0,n=e.length;o<n;o++)t(e[o],o,e)}}(document,window.sugoio||[]);
    sugoio.init('${appid}', {'project_id': '${project_id}'});
  </script>
<!-- end sugoio -->
...
</head>
\`\`\`

以上片段将异步方式加载我们库到页面，并提供了一个全局变量名为sugoio，你可以用它来代码埋点上报数据。 成功加载SDK后平台会自动采集页面浏览量。我们还提供一些高级设置：用户属性、页面属性、代码注入等。具体设置方法请参考下面的详细说明。

# init参数配置

\`\`\`javascript
  sugoio.init('${appid}', { // 项目TOKEN
    project_id: '${project_id}', // 项目ID
    api_host: '${collectGateway}', // 数据上报的地址
    app_host: '${protocol}//${websdk_app_host}', // sugoio-latest.min.js文件以及可视化配置时服务端地址
    decide_host: '${protocol}//${websdk_decide_host}', // 加载已埋点配置地址
    loaded: function(lib) { }, // **sugoio** **sdk** 加载完成回调函数
    debug: false, // 是否启用debug
    file_server_token: '${file_server_token}'
  });
\`\`\`

- **${appid}：** 为应用TOKEN。
- **${project_id}：** 为项目ID。
- **api_host：** 数据上报的地址(网关)。
- **app_host：** sugoio-latest.min.js文件以及可视化配置时服务端地址。
- **decide_host：** 加载已埋点配置地址。
- **loaded：** sugoio sdk 加载完成回调函数。
- **enable_hash** 单页应用页面设置开启hash配置(默认false)。
- **duration_track** 是否自动上报停留事件(默认true)。
- **heatmap** 是否开启热图分析功能(默认false)。
- **heatmap_grid_track：** 是否开启网格热图事件上报功能(默认false)。
- **debug** 是否启用debug。
- **exception_topic** sdk默认异常上报topic名称 不设置则不上报

## 用户自定义维度

多维分析工具本身提供了例如 “访问来源”，“城市”,“操作系统"，”浏览器“等等这些维度。这些维度都可以和用户创建的指标进行多维的分析。但是往往不能满足用户对数据多维度分析的要求，因为每个公司的产品都有各自的用户维度，比如客户所服务的公司，用户正在使用的产品版本等等。 平台为了能够让数据分析变得更加的灵活，我们在 JS SDK 中提供了用户自定义维度的API接口:

### **自定义事件上报(代码埋点上报)**

第一次接入平台时，建议先追踪 3~5 个关键的事件，只需要几行代码，便能体验平台的分析功能。例如：

* 图片社交产品，可以追踪用户浏览图片和评论事件。
* 电商产品，可以追踪用户注册、浏览商品和下订单等事件。

平台SDK 初始化成功后，即可以通过 sugoio.track\(event\_name, \[properties\], \[callback\]\) 记录事件：

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
  // sugoio.register 提供全局设置为每条上报记录都设置共有属性，在 Cookie 中永久保存属性，永久有效，如果存在这个属性了则覆盖
  sugoio.register({
    Custom1: 'Custom1',
    Custom2: 'Custom2'
    ...
  });
\`\`\`

# 页面停留事件

\`\`\`javascript
  sugoio.init('${appid}', {
    project_id: '${project_id}',
    loaded: function(lib) {
      sugoio.time_event('停留')
      sugoio._.register_event(window, 'beforeunload', function(){
      sugoio.track('停留', {path_name: location.pathname})
    }, false, true)
  }
  ....
  });
\`\`\`

## sugoio.register_once(object)

在 Cookie 中永久保存属性，如果存在这个属性了则不覆盖

`
    return docs
  }

  render() {
    const { appid, project_id } = this.props
    return (
      <div className="bordert markdown-wrap doc" style={{paddingTop:'20px'}}>
        <div>
          <p className="aligncenter">请按以下步骤进行 JS SDK 安装,如有问题请联系在线客服</p>
          <p>您的项目ID为 : <span className="bold font16">{project_id}</span></p>
          <p>您的应用Token为 : <span className="bold font16">{appid}</span></p>
          <p>请将以下代码放置于您的页面<b>{'<head>'}</b>标签和<b>{'</head>'}</b>标签之间</p>
        </div>
        <ReactMarkdown
          source={this.generateDocs()}
          className="result"
          skipHtml={false}
          escapeHtml={false}
          renderers={{
            code: CodeBlock
          }}
        />
      </div>
    )
  }
}
