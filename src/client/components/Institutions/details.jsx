import React, { Component } from 'react'
import { Button,Table } from 'antd'
import moment from 'moment'
import Fetch from '../../common/fetch-final'
import _ from 'lodash'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from '../../actions'
import { browserHistory } from 'react-router'

let columnsName = [
  {
    title: '机构编号',
    key: 'serial_number'
  },
  {
    title: '机构名称',
    key: 'name'
  },
  {
    title: '机构层级',
    key: 'level'
  },
  {
    title: '上级机构',
    key: 'parent'
  },
  {
    title: '启用状态',
    key: 'status'
  },
  {
    title: '备注',
    key: 'description'
  },
  {
    title: '最近更新时间',
    key: 'updated_at'
  },
  {
    title: '更新人',
    key: 'updated_by'
  }
]

let mapStateToProps = state => {
  return {
    institutionsList: state.common.institutionsList
  }
}
let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
class CompatePage extends React.PureComponent {
  state = {
    dataSource: [],
    dataSourceDraft: []
  }

  componentDidMount() {
    let id = _.get(this.props, 'params.id', '')
    if (id) {
      this.getInstitution(id)
    }
  }

  getInstitution = async (id) => {
    let data = await Fetch.get('/app/institutions-draft/find-one',{id})
    let treeData = await Fetch.get('/app/institutions-draft/tree-data',{id})
    let source = _.get(data, 'result.data', {})
    let treeDataResult = _.get(treeData, 'result.data', {})
    //待审核信息
    let dataSourceDraft = Object.keys(_.omit(source, ['id', 'institutions'])).map(key => {
      let object = _.find(columnsName, {key: key}) || {}
      let value = key === 'updated_at' 
        ? moment(source[key]).format('YYYY-MM-DD HH:mm:ss')
        : source[key]
      if (key === 'parent' && source[key]) {
        value = (_.find(treeDataResult, {id: source[key]})).name
      }
      return {
        column: object.title,
        value
      }
    })
    //正式信息
    let dataSource = Object.keys(source.institutions).map(key => {
      let object = _.find(columnsName, {key: key}) || {}
      let value = key === 'updated_at' 
        ? moment(source.institutions[key]).format('YYYY-MM-DD HH:mm:ss')
        : source.institutions[key]
      if (key === 'updated_by') value = source.updated_by
      if (key === 'parent' && source.institutions[key]) {
        value = (_.find(treeDataResult, {id: source.institutions[key]})).name
      }
      return {
        column: object.title,
        value
      }
    })
    this.setState({dataSourceDraft: dataSourceDraft, dataSource: dataSource})
  }

  render(){
    let {dataSourceDraft, dataSource} = this.state
   
    let columns = [
      {
        title: '字段',
        dataIndex: 'column',
        key: 'column'
      },
      {
        title: '属性值',
        dataIndex: 'value',
        key: 'name'
      }
    ]

    return (
      <div className="height-100"  style={{width:'100vw', overflow: 'auto'}}>
        <div style={{minWidth:'1000px'}} >
          <Button className="mg2" onClick={()=>{
            let id = _.get(this.props, 'location.query.backId')
            if (id) {
              return browserHistory.push('/console/institutions-manager?id=' + id)
            }
            window.history.back()
          }}
          >返回</Button>
          <div>
            {
              !_.isEmpty(dataSource) 
                ? <div className="relative height24">
                  <h2 className="center-of-relative">对比页面</h2>
                </div>
                : null
            }
            <div className="itblock"
              style={
                _.isEmpty(dataSource) 
                  ? {
                    width:'50%',
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)'
                  } 
                  : {
                    width:'50%'
                  }
              }
            >
              <div className="mg2">
                <h3 className="aligncenter">待审信息</h3>
                <Table
                  style={{width:'100%'}}
                  columns={columns}
                  dataSource={dataSourceDraft}
                  pagination={false}
                />
              </div>
            </div>
            {
              !_.isEmpty(dataSource) 
                ? <div className="itblock" style={{width:'50%'}}>
                  <div className="mg2">
                    <h3 className="aligncenter">正式信息</h3>
                    <Table
                      style={{width:'100%'}}
                      columns={columns}
                      dataSource={dataSource}
                      pagination={false}
                    />
                  </div>
                </div>
                : null
            }
          </div>
        </div>
      </div>
    )
  }
}
export default CompatePage

