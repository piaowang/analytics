import { Component } from 'react'
import _ from 'lodash'

import ResultTreeModel from './tree-model-render'
import Description from './description-render'
import PerformanceVector from './performance-vector'
import AssociationRules from './association-rules'
import MappedExampleSet from './mapped-example-set'
import FrequentItemSet from './frequent-item-sets'
import TableModel from './table-model'
import LinearRegression from './linear-regression'
import Kmeans from './k-means'
import RandomForest from './random-forest'
import PerformanceRegression from './performance-regression'
import { Radio, Table } from 'antd'
import FFM from './ffm'

const RadioGroup = Radio.Group
const RadioButton = Radio.Button

const exampleSet = [
  'mapped_example_set',
  'simple_example_set',
  'remapped_example_set',
  'conditioned_example_set',
  'sorted_example_set',
  'non_special_example_set',
  'attribute_weighted_example_set',
  'splitted_example_set',
  'model_view_example_set'
]
const exampleSetDes = [
  '映射示例集',
  '简单示例集',
  '重映射示例集',
  '条件示例集',
  '排序示例集',
  '普通示例集',
  '属性加权示例集',
  '分类示例集',
  '模型示例集'
]

const typeToObject = {
  default: {
    dataType: exampleSet, //需要展示的结果类型
    dataTypeDes: exampleSet.reduce((prev, key, i) => {
      prev[key] = exampleSetDes[i]
      return prev
    }, {})
  },
  parallel_decision_tree: {
    dataType: ['tree_model'], //需要展示的结果类型
    dataTypeDes: {
      //结果类型对应的描述
      tree_model: '决策树'
    }
  },
  performance_classification: {
    dataType: ['performance_vector'],
    dataTypeDes: {
      performance_vector: '分类评估'
    }
  },
  performance_binominal_classification: {
    dataType: ['performance_vector'],
    dataTypeDes: {
      performance_vector: '二项分类评估'
    }
  },
  apply_model: {
    dataType: [],
    dataTypeDes: {}
  },
  create_association_rules: {
    dataType: ['association_rules'],
    dataTypeDes: {
      association_rules: '关联规则'
    }
  },
  fp_growth: {
    dataType: ['frequent_item_sets'],
    dataTypeDes: {
      frequent_item_sets: 'fp增长树'
    }
  },
  linear_regression: {
    dataType: ['linear_regression'],
    dataTypeDes: {
      linear_regression: '线性回归'
    }
  },
  performance_regression: {
    dataType: ['performance_vector'],
    dataTypeDes: {
      performance_vector: '回归评估'
    },
    result: {
      performance_vector: PerformanceRegression
    }
  },
  logistic_regression: {
    dataType: ['MyKLRModel'],
    dataTypeDes: {
      MyKLRModel: '逻辑回归'
    }
  },
  k_means: {
    dataType: ['centroid_cluster'],
    dataTypeDes: {
      centroid_cluster: '类别数据'
    }
  },
  support_vector_machine: {
    dataType: ['svm'],
    dataTypeDes: {
      svm: '支持向量机'
    }
  },
  random_forest: {
    dataType: ['random_forest'],
    dataTypeDes: {
      random_forest: '随机森林'
    }
  },
  ffm: {
    dataType: ['FieldAwareFactorizationMachineModel'],
    dataTypeDes: {
      FieldAwareFactorizationMachineModel: 'FFM'
    }
  }
}

const result = {
  tree_model: ResultTreeModel,
  performance_vector: PerformanceVector,
  association_rules: AssociationRules,
  mapped_example_set: MappedExampleSet,
  frequent_item_sets: FrequentItemSet,
  linear_regression: LinearRegression,
  MyKLRModel: TableModel,
  centroid_cluster: Kmeans,
  svm: TableModel,
  random_forest: RandomForest,
  FieldAwareFactorizationMachineModel: FFM,
  ...exampleSet.reduce((prev, e) => {
    prev[e] = MappedExampleSet
    return prev
  }, {})
}

//补全模型应用的dataType
let temp = typeToObject.apply_model
for (let key in typeToObject) {
  if (key !== 'apply_model') {
    temp.dataType = temp.dataType.concat(typeToObject[key].dataType)
    Object.assign(temp.dataTypeDes, typeToObject[key].dataTypeDes)
  }
}

class MainRenders extends Component {
  state = {
    tab: 1
  };

  onChange = (e) => {
    this.setState({
      tab: e.target.value
    })
  };

  render() {
    const { type, modelData } = this.props
    const { tab } = this.state
    const typeObj = typeToObject[type] || typeToObject.default

    let ioObjects = _.get(modelData, 'data.ioObjects', []).filter(
      (o) => o && typeObj.dataType.includes(o.dataType)
    )

    let mainData =
      ioObjects.find((o) => o.dataType === typeObj.dataType[0]) || ioObjects[0]
    let description = mainData ? mainData.description : null
    //临时关闭，只走表格方式去显示
    // if (type === 'linear_regression') {
    //   const columns = [
    //     {
    //       dataIndex: 'predict_label',
    //       title: 'predict_label'
    //     },
    //     {
    //       dataIndex: 'label',
    //       title: 'label'
    //     }
    //   ]
    //   return (
    //     <div>
    //       <pre>
    //         {mainData.metrics.map((p,index) => (<span key={index} className='pd2r'> {p}</span>))}
    //       </pre>
    //       <Table columns={columns} dataSource={mainData.data} />
    //     </div>
    //   )
    // }
    let classNames = new Array(ioObjects.length + 1).fill('hide')
    classNames[tab] = ''

    let group = []
    let body = ioObjects.map((o, i) => {
      let Temp = _.get(typeObj, 'result.' + o.dataType, result[o.dataType])
      let j = i + 1
      group.push(
        <RadioButton value={j} key={j}>
          {typeObj.dataTypeDes[o.dataType]}
        </RadioButton>
      )
      return (
        <div className={classNames[j]} key={j}>
          <Temp data={o} />
        </div>
      )
    })

    if (description) {
      group.unshift(
        <RadioButton value={0} key={0}>
          文字描述
        </RadioButton>
      )
      body.unshift(
        <Description
          description={description}
          className={classNames[0]}
          key={0}
        />
      )
    }

    return (
      <div>
        <div className={'tabs pd1y' + (group.length > 1 ? '' : ' hide')}>
          <RadioGroup onChange={this.onChange} value={tab}>
            {group}
          </RadioGroup>
        </div>
        {body}
      </div>
    )
  }
}

export default MainRenders
