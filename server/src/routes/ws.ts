import express from 'express';
import { query, body } from 'express-validator';
import validate from '../util/validate';
import WebSocket from 'ws';

import db from '../archiving/database';
import { clientChannelListener } from '../archiving/archive';

const router = express.Router();

router.ws('/channelQueue', async (ws: WebSocket, req: express.Request) => {
	console.log('websocket opened');

	const channelQueue = await db.getQueuedChannels();
	ws.send(JSON.stringify(channelQueue));

	const listener = (channel: string) => {
		ws.send(JSON.stringify([channel]));
	};

	clientChannelListener.on('channel', listener);

	ws.on('close', () => {
		console.log('websocket closed');
		clientChannelListener.removeListener('channel', listener);
	});
});

export default router;
