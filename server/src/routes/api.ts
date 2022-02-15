import express from 'express';
import { query, body } from 'express-validator';
import validate from '../util/validate';

import * as youtube from '../archiving/youtube';
import * as connections from '../graphing/connections';

import db from '../archiving/database';

const router = express.Router();

router.post(
	'/accept-channel',
	body('channelId').isString(),
	async (req, res) => {
		const { channelId } = validate(req);

		await db.acceptOrRejectChannel(channelId, true);

		return res.json({ success: true });
	}
);

router.post(
	'/filter-channel',
	body('channelId').isString(),
	async (req, res) => {
		const { channelId } = validate(req);

		await db.acceptOrRejectChannel(channelId, false);

		return res.json({ success: true });
	}
);

router.get('/get-channels', async (req, res) => {
	const channels = await db.getChannels();

	return res.json(channels);
});

router.get('/get-connections', async (req, res) => {
	const { relations, channelNames } = await connections.getRelations();

	return res.json({ relations, channelNames });
});

export default router;
