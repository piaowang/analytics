/* eslint-disable react/prop-types */
/**
 * @author WuQic
 * @email chao.memo@gmail.com
 * @create date 2019-04-10 15:40:30
 * @modify date 2019-04-10 15:40:30
 * @description 用户生命周期
 */

import React, { Component } from 'react'
import Bread from '~/components/common/bread'
import Empty from '~/components/common/empty'
import { connect } from 'react-redux'
import { PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd'
import _ from 'lodash'
import { browserHistory, Link } from 'react-router'
import LifeCycleForm from './life-cycle-form'
import LifeCycleMain from './life-cycle-main'
import { namespace } from './store/life-cycle'

@connect(state => ({ ...state[namespace], ...state.sagaCommon }))
export default class LifeCycle extends Component {

  componentWillUpdate(nextProps) {
    const { projectCurrent: nextProject } = nextProps
    const { projectCurrent } = this.props
    if (projectCurrent !== nextProject) {
      this.dispatch('init', { project_id: nextProps.id})
    } 
  }

  dispatch(func,payload) {
    this.props.dispatch({
      type: `${namespace}/${func}`,
      payload
    })
  }
  
  changeProps(payload) {
    this.props.dispatch({
      type: `${namespace}/setState`,
      payload
    })
  }

  render() {
    const { lifeCycle } = this.props

    return (
      <div className="user-life-cycle height-100">
        <Bread path={[{ name: '生命周期' }]}>
          {
            !_.isEmpty(lifeCycle)
              ?  
              <Link to={`/console/life-cycle/edit/${lifeCycle.id}`}>
                <Button type="primary">编辑</Button>
              </Link>
              :
              null
          }
        </Bread>
        <div className="scroll-content always-display-scrollbar">
          <div className="relative pd2y pd3x">
            {
              _.isEmpty(lifeCycle) ? (
                <Empty
                  style={{margin: '40px 8px'}}
                  description="暂未无生命周期模型"
                >
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      browserHistory.push('/console/life-cycle/new')
                    }}
                  >创建生命周期模型</Button>
                </Empty>
              ) : (
                // <LifeCycleForm lifeCycle={lifeCycle} />
                <LifeCycleMain />
              )
            }
          </div>
        </div>
      </div>
    );
  }
}
