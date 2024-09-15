import React from 'react'
import { connect } from 'react-redux'
import { PlusCircleOutlined,UploadOutlined } from '@ant-design/icons'
import { Spin, Button, Upload, Modal, Form, Input, message } from 'antd'
import { bindActionCreators } from 'redux'
import * as actions from '../../actions'
import ProjForm from './form'
import setStatePromise from '../../common/set-state-promise'
import { initProcess } from './constants'
import Bread from '../Common/bread'
import { Link } from 'react-router'
import { checkPermission } from '../../common/permission-control'
import fetch from '../../common/fetch-final'

const canAdd = checkPermission(/^post:\/app\/proj\/add$/)

@setStatePromise
class ProjSingle extends React.Component {
  state = {
    process: initProcess('加载中...'),
    loading: false,
    madalvisible: false
  };

  getChildContext() {
    return {
      slices: this.props.slices,
      datasources: this.props.datasources
    }
  }

  async componentWillMount() {
    let { setProp } = this.props
    setProp('set_loading', true)
    await this.props.getOperators()
    await this.getProjInfo()
    setProp('set_loading', false)
    //获取单图和数据源
    this.props.getSlices()
    this.props.getDatasources({ noauth: 1 })
  }

  getProjInfo = async () => {
    await this.setStatePromise({
      loading: true
    })
    let { projectId } = this.props.params

    let res = await this.props.getPioProjects({
      id: projectId
    })
    await this.setStatePromise({
      loading: false
    })
    if (!res) return
    await this.setStatePromise({
      process: res.result
    })
  };
  async downSuan() {
    window.location.href = '/app/pio/dao-out'
  }
  openModal(){
    this.setState({
      fullName:'',
      madalvisible:true
    })
  }
  daoEnter = async () => {
    const res = await fetch.get('/app/pio/dao-in', {
      fullName: this.state.fullName
    })
    if(res){
      this.setState({
        madalvisible:false
      })
      await this.props.getOperators()
      message.success('导入成功！')
    }
  };
  handleCancel = () => {
    this.setState({
      madalvisible: false
    })
  };

  render() {
    let { process, loading, madalvisible } = this.state
    const pdata = {
      name: 'file',
      accept:'zip',
      beforeUpload: file => {
        return false
      }
    }
    const layout = {
      labelCol: { span: 5 },
      wrapperCol: { span: 16 }
    }
    return (
      <Spin spinning={loading}>
        <Bread
          path={[
            { name: '智能分析', link: '/console/pio-projects?key=2' },
            { name: '智能分析详情' }
          ]}
        >
          <div style={{ float: 'left' }}>
            <Button className="mg1r" onClick={()=>this.openModal()}>
              导入算子
            </Button>
            <Button className="mg1r" onClick={this.downSuan}>
              导出算子
            </Button>
          </div>
          {canAdd ? (
            <Link to="/console/pio-projects/new">
              <Button type="primary" icon={<PlusCircleOutlined />}>
                新建智能分析
              </Button>
            </Link>
          ) : null}
        </Bread>
        <ProjForm {...this.props} process={process} />
        <Modal
          title="导入算子"
          visible={madalvisible}
          onOk={this.daoEnter}
          onCancel={this.handleCancel}
        >
          <div>
            <Form
              {...layout}
              name="basic"
            >
              <Form.Item
                label="算子名称"
                name="fullName"
                rules={[{ required: true, message: '请输入算子名称' }]}
              >
                <Input onChange={(e)=>{this.setState({
                  fullName:e.target.value
                })}}
                />
              </Form.Item>
              <Form.Item label="导入算子模板">
                <Upload {...pdata}>
                  <Button>
                    <UploadOutlined /> 导入模板
                  </Button>
                </Upload>
              </Form.Item>
            </Form>
          </div>
        </Modal>
      </Spin>
    )
  }
}

ProjSingle.childContextTypes = {
  slices: React.PropTypes.array,
  datasources: React.PropTypes.array
}

let mapStateToProps = (state) => state.common
let mapDispatchToProps = (dispatch) => bindActionCreators(actions, dispatch)

export default connect(mapStateToProps, mapDispatchToProps)(ProjSingle)
