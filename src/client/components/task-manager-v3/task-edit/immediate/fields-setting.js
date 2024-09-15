import React, { useState, useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import { Input, Table, Tabs, Select, Checkbox, Button } from 'antd'
import { PlusOutlined, CloseOutlined } from '@ant-design/icons'
// import { useItems } from './utils'
import { generate } from 'shortid'
import FieldsSettingModal from './fields-setting-model'

const { Option } = Select

function FieldsSetting(props) {
  const { config = {}, value = [], onChange, id } = props
  const { items } = config

  const [state, setState] = useState({
    scriptData: '',
    configData: [],
    settingModalVisible: false
  })

  useEffect(() => {
    if (!value || state.settingModalVisible) {
      return
    }
    setState({
      scriptData: [],
      configData: '',
      settingModalVisible: false
    })
  }, [id])

  useEffect(() => {
    if (!value || state.settingModalVisible) {
      return
    }
    setState({
      scriptData: configToScript(value),
      configData: value.map(p => ({ ...p, index: p.index || generate() })),
      settingModalVisible: false
    })
  }, [value?.length, value?.map(p => p.id).join('|'), state.settingModalVisible])

  useEffect(() => {
    return () => {
      setState({
        scriptData: '',
        configData: [],
        settingModalVisible: false
      })
    }
  }, [])

  const columns = useMemo(() => {
    let result = items.map(p => {
      return {
        title: p.label,
        key: p.value,
        dataIndex: p.value,
        render: (val, obj) => generateCol(p, val, obj)
      }
    })
    result.push({
      title: '操作',
      key: 'operation',
      dataIndex: 'operation',
      render: (v, o) => <CloseOutlined onClick={() => handleDelItem(o.index)} />
    })
    return result
  }, [items, value])

  const changeData = (value, update) => {
    onChange && onChange(value)
    if (update) {
      setState({
        ...state,
        configData: value
      })
    }
  }

  /**
   * 根据配置生成table中的列
   * @param {*} obj 配置信息
   * @param {*} index 下标
   */
  const generateCol = (itemConfig, val = '', obj) => {
    const { option, type } = itemConfig
    const { index } = obj
    switch (type) {
      case 'input':
        return <Input defaultValue={val} onChange={e => handleChange(itemConfig, index, e.target.value)} />
      case 'select':
        return (
          <Select defaultValue={val} onChange={val => handleChange(itemConfig, index, val)}>
            {option.map(p => (
              <Option key={p.value} value={p.value}>
                {p.label}
              </Option>
            ))}
          </Select>
        )
      case 'checkbox':
        return <Checkbox checked={val.toString() === 'true'} onChange={e => handleCheckOnly(itemConfig, index, e.target.checked)} />
      default:
        break
    }
  }

  /**
   * 添加一个列
   */
  const handleAddItem = () => {
    if (_.some(value, p => _.isEmpty(p))) {
      return
    }
    changeData([...value, { index: generate() }])
  }

  /**
   * 脚本字符串转json配置
   * @param {*} data 脚本内容
   */
  const scriptToConfig = (data, controlConfig) => {
    const scriptItems = data.split(';')
    return scriptItems.map(p => {
      const value = p.trim().split(',')
      return _.reduce(
        controlConfig,
        (r, v, k) => {
          const val = _.get(value, k, '')
          if (k == 0) {
            r['index'] = generate()
          }
          r[v.value] = _.trim(val)
          return r
        },
        {}
      )
    })
  }

  /**
   * 配置转脚本内容
   * @param {*} data 配置内容
   */
  const configToScript = (data = []) => {
    const fields = items.map(p => p.value)
    const script = data.map(p => {
      return _.reduce(
        fields,
        (r, v, k) => {
          r[k] = _.get(p, v, '')
          return r
        },
        []
      ).join(',')
    })
    return script.join(`;
`)
  }

  /**
   * 删除事件
   * @param {*} index 下标
   */
  const handleDelItem = index => {
    const configData = value.filter(obj => obj.index !== index)
    changeData(configData)
  }

  /**
   * checkebox change方法
   * @param {*} obj 组件配置
   * @param {*} index 下标
   * @param {*} checked 选中状态
   */
  const handleCheckOnly = (obj, index, checked) => {
    const { value: key, singleChoice } = obj
    // 是否有多个选中
    const hasCheck = _.some(value, p => {
      return _.get(p, key, false)
    })
    // 如果不是单选模式 或者没有选中的checkbox 或者是取消选中 直接修改值
    if (singleChoice !== '1' || !hasCheck || !checked) {
      let configData = value.map(p => {
        if (p.index !== index) {
          return p
        }
        return {
          ...p,
          [key]: checked
        }
      })
      changeData(configData, true)
      return
    }

    // 单选模式去掉其他行的选中状态
    let configData = value.map(p => {
      if (p.index === index) {
        return {
          ...p,
          [key]: true
        }
      }
      return {
        ...p,
        [key]: false
      }
    })
    changeData(configData, true)
  }

  /**
   * input select 值改变方法
   * @param {*} obj 组件配置
   * @param {*} index 下标
   * @param {*} checked 选中状态
   */
  const handleChange = _.debounce((obj, index, val) => {
    const { value: key } = obj
    let configData = value.map(p => {
      if (p.index !== index) {
        return p
      }
      return {
        ...p,
        [key]: val
      }
    })
    changeData(configData)
  }, 100)

  const handleClickBatchEdit = () => {
    setState({
      ...state,
      settingModalVisible: true,
      scriptData: configToScript(value)
    })
  }

  const handleOk = val => {
    changeData(scriptToConfig(val, items))
    setState({ ...state, settingModalVisible: false })
  }

  const handleCancel = () => {
    setState({
      ...state,
      settingModalVisible: false
    })
  }

  return (
    <div>
      <div className='alignright mg1b'>
        {/* {
        !scriptConf?.isOpen ?
          <Button>批量修改</Button>
          : null} */}

        <Button onClick={handleClickBatchEdit}>批量修改</Button>
        <div>
          <Table columns={columns} dataSource={state.configData} pagination={false} rowKey='index' key={`${id}_${config.value}`} />
          <Button icon={<PlusOutlined />} onClick={handleAddItem} type='dashed' className='mg-auto mg2t width-100'>
            添加字段
          </Button>
        </div>
        <FieldsSettingModal config={config} value={state.scriptData} onOk={handleOk} onCancel={handleCancel} visible={state.settingModalVisible} />
      </div>
    </div>
  )
}

FieldsSetting.propTypes = {
  value: PropTypes.object.isRequired,
  config: PropTypes.object.isRequired
}

export default FieldsSetting
