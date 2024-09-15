import { Component } from 'react'

class FFM extends Component {
  render() {
    const {data} = this.props
    return (
      <div>
        <p>
          <label className="bold">特征总数：</label>
          <span>{data.featureNum}</span>
        </p>
        <p>
          <label className="bold">域总数：</label>
          <span>{data.fieldNum}</span>
        </p>
        <p>
          <label className="bold">隐向量维数：</label>
          <span>{data.latentFactorDim}</span>
        </p>
        <p>
          <label className="bold">normalization：</label>
          <span>{data.normalization ? 'true' : 'false'}</span>
        </p>
        <p>
          <label className="bold">权重：</label>
          <span>{data.weights.slice(0, 100).join(' | ')}</span>
        </p>
      </div>
    )
  }
}

export default FFM
