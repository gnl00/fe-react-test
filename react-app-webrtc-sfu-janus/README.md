# WebRTC

## 前言

WebRTC（Web Real-Time Communications）是一项实时通讯技术，它允许网络应用或者站点，在不借助中间媒介的情况下，建立浏览器之间点对点（Peer-to-Peer）的连接，实现视频流和（或）音频流或者其他任意数据的传输。WebRTC 包含的这些标准使用户在无需安装任何插件或者第三方的软件的情况下，创建点对点（Peer-to-Peer）的数据分享和电话会议成为可能。



## 协议

### ICE

WebRTC 连接是在 **ICE 协议框架**的基础之上建立的。ICE（Interactive Connectivity Establishment，交互式连接创建）是一个允许你的浏览器和对端浏览器建立连接的协议框架。<br />在实际的网络当中，有很多原因能导致简单的从 A 端到 B 端直连不能如愿完成。这需要绕过阻止建立连接的防火墙，给你的设备分配一个唯一可见的地址（通常情况下我们的大部分设备没有一个固定的公网地址），如果路由器不允许主机直连，还得通过一台服务器（TURN）转发数据。

ICE 协议框架通过使用以下几种技术完成上述工作：

* NAT
* STUN
* TURN
* SDP
  
  

### NAT

NAT（Network Address Translation，网络地址转换协议）用来给你的（私网）设备映射一个公网的 IP 地址的协议。一般情况下，路由器的 WAN 口有一个公网 IP，所有连接这个路由器 LAN 口的设备会分配一个私有网段的 IP 地址（例如 192.168.1.3）。私网设备的 IP 被映射成路由器的公网 IP 和唯一的端口，通过这种方式不需要为每一个私网设备分配不同的公网 IP，但是依然能被外网设备发现。



### STUN

STUN（Session Traversal Utilities for NAT，NAT 的会话穿越功能 ），是一个允许位于 NAT 后的客户端找出自己的公网地址，判断出路由器阻止直连的限制方法的协议。<br />客户端通过给公网的 STUN 服务器发送请求获得自己的公网地址信息，以及是否能够被（穿过路由器）访问。<br />

![](https://cdn.nlark.com/yuque/0/2023/png/22023164/1688695158425-44b166a8-4e8c-4ce4-87a0-a9d98ae91a9b.png#averageHue=%2347704c&clientId=ud9d0288e-3ae9-4&from=paste&id=uc093c812&originHeight=378&originWidth=259&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=shadow&taskId=u5bf5d21b-ea66-441f-a517-82ea07029c4&title=)

一些路由器严格地限定了谁能连接内网的设备。这种情况下，即使 STUN 服务器识别了该内网设备的公网 IP 和端口的映射，依然无法和这个内网设备建立连接。这种情况下就需要转向 TURN 协议。



### TURN

一些路由器使用一种“对称型 NAT”的 NAT 模型。这意味着路由器只接受和对端先前建立的连接（就是下一次请求建立新的连接映射）。<br />TURN（Traversal Using Relays around NAT，NAT 的中继穿越方式）通过 TURN 服务器中继所有数据的方式来绕过“对称型 NAT”。你需要在 TURN 服务器上创建一个连接，然后告诉所有对端设备发包到服务器上，TURN 服务器再把包转发给你。这种方式是开销很大的，所以只有在没得选择的情况下采用。<br />

![](https://cdn.nlark.com/yuque/0/2023/png/22023164/1688695373481-3c636260-e2fd-4fae-b66c-433555e2f834.png#averageHue=%2347704c&clientId=ud9d0288e-3ae9-4&from=paste&id=uc77c3169&originHeight=297&originWidth=295&originalType=url&ratio=1&rotation=0&showTitle=false&status=done&style=shadow&taskId=u634833ec-ff8a-4f36-9fd9-05e016f4167&title=)



### SDP

SDP（Session Description Protocol，会话描述协议），是一个描述多媒体连接内容的协议，例如分辨率，格式，编码，加密算法等。所以在数据传输时两端都能够理解彼此的数据。本质上，这些描述内容的元数据并不是媒体流本身。从技术上讲，SDP 并不是一个真正的协议，而是一种数据格式，用于描述在设备之间共享媒体的连接。



SDP 由一行或多行 UTF-8 文本组成，每行以一个字符的类型开头，后跟等号（“ =”），然后是包含值或描述的结构化文本，其格式取决于类型。以给定字母开头的文本行通常称为“字母行”。例如，提供媒体描述的行的类型为“m”，因此这些行称为“m 行”。



```
v=0
o=- 2730762382602303627 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1
a=extmap-allow-mixed
a=msid-semantic: WMS ba71af70-9222-4a83-a780-946afd868aa9
m=video 9 UDP/TLS/RTP/SAVPF 96 97 102 103 104 105 106 107 108 109 127 125 39 40 98 99 100 101 112 113 116 117 118
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:M1il
a=ice-pwd:nh3sQuqokikxlyvF4J42CcXk
a=ice-options:trickle
a=fingerprint:sha-256 E2:66:65:48:16:0A:38:29:A1:5C:CB:5D:7C:FF:89:93:2A:A2:68:6E:44:6B:52:94:01:35:E8:A4:CD:53:51:B9
a=setup:actpass
a=mid:0
a=extmap:1 urn:ietf:params:rtp-hdrext:toffset
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:3 urn:3gpp:video-orientation
a=extmap:4 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay
a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type
a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing
a=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space
a=extmap:9 urn:ietf:params:rtp-hdrext:sdes:mid
a=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id
a=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id
a=sendrecv
a=msid:ba71af70-9222-4a83-a780-946afd868aa9 6a9983e0-c05d-4271-b11d-1af15b9e68fe
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:96 VP8/90000
a=rtcp-fb:96 goog-remb
a=rtcp-fb:96 transport-cc
a=rtcp-fb:96 ccm fir
a=rtcp-fb:96 nack
a=rtcp-fb:96 nack pli
a=rtpmap:97 rtx/90000
a=fmtp:97 apt=96
a=rtpmap:102 H264/90000
a=rtcp-fb:102 goog-remb
a=rtcp-fb:102 transport-cc
a=rtcp-fb:102 ccm fir
a=rtcp-fb:102 nack
a=rtcp-fb:102 nack pli
a=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f
a=rtpmap:103 rtx/90000
a=fmtp:103 apt=102
a=rtpmap:104 H264/90000
a=rtcp-fb:104 goog-remb
a=rtcp-fb:104 transport-cc
a=rtcp-fb:104 ccm fir
a=rtcp-fb:104 nack
a=rtcp-fb:104 nack pli
a=fmtp:104 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f
a=rtpmap:105 rtx/90000
a=fmtp:105 apt=104
a=rtpmap:106 H264/90000
a=rtcp-fb:106 goog-remb
a=rtcp-fb:106 transport-cc
a=rtcp-fb:106 ccm fir
a=rtcp-fb:106 nack
a=rtcp-fb:106 nack pli
a=fmtp:106 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f
a=rtpmap:107 rtx/90000
a=fmtp:107 apt=106
a=rtpmap:108 H264/90000
a=rtcp-fb:108 goog-remb
a=rtcp-fb:108 transport-cc
a=rtcp-fb:108 ccm fir
a=rtcp-fb:108 nack
a=rtcp-fb:108 nack pli
a=fmtp:108 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f
a=rtpmap:109 rtx/90000
a=fmtp:109 apt=108
a=rtpmap:127 H264/90000
a=rtcp-fb:127 goog-remb
a=rtcp-fb:127 transport-cc
a=rtcp-fb:127 ccm fir
a=rtcp-fb:127 nack
a=rtcp-fb:127 nack pli
a=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d001f
a=rtpmap:125 rtx/90000
a=fmtp:125 apt=127
a=rtpmap:39 H264/90000
a=rtcp-fb:39 goog-remb
a=rtcp-fb:39 transport-cc
a=rtcp-fb:39 ccm fir
a=rtcp-fb:39 nack
a=rtcp-fb:39 nack pli
a=fmtp:39 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=4d001f
a=rtpmap:40 rtx/90000
a=fmtp:40 apt=39
a=rtpmap:98 VP9/90000
a=rtcp-fb:98 goog-remb
a=rtcp-fb:98 transport-cc
a=rtcp-fb:98 ccm fir
a=rtcp-fb:98 nack
a=rtcp-fb:98 nack pli
a=fmtp:98 profile-id=0
a=rtpmap:99 rtx/90000
a=fmtp:99 apt=98
a=rtpmap:100 VP9/90000
a=rtcp-fb:100 goog-remb
a=rtcp-fb:100 transport-cc
a=rtcp-fb:100 ccm fir
a=rtcp-fb:100 nack
a=rtcp-fb:100 nack pli
a=fmtp:100 profile-id=2
a=rtpmap:101 rtx/90000
a=fmtp:101 apt=100
a=rtpmap:112 H264/90000
a=rtcp-fb:112 goog-remb
a=rtcp-fb:112 transport-cc
a=rtcp-fb:112 ccm fir
a=rtcp-fb:112 nack
a=rtcp-fb:112 nack pli
a=fmtp:112 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=64001f
a=rtpmap:113 rtx/90000
a=fmtp:113 apt=112
a=rtpmap:116 red/90000
a=rtpmap:117 rtx/90000
a=fmtp:117 apt=116
a=rtpmap:118 ulpfec/90000
a=ssrc-group:FID 1094471611 748217863
a=ssrc:1094471611 cname:VOfr9YfMexwH++8a
a=ssrc:1094471611 msid:ba71af70-9222-4a83-a780-946afd868aa9 6a9983e0-c05d-4271-b11d-1af15b9e68fe
a=ssrc:748217863 cname:VOfr9YfMexwH++8a
a=ssrc:748217863 msid:ba71af70-9222-4a83-a780-946afd868aa9 6a9983e0-c05d-4271-b11d-1af15b9e68fe
m=audio 9 UDP/TLS/RTP/SAVPF 111 63 9 0 8 13 110 126
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:M1il
a=ice-pwd:nh3sQuqokikxlyvF4J42CcXk
a=ice-options:trickle
a=fingerprint:sha-256 E2:66:65:48:16:0A:38:29:A1:5C:CB:5D:7C:FF:89:93:2A:A2:68:6E:44:6B:52:94:01:35:E8:A4:CD:53:51:B9
a=setup:actpass
a=mid:1
a=extmap:14 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:4 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:9 urn:ietf:params:rtp-hdrext:sdes:mid
a=recvonly
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=rtcp-fb:111 transport-cc
a=fmtp:111 minptime=10;useinbandfec=1
a=rtpmap:63 red/48000/2
a=fmtp:63 111/111
a=rtpmap:9 G722/8000
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:13 CN/8000
a=rtpmap:110 telephone-event/48000
a=rtpmap:126 telephone-event/8000
```



## 信令服务器

> Signaling Server

**实现一**： nodejs + socket.io

参考

* https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API/Signaling_and_video_calling

* https://zhuanlan.zhihu.com/p/617493984

* https://juejin.cn/post/7171089420911640613
  
  

**实现二**：springboot + websocket 或者 netty + websocket



## 穿透服务器

### STUN 服务器

> https://zhuanlan.zhihu.com/p/571855011



### TURN 服务器

> https://zhuanlan.zhihu.com/p/71025431
> 
> https://zhuanlan.zhihu.com/p/571855011



**coturn**： https://github.com/coturn/coturn



## SFU 转发服务器

> Selective Forwarding Unit

* [为什么需要 SFU 服务器](https://zhuanlan.zhihu.com/p/449126409)
* [如何实现 SFU 服务器](https://zhuanlan.zhihu.com/p/68500274)
  
  

SFU 服务器：

* janus-gateway

* mediasoup

* Licode

* Jitsi

* Medooze
  
  

## Janus-gateway

> [Github](https://github.com/meetecho/janus-gateway)，[官网](https://janus.conf.meetecho.com/)，[第三方 docker](https://github.com/wangsrGit119/janus-webrtc-gateway-docker)

> 搭建起来还是有点麻烦的，注意看好配置文件的映射和启用的插件情况

```shell
# 在 docker-compose.yaml 同目录下
docker compose logs -f # 用来查看 docker compose 日志比 docker logs -f <container-name> 方便
```



> [JavaScript API](https://janus.conf.meetecho.com/docs/JS.html)

> 初步感受：比使用纯 WebRTC 复杂



**踩坑**：

* `videoCallPluginHandle.createOffer#tracks`
  
  > `tracks:` you can use this property to tell the library which media (audio/video/data) you're interested in, and whether you're going to send and/or receive any of them; by default no device is captured, and Data Channels are disabled as well; incoming audio and video is instead autoaccepted unless you tell the library otherwose; the same property can also be used to update sessions (e.g., to add/remove/replace tracks); this option is an array of objects, where each object can take any of the following properties:

* `videoCallPluginHandle#data`
  
  ```js
      const sendToDataChannel = param => {
          console.log(param)
          // 使用 dataChannel 发送消息的时候注意 videoCallPluginHandle.data 方法参数需要以对象的形式传入，并且参数名只能叫 text 或者 data
          // data(parameters): sends data through the Data Channel, if available;
          videoCallPluginHandle.data({
              data: param
          })
      }
  ```
  
  
  
  

理了一段时间，终于通了。整理以下思路：



### 启动服务

1、[Docker](https://github.com/canyanio/janus-gateway-docker)

2、[获取配置文件](https://github.com/meetecho/janus-gateway)

3、配置文件中路径重命名

```
## 新版本中下面这几个路径在配置文件中是 @xxx@ 变量赋值，改成下面的
configs_folder = "/usr/local/etc/janus"                        
plugins_folder = "/usr/local/lib/janus/plugins"                   
transports_folder = "/usr/local/lib/janus/transports"     
events_folder = "/usr/local/lib/janus/events"                    
loggers_folder = "/usr/local/lib/janus/loggers"
```

4、启动 docker-compose





### P2P



1、引入依赖 `janus.js` 和  `webrtc-adapter`。前者可以使用 CDN 或者直接复制到本地，后者使用 `npm install`

2、初始化 Janus

```js
    let janusInst = null  
  let videoCallPluginHandle = null;
    function initJanus () {
        janus.init({
            debug: true,
            dependencies: Janus.useDefaultDependencies({ adapter: adapter }), // must be here
        })

        janusInst = new Janus({
            server: 'http://localhost:8088/janus', // your janus server
            success: () => {
                initPluginHandle(); // 初始化 janus 成功后初始化插件
            },
            error: err => {},
            destroy: () => {}
        })
    }
```

3、初始化插件

```js
    const [clientId, setClientId] = useState('');
    const initPluginHandle = () => {
        // client unique Id
        const randomId = Janus.randomString(8);
        setClientId(randomId)

        janusInst.attach({
            opaqueId: clientId,
            plugin: 'janus.plugin.videocall', // 设置需要的插件
            success: pluginHandle => {
                videoCallPluginHandle = pluginHandle
            },
            error: (cause) => {},
            onmessage: (msg, jsep) => {
                // msg 交互信息：create/join/stop
                // jsep：协商信令
                onMessage(msg, jsep)
            },
            ondata: data => { // data has been received through the Data Channel;
            },
            onlocaltrack: (track, added) => {},
            onremotetrack: (track, mid, added) => {},
            oncleanup: () => {},
            detach: () => {}
        })
    }
```

4、经过以上步骤 janus 初始化完毕，接下来注册用户

```js
    const registerToJanus = () => {
        const register = {
            request: 'register', // 还有 call/accept 等请求，janus 会根据请求处理不同的操作
            username: clientId
        }

        videoCallPluginHandle.send({message: regiientId)
    }
```

5、发起呼叫请求（创建 Offer）

```js
    const createOffer = () => {
        videoCallPluginHandle.createOffer({
            // video + audio + datachannel
            tracks: [
                {
                    type: 'screen', // must be one of "audio", "video", "screen" and "data";
                    // capture: in case something must be captured (e.g., a microphone for "audio" or a "webcam" for video),
                    // passing true asks for the default device,
                    // but getUserMedia (for audio/video) or getDisplayMedia (for screen sharing) constraints can be passed as well as objects
                    capture: navigator.mediaDevices.getDisplayMedia({video: true, audio: false}),
                },
                { type: 'data' }
            ],
            success: jsep => {
                const body = {
                    request: 'call',
                    username: targetId
                }

                videoCallPluginHandle.send({
                    message: body,
                    jsep
                })
            },
            error: cause => {}
        })
    }
```

6、offer 请求发送后可以在 `janusInst.attach#onmessage` 回调函数中接收到消息，可以在里面根据消息类型进行不同操作的处理

```js
    const onMessage = (msg, jsep) => {
        console.log('::: Received Message :::')
        console.log(msg)
        const result = msg['result']
        if (result) {

            let event = null;
            if (event = result.event) {
                switch (event) {
                    case 'incomingcall':
                        createAnswer(jsep)
                        break;
                    case 'accepted':
                        onAccepted(jsep)
                        break;
                    case 'update':
                        break;
                    case 'hangup':
                        break;
                    default:
                        break;
                }
            }
        }
    }
```

7、目标用户接收到 Offer，创建 Answer

```js
    const createAnswer = (jsep) => {
        videoCallPluginHandle.createAnswer({
            jsep,
            tracks: [
                {
                    type: 'screen',
                    capture: navigator.mediaDevices.getDisplayMedia({video: true, audio: false}),
                },
                { type: 'data' }
            ],
            success: innerJsep => {
                const body = {
                    request: 'accept'
                }
                videoCallPluginHandle.send({
                    message: body,
                    jsep: innerJsep
                })
            },
            error: err => {
                console.log('createAnswer error: ', err)
            }
        })
    }
```

8、最后双方都会接收到 accept 指令，通话开始

```js
    const onAccepted = (jsep) => {
        console.log('onAccepted jsep: ', jsep)
        if (jsep) {
            videoCallPluginHandle.handleRemoteJsep({
                jsep
            })
        }
    }
```



### PtoMany

> 调了很久，PtoMany 终于通了。遇到一个坑：在 WSL 中的 Ubuntu 安装 Docker 再启动 Janus 的话在使用 `videoroom` 的时候会导致无法启动 ICE Server 无法启动；测试 `videocall` 的时候却是没问题的。



流程和 P2P 有差别：

1、无需发送 register 请求，直接 join room 就会生成唯一 id；后续可以使用这个唯一的 id 进行视频流的发布和订阅操作。

2、createOffer 和 createAnswer 操作是分开的，由两个不同的 pluginHandle 分别执行。publisher 的 pluginHandle 负责 createOffer；subscriber 的 pluginHandle 负责 createAnswer。publisher 和 subscriber 都是和 Janus 服务器进行交流的，不像 P2P 直接进行交流。







## 参考

* https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API/Protocols

* https://zhuanlan.zhihu.com/p/602229179

* https://juejin.cn/post/7189829515265179705
