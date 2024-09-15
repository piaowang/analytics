import React from 'react'
import Bread from '../Common/bread'

class NewModel extends React.Component {
  render() {
    return (
      <div className="height-100 bg-white">
        <Bread path={[
          {name: '流失预测', link: '/console/loss-predict'},
          {name: '新建流失分析模型'}
        ]}
        />
        <div className="pd2b pd3x">
          <span>模型说明:该模型包含模型输出、模型效果、规则集三块，，你可以上传一份和训练数据的字段格式一样的数据表格，使用该模型进行数据预测。</span>
          <div className="fright">
            <Button
              type="primary"
            >
              使用该模型做预测
            </Button>
            <Button className="mg2l" type="success">
              查看历史预测记录
            </Button>
          </div>
        </div>
        <div className="relative pd2y pd3x min-height500 border-dashed">
          <div className="absolute a-center height100 width200 aligncenter">
            <Icon type="info-circle-o" className="font60 color-purple pd2b" />
            <h3>当前没有训练模型，请先上传数据进行训练！</h3>
          </div>
        </div>
        <div className="pd3y aligncenter">
          <Button type="success" size="large" className="pd3x">建立训练模型</Button>
        </div>
      </div>
    )
  }
}

export default NewModel
