import React from 'react'
import TreeModel from '../PioProjects/result-renders/tree-model-render'

class ModelResultOutput extends React.Component {

  render() {
    let {root, ...rest} = this.props
    return (
      <div {...rest}>
        <div
          className="border overscroll-y"
          style={{height: 'calc(100% - 29px - 32px)'}}
        >
          <TreeModel data={root} />
        </div>
        <h2 className="aligncenter mg2y">训练模型图</h2>
      </div>
    )
  }
}

export default ModelResultOutput
