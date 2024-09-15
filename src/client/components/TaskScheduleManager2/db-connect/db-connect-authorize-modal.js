import { CaretRightOutlined } from '@ant-design/icons';
import { Modal, Checkbox, Collapse, Button } from 'antd';
import React from 'react'
import { connect } from 'react-redux'
import classnames from 'classnames'

const { Panel } = Collapse

const customPanelStyle = {
  background: '#fff',
  borderRadius: 4,
  marginBottom: 24,
  border: 0,
  overflow: 'hidden'
}
@connect(({ dbConnect }) => ({
  ...dbConnect
}))
export default class DbPopWindow extends React.Component {
  componentDidMount () {

  }

  changeState (state) {
    this.props.dispatch({
      type: 'dbConnect/changeState',
      payload: state
    })
  }

  onSubmit = async () => {
    const { authorizeInfo } = this.props
    const { handleOk } = this.props
    handleOk(authorizeInfo)
  }

  onChaOptions = (id) => {
    const { authorizeInfo, authorizeList } = this.props
    const isExist = authorizeInfo.includes(id)
    if (isExist) {
      const list = authorizeInfo.filter(item => item !== id)
      this.changeState({
        authorizeInfo: list
      })
      this.forceUpdate()
    } else {
      authorizeInfo.push(id.toString())
      this.changeState({ authorizeInfo })
      this.forceUpdate()
    }
  }

  render () {
    const { visible, handleCancel, authorizeInfo, authorizeList } = this.props
    return (
      <div>
        <Modal
          maskClosable={false}
          title={'授权管理'}
          visible={visible}
          onCancel={() => {
            handleCancel()
          }}
          onOk={this.onSubmit}
          width={700}
        >
          <Collapse
            bordered={false}
            defaultActiveKey={'1'}
            expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
          >
            <Panel header="数据开发中心" key="1" style={customPanelStyle}>
              {/* <Checkbox.Group options={authorizeList} value={authorizeInfo} onChange={this.onChaOptions} /> */}
              {authorizeList.map(item => {
                const type = authorizeInfo.includes(item.value) ? 'primary' : 'ghost'
                return (
                  <Button
                    key={'db_authorize' + item.value}
                    type={type}
                    className="mw200 elli mg1b mg1r"
                    onClick={this.onChaOptions.bind(this, item.value)}
                  >{item.label}</Button>
                )
              })}
            </Panel>
          </Collapse>
        </Modal>
      </div>
    );
  }
}
