/**
 * 代码参考自 https://github.com/github/fetch#aborting-requests
 */


import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only'
import { fetch } from 'whatwg-fetch'


// safari 的 fetch 无法正常使用，会报 Type Error。可以去上传日志那里试试
const isSafari = typeof document !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
const mobiles = ['android', 'iphone', 'ipad', 'windows phone', 'blackberry', 'hp-tablet', 'symbian', 'phone']

// use native browser implementation if it supports aborting
export const abortableFetch = ('signal' in new Request('')) && !isSafari ? window.fetch : fetch
// export const abortableFetch = fetch

export const AbortController = window.AbortController

export const isMobile = function () {
	let userAgentInfo = navigator.userAgent
	if (!!userAgentInfo.match(/AppleWebKit.*Mobile.*/) || !!userAgentInfo.match(/AppleWebKit/)) {
		let info = userAgentInfo.toLowerCase();
		return mobiles.some(monile => !!~info.indexOf(monile))
	}
	return false;
};