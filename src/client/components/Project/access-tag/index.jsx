import React from 'react'
import { browserHistory } from 'react-router'
import Bread from '../../Common/bread'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Button, Input, Modal } from 'antd'
import Icon2 from '../../Common/sugo-icon'
import helpLinkMap from 'common/help-link-map'
import Steps from '../../Common/access-steps'
import { validateFieldsAndScroll } from '../../../common/decorators'
import Fetch from '../../../common/fetch-final'
import { Anchor } from '../../Common/anchor-custom'

const { Item: FormItem } = Form
const { docUrl } = window.sugo
const helpLink = docUrl + helpLinkMap['/console/project#']

/**
 * @description 标签数据接入
 * @export
 * @class TagAccessor
 * @extends {React.Component}
 */
@Form.create()
@validateFieldsAndScroll
export default class TagAccessor extends React.Component {
  constructor(props, context) {
    super(props, context)
    this.state = {
      stepCurrent: 1
    }
  }

  renderSteps = () => {
    let steps = tagStepsTitles.map(title => ({ title }))
    let { stepCurrent } = this.state
    return (
      <div className='pd2t pd1b pd3x'>
        <Steps steps={steps} current={stepCurrent} />
      </div>
    )
  }

  /**
   * @description 保存数据
   * @memberOf TagAccessor
   */
  save = async () => {
    // const { project: { id: project_id, datasource_id, tag_datasource_name: old_tag_datasource_name, datasource_name: old_datasource_name } } = this.props
    // let { tag_datasource_name, datasource_name } = await this.validateFieldsAndScroll()
    // if (!tag_datasource_name || !datasource_name) return
    // // if (old_tag_datasource_name && old_tag_datasource_name === tag_datasource_name
    // //   && old_datasource_name && old_datasource_name === datasource_name) {
    // //   message.warn('无需更新，未作修改！')
    // //   return
    // // }
    // const res = await Fetch.post('/app/project/tag-source-name/save', {tag_datasource_name, project_id, datasource_id, datasource_name})
    // if (res.success) {
    //   Modal.success({
    //     title: '保持成功',
    //     onOk: () => {
    //       browserHistory.push('/console/project')
    //     }
    //   })
    // }
    browserHistory.push('/console/project')
  }

  renderSetingsStep = () => {
    const { project, actionProject } = this.props
    // const { getFieldDecorator } = this.props.form
    return (
      <Form className='mg32t pd2y min-height500'>
        <FormItem {...formItemLayout} label='标签数据表名'>
          {project.tag_datasource_name}
        </FormItem>
        <FormItem {...formItemLayout} label='关联行为数据表名'>
          {actionProject.map(p => p.title || p.name).join(', ')}
        </FormItem>
        <FormItem {...tailFormItemLayout} className='aligncenter'>
          <Button type='primary' size='default' onClick={this.save}>
            返回
          </Button>
        </FormItem>
      </Form>
    )
  }

  render() {
    let { stepCurrent } = this.state
    const extra = (
      <Anchor href={helpLink} target='_blank' className='color-grey pointer' title='查看帮助文档'>
        <Icon2 type='question-circle' />
      </Anchor>
    )
    return (
      <div className='height-100 overscroll-y bg-white access-sdk access-collector'>
        <Bread path={[{ name: '项目管理', link: '/console/project' }, { name: '标签接入' }]} extra={extra}>
          <Button className='mg1l' onClick={() => browserHistory.push('/console/project')}>
            返回
          </Button>
        </Bread>
        {this.renderSteps()}

        <div className='mg-auto mw-50 pd2x pd2b'>{stepCurrent === 1 ? this.renderSetingsStep() : null}</div>
      </div>
    )
  }
}

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 6 }
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 14 }
  }
}

const tailFormItemLayout = {
  wrapperCol: {
    xs: {
      span: 24,
      offset: 0
    },
    sm: {
      span: 14,
      offset: 6
    }
  }
}

export const tagStepsTitles = ['选择导入方式', '绑定标签数据表']
