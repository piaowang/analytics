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
    value: 1
  }
  // andorid
  renderAndroidContent() {
    const { appid, project_id } = this.props
    const { collectGateway, sdk_ws_url, websdk_decide_host } = window.sugo
    const protocol = `${window.location.protocol}`
    const docs = `
# Sugo Android SDK 使用文档

## 1. SDK 插件集成

### 方式一：jcenter （网络）

在以项⽬名为命名的顶层 build.gradle ⽂件中:

![](/_bc/sugo-analytics-static/assets/images/track/doc/android/4.png)

添加配置：

\`\`\`groovy
buildscript {
  repositories {
      jcenter()
      google()
  }
  dependencies {
      ...
      classpath 'com.hujiang.aspectjx:gradle-android-plugin-aspectjx:2.0.8'
  }
}
\`\`\`

### 方式二：本地插件包

在你的项目根目录下新建目录plugins，把gradle-android-plugin-aspectjx-2.0.8.jar拷贝到plugins，依赖jar包。

![](/_bc/sugo-analytics-static/assets/images/track/doc/android/5.png)

添加配置：

\`\`\`groovy
buildscript {
  repositories {
      jcenter()
      google()
  }
  dependencies {
      ...
        classpath fileTree(dir:'plugins', include:['gradle-android-plugin-aspectjx-2.0.8.jar'])
  }
}
\`\`\`

app项目的build.gradle里应用插件

![](/_bc/sugo-analytics-static/assets/images/track/doc/android/6.png)

添加配置：

\`\`\`groovy
apply plugin: 'android-aspectjx'
\`\`\`

## 2. SUGO SDK集成

### 方式一：Maven （网络）

在app的主目录的build.gradle 中dependencies中添加:

![](/_bc/sugo-analytics-static/assets/images/track/doc/android/7.png)

  \`\`\`Groovy
dependencies {
      <!-- 联系开发人员获取最新版本号 -->
      implementation 'io.sugo.android:sugo-android-sdk:3.0.10'
  }
  \`\`\`

### 方式二： aar包

将资源⽂件中的sugo-android-sdk-release-3.0.10.aar,复制到 app 模块下的 libs ⽂件中 打开app/build.gradle ，在 dependencies 中添加相应的包的引⽤ :

![](/_bc/sugo-analytics-static/assets/images/track/doc/android/8.png)

\`\`\`groovy
  dependencies {
        implementation(name:'sugo-android-sdk-release-3.0.10', ext:'aar')
  }
\`\`\`

  ## 3. SDK 使用
### 3.1 在AndroidManifest中配置信息，以下是示例： 

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

### 3.2 配置scheme，在启动的 Activity 上，添加\`<intent-filter>\`

\`\`\`xml
<activity>
  
    <intent-filter>
      <action android:name="android.intent.action.MAIN" />
      <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
    <!-- 添加下面这段 -->
    <intent-filter>
      <data android:scheme="sugo.${appid}"/>
      <action android:name="android.intent.action.VIEW"/>
      <category android:name="android.intent.category.DEFAULT"/>
      <category android:name="android.intent.category.BROWSABLE"/>
    </intent-filter>
  
</activity>
\`\`\`

### 3.3 标准的使用实例，应该是在 APP 中继承于\`Application\`的类中，添加初始化代码，以下是示例：

  \`\`\`Java
  public class App extends Application {

    @Override
    public void onCreate() {
        super.onCreate();
        //初始化sugo SDK
        SugoAPI.startSugo(this,SGConfig.getInstance(this));
    }
  }
  \`\`\`
### 3.4 需要在sdk初始化后进行其他操作，可以使用以下的初始化语句：

  \`\`\`Java
  SugoAPI.startSugo(this, SGConfig.getInstance(this), new InitSugoCallback() {
    @Override
    public void finish() {
        //sdk 初始化后，可以在这里进行其他操作
    }
  });
  \`\`\`
### 3.5 开启开发者模式,在AndroidManifest.xml配置：

\`\`\`xml
    <!-- 设置日志开发者模式，默认关闭, 可选 -->
        <meta-data
            android:name="io.sugo.android.SGConfig.EnableDebugLogging"
            android:value="true" />
\`\`\`

  ## 4. 代码埋点

+ public void track(@NonNull String eventName)

+ public void track(@NonNull String eventName, JSONObject properties)

+ public void track(String eventId, @NonNull String eventName, JSONObject properties)

+ public void trackMap(@NonNull String eventName, Map<String, Object> properties)

  示例如下(根据使用需求调用)：

  \`\`\`Java
  JSONObject p =new JSONObject();
  try {
      p.put("key","value");
  } catch (JSONException e) {
      e.printStackTrace();
  }
  HashMap<String ,Object> map = new HashMap<>();
  map.put("key","value");
  SugoAPI.getInstance(App.this).track("eventName");
  SugoAPI.getInstance(App.this).track("eventName",p);
  SugoAPI.getInstance(App.this).track("eventId","eventName",p);
  SugoAPI.getInstance(App.this).trackMap("eventName",map);
  \`\`\`

## 5. 超级属性

### 5.1 注入公共属性

+ public void registerSuperPropertiesOnce(JSONObject superProperties) //不会覆盖已有的属性

+ public void registerSuperPropertiesOnceMap(Map<String, Object> superProperties) //不会覆盖已有的属性

+ public void registerSuperProperties(JSONObject superProperties) //会覆盖已有的属性

+ public void registerSuperPropertiesMap(Map<String, Object> superProperties)//会覆盖已有的属性

  使用示例如下:

  \`\`\`java
  JSONObject p =new JSONObject();
  try {
      p.put("key","value");
  } catch (JSONException e) {
      e.printStackTrace();
  }
  HashMap<String ,Object> map = new HashMap<>();
  map.put("key","value");
  SugoAPI.getInstance(App.this).registerSuperProperties(p);
  SugoAPI.getInstance(App.this).registerSuperPropertiesMap(map);
  SugoAPI.getInstance(App.this).registerSuperPropertiesOnce(p);
  SugoAPI.getInstance(App.this).registerSuperPropertiesOnceMap(map);
  \`\`\`

### 5.2 取消注入的公共属性

* public void unregisterSuperProperty(String superPropertyName)  //删除某个默认属性

* public void clearSuperProperties()  //删除所有默认属性

  使用示例如下:

  \`\`\`java
  SugoAPI.getInstance(App.this).unregisterSuperProperty("key");
  SugoAPI.getInstance(App.this).clearSuperProperties();
  \`\`\`

## 6. 用户登录

* 当需要记录用户第一次登录行为

  \`\`\`java
  ////userIdKey为维度名称，userIdValue为用户唯一标识
  SugoAPI.getInstance(App.this).login("userIdKey", "userIdValue");
  \`\`\`

## 7. 属性的补充与修改

### 7.1 忽略某个控件的点击事件：

* 通过 ***ignoreView()*** 方法可以忽略某个 View 对象的 App 点击事件：

  \`\`\`
  SugoAPI.getInstance(this).ignoreView(View view);
  \`\`\`

### 7.2 忽略某类控件的点击事件：

+ 通过 ***ignoreViewType()*** 方法可以忽略某种控件类型及其子类型的 App 点击事件：

  \`\`\`Java
  SugoAPI.getInstance(this).ignoreViewType(Class viewType);
  \`\`\`

### 7.3  原生控件设置自定义属性

* 当特定的view需要赋予特定的属性,在上传点击事件时，会把数据属性上报。可以使用SUGO SDK 预设的\`SUGO_EXTRA_TAG\`,把属性赋值给tag:

  \`\`\`java
  Map<String,String> map = new HashMap<>();
  map.put("eventdataid","1819-1921");
  map.put("eventdatatype","pid");
  view.setTag(SugoAPI.SUGO_EXTRA_TAG,map);
  \`\`\`

### 7.4 列表控件设置自定义属性

* 对于 **Recyclerview **、***ListView***、***GridView***，通过 Adapter 实现 ***SugoAdapterViewItemTrackProperties*** 接口来扩展事件属性。

  \`\`\`java
class MyAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> implements 
    SugoAdapterViewItemTrackProperties {
  @Override
        public Map<String, Object> getItemTrackProperties(int position) {
            Map<String, Object> map = new HashMap<>();
            map.put("eventdataid",entitys.get(position).getDataId());
            return map;
        }
}
  \`\`\`

### 7.5 原生页面设置自定义属性

* 当特定的页面需要赋予特定的属性，在上传当前页面的点击事件时，会把数据属性上报。可以让页面实现\`SugoPageTracker\`接口,然后实现方法\`getSugoPageProperties()\`

  \`\`\`java
  @Override
  public Map<String, Object> getSugoPageProperties() {
      Map<String,Object> map = new HashMap<>();
      map.put("key1","value1");
      return map;
  }
  \`\`\`

## 8. H5页面埋点

### 8.1 H5元素添加点击业务属性

##### 如果想让H5元素在点击的时候上报业务属性，请将业务属性赋值给data-code

示例如下:

\`\`\`html
<div class="bump-col-6" data-code="181159-08" onclick="myClick()">我是H5标签</div> </div>
\`\`\`

注意：SDK将在该元素点击的时候获取data-code的值，赋值给业务属性字段(business_attribute)

### 8.2 H5页面添加浏览业务属性 

##### 如果想让H5页面在浏览事件中上报业务属性，请在页面中添加一个隐藏的div元素，该元素的id为eventdataid，并将业务属性赋值给该元素的value,

示例如下:

\`\`\`html
<div hidden id="eventdataid" value="181159-08">我是H5隐藏标签</div> </div>
\`\`\`

注意：SDK将在页面浏览时，获取id为eventdataid的元素，并获取该元素的value值赋值给业务属性字段(business_attribute)

## 9.代码混淆

如果你启用了混淆，请在你的 proguard-rules.pro 中加入如下代码：

\`\`\`groovy
-keep class io.sugo.** {
    *;
}
-dontwarn  io.sugo.**
-keepnames class * extends android.view.View
-keepnames class * extends android.app.Fragment
-keepnames class * extends android.support.v4.app.Fragment
-keepnames class * extends androidx.fragment.app.Fragment
-keep class android.support.v4.view.ViewPager{
    *;
}
-keep class android.support.v4.view.ViewPager$**{
    *;
}
-keep class androidx.viewpager.widget.ViewPager{
    *;
}
-keep class androidx.viewpager.widget.ViewPager$**{
    *;
}
-dontwarn com.google.android.gms.**
-keep public class com.google.android.gms.* { public *; }
\`\`\`


    `
    return docs
      .replace(/YOUR_TOKEN/gm, appid)
      .replace(/YOUR_PROJECT_ID/gm, project_id)
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
        return this.renderAndroidContent()
      case 2:
        return this.renderRNContent()
      case 3:
        return this.renderFlutterContent()
    }

  }

  render() {
    const { appid, project_id } = this.props

    return (
      <div className="markdown-wrap bordert doc" style={{ paddingTop: '20px' }}>
        <div>
          <div>
            <p className="aligncenter">请按以下步骤进行 Android SDK 安装,如有问题请联系在线客服</p>
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
          <RadioButton value={1}>Android</RadioButton>
          <RadioButton value={2}>React-Native</RadioButton>
          <RadioButton value={3}>flutter</RadioButton>
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
