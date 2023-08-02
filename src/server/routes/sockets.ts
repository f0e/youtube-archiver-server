import express from 'express';
import { query, body } from 'express-validator';
import validate from '../../util/validate';
import WebSocket from 'ws';

import db from '../../archiving/database';
import { clientListener } from '../../archiving/archive';

const router = express.Router();

router.ws('/queue-count', async (ws: WebSocket, req: express.Request) => {
	const sendCount = async () => {
		const count = await db.getQueuedChannelCount();
		ws.send(JSON.stringify(count));
	};

	sendCount();
	clientListener.on('queue', sendCount);

	ws.on('close', () => clientListener.removeListener('queue', sendCount));
});

router.ws('/video-count', async (ws: WebSocket, req: express.Request) => {
	const sendCount = async () => {
		const count = await db.getDownloadedVideoCount();
		ws.send(JSON.stringify(count));
	};

	sendCount();
	clientListener.on('video', sendCount);

	ws.on('close', () => clientListener.removeListener('video', sendCount));
});

router.ws('/channel-count', async (ws: WebSocket, req: express.Request) => {
	const sendCount = async () => {
		const count = await db.getChannelCount();
		ws.send(JSON.stringify(count));
	};

	sendCount();
	clientListener.on('channel', sendCount);

	ws.on('close', () => clientListener.removeListener('channel', sendCount));
});

export default router;
