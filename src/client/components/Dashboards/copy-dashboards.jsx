import { Component } from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Modal, Select, Input, message } from 'antd';
import Fetch from '../../common/fetch-final'
import PropTypes from 'prop-types'
import {bindActionCreators} from 'redux'
import {connect} from 'react-redux'
import * as actions from '../../actions'

const {Option} = Select

let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)
@connect(state => ({}), mapDispatchToProps)
@Form.create()
class CopyDashboards extends Component {
  constructor (props) {
    super(props)
    this.state = {
      loading: false
    }
  }

  submit = () => {
    const { form: {validateFields}, onCancel, projectList=[], getDashboards, reoloadDashBoardCategory} = this.props
    validateFields((err, value)=> {
      if(err) {return}
      this.setState({loading: true})
      const {oldDatasource, datasourceId} = value
      const datasource = projectList.find(({id}) => id === datasourceId)
      const data = {
        oldDatasource,
        toDatasource: datasource.datasource_id,
        toProjectId: datasource.id,
        toDatasourceName: datasource.datasource_name
      }
      Fetch.post('/app/slices/copyDashboards', data)
        .then((response) => {
          if (response.success) {
            message.success('操作成功')
            typeof getDashboards === 'function' && getDashboards()
            typeof reoloadDashBoardCategory === 'function' && reoloadDashBoardCategory()
          } else {
            message.error('操作失败')
          }
          this.setState({loading: false})
          onCancel()
        })
        .catch(()=>{
          message.error('操作失败')
          this.setState({loading: false})
        })
      
    })

  }
  render() {
    const { form: {getFieldDecorator}, onCancel, visible, projectList=[], projectCurrent } = this.props
    const {loading} = this.state

    const cancel = () => {
      this.setState({loading: false})
      onCancel()
    }

    return (
      <Modal
        confirmLoading={loading}
        visible={visible}
        onCancel={cancel}
        onOk={this.submit}
        title="复制看板"
        width={400}
        className="dash-category-modal"
      >
        <Form>
          <Form.Item style={{display: 'none'}}>
            {getFieldDecorator('oldDatasource', {
              initialValue: projectCurrent.datasource_id
            })(<Input />)}
          </Form.Item>
          <Form.Item label={'复制到新项目'} labelCol={{span: 8}} wrapperCol={{span: 16}}>
            {getFieldDecorator('datasourceId', {
              rules: [{ required: true, message: '请选择复制到那个项目' }]
            })(<Select>
              {
                projectList.map((item) => {
                  if (projectCurrent.datasource_id !== item.datasource_id) {
                    return (<Option key={item.id} title={item.name} value={item.id}>{item.name}</Option>)
                  }
                  return null
                })
              }
            </Select>)}
          </Form.Item>
        </Form>
      </Modal>)
  }
}

CopyDashboards.propTypes = {
  form: PropTypes.object,
  onCancel: PropTypes.func,
  getDashboards: PropTypes.func,
  visible: PropTypes.bool,
  projectList: PropTypes.array,
  projectCurrent: PropTypes.object
}

export default CopyDashboards
