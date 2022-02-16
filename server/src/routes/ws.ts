import express from 'express';
import { query, body } from 'express-validator';
import validate from '../util/validate';
import WebSocket from 'ws';

import db from '../archiving/database';
import { clientQueueListener } from '../archiving/archive';

const router = express.Router();

router.ws('/queueCount', async (ws: WebSocket, req: express.Request) => {
	const sendCount = async () => {
		const count = await db.getQueuedChannelCount();
		ws.send(JSON.stringify(count));
	};

	sendCount();
	clientQueueListener.on('channel', sendCount);

	ws.on('close', () =>
		clientQueueListener.removeListener('channel', sendCount)
	);
});

export default router;
