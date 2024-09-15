import React, {useEffect, useMemo} from 'react'
import useAbortableFetch from 'use-abortable-fetch'
import { Icon as LegacyIcon } from '@ant-design/compatible';
import {getQueryDruidDataUrl} from '../../../common/slice-data-transform'
import _ from 'lodash'
import moment from 'moment'
import {connect} from 'react-redux'
import {doChangeRuntimeState} from '../actions/workbench'
import {immutateUpdate, isEqualWithFunc, tryJsonParse} from '../../../../common/sugo-utils'

moment.locale('zh-cn')
function DataFilterControl0(props) {
  let {className, params, styleConfig, runtimeState, applyInteractionCode} = props
  let {notActive, active, showAllOption, defaultActive, defaultShowNum = 6, isDate } = styleConfig || {}
  let dimName = _.get(params, 'dimensions[0]')
  let url = useMemo(() => {
    const slice = {
      druid_datasource_id: params.druid_datasource_id,
      params: _.omit(params, ['druid_datasource_id', '_extra'])
    }
    return getQueryDruidDataUrl(slice)
  }, [params])
  const { data, loading, error, abort } = useAbortableFetch(url)
  const [showMore, setShowMore] = React.useState(false)

  // 初始化运行时状态，如果有需要，可以设置一个初始状态
  useEffect(() => {
    const currRuntimeState = _.get(window.store.getState(), 'livescreen_workbench.runtimeState', {})
    if (defaultActive && !_.get(currRuntimeState, ['dataFilter', dimName])) {
      let nextRuntimeState = immutateUpdate(currRuntimeState, ['dataFilter', dimName], () => isDate ? eval(defaultActive) : defaultActive)
      doChangeRuntimeState(nextRuntimeState)(window.store.dispatch)
    }
    
    return () => {
      abort()
    }
  }, [])
  let resultSet = _.get(data, '[0].resultSet', [])
  let selectedTerm = _.get(runtimeState, ['dataFilter', dimName], '')
  return (
    <div className={className}>
      {!showAllOption ? null : (
        <div
          className="iblock pointer"
          style={!selectedTerm ? active : notActive}
          onClick={() => {
            let val = ''
            //let nextRuntimeState = immutateUpdate(runtimeState, ['dataFilter', dimName], () => val)
            //只过滤维度数据，其他临时数据清空
            let nextRuntimeState = { dataFilter: {...runtimeState.dataFilter, [dimName] : val } }

            doChangeRuntimeState(nextRuntimeState)(window.store.dispatch)
          }}
        >全部</div>
      )}
      {_.map(resultSet, (d, i) => {
        if ( i >= defaultShowNum && !showMore) return null
        let isActive = selectedTerm === d[dimName] 
        if (isDate) {
          isActive = moment(selectedTerm).startOf('d').diff(moment(d[dimName]).startOf('d')) === 0 
        }
        return (
          <div
            key={i}
            className="iblock pointer"
            style={isActive ? active : notActive}
            onClick={() => {
              let val = d[dimName]  

              //let nextRuntimeState = immutateUpdate(runtimeState, ['dataFilter', dimName], () => val)
              //只过滤维度数据，其他临时数据清空
              let nextRuntimeState = { dataFilter: {...runtimeState.dataFilter, [dimName] : val } }

              doChangeRuntimeState(nextRuntimeState)(window.store.dispatch)
            }}
          >{isDate ? moment(d[dimName]).format(isDate) : d[dimName]}</div>
        )
      })}
      {
        resultSet.length  > defaultShowNum
          ? <LegacyIcon type={showMore ? 'double-left' : 'double-right'}
            className="iblock pointer" 
            style={notActive}
            onClick={() => {
              setShowMore(!showMore)
            }}
          />
          : null
      }
    </div>
  );
}

const DataFilterControl = connect(state => {
  return {
    runtimeState: _.get(state, 'livescreen_workbench.runtimeState', {})
  }
})(DataFilterControl0)


export default DataFilterControl
