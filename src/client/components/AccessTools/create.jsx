import React from 'react'
import Bread from '../Common/bread'
import Editor from './editor'
import Store from './store'
import helpLinkMap from 'common/help-link-map'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { Anchor } from '../Common/anchor-custom'

const { docUrl } = window.sugo
const helpLink = docUrl + helpLinkMap['/console/access-tools']

class Main extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
    this.state = this.store.getState()
  }

  componentWillMount() {
    this.store.initCreateModel(this.props.params.id)
  }

  render() {
    const { Project, AccessDataTask } = this.state
    let extra = (
      <Anchor href={helpLink} target='_blank' className='color-grey pointer'>
        <QuestionCircleOutlined />
      </Anchor>
    )
    return (
      <div className='height-100 bg-grey-f5'>
        <Bread path={[{ name: '数据接入工具', link: '/console/access-tools' }, { name: '编辑导入任务' }]} extra={extra}>
          {null}
        </Bread>
        <div className='scroll-content always-display-scrollbar' style={{ height: window.innerHeight - 44 - 48 }}>
          {Project.id ? <Editor project={Project} accessDataTask={AccessDataTask} /> : null}
        </div>
      </div>
    )
  }
}

export default Main
