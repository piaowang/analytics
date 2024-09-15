import React from 'react'
import Bread from '../Common/bread'
import CompanyForm from './company-form'
import AddBtn from './add-btn'
import { KeyOutlined } from '@ant-design/icons'
import { Button } from 'antd'
import _ from 'lodash'
import BackToListBtn from '../Common/back-to-list-btn'
import { Anchor } from '../Common/anchor-custom'

export default class SegmentExpandSingle extends React.Component {
  render() {
    let id = this.props.params.companyId
    let { companys } = this.props
    let company = _.find(companys, { id }) || {}
    return (
      <div className='height-100'>
        <Bread path={[{ name: '企业列表', link: '/console/company' }, { name: company.name }]}>
          <Anchor href='/retrieve-password' target='_blank'>
            <Button type='ghost' className='mg1r'>
              <KeyOutlined /> 找回密码
            </Button>
          </Anchor>
          <BackToListBtn to='/console/company' title='返回列表' className='mg1r' />
          <AddBtn {...this.props} />
        </Bread>
        <div className='scroll-content always-display-scrollbar'>
          <CompanyForm {...this.props} company={company} />
        </div>
      </div>
    )
  }
}
