import fetch from '../common/fetch-final'
import _ from 'lodash'

async function deleteCsvFile(operator) {
  let fileUrl = _.get(operator, 'parameters.keyToValueMap.csv_file')
  if(fileUrl) {
    let path = fileUrl.replace(window.sugo.file_server_url, '')
    let res = await fetch.get('/app/uploaded-files/get', {path})
    if(res && !res.error && res.result && res.result.length) {
      await fetch.delete(`/app/uploaded-files/delete/${res.result[0].id}`)
    }
  }
}

const getPioProjects = (query) => {

  return async dispatch => {
    //setLoading(dispatch, true)
    let res = await fetch.get('/app/proj/get', query)
    //setLoading(dispatch, false)
    if (!res) return
    if (!query) {
      let action = {
        type: 'set_pioProjects',
        data: res.result
      }
      dispatch(action)
    }
    return res

  }

}

const updateProjects = (id, data) => {

  return async dispatch => {
    let res = await fetch.post('/app/proj/update', {
      id,
      data
    })
    if (!res) return

    let action = {
      type: 'update_pioProjects',
      data: {
        id,
        ...data
      }
    }
    dispatch(action)

    return res

  }

}

const delProjects = (project) => {

  return async dispatch => {
    let query = {
      id: project.id
    }
    let res = await fetch.delete(`/app/proj/del/${project.id}`)
    if (!res) return
    if(res && !res.error) {
      let ops = _.get(project, 'rootOperator.execUnits[0].operators')
      if(ops) {//删除的流程中有读取csv算子，需要清理已上传的文件
        ops.forEach(op => op.operatorType === 'read_csv' ? deleteCsvFile(op) : null)
      }
    }

    let action = {
      type: 'del_pioProjects',
      data: query
    }
    dispatch(action)

    return res

  }

}

const addProjects = (data) => {

  return async dispatch => {
    let res = await fetch.post('/app/proj/add', data)
    if (!res) return

    let action = {
      type: 'add_pioProjects',
      data: res.result
    }
    dispatch(action)

    return res

  }

}

const addProcessOperator = (id, data) => {

  return async dispatch => {
    let res = await fetch.post('/app/proj/add-process-operator', {
      id, data
    })
    return res
  }

}

const delProcessOperator = (processId, operator) => {

  return async dispatch => {
    let res = await fetch.delete(`/app/proj/del-process-operator/${processId}/${operator.name}`)
    if(res && !res.error) {
      //删除的是读取csv算子，需要清理已上传的文件
      deleteCsvFile(operator) 
    }
    return res
  }

}

const updateProcessOperator = (processId, operatorName, data) => {

  return async dispatch => {

    let keys = Object.keys(data)
    let _data = []
    for (let key of keys) {
      _data.push({
        key,
        value: data[key]
      })
    }
    let res = await fetch.post('/app/proj/update-process-operator', {
      processId,
      operatorName, 
      data: _data
    })
    return res
  }

}

const updateOperatorInfo = (processId, operatorName, data) => {

  return async dispatch => {
    let res = await fetch.post('/app/proj/update-operator-info', {
      processId, operatorName, data
    })
    return res
  }

}

const connect = (processId, data) => {

  return async dispatch => {
    let res = await fetch.post('/app/proj/connect', {
      processId, data
    })
    return res

  }

}

const disConnect = (processId, data) => {

  return async dispatch => {
    let res = await fetch.post('/app/proj/disconnect', {
      processId, data
    })
    return res

  }

}

const run = (processId, operatorId, runFrom) => {

  return async dispatch => {
    let res = null
    if(operatorId) {
      let url = '/app/proj/run-' + runFrom
      res = await fetch.post(url, {
        processId,
        operatorId
      })
    } else {
      res = await fetch.post('/app/proj/run', {
        processId
      })
    }

    return res
  }

}

const getOperatorResult = (processId, operatorName) => {

  return async dispatch => {
    let res = await fetch.post('/app/proj/operator-result', {
      processId, operatorName
    })
    return res
  }

}

const addTemplate = data => {
  return async dispatch => {
    data.isTemplate = 1
    let res = await fetch.post('/app/proj/add-template', data)
    if (!res) return

    let action = {
      type: 'add_pioProjects',
      data: res.result
    }
    dispatch(action)

    return res
  }
}

const getTemplateType = () => {
  return async () => {
    let res = await fetch.get('/app/proj/get-template-type')
    if (!res) return
    if(res.result) {
      res.result = Object.keys(res.result).map(key => ({id: key, name: res.result[key]}))
    }
    return res
  }
}

const addCase = data => {
  return async dispatch => {
    let res = await fetch.post('/app/proj/add-case', data)
    if (!res) return

    let action = {
      type: 'add_pioProjects',
      data: res.result
    }
    dispatch(action)

    return res
  }
}

const getCase = () => {
  return async dispatch => {
    let res = await fetch.get('/app/proj/get-case')
    if (!res) return
    let action = {
      type: 'set_pioCases',
      data: res.result
    }
    dispatch(action)
    return res
  }
}

const cloneCase = (id) => {
  return async dispatch => {
    let res = await fetch.post('/app/proj/clone-case', id)
    if (!res) return

    let action = {
      type: 'add_pioProjects',
      data: res.result
    }
    dispatch(action)

    return res
  }
}
const cloneProcessOperator = (processId, operatorId, data) => {
  return async () => {
    let res = await fetch.post('/app/proj/clone-operator', {
      processId,
      operatorId,
      ...data
    })
    return res
  }
}

export {
  getPioProjects,
  updateProjects,
  delProjects,
  addProjects,
  delProcessOperator,
  updateProcessOperator,
  addProcessOperator,
  connect,
  updateOperatorInfo,
  disConnect,
  run,
  getOperatorResult,
  addTemplate,
  getTemplateType,
  addCase,
  getCase,
  cloneCase,
  cloneProcessOperator
}
