# RTC_classroom  

## 功能说明
		该系统是一个在线实时通信的课堂
		系统由客户端和服务器组成
		客户端分为主持人端和普通成员端
		成员能使用文字、音频、视频、屏幕分享功能进行交流
		主持人端能对成员的权限进行管理
		能同时运行多个课堂，通过课堂号区分不同课堂
		同一课堂同时最多一人开启屏幕分享

## 操作展示

+ ###  启动服务器
  ​	运行根目录下`web_server.py`启动服务器
  ![alt 服务运行效果](https://trnny.github.io/rtccr/img/1.png)
  	如图没有任何输出则为启动成功，若有输出，需根据输出的提示，检查Python版本问题、Python包缺失问题等

+ ### 打开客户端
  ​	服务器启动后，打开服务器创建的页面，例如 <http://localhost:8000> 进入课堂主页
  ![alt 主页效果](https://trnny.github.io/rtccr/img/2.png)

+ ### 进入课堂  
  ​	点击创建课堂按钮，创建成功后会以主持人的身份进入课堂，标题显示课堂号和在线人数（普通成员数，不包括自己）
  	点击加入课堂按钮，正确输入课堂号和自己的昵称，会以普通成员的身份进入课堂，表示显示课堂号和自己的昵称

+ ### 界面、按钮功能
  ​	进入后的默认界面，布局和功能如下，弹幕区是文字交流的显示界面（以支持人端为例）
  ![alt 空界面](https://trnny.github.io/rtccr/img/5.png)
  	以上三个开关按钮切换对应区的开和关
  ![alt 开启三个区](https://trnny.github.io/rtccr/img/6.png)
  	弹幕区关闭时，收到弹幕时开关上显示消息条数
  ![alt 弹幕区开关](https://trnny.github.io/rtccr/img/8.png)
  	开启后，收到弹幕在弹幕区显示，右侧为自己的消息，左侧为其他成员的消息
  ![alt 弹幕区](https://trnny.github.io/rtccr/img/10.png)
  	功能区图标分别对应音频、视频、屏幕分享、弹幕、退出
  ![alt 功能区](https://trnny.github.io/rtccr/img/11.png)
  	音频、视频图标右下角有红色✘或者绿色✔，分别表示关闭和开启。以视频为例，开启时浏览器可能会有类似于`是否允许页面使用摄像设备`的提示，请选择允许
  ![alt 视频开启](https://trnny.github.io/rtccr/img/12.png)
  	使用共享屏幕功能，在弹出拾取器后选择分享内容并点击分享按钮会开始分享
  	正在投屏时，投屏图标右下角有向上的绿色箭头，接收投屏时，箭头向下
  		投屏：![alt 投屏](https://trnny.github.io/rtccr/img/14.png)接收投屏：![alt 接收投屏](https://trnny.github.io/rtccr/img/15.png)
  	投屏功能被关闭时，投屏图标右下角有红色✘；弹幕功能的关和开后在弹幕图标右下角有红色✘和绿色✔
  		投屏关：![alt 投屏关](https://trnny.github.io/rtccr/img/16.png)弹幕开：![alt 弹幕开](https://trnny.github.io/rtccr/img/17.png)弹幕关：![alt 弹幕关](https://trnny.github.io/rtccr/img/18.png)
  	成员列表显示成员的状态，在主持人端，还可以管理权限
  	双击自己的昵称，进行更换昵称
  	主持人端双击普通成员昵称，禁止或允许成员音视频权限。双击自己的投屏或弹幕图标，开启或关闭课堂的投屏或弹幕功能（整个课堂）.双击普通成员的投屏或弹幕图标，允许或禁止成员使用投屏或弹幕功能
  	投屏或弹幕功能被关闭，功能区对应图标右下角为红色✘
  ![alt 图标](https://trnny.github.io/rtccr/img/26.png)
  	屏幕正中的视频显示区保持16:9的宽高比，双击视频显示区视频可以在激活状态和普通状态间切换，激活状态被激活视频独占整个视频显示区，普通状态所有视频均可以显示
  ![alt 空界面](https://trnny.github.io/rtccr/img/39.png)
  ![alt 空界面](https://trnny.github.io/rtccr/img/40.png)
  	按`F11`使视频显示区全屏显示，按`Esc`退出全屏

+ ### 其他说明
	+ 服务器使用Python
		+ Python3、tornado
		+ 目前在Linux+Python3.8+tornado6.0.4测试通过
		+ 其他操作系统或软件版本均未进行测试
	+ 客户端使用Google-Chrome
		+ Google-Chrome > 72
		+ 目前在Google-Chrome78正式版测试通过
		+ 其他浏览器或浏览器版本均未进行测试
	+ 使用音频、视频、投屏功能时，只有它们的请求信息进过服务器，媒体数据并未通过服务器

