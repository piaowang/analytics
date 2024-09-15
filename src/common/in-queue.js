/**
 * 为 fetch 等异步函数添加队列功能
 * 测试见 in-queue.test.js，测试命令 mocha -t 5000 test/test.js
 */
import _ from 'lodash'

const queueDict = { }

function getQueueInst(queueName) {
  if (queueName in queueDict) {
    return queueDict[queueName]
  }
  queueDict[queueName] = new Queue()
  return queueDict[queueName]
}

const DropPrevIdErr = new Error('Queued task aborted')

const TaskState = {
  Waiting: 0,
  Running: 1,
  Done: 2
}

const taskNotDonePred = task => task.state !== TaskState.Done

class Queue {
  waitingQueue = []

  tryToRun = () => {
    let firstNotDone = _.find(this.waitingQueue, taskNotDonePred)
    if (firstNotDone && firstNotDone.state === TaskState.Waiting) {
      firstNotDone.onMyTurn()
    }
  }

  invalidById = id => this.waitingQueue.filter(qObj0 => qObj0.id === id).forEach(qObj0 => qObj0.invalid())

  genQueueObj = (id, doFetch, abortRunningTask) => {
    return {
      id,
      state: TaskState.Waiting,
      onMyTurn: null,
      invalid: _.noop,
      action: doFetch,
      abort: abortRunningTask && _.once(abortRunningTask) || _.noop
    }
  }

  waiting = async (qObj) => {
    // 移除重复 id 的任务
    this.invalidById(qObj.id)
    this.waitingQueue.push(qObj)

    try {
      // 3 种情况：
      // 1：正确排队并执行 fetch，完成后尝试继续执行队列
      // 2：fetch 报错，尝试继续执行队列
      // 3：排队中途退出，尝试继续执行队列

      if (1 < this.waitingQueue.length) {
        // 等待之前的操作，如果有相同的 id 同时等待，则之前的等待将会报错
        await new Promise((resolve, reject) => {
          qObj.onMyTurn = () => resolve()
          // 冲突报错后，移出队列
          qObj.invalid = () => reject(DropPrevIdErr)
        })
      }
      qObj.invalid = qObj.abort
      qObj.state = TaskState.Running
      return await qObj.action()
    } catch (e) {
      if (e !== DropPrevIdErr) {
        throw e // fetch 报错或任务被中止
      }
    } finally {
      qObj.state = TaskState.Done
      this.waitingQueue = this.waitingQueue.filter(taskNotDonePred)

      this.tryToRun()
    }
  }
}

/**
 * 为异步函数 asyncFunc 添加队列功能
 * @param {string} queueName 队列名称，为了与其他队列隔离
 * @param {string} id  任务 id
 * @param {function(...[*])} asyncFunc 异步函数
 * @param {function()?} abortRunningTask 终止异步函数运行函数
 * @returns {function(...[*])} 封装过后的异步函数
 */
export function inQueue(queueName, id, asyncFunc, abortRunningTask) {
  let queueInst = getQueueInst(queueName)
  return async (...args) => {
    let qObj = queueInst.genQueueObj(id, () => asyncFunc(...args), abortRunningTask)
    return await queueInst.waiting(qObj)
  }
}

export function invalidById(queueName, id) {
  getQueueInst(queueName).invalidById(id)
}
