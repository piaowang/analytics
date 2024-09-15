import React from 'react'
import { Radio } from 'antd'
import ReactMarkdown from 'react-markdown'
import _ from 'lodash'
import CodeBlock from '../view-web/code-block'

const RadioGroup = Radio.Group
const RadioButton = Radio.Button

class Docs extends React.Component {
  static propTypes = {
    appid: React.PropTypes.string.isRequired,
    project_id: React.PropTypes.string.isRequired
  }

  static defaultProps = {
    appid: '',
    project_id: ''
  }

  state = {
    value: 1 //1 = Obj-c, 2 = Swift
  }
  // objective-c
  renderObjCContent() {
    const { appid, project_id } = this.props
    const { collectGateway, sdk_ws_url, websdk_decide_host } = window.sugo
    const protocol = `${window.location.protocol}`
    const docs = `
# iOS SDK使用文档

## 1、SDK插件导入

### 方式一：Pod集成

#### 配置项目的Podfile，xxxx为版本号，请使用最新发布的版本号,pod install或者pod update即可

\`\`\`
source 'https://github.com/CocoaPods/Specs.git'
platform :ios, '9.0'

target 'TestDemo' do
  
  # Pods for TestDemo
  pod 'sugo-objc-sdk','xxxx'
  
end
\`\`\`

  ### 方式二：静态库集成


#### 我们可提供SDK开发工具包，包含了iOS SDK的全部资源文件，请将所有的资源文件导入的项目中

* ##### 资源文件内容:

  * Sugo.framework：SDK的静态库
* Sugo.xcdatamodeld：SDK中使用的Coredata的配置文件
  * sugoResource.bundle：SDK中使用的js资源文件
* libRNSugoTrackModule.a：SDK中支持的RN桥接文件(如果项目中没有使用的RN，可不导入到项目中)
  * 集成文档

* ##### 添加系统依赖库

\`\`\`
Adsupport.framework
CoreData.framework
CoreLocation.framework
CoreTelephony.framework
libz.tdb
Sugo.framework
SystemConfiguration.framwork
WebKit.framwwork
\`\`\`

![](/_bc/sugo-analytics-static/assets/images/track/doc/ios/image_ios_1.jpg)

* ##### 设置Other Linker Flags

  点击项目的target，在build setting中搜索Other linker Flags，添加-ObjC

![](/_bc/sugo-analytics-static/assets/images/track/doc/ios/image_ios_3.jpg)

## 2、SDK配置

### 2.1 导入头文件

在集成了SDK的项目中，打开\`AppDelegate.m\`，在文件头部添加：
\`\`\`objectivec
#import <Sugo/Sugo.h>
\`\`\`
### 2.2 添加SDK对象初始化代码

###### 在AppDelegate.m文件的application:didFinishLaunchingWithOptions:方法中初始化SDK

\`\`\`objectivec
- (void)initSugo {
  NSString *projectID = @"${project_id}"; // 项目ID
  NSString *appToken = @"${appid}"; // 应用Token
  SugoBindingsURL = @"${protocol}//${websdk_decide_host}"; // 设置获取绑定事件配置的URL，端口默认为8000
  SugoCollectionURL = @"${collectGateway}"; // 设置传输绑定事件的网管URL，端口默认为80
  SugoCodelessURL = @"${sdk_ws_url}"; // 设置连接可视化埋点的URL，端口默认为8000
  SugoExceptionTopic = @"sugo_exception"; // 设置sdk异常上报topic名称，默认为sugo_exception
  [Sugo sharedInstanceWithID:projectID token:appToken launchOptions:nil withCompletion:^() {
      [[Sugo sharedInstance] setEnableLogging:YES]; // 如果需要查看SDK的Log，请设置为true
      [[Sugo sharedInstance] setFlushInterval:5]; // 被绑定的事件数据往服务端上传的事件间隔，单位是秒，如若不设置，默认时间是60秒
      [[Sugo sharedInstance] setCacheInterval:60]; // 从服务端拉取绑定事件配置的时间间隔，单位是秒，如若不设置，默认时间是1小时
  }];
}
\`\`\`
### 2.3 配置App的URL Types中的scheme

在Xcode中，点击项目的Targets，进入info便签页，添加URL Types。

- Identifier: Sugo
- URL Schemes: sugo.${appid}
- Icon: (可随意)
- Role: Editor

![](/_bc/sugo-analytics-static/assets/images/track/doc/ios/image_ios_2.jpg)

### 2.4 添加打开应用代码

UIApplicationDelegate中有3个可通过URL打开应用的方法，如下：

- (BOOL)application:(UIApplication *)app openURL:(NSURL* )url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options;
- (BOOL)application:(UIApplication *)application openURL:(NSURL* )url sourceApplication:(NSString *)sourceApplication annotation:(id)annotation;
- (BOOL)application:(UIApplication *)application handleOpenURL:(NSURL* )url;

请根据应用需适配的版本在AppDelegate.m中实现其中一个或多个方法,并调用[[Sugo sharedInstance] handleURL:url];。

\`\`\`objective-c
-(BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  if ([[Sugo sharedInstance] handleURL:url]) {
      return YES;
  }
  return NO;
}
\`\`\`

## 3、代码埋点

+ -(void)trackEvent:(NSString *)event;
+ -(void)trackEvent:(NSString *)event properties:(NSDictionary *)properties;
+ -(void)trackEventID:(nullable NSString *)eventID eventName:(NSString *)eventName;
+ -(void)trackEventID:(nullable NSString *)eventID eventName:(NSString *)eventName properties:(nullable NSDictionary *)properties;

示例如下:
\`\`\`objectivec
NSMutableDictionary *dict = [[NSMutableDictionary alloc]init];
[dict setValue:@"value1" forKey:@"key1"];
[dict setValue:@"value2" forKey:@"key2"];    
[[Sugo sharedInstance] trackEventID:@"事件Id" eventName:@"事件名称" properties:dict];
\`\`\`

## 4、 超级属性

### 4.1 注入公共属性

+ -(void)registerSuperProperties:(NSDictionary *)properties;//会覆盖已有的属性
+ -(void)registerSuperPropertiesOnce:(NSDictionary *)properties;//不会覆盖已有的属性

示例如下:
\`\`\`objectivec
NSMutableDictionary *dict = [[NSMutableDictionary alloc]init];
[dict setValue:@"value1" forKey:@"key1"];
[dict setValue:@"value2" forKey:@"key2"];
[[Sugo sharedInstance] registerSuperProperties:dict];
[[Sugo sharedInstance] registerSuperPropertiesOnce:dict];
\`\`\`

### 4.2 取消注入的公共属性
+ -(void)unregisterSuperProperty:(NSString *)propertyName;
+ -(void)clearSuperProperties;

示例如下:
\`\`\`objectivec
[[Sugo sharedInstance] unregisterSuperProperty:@"property"];
[[Sugo sharedInstance] clearSuperProperties];
\`\`\`

## 5. 属性的补充与修改

### 5.1 忽略某个控件的点击事件：
@property (nonatomic, assign) BOOL sugoIgnoreView;

  示例如下:

\`\`\`objectivec
UIButton *Btn = [[UIButton alloc] init];
btn.sugoIgnoreView = YES;
\`\`\`

注意:如果要忽略某个控件的点击事件，必须在控件的点击事件触发前忽略，最好在创建控件时忽略。

### 5.2 忽略某类控件的点击事件：

+ +(void)ignoreViewType:(Class)viewType;

示例如下:
\`\`\`objectivec
  [Sugo ignoreViewType:[UISegmentedControl class]];
  [Sugo ignoreViewType:[UISlider class]];
\`\`\`

### 5.3 原生控件设置自定义属性
#### @property (nonatomic, strong) NSDictionary* sugoCustomViewProperties;

##### 继承自UIView的控件，可通过 sugoCustomViewProperties 设置自定义信息：

示例如下:

\`\`\`objectivec
btn.sugoCustomViewProperties = @{@"key":@"value"};
\`\`\`

### 5.4 Cell控件设置自定义属性
#### cell存在重用机制,不能直接设置sugoCustomViewProperties属性,需要使用如下方法进行设置

示例如下:

\`\`\`objectivec
//  给 tableView 或 collectionView设置sugoListViewTrackDelegate，并遵守SugoListViewTrackDelegate协议,并实现方法

// 如果是UITableView
self.tableView.sugoListViewTrackDelegate = self;
-(NSDictionary *)sugoTrack_tableView:(UITableView *)tableView customPropertiesAtIndexPath:(NSIndexPath *)indexPath {
      return @{@"customProperty":@"MyValue"};
}

//  如果是UICollectionView
self.collectionView.sugoListViewTrackDelegate = self;
-(NSDictionary *)sugoTrack_collectionView:(UICollectionView *)collectionView customPropertiesAtIndexPath:(NSIndexPath *)indexPath {
      return @{@"customProperty":@"MyValue"};
}
\`\`\`

### 5.5 原生页面设置自定义属性，页面需要遵守\`SugoVCAutoTrackProtocol\`协议，实现如下方法：
+ -(NSDictionary *)getSugoPageProperties;

示例如下:
\`\`\`objectivec
-(NSDictionary *)getSugoPageProperties {
  return @{@"page_name":@"我是介绍页",@"customer_id":@"customId"};
}
\`\`\`
### 5.6 H5元素添加业务属性

##### 如果想让H5元素在点击的时候上报业务属性，请将业务属性赋值给data-code

示例如下:
\`\`\`html
<div class="bump-col-6" data-code="181159-08" onclick="myClick()">我是H5标签</div> </div>
\`\`\`
注意：SDK将在该元素点击的时候获取data-code的值，赋值给业务属性字段(business_attribute)

### 5.7 H5页面添加业务属性 

##### 如果想让H5页面在浏览事件中上报业务属性，请在页面中添加一个隐藏的div元素，该元素的id为eventdataid，并将业务属性赋值给该元素的value,

示例如下:
\`\`\`html
<div hidden id="eventdataid" value="181159-08">我是H5隐藏标签</div> </div>
\`\`\`

注意：SDK将在页面浏览时，获取id为eventdataid的元素，并获取该元素的value值赋值给业务属性字段(business_attribute)

## 6. 添加可视化圈选控件类型

### 6.1 添加自定义添加手势的view的类

+ +(void)addCustomGestureViewType:(Class)viewType;

##### 注意：SDK内部默认只允许UIButton、UISwitch、UISlider、UITableViewCell、UICollecetionViewCell等可直接响应点击事件的控件的圈选，若开发者在项目中通过给自定义的view添加手势的方式让view拥有点击事件，这种view默认是无法圈选的，开发者可以手动添加该种类型的view

示例如下:

\`\`\`objectivec
  [Sugo addCustomGestureViewType:NSClassFromString(@"SGPopView")];
\`\`\`

`
    return docs
      .replace(/YOUR_TOKEN/gm, appid)
      .replace(/YOUR_PROJECT_ID/gm, project_id)
  }
  // swift
  renderSwiftContent() {
    const { appid, project_id } = this.props
    const { collectGateway, sdk_ws_url, websdk_decide_host } = window.sugo
    const protocol = `${window.location.protocol}`
    const docs = `
## 1. 集成

### 1.1 CocoaPods

**现时我们的发布版本只能通过Cocoapods 1.1.0及以上的版本进行集成**

通过[CocoaPods](https://cocoapods.org)，可方便地在项目中集成此SDK。

#### 1.1.1 配置\`Podfile\`

请在项目根目录下的\`Podfile\`
（如无，请创建或从我们提供的SugoDemo目录中[获取](https://github.com/Datafruit/sugo-swift-sdk/blob/master/SugoDemo/Podfile)并作出相应修改）文件中添加以下字符串：

\`\`\`nginx
pod 'sugo-swift-sdk'
\`\`\`

#### 1.1.2 执行集成命令

关闭Xcode，并在\`Podfile\`目录下执行以下命令：

\`\`\`cmake
pod install
\`\`\`

#### 1.1.3 完成

运行完毕后，打开集成后的\`xcworkspace\`文件即可。

### 1.2 手动安装

为了帮助开发者集成最新且稳定的SDK，我们建议通过Cocoapods来集成，这不仅简单而且易于管理。
然而，为了方便其他集成状况，我们也提供手动安装此SDK的方法。

#### 1.2.1 以子模块的形式添加
以子模块的形式把\`sugo-swift-sdk\`添加进本地仓库中:

\`\`\`nginx
git submodule add git@github.com:Datafruit/sugo-swift-sdk.git
\`\`\`

现在在仓库中能看见Sugo项目文件（\`Sugo.xcodeproj\`）了。 

#### 1.2.2 把\`Sugo.xcodeproj\`拖到你的项目（或工作空间）中

把\`Sugo.xcodeproj\`拖到需要被集成使用的项目文件中。

#### 1.2.3 嵌入框架（Embed the framework）

选择需要被集成此SDK的项目target，把\`Sugo.framework\`以embeded binary形式添加进去。

## 2. SDK的基础调用

### 2.1 获取SDK配置信息

登陆数果星盘后，可在平台界面中创建项目和数据接入方式，创建数据接入方式时，即可获得项目ID与Token。

### 2.2 配置并获取SDK对象

#### 2.2.1 添加头文件

在集成了SDK的项目中，打开\`AppDelegate.swift\`，在文件头部添加：

\`\`\`swift
import Sugo
\`\`\`

#### 2.2.2 添加SDK对象初始化代码

把以下代码复制到\`AppDelegate.swift\`中，并填入已获得的项目ID与Token：

\`\`\`swift
fileprivate func initSugo() {
  let id: String = "${project_id}" // 项目ID
  let token: String = "${appid}" // 应用ID
  Sugo.BindingsURL = "${protocol}//${websdk_decide_host}" // 设置获取绑定事件配置的URL，端口默认为8000
  Sugo.CollectionURL = "${collectGateway}" // 设置传输绑定事件的网管URL，端口默认为80
  Sugo.CodelessURL = "${sdk_ws_url}" // 设置连接可视化埋点的URL，端口默认为8000
  Sugo.initialize(projectID: id, token: token){
    Sugo.mainInstance().loggingEnabled = true // 如果需要查看SDK的Log，请设置为true
    Sugo.mainInstance().flushInterval = 5 // 被绑定的事件数据往服务端上传的时间间隔，单位是秒，如若不设置，默认时间是60秒
    Sugo.mainInstance().cacheInterval = 60 // 从服务端拉取绑定事件配置的时间间隔，单位是秒，如若不设置，默认时间是1小时
  }
}
\`\`\`
#### 2.2.3 调用SDK对象初始化代码

添加\`initSugo\`后，在\`AppDelegate\`方法中调用，如下：

\`\`\`swift
func application(_ application: UIApplication, 
  didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool {
    // Override point for customization after application launch.
    initSugo()
    return true
}
\`\`\`    
`
    return docs
  }

  // react-native
  renderRNContent() {
    const { appid, project_id } = this.props
    const { collectGateway, sdk_ws_url, websdk_decide_host } = window.sugo
    const protocol = `${window.location.protocol}`
    const docs = `

## React Native

#### 数果 react-native-sugo-track 模块，封装了 Android & iOS SDK 常用 API ，使用此模块，可以在 React Native 开发的 App 中完成埋点的统计上报

#### 兼容版本,注意中间版本不支持：

* 兼容 react native 版本：0.46-0.56 , 0.59.9 
* 兼容组件 react-navigation 版本：^2.7.4 , ^3.11.0
* 兼容组件 react-native-navigation 版本：^1.1.486

## 1. 使用npm方式安装SDK RN模块

###### 对于React Native 开发的应用，可以使用 npm 方式集成数果 SDK RN 模块

#### 1.1 npm 安装 npm install react-native-sugo-track 模块

\`\`\`json
npm install react-native-sugo-track --save
\`\`\`

#### 1.2 项目关联 react-native-sugo-track模块
\`\`\`  json
react-native link react-native-sugo-track
\`\`\`

#### 1.3 配置package.json
##### 在package.json文件增加如下配置:

\`\`\`json
"scripts": {
  "postinstall": "node node_modules/react-native-sugo-track/SGRNTrackHook.js -run"
}
\`\`\`

#### 1.4 执行npm命令

\`\`\`
npm install
\`\`\`



## 2. 引入原生SDK, 并初始化原生SDK

###### 详细接入过程请参考android和iOS集成文档

### 2.1 Android端

在程序的入口 **Application** 的 \`onCreate()\` 中调用 \`SugoAPI.startSugo()\`初始化SDK

\`\`\`java
public class MyApplication extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        //初始化SDk
        SugoAPI.startSugo(this, SGConfig.getInstance(this));
    }
}
\`\`\`

在AndroidManifest中配置信息:

\`\`\`xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

      <!-- 必要的权限 -->
      <uses-permission android:name="android.permission.INTERNET"/>
      <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
      <uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>
      <uses-permission android:name="android.permission.READ_PHONE_STATE"/>
      <uses-permission android:name="android.permission.BLUETOOTH"/>

    <application>

      <!-- 设置ProjectId -->
      <meta-data
          android:name="io.sugo.android.SGConfig.ProjectId"
          android:value="${project_id}" />

      <!-- 设置 Token -->
      <meta-data
          android:name="io.sugo.android.SGConfig.token"
          android:value="${appid}" />

      <!-- 设置埋点配置地址 -->
      <meta-data
          android:name="io.sugo.android.SGConfig.APIHost"
          android:value="${protocol}//${websdk_decide_host}" />

      <!-- 设置可视化埋点地址 -->
      <meta-data
          android:name="io.sugo.android.SGConfig.EditorHost"
          android:value="${sdk_ws_url}" />

      <!-- 设置数据上报地址 -->
      <meta-data
          android:name="io.sugo.android.SGConfig.EventsHost"
          android:value="${collectGateway}" />

      <!-- 设置异常上报topic名称 -->
      <meta-data
          android:name="io.sugo.android.SGConfig.ExceptionTopic"
          android:value="sugo_exception" />

    </application>
  </manifest>
\`\`\`

### 2.2 iOS端

  * 引入SDK

  \`\`\`
  pod 'sugo-objc-sdk','联系开发人员获取版本号'
  \`\`\`

  * 执行pod
  \`\`\`
  pod install
  \`\`\`

  * 初始化SDK

  \`\`\`
  AppDelegate.m中配置:
  - (void)initSugo {
    NSString *projectID = @"项目中获取"; // 项目ID
    NSString *appToken = @"项目中获取"; // 应用Token
    SugoBindingsURL = @"项目中获取"; // 设置获取绑定事件配置的URL，端口默认为8000
    SugoCollectionURL = @"项目中获取"; // 设置传输绑定事件的网管URL，端口默认为80
    SugoCodelessURL = @"项目中获取"; // 设置连接可视化埋点的URL，端口默认为8000
    SugoExceptionTopic = @"sugo_exception"; // 设置sdk异常上报topic名称，默认为sugo_exception
    [Sugo sharedInstanceWithID:projectID token:appToken launchOptions:nil withCompletion:^() {
        [[Sugo sharedInstance] setEnableLogging:YES]; // 如果需要查看SDK的Log，请设置为true
        [[Sugo sharedInstance] setFlushInterval:5]; // 被绑定的事件数据往服务端上传的事件间隔，单位是秒，如若不设置，默认时间是60秒
        [[Sugo sharedInstance] setCacheInterval:60]; // 从服务端拉取绑定事件配置的时间间隔，单位是秒，如若不设置，默认时间是1小时
    }];
  }
  AppDelegate方法中调用:
    [self initSugo];
  \`\`\`

  

## 3. 页面识别

##### 由于RN应用的页面切换并不遵循原生的生命周期， 需要单独适配， 目前在 React Native 页面中我们只支持\`react-navigation\`， \`react-native-navigation\`作为导航器, 并且为了拓展性， 留下了手动的page接口， 开发者可自行适配(直接更改SGRNTrackHook.js)

### 3.1 react-navigation

##### 如果使用react-navigation， 我们的hook脚本进行了自动适配, 默认的page名称为其key值。 用户可以自行设置， 如下代码：

\`\`\`js
this.props.navigation.setParams({sugoPagePath: 'xx'});
\`\`\`

##### 采集原理参照 [react-navigation 的 screen tracking](https://reactnavigation.org/docs/en/screen-tracking.html)，目前仅兼容 [\`Listening to State Changes\`](https://reactnavigation.org/docs/en/screen-tracking.html#listening-to-state-changes)方式

### 3.2 react-native-navigation

##### 当前支持\`react-native-navigation\`版本为 1.1.486， 1.1.406。 理论上兼容1.1版本

##### react-native-navigation\`其标题默认取\`title\`， 如果没有\`title\`则取\`screenId\`，作为唯一标记。

##### 用户可以设置自定义\`title\`, 只需要设置\`sugoPagePath\`字段， 该字段与\`title\`同级即可

## 4. 自定义数据上报

##### 自定义数据上传其实最终是通过 NativeModules.RNSugoTrackModule 调用的原生Sugo 的API

方法名 | 参数类型 | 说明 
:-: | :-: | :-: 
trackEvent:properties: | (String event, Object properties) | 手动代码埋点 
registerSuperProperties: | (Object properties) | 设置超级属性 
registerSuperPropertiesOnce: | (Object properties) | 设置不可覆盖的超级属性 
unregisterSuperProperty: | (String propertie) | 删除某个超级超级属性 
clearSuperProperties | 无参数 | 删除所有超级属性 

###### 代码示例

\`\`\`js
//在使用 GrowingIO 埋点功能的文件中导入 NativeModules
import {
    NativeModules
  } from 'react-native';
  
//埋点方法调用示例如下：
//trackEvent:properties: 手动代码埋点
NativeModules.RNSugoTrackModule.trackEvent('testEventId', {'卖家Id': 'xxxxxx', '地点': '北京'});

//registerSuperProperties: 设置超级属性,会覆盖已有属性
NativeModules.RNSugoTrackModule.registerSuperProperties({ "name": "Danny", "Age": 20 });

//registerSuperPropertiesOnce: 设置超级属性,不会覆盖已有属性
NativeModules.RNSugoTrackModule.registerSuperPropertiesOnce({ "name": "Danny", "Age": 20 });

//unregisterSuperProperty: 删除某个超级属性
NativeModules.RNSugoTrackModule.unregisterSuperProperty("name");

//clearSuperProperties 删除所有超级属性
NativeModules.RNSugoTrackModule.clearSuperProperties();

\`\`\`


    
    `

    return docs
      .replace(/YOUR_TOKEN/gm, appid)
      .replace(/YOUR_PROJECT_ID/gm, project_id)
  }

  // flutter
  renderFlutterContent() {
    const { appid, project_id } = this.props
    const { collectGateway, sdk_ws_url, websdk_decide_host } = window.sugo
    const protocol = `${window.location.protocol}`
    const docs = `

# sugo_flutter_sdk  1.0.0

数果\` sugo_flutter_sdk\` 插件，封装了 iOS & Android SDK 常用 API ，使用此插件，可以完成埋点的统计上报。

## 1. 在项目中添加安装插件

在 Flutter 项目的 \`pubspec.yam\` 文件中添加\` sugo_flutter_sdk\` 依赖

\`\`\`yml
dependencies:
  # 添加数果 flutter plugin 
  sugo_flutter_sdk:
      hosted:
        name: sugo_flutter_sdk
        url: http://xx.xx.xx:端口
      version: ^1.0.0
\`\`\`

执行flutter packages get 命令安装插件

\`\`\`shell
  flutter packages get  
\`\`\`

## 2. Android 端

在程序的入口 **Application** 的 \`onCreate()\` 中调用 \`SugoAPI.startSugo()\`初始化SDK

\`\`\`java
public class MyApplication extends FlutterApplication {

    @Override
    public void onCreate() {
        super.onCreate();
        //初始化SDk
        SugoAPI.startSugo(this, SGConfig.getInstance(this));
    }
}
\`\`\`

在AndroidManifest中配置信息

\`\`\`xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

      <!-- 必要的权限 -->
      <uses-permission android:name="android.permission.INTERNET"/>
      <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
      <uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>
      <uses-permission android:name="android.permission.READ_PHONE_STATE"/>
      <uses-permission android:name="android.permission.BLUETOOTH"/>

    <application>

      <!-- 设置ProjectId -->
      <meta-data
          android:name="io.sugo.android.SGConfig.ProjectId"
          android:value="${project_id}" />

      <!-- 设置 Token -->
      <meta-data
          android:name="io.sugo.android.SGConfig.token"
          android:value="${appid}" />

      <!-- 设置埋点配置地址 -->
      <meta-data
          android:name="io.sugo.android.SGConfig.APIHost"
          android:value="${protocol}//${websdk_decide_host}" />

      <!-- 设置可视化埋点地址 -->
      <meta-data
          android:name="io.sugo.android.SGConfig.EditorHost"
          android:value="${sdk_ws_url}" />

      <!-- 设置数据上报地址 -->
      <meta-data
          android:name="io.sugo.android.SGConfig.EventsHost"
          android:value="${collectGateway}" />

      <!-- 设置异常上报topic名称 -->
      <meta-data
          android:name="io.sugo.android.SGConfig.ExceptionTopic"
          android:value="sugo_exception" />

    </application>
  </manifest>
\`\`\`

详细配置请看官网[Sugo Android SDK 使用文档](http://docs.sugo.io/developer/android/#anchor-2)

## 3. iOS 端

请在项目根目录下的\`Podfile\` （如无，请创建或从我们提供的SugoDemo目录中[获取](https://github.com/Datafruit/sugo-objc-sdk/blob/master/SugoDemo/Podfile)并作出相应修改）文件中添加以下字符串：

\`\`\`objc
pod 'sugo-objc-sdk'
\`\`\`

在\`Podfile\`目录下执行以下命令：

\`\`\`objc
pod install
\`\`\`

在程序入口**AppDelegate**初始化SDK

\`\`\`objc
- (BOOL)application:(UIApplication *)application
    didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  [GeneratedPluginRegistrant registerWithRegistry:self];
  // Override point for customization after application launch.
  [self initSugo];
  return YES;
}
\`\`\`

初始化配置：

\`\`\`objc
- (void)initSugo {
  NSString *projectID = @"项目ID";
  NSString *appToken = @"应用Token";
  SugoBindingsURL = @"设置获取绑定事件配置的URL";
  SugoCollectionURL = @"设置传输绑定事件的网管URL";
  SugoCodelessURL = @"设置连接可视化埋点的URL";
  SugoExceptionTopic = @"设置sdk异常上报topic名称，默认为sugo_exception"; 
  [Sugo sharedInstanceWithID:projectID token:appToken launchOptions:nil withCompletion:^() {
      [[Sugo sharedInstance] setEnableLogging:YES]; // 如果需要查看SDK的Log，请设置为true
      [[Sugo sharedInstance] setFlushInterval:5]; // 被绑定的事件数据往服务端上传的事件间隔，单位是秒，如若不设置，默认时间是60秒
      [[Sugo sharedInstance] setCacheInterval:60]; // 从服务端拉取绑定事件配置的时间间隔，单位是秒，如若不设置，默认时间是1小时
  }];
}
\`\`\`

详细配置请看官网[ios集成文档](http://docs.sugo.io/developer/ios/objc/integration.html)

## 4. Flutter中使用插件

在具体 dart 文件中导入\`sugo_flutter_sdk.dart\`

\`\`\`java
import 'package:sugo_flutter_sdk/sugo_flutter_sdk.dart';
\`\`\`

4.1 埋点事件

例如，触发事件名为AddToCart，对应的事件属性有：ProductID

\`\`\`dart
  Map<String, dynamic> map = Map.from({
                "ProductID": "123456"
              });
SugoFlutterSdk.trackEvent("AddToCart", map: map);
\`\`\`

4.2 注册超级属性

例如，设置用户的userId

\`\`\`dart
Map<String, dynamic> map = Map.from({
                "userId": 1
              });
              SugoFlutterSdk.registerSuperProperties(map);
\`\`\`

## 5. 页面自动跟踪 (需要自行配置)

5.1 配置全局导航监听\`SuGoRouteObserver\`

\`\`\`dart
@override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: HomePage(),
      navigatorObservers: [SuGoRouteObserver()],
    );
  }
\`\`\`

5.2  默认获取静态路由名称，动态路由需要配置setting参数才可以获取到name，例如：settings: RouteSettings(name: "APage"),

\`默认前缀为flutter_ + 页面名称, 即 flutter_APage\`

静态路由：

\`\`\`dart
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo'
      home: MyHomePage(title: 'Flutter Demo Home Page'),
      routes: <String,WidgetBuilder> {
        'router/new_page': (_) => new StaticNavPage()  //获取名称router/new_page
      },
    );
  }
}
\`\`\`

动态路由：

\`\`\`dart
  Navigator.push(context, new MaterialPageRoute(builder: (context) {
      return APage();
    },settings: RouteSettings(name: "APage"))); //获取到APage名称
\`\`\`
`
    return docs
      .replace(/YOUR_TOKEN/gm, appid)
      .replace(/YOUR_PROJECT_ID/gm, project_id)
  }

  renderContent() {
    const { value } = this.state
    switch (value) {
      case 1:
      default:
        return this.renderObjCContent()
      case 2:
        return this.renderSwiftContent()
      case 3:
        return this.renderRNContent()
      case 4:
        return this.renderFlutterContent()
    }

  }

  render() {
    const { appid, project_id } = this.props

    return (
      <div className="markdown-wrap bordert doc" style={{ paddingTop: '20px' }}>
        <div>
          <div className="pd1b">
            <p className="aligncenter">请按以下步骤进行 iOS SDK 安装,如有问题请联系在线客服</p>
            <p>您的项目ID为 : <span className="bold font16">{project_id}</span></p>
            <p>您的应用Token为 : <span className="bold font16">{appid}</span></p>
          </div>
        </div>
        <RadioGroup
          onChange={e => {
            this.setState({
              value: e.target.value
            })
          }}
          defaultValue={1}
        >
          <RadioButton value={1}>Objective-C</RadioButton>
          {/* <RadioButton value={2}>Swift</RadioButton> */}
          <RadioButton value={3}>React-Native</RadioButton>
          <RadioButton value={4}>flutter</RadioButton>
        </RadioGroup>
        <ReactMarkdown
          source={this.renderContent()}
          className="result"
          renderers={_.assign({}, ReactMarkdown.renderers, {
            code: CodeBlock
          })}
        />
      </div>
    )
  }
}

export default Docs
