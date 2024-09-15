import {inQueue, invalidById} from '../../src/common/in-queue'
import moment from 'moment'
import {delayPromised} from '../../src/common/sugo-utils'
import chai from 'chai'

const {expect} = chai

let loggedDelay = async (wait) => {
  console.log('waiting: ', wait)
  await delayPromised(wait)
  console.log('wait done: ', wait)
}

describe('in-queue 测试', () => {
  it('正常队列测试', async () => {
    let qDelay1 = inQueue('test1', 1, loggedDelay)
    let qDelay2 = inQueue('test1', 2, loggedDelay)
    let qDelay3 = inQueue('test1', 3, loggedDelay)

    let mStart = moment()
    qDelay1(1001)
    qDelay2(999)
    await qDelay3(1002)

    let elapse = moment().diff(mStart, 'ms')
    console.log('total elapse: ', elapse)
    expect(elapse > 3000).to.be.true
    return
  })

  it('跳过重复测试', async () => {
    let qDelay1 = inQueue('test2', 1, loggedDelay)
    let qDelay2 = inQueue('test2', 2, loggedDelay)
    let qDelay3 = inQueue('test2', 3, loggedDelay)
    let mStart = moment()
    qDelay1(1001)
    qDelay2(3000)
    qDelay3(1002)
    await qDelay2(500)

    let elapse = moment().diff(mStart, 'ms')
    console.log('total elapse: ', elapse)
    expect(elapse > 2000 && elapse < 3000).to.be.true
    return
  })

  it('不会覆盖执行中的任务测试', async () => {
    let qDelay1 = inQueue('test3', 1, loggedDelay)
    let qDelay2 = inQueue('test3', 2, loggedDelay)
    let mStart = moment()
    qDelay2(1001)
    qDelay1(1000)
    await delayPromised(1300)
    await qDelay1(999)

    let elapse = moment().diff(mStart, 'ms')
    console.log('total elapse: ', elapse)
    expect(elapse > 3000).to.be.true
    return
  })

  it('崩溃后不会影响后面的队列', async () => {
    let qDelay1 = inQueue('test4', 1, loggedDelay)
    let qDelay2 = inQueue('test4', 2, async (...args) => {
      await loggedDelay(...args)
      throw new Error('crash...')
    })
    let qDelay3 = inQueue('test4', 3, loggedDelay)

    let mStart = moment()
    qDelay1(1001)
    qDelay2(400).catch(() => {})
    await qDelay3(1002)

    let elapse = moment().diff(mStart, 'ms')
    console.log('total elapse: ', elapse)
    expect(elapse > 2000 && elapse < 3000).to.be.true
    return
  })

  it('invalid 测试', async () => {
    let qDelay1 = inQueue('test5', 1, loggedDelay)
    let qDelay2 = inQueue('test5', 2, loggedDelay)
    let qDelay3 = inQueue('test5', 3, loggedDelay)
    let mStart = moment()
    qDelay1(1001)
    qDelay2(999)
    let p3 = qDelay3(1002)
    await delayPromised(800)
    invalidById('test5', 2)
    await p3

    let elapse = moment().diff(mStart, 'ms')
    console.log('total elapse: ', elapse)
    expect(elapse < 2500).to.be.true
    return
  })
})
