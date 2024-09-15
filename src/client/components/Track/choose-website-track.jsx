import React from 'react'
import Bread from '../Common/bread'
import { DesktopOutlined, RollbackOutlined } from '@ant-design/icons'
import { Card, Button, Select, Tooltip, Spin, Radio } from 'antd'
import Fetch from '../../common/fetch-final.js'
import setStatePromise from '../../common/set-state-promise'
import {decompressUrlQuery, tryJsonParse} from '../../../common/sugo-utils.js'
import {TRACKTYPE} from './../../constants/track'

import {generate} from 'shortid'
import _ from 'lodash'
import './track.styl'

const Option = Select.Option

//选择页面来启动可视化埋点
@setStatePromise
export default class ChooseWebsiteTrack extends React.Component {

  state = {
    websites: [],
    projectId: null,
    options: [],
    searchValue: null,
    errTipsText: '',
    errTipsVisible: false,
    goBtnDisabled: true,
    spinning: false,
    tokenParams: {},
  }

  async componentDidMount() {
    const { params: { token } } = this.props //
    const tokenParams = tryJsonParse(decompressUrlQuery(token)) //{token, appName}
    this.setState({
      spinning: true,
      tokenParams: tokenParams
    })
    await this.getWebsites(tokenParams.token)
  }

  async getWebsites(token, url) {
    try{
      let res = await Fetch.get('/app/sdk/desktop/track-websites', {token, url: url ? url : null}, {
        timeout: 18000,
        handleErr: (res) => {
          console.log(res, 'fetch err=====')
        }
      })
      if (!res) {
        res = {
          result: {
            websites: []
          }
        }
      }

      // https://my.workec.com/crm/detail?crmid=757606488&t=9#index
      // {"result":{"projectId":"com_ryMzKwz6l_project_rJZvsXdeW","websites":[{"url":"https://my.workec.com/crm/detail?crmid=757606488&t=9#index"}]},"code":0}
      this.setState({spinning: false})
      const options = res.result.websites.length > 0 ? _.uniq(res.result.websites.map(o => o.url)) : []
      await this.setStatePromise({ websites: options, projectId: res.result.projectid })
    } catch (e){
      debug(e)
    }
  }

  onSearch = (value) => {
    let {websites} = this.state
    let options
    if (!value) {
      options = []
    } else {
      options = websites.slice(0).filter( v => v.indexOf(value) > -1).map((url, idx) => {
        return <Option key={`${url}-opts-${idx}`} value={url}>{url}</Option>
      })
    }
    // 没有匹配到历史也可进入可视化埋点页面
    if (_.isEmpty(options) && value) {
      options = [
        <Option key={`${value}-opts`} value={value}>{value}</Option>
      ]
    }
    this.setState({
      options,
      searchValue: value,
      goBtnDisabled: !value,
      errTipsVisible: false
    })
  }

  showErrorTips(text){
    this.setState({
      errTipsText: text,
      errTipsVisible: true
    })
  }

  goBack = () => {
    const { tokenParams: { token, project_id } } = this.state
    window.location = `/console/project/${project_id}?token=${token}`
  }

  goTrackPage = async (url) => {
    const {websites, projectId, tokenParams} = this.state
    const {token,type} = tokenParams
    //格式验证
    if (!url || !/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(url)) {
      this.showErrorTips('输入错误，无效的URL')
      return
    }
    if (websites.length === 0 || !_.includes(websites, url)) {
      // TODO 未加载的历史记录，需要请求服务器验证
      await this.getWebsites(token, url)
    }
    // 没有匹配到上报数据也可以进入可视化埋点
    if (!_.includes(this.state.websites, url)) {
      this.showErrorTips('该网站还未配置上报过数据')
    }
    this.setState({errTipsVisible: false})
    // 保存原有的hash

    const index = url.indexOf('#')
    const hash = index > -1 ? url.substring(index + 1) : ''
    const path = index > -1 ? url.substring(0, index) : url

    // 传递给可视化埋点编辑器的参数
    const editorParams = {
      state: {
        token,
        hash,
        app_host: location.host,
        token_type: 'Bearer',          // 天知道这字段有啥用，不明白的话不要轻易动
        access_token: generate(),      // 访问token
        expires_in: 60 * 60 * 24,      // 访问过期时间：24小时
        user_id: window.sugo.user.id,
        project_id: projectId,
        choose_page: location.href,
        trackType: type     // 全埋点/可视化类型
      }
    }

    const encode = window.btoa(JSON.stringify(editorParams))
    window.location = `${path}#${encode}`
  }

  render() {
    const { options, websites, searchValue, errTipsText, errTipsVisible, goBtnDisabled, spinning, tokenParams } = this.state
    const suggestions = websites.length === 0 ? null : (
      <ul className="suggestion-list">
        {
          websites.map((url, idx) => (
            <li
              className="suggestion-item"
              onClick={() => this.goTrackPage(`${url ? url : ''}`)}
              key={`${url}-li-${idx}`}
            >
              <DesktopOutlined /> {url}
            </li>
          ))
        }
      </ul>
    )
    return (
      <div>
        <Bread
          path={[
            { name: '项目管理', link: '/console/project' },
            { name: tokenParams.appName, link: `/console/project/${tokenParams.project_id}?token=${tokenParams.token}` },
            { name: tokenParams.type === TRACKTYPE.TRACKAUTO ? '全埋点' : '可视化埋点' }
          ]}
        >
          <Button
            icon={<RollbackOutlined />}
            onClick={this.goBack}
            className="mg1r"
          >返回</Button>
        </Bread>
        <div className="editor-entry-wrapper">

          <Card title={`选择页面来启动${tokenParams.type === TRACKTYPE.TRACKAUTO? '全埋点': '可视化埋点'}`} >
            <div>
              <Tooltip
                placement="bottomLeft"
                title={errTipsText}
                visible={errTipsVisible}
              >
                <Select
                  showSearch
                  className="search-box"
                  onSearch={this.onSearch}
                  onChange={this.onSearch}
                  defaultActiveFirstOption={false}
                  filterOption={false}
                  notFoundContent=""
                  placeholder="http://www.yoursite.com"
                >
                  {options}
                </Select>
              </Tooltip>
              <Button
                type="primary"
                className="search-btn"
                disabled={goBtnDisabled}
                onClick={() => this.goTrackPage(`${searchValue ? searchValue : ''}`)}
              >GO</Button>
            </div>
            <div className="subtitle">最近查看热图埋点页面</div>
            <Spin
              spinning={spinning}
            >
              {suggestions}
            </Spin>
          </Card>
        </div>
      </div>
    )
  }
}
