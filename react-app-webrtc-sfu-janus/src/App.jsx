import {useEffect, useState} from 'react'
import Janus from "./assets/janus.js";
import janus from "./assets/janus.js";
import adapter from "webrtc-adapter";

import './App.css'

let localVideo = null;
let localStream = null;
let remoteVideo = null;
let remoteStream = null;

let janusInst = null
let videoCallPluginHandle = null;

// 1、初始化 Janus，使用 videoCallPluginHandle 管理整个会话（发起通话、发送 dataChannel 数据）
// 2、发送 register 消息注册到 Janus
// 3、发送 call 消息，请求通话

function App() {
	const [clientId, setClientId] = useState('');
	const [targetId, setTargetId] = useState('');

	// ======================================================================================= Janus

	function initJanus () {

		janus.init({
			debug: true,
			dependencies: Janus.useDefaultDependencies({ adapter: adapter }),
		})

		janusInst = new Janus({
			server: 'http://192.168.116.54:8088/janus',
			success: () => {
				console.log('new Janus success')
				initPluginHandle();
			},
			error: err => {
				console.log(err)
			},
			destroy: () => {
				console.log('destroy')
			}
		})
	}

	const initPluginHandle = () => {
		console.log('initPluginHandle')

		// client unique Id
		const randomId = Janus.randomString(8);
		console.log('clientId', randomId)

		setClientId(randomId)

		janusInst.attach({
			opaqueId: clientId,
			plugin: 'janus.plugin.videocall',
			success: pluginHandle => {
				videoCallPluginHandle = pluginHandle
				console.log('janus.plugin.videocall initialized')
			},
			error: (cause) => {
				console.log(cause)
			},
			onmessage: (msg, jsep) => {
				// msg 交互信息：create/join/stop
				// jsep：协商信令
				onMessage(msg, jsep)
			},
			ondata: data => {
				// data has been received through the Data Channel;
				console.log(':: Received data ::')
				console.log(data)
			},
			onlocaltrack: (track, added) => {
				console.log('onlocaltrack')
				if (added) {
					setVideoTrack('localVideo', track)
				}
			},
			onremotetrack: (track, mid, added) => {
				console.log('onremotetrack')
				if (added) {
					setVideoTrack('remoteVideo', track)
				}
			},
			oncleanup: () => {},
			detach: () => {}
		})
	}

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
		// if (result) {
		// 	if (result["list"]) {
		// 		let list = result["list"];
		// 		console.log("注册Peers", list)
		// 	} else if (result["event"]) {
		// 		let event = result["event"];
		// 		if (event === 'registered') {
		// 			console.log("注册成功", msg)
		// 			console.log("注册成功")
		// 			videoCallPluginHandle.send({message: {request: "list"}});
		// 		} else if (event === 'calling') {
		// 			console.log("呼叫中")
		// 			console.log("呼叫中，请稍后")
		// 		} else if (event === 'incomingcall') {
		// 			let username = result["username"]
		// 			console.log("来自于 【" + username + "】的呼叫")
		// 			videoCallPluginHandle.createAnswer({
		// 				jsep: jsep,
		// 				tracks: [
		// 					{type: 'audio', capture: true, recv: true},
		// 					{type: 'video', capture: true, recv: true},
		// 					{type: 'data'},
		// 				],
		// 				success: function (jsep) {
		// 					Janus.debug("应答 SDP!", jsep);
		// 					let body = {request: "accept"};
		// 					videoCallPluginHandle.send({message: body, jsep: jsep});
		// 				},
		// 				error: function (error) {
		// 					console.error("创建应答异常", error)
		// 				}
		// 			});
		// 		} else if (event === 'accepted') {
		// 			console.log("对方已接听同时设置协商信息", jsep)
		// 			if (jsep) {
		// 				videoCallPluginHandle.handleRemoteJsep({jsep: jsep});
		// 			}
		// 			console.log("对方已接听")
		// 		} else if (event === 'update') {
		// 			// An 'update' event may be used to provide renegotiation attempts
		// 			if (jsep) {
		// 				if (jsep.type === "answer") {
		// 					videoCallPluginHandle.handleRemoteJsep({jsep: jsep});
		// 				} else {
		// 					videoCallPluginHandle.createAnswer({
		// 						jsep: jsep,
		// 						tracks: [
		// 							{type: 'audio', capture: true, recv: true},
		// 							{type: 'video', capture: true, recv: true},
		// 							{type: 'data'},
		// 						],
		// 						success: function (jsep) {
		// 							console.log("重新应答信令 SDP!", jsep);
		// 							var body = {request: "set"};
		// 							videoCallPluginHandle.send({message: body, jsep: jsep});
		// 						},
		// 						error: function (error) {
		// 							console.error(error)
		// 						}
		// 					});
		// 				}
		// 			}
		// 		} else if (event === 'hangup') {
		// 			console.log(result["username"] + "已挂断,原因:(" + result["reason"] + ")!");
		// 			videoCallPluginHandle.hangup();
		// 			console.log("已挂断")
		//
		// 		} else if (event === "simulcast") {
		// 			console.log("联播simulcast，暂时不用考虑", msg)
		// 		}
		// 	}
		// } else {
		// 	const error = msg['error']
		// 	console.log(error)
		//
		// 	videoCallPluginHandle.hangup();
		// }
	}

	const setVideoTrack = (videoDomId, track) => {
		const videoDom = document.getElementById(videoDomId);
		let stream = videoDom.srcObject
		if (stream) {
			stream.addTrack(track)
		} else {
			stream = new MediaStream();
			stream.addTrack(track)
			videoDom.srcObject = stream
			videoDom.controls = false
			videoDom.autoplay = true
		}
	}

	const getDisplay = () => {
		let constrain = { video: true, audio: false }

		navigator.mediaDevices.getDisplayMedia(constrain).then(stream => {
			localVideo = document.getElementById('localVideo')
			console.log(localVideo)
			localVideo.srcObject = stream;
			localStream = stream
		}).catch(err => {
			console.log('getDisplay err', err)
		})
	}

	const initJanusClick = () => {
		initJanus();
	}

	const registerClick = () => {
		registerToJanus()
	}

	const registerToJanus = () => {
		const register = {
			request: 'register',
			username: clientId
		}

		videoCallPluginHandle.send({message: register})
		console.log('register: ', clientId)
	}

	const call = () => {
		createOffer();
	}

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
			error: cause => {
				console.log('call error: ', cause)
			}

		})
	}

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

	const onAccepted = (jsep) => {
		console.log('onAccepted jsep: ', jsep)
		if (jsep) {
			videoCallPluginHandle.handleRemoteJsep({
				jsep
			})
		}
	}

	const sendToDataChannel = param => {
		console.log(param)
		// data(parameters): sends data through the Data Channel, if available;
		videoCallPluginHandle.data({
			data: param
		})
	}

	const callClick = () => {
		call()
	}

	const onTargetChange = evt => {
		setTargetId(evt.target.value)
	}

	// const checkStream = () => {
	// 	console.log(localStream.getAudioTracks());
	// 	console.log(localStream.getVideoTracks());
	// }

	let sendData = null;
	const onDataChange = evt => {
		sendData = evt.target.value
	}

	const sendDataClick = () => {
		sendToDataChannel(sendData)
	}

	return (
		<>
			<div>
				<p>clientId: {clientId}</p>
				<button onClick={getDisplay}>getDisplay</button>
				{/*<button onClick={checkStream}>checkStream</button>*/}
				<button onClick={initJanusClick}>initJanus</button>
				<button onClick={registerClick}>register</button>
				<p>targetId: <input type={"text"} onChange={onTargetChange}/><button onClick={callClick}>call</button></p>
				<p>dataChannel: <input type={"text"} onChange={onDataChange}/><button onClick={sendDataClick}>sendData</button></p>
				<video id={"localVideo"} autoPlay muted width={"720px"} height={"640px"}></video>
				<video id={"remoteVideo"} autoPlay muted width={"720px"} height={"640px"}></video>
			</div>
		</>
	)
}

export default App
