// const { parseExpression } = require('cron-parser')
// const moment = require('moment')



// //该配置对全局有影响
// var options = {
//   currentDate: moment('9:30', 'HH:mm').toDate(),
//   // startDate: moment('11:10', 'HH:mm').toDate(),
//   endDate: moment('23:00', 'HH:mm').toDate(),
//   iterator: false
// }

// try {
//   var interval = parseExpression('*/11 * * * *', options)

//   while (true) {
//     try {
//       var obj = interval.next()
//       // console.log(obj,'obj====')
//       const nextCronTimeout = () => obj.getTime() - Date.now()
//       const cronTimeout = nextCronTimeout()
//       const timeout = cronTimeout > 0 ? cronTimeout : nextCronTimeout()
//       console.log('value:', obj.toString(), 'done:', obj.done, timeout)
//     } catch (e) {
//       // console.log(e)
//       break
//     }
//   }

//   // value: Wed Dec 26 2012 14:44:00 GMT+0200 (EET) done: false
//   // value: Wed Dec 26 2012 15:00:00 GMT+0200 (EET) done: false
//   // value: Wed Dec 26 2012 15:22:00 GMT+0200 (EET) done: false
//   // value: Wed Dec 26 2012 15:44:00 GMT+0200 (EET) done: false
//   // value: Wed Dec 26 2012 16:00:00 GMT+0200 (EET) done: false
//   // value: Wed Dec 26 2012 16:22:00 GMT+0200 (EET) done: true
// } catch (err) {
//   console.log('Error: ' + err.message)
// }



const { parseExpression } = require('cron-parser')
const moment = require('moment')


var options = {
  // currentDate: moment('9:30', 'HH:mm').toDate(),
  // startDate: moment('11:10', 'HH:mm').toDate(),
  // endDate: moment('23:00', 'HH:mm').toDate(),
  iterator: false
}

try {
  var interval = parseExpression('1 0 3 * * *', options)
  var idx = 0
  while (true) {
    if (idx > 20) {
      break
    }
    try {
      var obj = interval.next()
      // console.log(obj,'obj====')
      const nextCronTimeout = () => obj.getTime() - Date.now()
      const cronTimeout = nextCronTimeout()
      const timeout = cronTimeout > 0 ? cronTimeout : nextCronTimeout()
      console.log('value:', obj.toString(), 'done:', obj.done, timeout)
      idx ++
    } catch (e) {
      // console.log(e)
      break
    }
  }

  // value: Wed Dec 26 2012 14:44:00 GMT+0200 (EET) done: false
  // value: Wed Dec 26 2012 15:00:00 GMT+0200 (EET) done: false
  // value: Wed Dec 26 2012 15:22:00 GMT+0200 (EET) done: false
  // value: Wed Dec 26 2012 15:44:00 GMT+0200 (EET) done: false
  // value: Wed Dec 26 2012 16:00:00 GMT+0200 (EET) done: false
  // value: Wed Dec 26 2012 16:22:00 GMT+0200 (EET) done: true
} catch (err) {
  console.log('Error: ' + err.message)
}