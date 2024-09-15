import { initStore, taskType } from './setting'

const taskScheduling = (state= initStore ,action) => {
  switch(action.type){
    case taskType.updateStatus :
      return {...state, loading: action.payload}
    case taskType.saveScheduleTables :
      return {...state, scheduleTables: action.payload}
    case taskType.saveRunningFlows:
      return {...state, runningFlows: action.payload}
    case taskType.saveFinishedFlows:
      return {...state, finishedFlows: action.payload}
    case taskType.saveHistoryFlows: 
      return {...state, historyFlows: action.payload}
  }
  return state
}

export default taskScheduling 
