/**
 * @author WuQic
 * @email chao.memo@gmail.com
 * @create date 2019-04-17 18:02:46
 * @modify date 2019-04-17 18:02:46
 * @description 新建生命周期模型
 */
/* eslint-disable react/prefer-stateless-function */
import React, { Component } from 'react'
import Bread from '~/components/common/bread'
import LifeCycleForm from './life-cycle-form'


class LifeCycleNew extends Component {
  render() {
    return (
      <div className="user-life-cycle height-100">
        <Bread  path={[
          { name: '生命周期', link: '/console/life-cycle' },
          { name: '创建生命周期模型' }
        ]}
        />
        <div className="scroll-content always-display-scrollbar">
          <div className="height-100" style={{padding: 20}}>
            <LifeCycleForm params={_.get(this.props,'params','')} />
          </div>
        </div>
      </div>
    )
  }
}

export default LifeCycleNew

