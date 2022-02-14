import express from 'express';
import { query, body } from 'express-validator';
import validate from '../util/validate';
import WebSocket from 'ws';

import channelListener from '../archiving/channelListener';
import db from '../archiving/database';

const router = express.Router();

router.ws('/channelQueue', async (ws: WebSocket, req: express.Request) => {
	console.log('websocket opened');

	const channelQueue = await db.getQueuedChannels();
	ws.send(JSON.stringify(channelQueue));

	const listener = (channel: string) => {
		ws.send(channel);
	};

	channelListener.on('channel', listener);

	ws.on('close', () => {
		console.log('websocket closed');
		channelListener.removeListener('channel', listener);
	});
});

export default router;
