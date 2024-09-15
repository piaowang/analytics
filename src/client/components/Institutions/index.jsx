import React, { Component, Fragment } from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from '../../actions'
import _ from 'lodash'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import Tree from './tree'
import MyModel from './model'

let mapStateToProps = (state) => {
  return {
    institutions: state.common.institutions,
    institutionsList: state.common.institutionsList,
    institutionsTree: state.common.institutionsTree,
    roles: state.common.roles,
    users: _.get(state, 'common.users', [])
  }
}
let mapDispatchToProps = (dispatch) => bindActionCreators(actions, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
class Institutions extends Component {
  constructor(props) {
    super(props)
    this.getData()
    this.state = {
      modelType: 'create',
      parent: undefined,
      level: undefined,
      loading: false,
      query: undefined,
      visible: false,
      modalVisible: false,
      delay: true
    }
  }

  componentDidMount() {
    _.delay(() => {
      this.setState({ delay: false })
    }, 700)
    let id = _.get(this.props, 'location.query.id')
    if (id) {
      this.setState({ query: { id } })
    }
  }

  getData = async () => {
    await this.props.getInstitutions({}, {}, 'draft')
    await this.props.getUsers()
    // await this.props.getInstitutions({}, {})
    await this.props.getRoles()
  }

  add = (parent, level) => {
    this.setState({ modelType: 'create', parent, level })
  }

  details = (query) => {
    this.setState({ query })
    // getInstitutionsOne(query)
  }

  create = (data) => {
    this.setState({ loading: true })

    this.props.cteateInstitutions(
      data,
      () => {
        this.props.getInstitutions({}, {}, 'draft')
        this.setState({ loading: false })
      },
      'draft'
    )
  }

  editor = (data) => {
    this.setState({ loading: true })

    this.props.editorInstitutions(
      data,
      () => {
        this.props.getInstitutions({}, {}, 'draft')
        this.setState({ loading: false })
      },
      'draft'
    )
  }

  deleteData = (data, type) => {
    this.props.deleteInstitutions(
      data,
      (v) => {
        if (v !== 'err') {
          this.props.getInstitutions({}, {}, 'draft')
          if (type) {
            this.setState({ query: { id: '' } })
          }
        }
      },
      'draft'
    )
  }

  updateCheckFn = (data) => {
    window.sugo.$loading.show()
    this.props.updateCheck(data, (val) => {
      //为了兼容农商行多机构更新时间长问题，临时补救，后期有时间重构
      if(val === 'ok'){
        const k = this.props.institutionsList.findIndex((item)=>{
          return item.id == data.id
        })

        this.props.institutionsList[k].checking.checkStatus = data.status
        this.props.refreshData(this.props.institutionsList,()=>{
          window.sugo.$loading.hide()
        })
      }else{
        this.props.getInstitutions({}, {}, 'draft')
      }
    })
  }

  importFile = (data, callback) => {
    this.props.importInstitutions(
      data,
      () => {
        this.props.getInstitutions({}, {}, 'draft')
        typeof callback === 'function' && callback()
      },
      'draft'
    )
  }

  showModal = () => {
    this.setState({ visible: true })
  }

  hideModal = () => {
    this.setState({ visible: false })
  }

  render() {
    const {
      roles,
      users,
      institutions,
      institutionsList,
      institutionsTree
    } = this.props
    const {
      modelType,
      level,
      parent,
      loading,
      query,
      visible,
      modalVisible,
      delay
    } = this.state
    const treeProps = {
      data: institutionsTree,
      details: this.details,
      add: this.add,
      showModal: this.showModal,
      hideModal: this.hideModal,
      showImportModal: () => {
        this.setState({ modalVisible: true })
      },
      hidenImportModal: () => {
        this.setState({ modalVisible: false })
      },
      importFile: this.importFile,
      modalVisible,
      id: _.get(query, 'id', '')
    }
    const modelProps = {
      modelType,
      level,
      parent,
      loading,
      treeData: institutionsTree,
      institutions,
      institutionsList,
      roles,
      users,
      create: this.create,
      editor: this.editor,
      add: this.add,
      showModal: this.showModal,
      hideModal: this.hideModal,
      visible,
      deleteData: this.deleteData,
      updateCheckFn: this.updateCheckFn,
      modalVisible,
      showImportModal: () => {
        this.setState({ modalVisible: true })
      },
      id: _.get(query, 'id', '')
    }
    if (delay) {
      return <div className='pd3 aligncenter font20 color-grey'>加载中...</div>
    }
    return (
      <Fragment>
        <div className='borderb'>
          <div className='nav-bar'>
            <div className='fix'>
              <div className='itblock'>
                <div className='iblock'>
                  <div className='ant-breadcrumb'>
                    <span className='itblock elli'>
                      <b>机构管理</b>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <HorizontalSplitHelper
          style={{ height: 'calc(100% - 44px)' }}
          className='contain-docs-analytic'
        >
          <div
            defaultWeight={1}
            className='itblock height-100'
            style={{
              padding: '10px 5px 10px 10px'
            }}
          >
            <div className='bg-white corner height-100 pd2 overscroll-y'>
              <Tree {...treeProps} />
            </div>
          </div>
          <div
            className='itblock height-100'
            style={{ padding: '10px 10px 10px 5px' }}
            defaultWeight={5}
          >
            <div
              className='relative pd3 bg-white corner height-100 overscroll-y'
              style={{ display: 'flex' }}
            >
              <MyModel {...modelProps} />
            </div>
          </div>
        </HorizontalSplitHelper>
      </Fragment>
    )
  }
}

export default Institutions
