import React from 'react'
import { Form, Icon as LegacyIcon } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { CloseCircleOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tooltip } from 'antd';
import _ from 'lodash'
import formRender, {itemFilter} from './form-render'

const createForm = Form.create

const getKey = key => key.replace(/\@.*/, '') //去除@和后面的算子名

const formOptions = {
  onValuesChange: (props, values) => {
    let {update, unitData} = props
    let keys = Object.keys(values)
    let data = keys.reduce((prev, _key) => {
      let key = getKey(_key)
      prev[key] = values[_key]
      return prev
    }, {})
    
    update(unitData, data)
  }
}

class PioOperatorSettingModal extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      data: props.unitData
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.unitData, this.props.unitData)) {
      let data = nextProps.unitData
      //特殊处理csv
      if(data.operatorType === 'read_csv'){
        let main = data.parameterTypes.find(p => p.key === 'csv_file')
        let keys = ['column_separators', 'encoding', 'data_set_meta_data_information']
        main.otherParameterTypes = data.parameterTypes.filter(p => {
          if(keys.includes(p.key)) return p.isHidden = true
          else return false
        })
      }

      this.setState({
        data
      }, this.reset)
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (!_.isEqual(nextProps, this.props) || nextState !== this.state)
  }
  
  reset = () => {
    this.props.form.resetFields()
  }

  validateFields = () => {

    let {validateFields} = this.props.form
    return new Promise(resolve => {
      validateFields((errors, values) => {
        for(let key in values){
          values[getKey(key)] = values[key]
          delete values[key]
        }
        resolve(values)
      })
    })
  }

  getFieldDecorator = (key, opt) => {
    let id = this.getFieldId(key)
    return this.props.form.getFieldDecorator(id, opt)
  }

  getFieldId = (key) => key + '@' + this.state.data.name

  buildFormItem = (param, i) => {
    let {data} = this.state
    let keyToValueMap = _.get(data, 'parameters.keyToValueMap')

    let {
      key,
      paramType
    } = param

    let TempTag = formRender(paramType)
    let props = {
      getFieldDecorator: this.getFieldDecorator,
      keyToValueMap,
      index: i,
      form: this.props.form,
      options:{
        tags: 'param_type_attributes' === paramType
      },
      param,
      getFieldId: this.getFieldId
    }
    return <TempTag {...props} key={key + '@ft' + i + data.name}/>
  }

  onDel = () => {
    let {closeSettingModal, delOperator} = this.props
    let {name} = this.state.data
    delOperator(name)
    closeSettingModal()
  }

  renderFooter = () => {
    
    return (
      <div className="alignright pio-setting-footer pd2y">
        <Popconfirm
          onConfirm={this.onDel}
          title="确定从项目移除这个算子么？算子上所有连线也会一起移除。"
        >
          <Button
            type="ghost"
            icon={<CloseCircleOutlined />}
            className="mg2r iblock"
          >删除算子</Button>
        </Popconfirm>
      </div>
    );
  }

  render () {
    let {data} = this.state
    let {name, description} = data
    let params = _.get(data, 'parameterTypes', [])
    let cls = 'pio-setting-panel'
    const { isHidden } = this.props

    params = itemFilter(params, data)  

    const hideStyle = isHidden ? { right: '-300px' } : {}
    let iconProps = {
      type: 'caret-right',
      style: {
        position: 'absolute',
        top: '5px',
        left: '0px',
        color: '#aaa',
        fontSize: '11px'
      }
    }
    let hiddenTitle = '隐藏侧边栏'
    if(isHidden) {
      iconProps.type = 'caret-left'
      iconProps.style.left = '-13px'
      iconProps.style.color = '#1bb39c'
      iconProps.style.textShadow = '1px 1px 5px'
      hiddenTitle = '显示侧边栏'
    }

    return (
      <div className={cls} style={hideStyle}>
        <p className="font14 pio-setting-title borderb"><b>{description}</b>算子设定</p>
        <Tooltip
          title={hiddenTitle}
          placement="left"
        >
          <LegacyIcon 
            className="pointer"
            onClick={this.props.hide}
            {...iconProps}
          />
        </Tooltip>
        <div className="pio-setting-body">
          {
            name
              ? <div className="pd2x pd2t">
                <Form
                  onSubmit={this.onSubmit}
                >
                  {
                    params.map(this.buildFormItem)
                  }
                </Form>
              </div>
              : <p className="aligncenter pd3t">还未选择算子</p>
          }
        </div>
        {name ? this.renderFooter() : null}
      </div>
    );
  }

}

export default createForm(formOptions)(PioOperatorSettingModal)
