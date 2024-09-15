import React, { Component } from 'react'
import { SolutionOutlined } from '@ant-design/icons';
import { Spin, Card, Row, Col } from 'antd';
import Bread from '../Common/bread'
import BarChart from './barChart'
import LineChartBox from './linechart-box'

export default class Use extends Component {

  state = {
    loading: false
  }

  constructor(props) {
    super(props)
  }
  render() {
    const { loading = false } = this.state
    return (
      <div className="height-100 contain-docs-analytic">
        <Bread
          path={[{ name: '场景分析', link: '/console/overview' }]}
        />
        <div className="scroll-content always-display-scrollbar pd2x">
          <Spin spinning={loading} />
          <Card className="bg-white mg1t" title="使用分析一览表">
            <Row gutter={30} style={{marginBottom: '30px'}}>
              {
              //   <Col span={12}>
              //   <Card className="shadow15-ddd" style={{height: '516px'}}>
              //     <div className="color-main aligncenter font16"><Icon type="solution" className="mg1r" theme="outlined" />生活缴费</div>
              //     <LineChartBox type="lifePay"/>
              //   </Card>
              // </Col>
              }
              <Col span={12}>
                <Card className="shadow15-ddd" style={{height: '516px'}}>
                  <div className="color-main aligncenter font16"><SolutionOutlined className="mg1r" />助手</div>
                  <LineChartBox type="assistant"/>
                </Card>
              </Col>
              <Col span={12}>
                <Card className="shadow15-ddd" style={{height: '516px'}}>
                  <div className="color-main aligncenter font16"><SolutionOutlined className="mg1r" />账户查询</div>
                  <BarChart type="account" />
                </Card>
              </Col>
            </Row>
            <Row gutter={30}>
              <Col span={12}>
                <Card className="shadow15-ddd" style={{height: '516px'}}>
                  <div className="color-main aligncenter font16"><SolutionOutlined className="mg1r" />转账</div>
                  <LineChartBox type="transfer"/>
                </Card>
              </Col>
              <Col span={12}>
                <Card className="shadow15-ddd" style={{height: '516px'}}>
                  <div className="color-main aligncenter font16"><SolutionOutlined className="mg1r" />生活缴费</div>
                  <LineChartBox type="lifePay"/>
                </Card>
              </Col>
            </Row>
          </Card>
        </div>
      </div>
    );
  }
}
