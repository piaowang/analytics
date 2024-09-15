import React, { Component } from 'react'
import icFinace from '../../images/ic_finace.svg'
import icUser from '../../images/ic_user.svg'
import TextFitter from '../Common/text-fitter'
import HoverHelp from '../Common/hover-help'
import _ from 'lodash'
import AsyncTaskRunner from '../Common/async-task-runner'
import { doQuerySliceData } from '../../common/slice-data-transform'
import classNames from 'classnames'
import metricValueFormatterFactory from '../../common/metric-formatter-factory'

let metricFormater = metricValueFormatterFactory()

class DeviceCount extends Component {

  state = {
    loading: true,
    metricObjs: [],
    druid_result: {}
  }

  componentWillReceiveProps(nextProps, nextState) {
    const { slice } = nextProps
    let metricObjs = []
    if (slice) {
      metricObjs.push(_.get(slice, 'colTitle'))
      metricObjs.push(...slice.rowTitle.map(rT => {
        return [rT.title, ...rT.paramsData]
      }))
      this.setState({ metricObjs })
    }
  }


  getDruidData = () => {
    const { slice } = this.props
    if (slice) {
      return (
        <AsyncTaskRunner
          args={[slice]}
          task={async (sl) => {
            return await doQuerySliceData(sl)
          }}
          onResult={druid_result => {
            druid_result = druid_result[0]
            this.setState({ druid_result })
          }}
        />
      )
    } else {
      return
    }
  }

  render() {
    let { metricObjs = [], druid_result } = this.state
    const { businessDim, type } = this.props
    return (
      <div className="border">
        {
          this.getDruidData()
        }
        <div style={{ width: '100%' }} className="itblock">
          {
            metricObjs.map((row, rowIdx) => {
              return (
                <div className={classNames('itblock bg-white aligncenter width-100', {bordert: rowIdx > 0})} key={rowIdx}>
                  {
                    rowIdx === 0 ?
                      row.map((col, colIdx) => {
                        return (
                          colIdx === 0 ?
                            <div className="height60 relative bg-gray-blue borderr fleft" style={{ width: `calc(100% / ${row.length})` }} key={colIdx}>
                              {
                                type === 'ScenesBrowse' ?
                                  <img src={icUser} alt="" className="center-of-relative height-50" />
                                  :
                                  <div className="center-of-relative height40 width40" style={{ background: '#dae0f3', borderRadius: '50%', paddingTop: '8px' }}>
                                    <img src={icFinace} alt="" className="height24" />
                                  </div>
                              }
                            </div>
                            :
                            <div className="height60 line-height60  color-purple-blue font12 fleft" style={{ width: `calc(100% / ${row.length})` }} key={colIdx}>
                              <HoverHelp addonBefore={`${col.title} `} content={col.description} />
                            </div>
                        )
                      })
                      :
                      row.map((col, colIdx) => {
                        return (
                          colIdx === 0 ?
                            <div className="height60 relative bg-gray-blue borderr fleft font12 line-height60 " style={{ width: `calc(100% / ${row.length})` }} key={colIdx}>
                              <span>
                                {col}
                              </span>
                            </div>
                            :
                            <div className="height60 line-height60 font24 fleft" style={{ width: `calc(100% / ${row.length})` }} key={colIdx}>
                              <TextFitter
                                fontFamily="microsoft Yahei"
                                maxFontSize={26}
                                text={!_.isUndefined(_.get(druid_result, col)) ? metricFormater(_.get(druid_result, col)) : '--'}
                              />
                            </div>
                        )
                      })
                  }
                </div>
              )
            })
          }
        </div>
      </div>
    )
  }
}

export default DeviceCount

