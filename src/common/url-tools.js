/**
 * @Author sugo.io<asd>
 * @Date 17-11-1
 */

const DomainRegStr = '^(?:https?):'   // protocol
  + '\\/\\/'                          // //
  + '(?:[^\\\/\\s@]+@)?'              // auth
  + '(?:[^\\\/\\s]+)'                 // host
  + '(?::\\d+)?'                      // port

const Domain = {

  /**
   * @type {string}
   */
  RegStr: DomainRegStr,

  /**
   * @type {RegExp}
   */
  Reg: new RegExp(DomainRegStr, 'i'),

  /**
   * 替换 href 的domain，href 必须是完整的，包括 protocol 与 hostname
   * 如果 href 非法，则返回 domain + href
   * https://nodejs.org/dist/latest-v6.x/docs/api/url.html#url_url_parse_urlstring_parsequerystring_slashesdenotehost
   * ┌─────────────────────────────────────────────────────────────────────────────┐
   * │                                    href                                     │
   * ├──────────┬┬───────────┬─────────────────┬───────────────────────────┬───────┤
   * │ protocol ││   auth    │      host       │           path            │ hash  │
   * │          ││           ├──────────┬──────┼──────────┬────────────────┤       │
   * │          ││           │ hostname │ port │ pathname │     search     │       │
   * │          ││           │          │      │          ├─┬──────────────┤       │
   * │          ││           │          │      │          │ │    query     │       │
   * "  http:   // user:pass @ host.com : 8080   /p/a/t/h  ?  query=string   #hash "
   * │          ││           │          │      │          │ │              │       │
   * └──────────┴┴───────────┴──────────┴──────┴──────────┴─┴──────────────┴───────┘
   * (all spaces in the "" line should be ignored -- they are purely for formatting)
   * @param {string} href
   * @param {string} domain
   * @return {?string}
   * @example
   * ```js
   * DomainTool.replace('https://www.a.com/b.html', '*\/a.com')  // *\/a.com/b.html
   * DomainTool.replace('www.a.com/b.html', '*\/a.com')          // *\/a.comwww.a.com/b.html
   * DomainTool.replace('www.a.com:8080/b.html', '*\/a.com')     // *\/a.comwww.a.com/b.html
   * DomainTool.replace('/b.html', '*\/a.com')                   // *\/a.com/b.html
   * DomainTool.replace('http://\\b.html', '*\/a.com')           // *\/a.comhttp://\b.html
   * ```
   */
  replace(href, domain){
    return Domain.test(href) ? href.replace(Domain.Reg, domain) : domain + href
  },

  /**
   * 检测一个href是否包含domain
   * @param {string} href
   * @return {boolean}
   */
  test(href) {
    return Domain.Reg.test(href)
  }
}

export {
  Domain
}
