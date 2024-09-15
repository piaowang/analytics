import React from 'react'
import Bread from '../Common/bread'
import CompanyForm from './company-form'
import BackToListBtn from '../Common/back-to-list-btn'

export default class CompanyNew extends React.Component {
  render () {
    return (
      <div className="height-100">
        <Bread
          path={[
            { name: '企业列表', link: '/console/company' },
            { name: '新建企业', link: '/console/company/new' }
          ]}
        >
          <BackToListBtn
            to="/console/company"
            title="返回列表"
          />
        </Bread>
        <div className="scroll-content always-display-scrollbar">
          <CompanyForm {...this.props} />
        </div>
      </div>
    )
  }
}
