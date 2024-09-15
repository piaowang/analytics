/**
 * 告警设置
 */
import React from 'react'
// import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons'
import _ from 'lodash'
import shortid from 'shortid'
import AlarmForm from './alarm-form'

const addAlarmForm = props => {
  const { apiAlertInfos = [], changeState } = props
  const maxId = _.maxBy(apiAlertInfos, p => p.id)
  changeState({ apiAlertInfos: [...apiAlertInfos, { id: shortid() }] })
}

// const delAlarmForm = (props, id) => {
//   const { apiAlertInfos = [], validForm = {}, changeState } = props
//   changeState({
//     apiAlertInfos: apiAlertInfos.filter(p => p.id !== id),
//     validForm: _.omit(validForm, [id])
//   })
// }

function renderApiForm(props) {
  const { apiAlertInfos = [], validForm, changeState } = props
  if (!apiAlertInfos.length) {
    addAlarmForm(props)
  }
  return (
    <div className='overscroll-y pd2 always-display-scrollbar' style={{ height: 'calc(100vh - 240px)' }}>
      <div className='alarm-api-group mg2b pd1y'>
        <AlarmForm key={_.get(apiAlertInfos, '[0].id')} apiAlertInfo={apiAlertInfos} validForm={validForm} changeState={obj => changeState(obj)} />
        {/* <div className="delete-api-group">
          <a className="color-disable pointer" onClick={() => delAlarmForm(props, p.id)}>
            <MinusCircleOutlined className="color-disable mg1r" />
            删除API告警
          </a>
        </div> */}
      </div>
      {/* <div className="alignright">
        <a
          className="pointer"
          onClick={() => addAlarmForm(props)}
          title="添加一个API告警"
        >
          <PlusCircleOutlined className="mg1r" />
          添加一个API告警
        </a>
      </div> */}
    </div>
  )
}

export default class AlarmConfig extends React.Component {
  // componentDidMount(props) {
  //   addAlarmForm(props)
  // }

  render() {
    return renderApiForm(this.props)
  }
}
