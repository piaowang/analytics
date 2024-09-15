//qq客服组件
import { Popover, Button } from 'antd'
import './customer-service.styl'
import Icon from '../Common/sugo-icon'
import { qqCustomerServiceUrl, customerServicePhoneNumber } from './common'
import { Anchor } from '../Common/anchor-custom'

function renderPop() {
  return (
    <div>
      {qqCustomerServiceUrl ? renderQQ() : null}
      {customerServicePhoneNumber ? renderPhone() : null}
      <p className='p1t aligncenter'>产品咨询 / 解决方案</p>
    </div>
  )
}

function renderQQ() {
  return (
    <div className='pd1y'>
      <Anchor href={qqCustomerServiceUrl} target='_blank'>
        <Button className='customer-service-btn'>
          <span className='normal'>
            <Icon type='sugo-qq' className='iblock font12' /> QQ咨询
          </span>
          <span className='on-hover'>马上咨询</span>
        </Button>
      </Anchor>
    </div>
  )
}

function renderPhone() {
  return (
    <div className='pd1y'>
      <Button type='info' className='customer-service-btn'>
        <Icon type='sugo-phone' /> {customerServicePhoneNumber}
      </Button>
    </div>
  )
}

export default function CustomerService() {
  if (!qqCustomerServiceUrl && !customerServicePhoneNumber) return null
  return (
    <div id='customer-service' className='fixed-icon'>
      <Popover content={renderPop()} placement='leftTop'>
        <Icon type='customer-service' />
      </Popover>
    </div>
  )
}
