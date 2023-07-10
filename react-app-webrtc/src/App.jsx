import {useEffect} from 'react'
import adapter from "webrtc-adapter";
import janus from "./assets/janus.js";
import Janus from "./assets/janus.js";

import './App.css'

let cliJanus = null
let clientId = null
let videoCallPluginHandle = null;

function App() {
	useEffect(() => {
		initJanus();

		// let localVideo = document.getElementById('videoLocal');
		//
		// navigator.mediaDevices.getDisplayMedia({
		// 	video: true,
		// 	audio: false
		// }).then(stream => {
		// 	localVideo.srcObject = stream;
		// }).catch(err => {
		// 	console.log(err.message)
		// })
		//
		// return () => {
		// 	localVideo.srcObject = null
		// }
	}, [])



	function initJanus () {
		janus.init({
			callback: () => {
				if (!Janus.isWebrtcSupported()) {
					console.log('not supported webrtc')
				}
			},
			dependencies: Janus.useDefaultDependencies({adapter})
		})

		cliJanus = new Janus({
			server: 'http://192.168.115.140:8088/janus',
			success: () => {
				console.log('new Janus success')
				initVideoCallPlugin();
			},
			error: err => {
				console.log(err)
			},
			destroy: () => {
				console.log('destroy')
			}
		})

	}

	const initVideoCallPlugin = () => {
		console.log('initVideoCallPlugin')

		// client unique Id
		clientId = Janus.randomString(8);

		cliJanus.attach({
			opaqueId: clientId,
			plugin: 'janus.plugin.videocall',
			success: pluginHandle => {
				videoCallPluginHandle = pluginHandle

				setInterval(() => {
					getBitrate()
				}, 1500)

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

	const getBitrate = () => {
		if (videoCallPluginHandle) {
			console.log(videoCallPluginHandle)
			// console.log(videoCallPluginHandle.getBitrate())
		}
	}

	const onMessage = (msg, jsep) => {
		console.log('::: Received Message :::')
		console.log(msg)
		const result = msg['result']
		if (result) {
			if (result["list"]) {
				let list = result["list"];
				console.log("注册Peers", list)
			} else if (result["event"]) {
				let event = result["event"];
				if (event === 'registered') {
					console.log("注册成功", msg)
					console.log("注册成功")
					videoCallPluginHandle.send({message: {request: "list"}});
				} else if (event === 'calling') {
					console.log("呼叫中")
					console.log("呼叫中，请稍后")
				} else if (event === 'incomingcall') {
					let username = result["username"]
					console.log("来自于 【" + username + "】的呼叫")
					videoCallPluginHandle.createAnswer({
						jsep: jsep,
						tracks: [
							{type: 'audio', capture: true, recv: true},
							{type: 'video', capture: true, recv: true},
							{type: 'data'},
						],
						success: function (jsep) {
							Janus.debug("应答 SDP!", jsep);
							let body = {request: "accept"};
							videoCallPluginHandle.send({message: body, jsep: jsep});
						},
						error: function (error) {
							console.error("创建应答异常", error)
						}
					});
				} else if (event === 'accepted') {
					console.log("对方已接听同时设置协商信息", jsep)
					if (jsep) {
						videoCallPluginHandle.handleRemoteJsep({jsep: jsep});
					}
					console.log("对方已接听")
				} else if (event === 'update') {
					// An 'update' event may be used to provide renegotiation attempts
					if (jsep) {
						if (jsep.type === "answer") {
							videoCallPluginHandle.handleRemoteJsep({jsep: jsep});
						} else {
							videoCallPluginHandle.createAnswer({
								jsep: jsep,
								tracks: [
									{type: 'audio', capture: true, recv: true},
									{type: 'video', capture: true, recv: true},
									{type: 'data'},
								],
								success: function (jsep) {
									console.log("重新应答信令 SDP!", jsep);
									var body = {request: "set"};
									videoCallPluginHandle.send({message: body, jsep: jsep});
								},
								error: function (error) {
									console.error(error)
								}
							});
						}
					}
				} else if (event === 'hangup') {
					console.log(result["username"] + "已挂断,原因:(" + result["reason"] + ")!");
					videoCallPluginHandle.hangup();
					console.log("已挂断")

				} else if (event === "simulcast") {
					console.log("联播simulcast，暂时不用考虑", msg)
				}
			}
		} else {
			const error = msg['error']
			console.log(error)

			videoCallPluginHandle.hangup();
		}
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

	return (
		<>
			<div>
				<video id={"videoLocal"} autoPlay muted width={"720px"} height={"640px"}></video>
			</div>
		</>
	)
}

export default App
