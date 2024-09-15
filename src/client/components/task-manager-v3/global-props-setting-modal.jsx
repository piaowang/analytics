import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Input, Button, Row, Col, Modal } from 'antd';
import _ from 'lodash'
import { immutateUpdate } from '~/src/common/sugo-utils'


const JobParamsEditModal = (props) => {
  const {
    value = [],
    save,
    hide,
    visible
  } = props

  const [params, setParams] = useState(value)

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

  const editParams = (index, key, value) => {
    setParams(immutateUpdate(params, `${index}.${key}`, () => value))
  }

  return (
    <Modal
      visible={visible}
      title="设置全局参数"
      onOk={() => save(params)}
      onCancel={hide}
    >
      {
        params.map((p, i) => {
          return (
            <Row className="mg1t" key={`key_param_name_${i}`}>
              <Col span={10}>
                <Input
                  placeholder="请输入参数名"
                  defaultValue={p.name}
                  onChange={(e) => editParams(i, 'name', e.target.value)}
                />
              </Col>
              <Col span={10} offset={1}>
                <Input
                  className="inline mg1r"
                  defaultValue={p.value}
                  placeholder="请输入参数值"
                  onChange={(e) => editParams(i, 'value', e.target.value)}
                />
              </Col>

              <div className="inline width30 aligncenter">
                <MinusCircleOutlined
                  title="移除这个参数"
                  className="color-grey font16 pointer line-height32 hover-color-red"
                  onClick={() => removeParams(p, i)} />
              </div>
            </Row>
          );
        })
      }
      <div className="pd1t">
        <span
          className="pointer color-black font12"
          onClick={appendParams}
          title="增加一个参数"
        >
          <PlusCircleOutlined className="mg1r color-green font14" />
          增加一个参数
        </span>

        {/* <Button
					size="small"
					className="pointer color-black font12"
					onClick={() => reduction()}
					title="还原修改"
					icon="reload"
					type="primary"
					style={{ height: 24, marginLeft: 20, color: '#fff' }}
				>
					还原修改
        </Button> */}
      </div>
    </Modal>
  );
}

JobParamsEditModal.propTypes = {
  value: PropTypes.any,
  save: PropTypes.func,
  hide: PropTypes.func,
  visible: PropTypes.any
}

export default JobParamsEditModal
