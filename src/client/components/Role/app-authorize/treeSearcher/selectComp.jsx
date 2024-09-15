import React from 'react'
import {  TreeSelect } from 'antd'
import { recurTreeNode } from '../genTreeSelectNode'
import {connect} from 'react-redux'
import _ from 'lodash'

function SearchTreeSelect(props) {

  const dispatch = props.dispatch

  const tags = _.get(props, 'appAuthorizeGetTag.applicationTag', {})
  const store = _.get(props, 'appAuthorizeApplication')
  const { tagSearchVal = '' } = store

  return (
    <div className="fleft mg2l width-50">
      <span style={{fontWeight: 'bold'}}>应用标签: </span>
      <TreeSelect
        showSearch
        className="width-80"
        placeholder="请选择应用标签"
        allowClear
        getPopupContainer={() => document.querySelector('#app-authorize .app-authorize-treeselect')}
        treeCheckable
        // value={selectedTag}
        treeCheckStrictly
        multiple
        filterTreeNode
        treeDefaultExpandAll
        treeNodeFilterProp={'filterProp'}
        onSearch={(v) => {
          dispatch({
            type: 'appAuthorizeApplication/changeState',
            payload: {
              tagSearchVal: v
            }
          })
        }}
        onChange={(value) => {
          dispatch({
            type: 'appAuthorizeApplication/changeState',
            payload: {
              selectedTag: value.map(i => i.value)
            }
          })
        }}
      >
        {
          (tags.tree || []).map(i => recurTreeNode(i, tagSearchVal))
        }
      </TreeSelect>
    </div>
  )
}

export default connect(state => ({
  appAuthorizeGetTag: state.appAuthorizeGetTag,
  appAuthorizeApplication: state.appAuthorizeApplication
}))(SearchTreeSelect)













// import React from 'react'
// import { TreeSelect } from 'antd';

// const { TreeNode } = TreeSelect;

// export default class Demo extends React.Component {
//   state = {
//     value: undefined,
//   };

//   onChange = value => {
//     this.setState({ value });
//   };

//   render() {
//     return (
//       <TreeSelect
//         showSearch
//         style={{ width: '100%' }}
//         value={this.state.value}
//         dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
//         placeholder="Please select"
//         allowClear
//         treeDefaultExpandAll
//         treeNodeFilterProp={'title'}
//         onChange={this.onChange}
//       >
//         <TreeNode value="parent 1" title="parent 1" key="0-1">
//           <TreeNode value="parent 1-0" title="parent 1-0" key="0-1-1">
//             <TreeNode value="leaf1" title="my leaf" key="random" />
//             <TreeNode value="leaf2" title="your leaf" key="random1" />
//           </TreeNode>
//           <TreeNode value="parent 1-1" title="parent 1-1" key="random2">
//             <TreeNode value="sss" title={<b style={{ color: '#08c' }}>sss</b>} key="random3" />
//           </TreeNode>
//         </TreeNode>
//       </TreeSelect>
//     );
//   }
// }
