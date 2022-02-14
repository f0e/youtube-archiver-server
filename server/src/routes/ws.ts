import express from 'express';
import { query, body } from 'express-validator';
import validate from '../util/validate';
import WebSocket from 'ws';

import db from '../archiving/database';
import { clientQueueListener } from '../archiving/archive';

const router = express.Router();

router.ws('/channelQueue', async (ws: WebSocket, req: express.Request) => {
	console.log('websocket opened');

	// queue count messages
	const onQueued = async () => {
		ws.send(
			JSON.stringify({
				type: 'count',
				data: await db.getQueuedChannelCount(),
			})
		);
	};

	onQueued();
	clientQueueListener.on('channel', onQueued);

	// channel messages
	const channelQueue = await db.getQueuedChannels();
	ws.send(
		JSON.stringify({
			type: 'channels',
			data: channelQueue.slice(0, 10),
		})
	);

	ws.onmessage = async (e) => {
		const data = JSON.parse(e.data.toString());
		console.log(data);
		switch (data.type) {
			case 'getNewChannel': {
				const channelQueue = await db.getQueuedChannels();
				const lastIndex = channelQueue.findIndex(
					(channel) => channel.id == data.lastId
				);

				let channel;
				if (lastIndex == -1) channel = channelQueue[0];
				else channel = channelQueue[lastIndex + 1];

				if (channel) {
					ws.send(
						JSON.stringify({
							type: 'channels',
							data: [channel],
						})
					);
				}
			}
		}
	};

	ws.on('close', () => {
		console.log('websocket closed');
		clientQueueListener.removeListener('channel', onQueued);
	});
});

export default router;
