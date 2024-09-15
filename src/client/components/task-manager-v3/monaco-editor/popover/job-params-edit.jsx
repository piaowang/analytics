import React from 'react'
import PropTypes from 'prop-types'
import { MinusCircleOutlined, PlusCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import { Input, Button, Row, Col } from 'antd'
import _ from 'lodash'
import './job-params-edit.styl'

const JobParamsEdit = props => {
  const { params = [], setParams, reduction, changeEditStatus } = props

  // const

  const appendParams = () => {
    const names = params.map(({ name }) => name)
    if (names.includes('')) {
      return
    }
    setParams([
      ...params,
      {
        name: '',
        value: ''
      }
    ])
  }

  const removeParams = (param, idx) => {
    if (params[idx] && params[idx].name === param.name) {
      const p = [...params]
      p.splice(idx, 1)
      setParams([...p])
    }
  }

  return (
    <React.Fragment>
      {params.map((p, i) => {
        return (
          <Row className='mg1t' key={`key_param_${p.name || Date.now()}`}>
            <Col span={10}>
              <Input
                placeholder='请输入参数名'
                defaultValue={p.name}
                onChange={e => {
                  const value = e.target.value
                  p.name = value
                  changeEditStatus && changeEditStatus()
                }}
              />
            </Col>
            <Col span={10} offset={1}>
              <Input
                className='inline mg1r'
                defaultValue={p.value}
                placeholder='请输入参数值'
                onChange={e => {
                  const value = e.target.value
                  p.value = value
                  changeEditStatus && changeEditStatus()
                }}
              />
            </Col>
            <div className='inline width30 aligncenter'>
              <MinusCircleOutlined title='移除这个参数' className='color-grey font16 pointer line-height32 hover-color-red' onClick={() => removeParams(p, i)} />
            </div>
          </Row>
        )
      })}
      <div className='pd1t'>
        <span className='pointer color-black font12' onClick={appendParams} title='增加一个参数'>
          <PlusCircleOutlined className='mg1r color-green font14' />
          增加一个参数
        </span>

        <Button
          size='small'
          className='pointer color-black font12'
          onClick={() => reduction()}
          title='还原修改'
          icon={<ReloadOutlined />}
          type='primary'
          style={{ height: 24, marginLeft: 20, color: '#fff' }}
        >
          还原修改
        </Button>
      </div>
    </React.Fragment>
  )
}

JobParamsEdit.propTypes = {
  params: PropTypes.any,
  setParams: PropTypes.func,
  reduction: PropTypes.func,
  changeEditStatus: PropTypes.func
}

export default JobParamsEdit
