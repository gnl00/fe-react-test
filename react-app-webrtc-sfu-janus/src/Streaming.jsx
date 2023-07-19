import janus from "./assets/janus.js";
import Janus from "./assets/janus.js";
import adapter from "webrtc-adapter";
import {useState} from "react";

let janusInst = null;
let pluginHandle = null;

const streamsCache = {}
// stream ready to watch
let readyToWatch = null

function Streaming() {
	const [streams, setStreams] = useState([])

	function initJanus () {
		janus.init({
			debug: true,
			dependencies: Janus.useDefaultDependencies({ adapter: adapter }),
		})

		janusInst = new Janus({
			server: 'http://localhost:8088/janus',
			success: () => {
				console.log('new Janus success')
				initPluginHandle();
			},
			error: err => {
				console.log('new janus error ', err.message)
			},
			destroy: () => {
				console.log('janus destroy')
			}
		})
	}

	const initPluginHandle = () => {
		janusInst.attach({
			plugin: 'janus.plugin.streaming',
			success: ph => {
				pluginHandle = ph
				console.log('janus.plugin.streaming initialized')
			}
		})
	}

	const initJanusClick = () => {
		initJanus()
	}

	const listStreamClick = () => {
		const message = {
			request: 'list'
		}
		pluginHandle.send({
			message,
			success: resp => {
				console.log('list stream ', resp)
				let streamList = []
				if (streamList = resp['list']) {
					setStreams([...streamList])
				}

				// set default ready to watch
				readyToWatch = streamList[0]
				console.log('readyToWatch ', readyToWatch)

				streamList.forEach(stream => {
					const id = stream['id']
					streamsCache[id] = stream
				})
				console.log('streamsCache ', streamsCache)
			}
		})
	}

	const onSelectChange = evt => {
		const readyWatchId = evt.target.value
		readyToWatch = streamsCache[readyWatchId]
		console.log(readyToWatch)
	}

	const watchClick = () => {
		if (!readyToWatch) return
		const message = {
			request: 'watch',
			id: readyToWatch['id']
		}

		console.log('watch message ', message)

		pluginHandle.send({
			message,
			success: resp => {
				console.log('watch stream ', resp)
			}
		})
	}

	const createClick = async () => {
		let pushStream = null;

		await navigator.mediaDevices.getDisplayMedia({audio: false, video: true}).then(stream => {
			pushStream = stream
			console.log(pushStream)

		}).catch(err => {
			console.log('getDisplayMedia error ', err.message)
		})

		const message = {
			request: 'create',
			name: 'webrtc-push',
			type: 'rtp',
			id: 11223,
			description: 'webrtc push stream',
			is_private: false,
			media: [
				{
					type: 'video',
					mid: pushStream.id,
					port: 5104
				}
			]
		}

		pluginHandle.send({
			message,
			success: resp => {
				console.log('create response ', resp)
			}
		})
	}

	return (
		<>
			<div>
				<button onClick={initJanusClick}>initJanus</button><br />
				<button onClick={listStreamClick}>list Stream</button><br />

				<button onClick={createClick}>createStream</button><br />


				<select onChange={onSelectChange}>
					{
						streams.map((val, index) => {
							return <option key={index} value={val['id']}>{val['description']}</option>
						})
					}
				</select>
				<br />

				<button onClick={watchClick}>watch</button><br />
			</div>
		</>
	)
}

export default Streaming