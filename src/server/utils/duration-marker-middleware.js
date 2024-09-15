/**
 * Created by heganjie on 2017/5/11.
 * https://github.com/Datafruit/sugo-analytics/issues/2482
 */

import * as d3 from 'd3'

export default function withDurationMarker(app) {
  app.context.markProgress = async function (progressName) {
    let seq = this.state.durationSeq
    if (!seq) {
      seq = this.state.durationSeq = []
    }
    seq.push({progressName, when: Date.now()})
  }

  let middleware = async (ctx, next) => {
    ctx.markProgress('Begin')
    await next()
    ctx.markProgress('End')
    try {
      // target format: ['ProgressA -> ProgressB: 100ms', 'ProgressB -> ProgressC: 50ms', ...]
      let seq = ctx.state.durationSeq || []
      if (2 < seq.length) {
        let pairs = d3.pairs(seq)
        let res = pairs.map(p => `${p[0].progressName} -> ${p[1].progressName}: ${p[1].when - p[0].when}ms`)
        ctx.set('X-Elapsed-Time-Details', JSON.stringify(res))
      }
      ctx.set('X-Elapsed-Time', (seq[seq.length - 1].when - seq[0].when) + 'ms')
    } catch (e) {
      // console.log(e.message)
    }
  }
  app.use(middleware)
}
