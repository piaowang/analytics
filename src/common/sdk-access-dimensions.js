import { dictBy } from './sugo-utils'

/**
 * android, ios web SDK接入默认维度类型
 * [0=维度名称,1=维度别名,2=维度数据类型（如未设置默认string）]
 * 维度类型：0=Long; 1=Float; 2=String; 3=DateString; 4=Date; 5=Int;
 */
export const SDK_DEFAULT_DIMENSIONS = [
  ['__time', '服务端时间', 4],                    // 服务端时间
  ['sugo_nation', '国家'],                        // 用户所在国家(ip反解析)
  ['sugo_province', '省份'],                      // 用户所在省份(ip反解析)
  ['sugo_city', '城市'],                          // 用户所在城市(ip反解析)
  ['sugo_district', '地区'],                      // 用户所在地区(ip反解析)
  ['sugo_area', '区域'],                          // 用户所在区域(ip反解析)
  ['sugo_latitude', '纬度'],                      // 纬度(ip反解析)
  ['sugo_longitude', '经度'],                     // 经度(ip反解析)
  ['sugo_city_timezone', '城市时区'],             // 所在时区代表城市(ip反解析)
  ['sugo_timezone', '时区'],                      // 所在时区(ip反解析)
  ['sugo_phone_code', '国际区号'],                // 国际区号(ip反解析)
  ['sugo_nation_code', '国家代码'],               // 国家代码(ip反解析)
  ['sugo_continent', '所在大洲代码'],             // 所在大洲(ip反解析)
  ['sugo_administrative', '行政区划代码'],        // 中国行政区划代码(ip反解析)
  ['sugo_operator', '宽带运营商'],                // 用户所在运营商(ip反解析)
  ['sugo_ip', '客户端IP'],                        // 客户端IP(nginx)
  // ['sugo_http_forward', '客户端真实IP'],       // 客户端真实ip(nginx)
  // ['sugo_http_refer', 'Referer'],              // Referer(nginx)
  // ['sugo_user_agent', '浏览器标识'],           // 浏览器标识(nginx)
  ['browser', '浏览器名称'],  	                  // 浏览器名称
  ['browser_version', '浏览器版本'],              // 浏览器版本
  // ['sugo_args', '请求参数'],                   // 请求参数(nginx)
  // ['sugo_http_cookie', 'HttpCookie'],          // HttpCookie(nginx)
  ['app_name', '应用名称'],                       // 系统或app的系统名称
  ['app_version', '应用版本'],                    // 系统或app的系统版本
  ['app_build_number', '应用编译版本'],           // android build number
  ['session_id', '会话ID'],                       // 会话id
  ['network', '网络类型'],                        // 用户使用的网络
  ['device_id', '设备ID'],                        // 浏览器cookies（首次访问时生成)/Android或ios device id
  ['bluetooth_version', '蓝牙版本'],              // 用户蓝牙版本
  ['has_bluetooth', '蓝牙功能'],                  // 用户是否有蓝牙
  ['device_brand', '品牌'],                       // 用户电脑、平板、或手机牌子
  ['device_model', '品牌型号'],                   // 用户电脑、平板、或手机型号
  ['system_name', '操作系统名称'],                // 用户系统、平板或手机OS
  ['system_version', '操作系统版本'],             // 用户平板或手机OS版本
  ['radio', '通信协议'],                          // 通信协议
  ['carrier', '手机运营商'],                      // 运营商
  ['screen_dpi', '屏幕DPI', 5],                   // 客户端屏幕DPI
  // ['screen_height', '屏幕高度', 5],            // 客户端屏幕高度
  // ['screen_width', '屏幕宽度', 5],             // 客户端屏幕宽度
  ['screen_pixel', '屏幕分辨率'],                 // 客户端屏幕分辨率（格式：屏幕宽度*屏幕高度）
  ['event_time', '客户端事件时间', 4],            // 客户端事件发生时间（unix毫秒数)
  ['current_url', '当前请求地址'],                // 客户端当前请求地址
  // ['referrer', '客户引荐'],                    // 客户引荐
  ['referring_domain', '客户引荐域名'],           // 客户引荐域名
  ['host', '客户端域名'],                         // 客户端域名
  ['distinct_id', '用户唯一ID'],                  // 用户唯一ID
  ['has_nfc', 'NFC功能'],                         // NFC功能
  ['has_telephone', '电话功能'],                  // 电话功能
  ['has_wifi', 'WIFI功能'],                       // wifi功能
  ['manufacturer', '设备制造商'],                 // 设备制造商
  ['duration', '停留时间', 1],                    // 页面停留时间
  ['sdk_version', 'SDK版本'],                     // sdk版本
  ['page_name', '页面名称'],                      // 页面名称或屏幕名称
  ['path_name', '页面路径'],                      // 页面路径
  ['event_id', '事件ID'],                         // 事件ID
  ['event_name', '事件名称'],                     // 事件名称
  ['event_type', '事件类型'],                     // 事件类型click、focus、submit、change
  ['event_label', '事件源文本'],                  // 事件源文本
  ['sugo_lib', 'sdk类型'],                        // sdk类型 web、ios、android
  ['token', '应用ID'],                            // 应用ID
  ['from_binding', '是否绑定事件'],               // 是否绑定事件（null或者true）（用于区分是绑定的，还是系统自动上报的，比如浏览、启动为自动上报，绑定取值1，自动上报取值0）
  ['google_play_services', 'GooglePlay服务'],     // GooglePlay服务
  ['page_category', '页面分类'],                  // 页面分类
  ['first_visit_time', '首次访问时间', 4],        // 首次访问时间
  ['first_login_time', '首次登陆时间', 4],         // 首次登陆时间
  ['onclick_point', '点击位置'],                  // 首次登陆时间
  ['sugo_auto_track', '全埋点数据标识位'],         //(1标识非可视化埋点数据)
  ['sugo_autotrack_position', '元素索引'],        //原生埋点有效 h5无效
  ['sugo_autotrack_path', '元素路径'],            //路径
  ['sugo_autotrack_page_path', '元素所在页面路径'], //页面路径
  ['business_attribute','默认业务属性']          //默认业务属性
]

/**
 * 标签项目默认用户基础属性
 */
export const TAG_DEFAULT_DIMENSIONS = [
  ['distinct_id', '用户唯一ID'],
  ['s_member_name', '会员名称'],
  ['s_phone', '手机'],
  ['s_email', '邮件'],
  ['s_weibo', '微博'],
  ['s_sex', '性别'],
  ['s_wechat', '微信']
]

export const SDK_DEFAULT_DIMENSION_TRANSLATION_DICT = dictBy(SDK_DEFAULT_DIMENSIONS, arr => arr[0], arr => arr[1])

export const TAG_DEFAULT_DIMENSION_TRANSLATION_DICT = dictBy(TAG_DEFAULT_DIMENSIONS, arr => arr[0], arr => arr[1])
