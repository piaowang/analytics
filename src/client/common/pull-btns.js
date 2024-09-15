
import { BarsOutlined, UpOutlined } from '@ant-design/icons';
import { Popover, Button, Popconfirm } from 'antd';
import {useState } from 'react'
import './pull-btns.styl'


export default function PullBtns(props) {
  const {options = [], trigger } = props
  const [isSpread, setIsSpread] = useState(false)

  const renderContent = () => {
    return options.map(o => {
      if (o.key === 'delete') {
        return (
          <Popconfirm
            title={o.title || ''}
            onConfirm={o.onClick || (() => { })}
            onVisibleChange={setIsSpread}
          >
            <div key={o.label} className="pd1 color-disable" style={{ cursor: 'pointer' }} >{o.label || ''}
            </div>
          </Popconfirm>
        )
      }
      return (
        <div key={o.key || o.label} onClick={o.onClick || (() => {})} className="pd1 pull-btns-item " style={{cursor: 'pointer'}} >{o.label || ''}
        </div>
      )
    })
  }

  return (
    <Popover
      content={renderContent()}
      placement="bottom"
      trigger={trigger}
      visible={isSpread}
      onVisibleChange={setIsSpread}
      className="pull-btns"
    >
      <Button type="primary">
        <BarsOutlined className="mg1r" />
        <UpOutlined
          className="pull-btns-icon"
          style={{
            transform: `rotate(${!isSpread? 0 : 180}deg)`,
            transition: 'all 0.2s'
          }} />
      </Button>
    </Popover>
  );
}
