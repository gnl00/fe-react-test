import {useEffect, useState} from 'react'
import Janus from "./assets/janus.js";
import janus from "./assets/janus.js";
import adapter from "webrtc-adapter";

import './App.css'
import './VideoRoom.css'

// 1、初始化 Janus，无需注册，加入 room 返回唯一 id。
// 2、publisher 发布视频流的同时会 createOffer（和 Janus 服务器连接）WebRTC 流会直接上传到 Janus 服务器。
// 3、subscriber 可以通过加入相同的房间，订阅（feed）指定 publisher 的唯一 id 来获取该 publisher 发布的视频流；在订阅的过程中会使用到 createAnswer（和 Janus 服务器进行交流）。
// 值得注意的是：createOffer 和 createAnswer 不是在同一个 pluginHandle 上进行的；publisher 的 pluginHandle 负责执行 createOffer；subscriber 的 pluginHandle 负责 createAnswer。
// 当然也可以在一次操作中同时进行 publish 和 subscribe 操作，但是要注意将两个不同的 pluginHandle 区分

let iceServers = null
let opaqueId = null

let janusInst = null
let videoRoomPluginHandle = null

let globalRoomId = -1
let globalPublisherIds = []
let subscribe_mode = false;

let publishStreams = []

function VideoRoom() {
	const [clientId, setClientId] = useState(-1);
	const [roomId, setRoomId] = useState(1234);
	const [subscribeMode, setSubscribeMode] = useState(false);
	const [publisherIds, setPublisherIds] = useState([])

	// ======================================================================================= Janus

	function initJanus () {
		janus.init({
			debug: true,
			dependencies: Janus.useDefaultDependencies({ adapter: adapter }),
		})

		janusInst = new Janus({
			server: 'http://localhost:8088/janus',
			iceServers: iceServers,
			success: () => {
				console.log('new Janus instance success')
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

		// generate a random id
		opaqueId = Janus.randomString(8);

		janusInst.attach({
			opaqueId: opaqueId,
			plugin: 'janus.plugin.videoroom',
			success: pluginHandle => {
				videoRoomPluginHandle = pluginHandle
				console.log('janus.plugin.videoroom initialized')
			},
			error: (cause) => {
				console.log(cause)
			},
			iceState: state => {
				console.log('ICE state change to: ', state)
			},
			webrtcState: on => {
				console.log('WebRTC is: ' + (on? 'up':'down'))
				if (on) {
					const bitrate = 0; // Not limiting bandwidth
					const message = {
						request: "configure",
						bitrate: bitrate
					}
					videoRoomPluginHandle.send({message})
					console.log('set bandwidth to no limit')
				}
			},
			mediaState: (media, on, mid) => {
				console.log('Janus ' + (on? 'start':'stop') + ' receiving media')
			},
			onmessage: (msg, jsep) => {
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
				console.log('onremotetrack publisher', track, mid, added)
			},
			oncleanup: () => {},
			detach: () => {}
		})
	}
	const sendJanusRequest = (body) => {
		videoRoomPluginHandle.send({
			...body,
			success: resp => {
				console.log(resp)
			}
		})
	}

	const onMessage = (msg, jsep) => {
		console.log('::: Publisher Received Message :::')
		console.log(msg)
		const event = msg['videoroom']
		if (event) {
			let publishers = null;
			switch (event) {
				case 'joined':
					const id = msg['id'];
					setClientId(id)
					console.log(`client:  ${id} joined`)

					// collect publishers
					publishers = msg["publishers"]
					console.log('publishers ', publishers)
					if (publishers) {
						savePublisherIds(publishers)
					}

					break;
				case 'event':
					let streams = []
					if (msg['configured'] === 'ok' && (streams = msg["streams"])) {
						publishStreams = streams
					}

					// received publish event
					// save publisher info
					publishers = msg["publishers"]
					if (publishers) {
						savePublisherIds(publishers)
					}

					let unpublishedId = -1
					if (unpublishedId = msg['unpublished']) {
						removePublisherId(unpublishedId)
						removeRemoteVideoDom(unpublishedId)
					}

					let leftId = -1
					if (leftId = msg['leaving']) {}

					break;
				default:
					break;
			}
		}

		if (jsep) {
			videoRoomPluginHandle.handleRemoteJsep({jsep})
		}
	}

	const setVideoTrack = (videoDomId, track) => {
		const videoDom = document.getElementById(videoDomId);
		let stream = videoDom.srcObject
		console.log('setVideoTrack stream ', stream)
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

	const createVideoDom = (track, feedId) => {
		const videoDomId = "remoteVideo-" + feedId;

		console.log('createVideoDom domId ', videoDomId)

		const remoteVideoDom = document.getElementById(videoDomId)
		if (remoteVideoDom) {
			const stream = remoteVideoDom.srcObject;
			stream.addTrack(track)
		} else {
			const createdDom = document.createElement('video');
			const stream = new MediaStream();
			stream.addTrack(track)
			createdDom.style.width = '720px';
			createdDom.style.height = 'auto'
			createdDom.srcObject = stream
			createdDom.controls = false
			createdDom.autoplay = true
			createdDom.id = videoDomId

			const videoArea = document.getElementById('videoArea')
			videoArea.appendChild(createdDom)
		}
	}

	const savePublisherIds = publishers => {
		console.log('savePublishersInfo')
		const pubIds = []
		publishers.forEach(pub => {
			const publisherId = pub.id;
			pubIds.push(publisherId)
		})

		globalPublisherIds.push(...pubIds)
		setPublisherIds([...globalPublisherIds])
		console.log('globalPublisherIds', globalPublisherIds)
	}

	const removePublisherId = (targetId) => {
		let removeIdx = -1
		if ((removeIdx = globalPublisherIds.indexOf(targetId)) < 0) return
		globalPublisherIds.splice(removeIdx, 1)
		setPublisherIds([...globalPublisherIds])
		console.log('globalPublisherIds', globalPublisherIds)
	}

	const removeRemoteVideoDom = (publisherId) => {
		const remoteDomId = 'remoteVideo-' + publisherId;
		const remoteDom = document.getElementById(remoteDomId);
		if (remoteDom) remoteDom.remove()
	}

	const initSubscriberPluginHandle = (feedId) => {
		let subscribePluginHandle = null;
		janusInst.attach({
			opaqueId: opaqueId,
			plugin: 'janus.plugin.videoroom',
			success: pluginHandle => {
				subscribePluginHandle = pluginHandle

				console.log(' -- This is a subscriber --')

				let streams = []
				streams.push({
					feed: Number.parseInt(feedId),
				})

				console.log('subscribe streams: ', streams)

				const subscribe = {
					request: 'join',
					room: globalRoomId,
					ptype: "subscriber",
					streams
				}
				subscribePluginHandle.send({message: subscribe})
			},
			error: (cause) => {
				console.log(cause)
			},
			iceState: state => {
				console.log('ICE state change to: ', state)
			},
			webrtcState: on => {
				console.log('WebRTC is: ' + (on? 'up':'down'))
				if (on) {
					const bitrate = 0; // Not limiting bandwidth
					const message = {
						request: "configure",
						bitrate: bitrate
					}
					subscribePluginHandle.send({ message })
					console.log('set bandwidth to no limit')
				}
			},
			mediaState: (media, on, mid) => {
				console.log('Janus ' + (on? 'start':'stop') + ' receiving media')
			},
			onmessage: (msg, jsep) => {
				console.log('::: Subscriber Received Message :::')
				console.log(msg)

				let event = null
				if (event = msg['videoroom']) {
					switch (event) {
						case 'attached':
							break;
						default:
							break;
					}
				}

				if (jsep) {
					// create answer
					subscribePluginHandle.createAnswer({
						jsep,
						tracks: [
							{
								type: 'data'
							}
						],
						success: innerJsep => {
							const message = {
								request: 'start',
								room: globalRoomId
							}
							subscribePluginHandle.send({message, jsep: innerJsep})
						}
					})
				}
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
				console.log('onremotetrack ', track, mid, added)
				if (added) {
					createVideoDom(track, feedId)
				}
			}
		})
	}

	const newRemoteFeed = (feedId) => {
		initSubscriberPluginHandle(feedId);
	}

	const createRoom = () => {
		const body = {
			request: 'create',
			publishers: 6,
			is_private: false
		}

		videoRoomPluginHandle.send({
			message: body,
			success: resp => {
				console.log(resp)
				let returnRoomId = null
				if (resp && (returnRoomId = resp['room'])) {
					setRoomId(returnRoomId)
				}
			}
		})
	}

	const joinRoom = () => {
		const message = {
			request: 'join',
			ptype : 'publisher',
			room: roomId,
			notify_joining: true,
			token: 'adminpwd'
		}

		console.log('ready to send: ', message)

		videoRoomPluginHandle.send({ message })
	}

	const createOffer = () => {
		let mStream = null
		videoRoomPluginHandle.createOffer({
			tracks: [
				{
					type: 'screen',
					capture: navigator.mediaDevices.getDisplayMedia({video: true, audio: false}).then(stream => {
						mStream = stream
					}),
					simulcast: false

				},
				{ type: 'data' }
			],
			success: jsep => {
				console.log(jsep)
				const body = {
					request: 'configure',
					audio: false,
					video: true,
				}

				videoRoomPluginHandle.send({
					jsep,
					message: body
				})
			},
			error: cause => {
				console.log('publish error: ', cause)
			}
		})
	}

	const initJanusClick = () => {
		initJanus();
	}

	const createRoomClick = () => {
		createRoom()
	}

	const onRoomChange = evt => {
		globalRoomId = Number.parseInt(evt.target.value)
		setRoomId(globalRoomId)
	}

	const joinRoomClick = () => {
		joinRoom()
	}

	const listRoomsClick = () => {
		const message = {
			request: 'list'
		}
		sendJanusRequest({message})
	}
	const listParticipantsClick = () => {
		const message = {
			request: 'listparticipants',
			room: roomId
		}
		sendJanusRequest({message})
	}

	const publishClick = () => {
		createOffer()
	}

	const onModeChange = evt => {
		subscribe_mode = evt.target.checked
		setSubscribeMode(subscribe_mode)
	}

	const onPublisherBtnClick = (evt, val) => {
		newRemoteFeed(val)
	}

	const forwardClick = () => {
		doForward()
	}

	const doForward = () => {
		const streams = []
		publishStreams.forEach(stream => {
			if (stream.type === 'video') {
				const readyToPush = {
					port: 4567,
					rtcp_port: 4568,
					mid: stream.mid
				}
				streams.push(readyToPush)
			}
		})
		const message = {
			request: 'rtp_forward',
			room: roomId,
			publisher_id: clientId,
			secret: 'adminpwd',
			host: '127.0.0.1',
			host_family: 'ipv4',
			streams
		}

		videoRoomPluginHandle.send({
			message,
			success: resp => {
				console.log(resp)
			}
		})
	}

	const listForwarderClick = () => {

		const message = {
			request: 'listforwarders',
			room: roomId,
			secret: 'adminpwd'
		}
		videoRoomPluginHandle.send({
			message,
			success: resp => {
				console.log(resp)
			}
		})
	}

	return (
		<>
			<div style={{width: "720px"}}>
				<p>clientId: {clientId}</p>
				<p>roomId: {roomId}</p>

				<button onClick={initJanusClick}>connectToJanus</button>

				<br/>
				<button onClick={createRoomClick}>createRoom</button>
				<button onClick={listRoomsClick}>list Rooms</button>

				<br /><br />
				subscribe mode: <input type={"checkbox"} onChange={onModeChange} checked={subscribe_mode}/>
				<br />

				<p>
					join roomId: <input type={"text"} value={roomId} onChange={onRoomChange}/>
					<br></br>
					<button onClick={joinRoomClick}>join</button>
					<button onClick={listParticipantsClick}>list Participants</button>
				</p>

				{
					!subscribeMode ?
						<>
							<button onClick={publishClick}>publish</button>
							<button onClick={forwardClick}>forward</button>
							<button onClick={listForwarderClick}>list forwarder</button>
						</>:<></>
				}

				{
					subscribeMode?
						<>
							<span>Click the feed below to subscribe</span><br/>
							{
								publisherIds?.map((val) => {
									return (
										<button className={"btn-publisher"} key={val} onClick={evt => {onPublisherBtnClick(evt, val)}}>{val}</button>
									)
								})
							}
						</>
						:<></>
				}

				<div id={"videoArea"}>
					{
						subscribeMode?<></>:
							<>
								<video id={"localVideo"} autoPlay muted width={"720px"} height={"auto"} />
							</>
					}
				</div>
			</div>
		</>
	)
}

export default VideoRoom
