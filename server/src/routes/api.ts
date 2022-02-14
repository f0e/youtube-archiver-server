import express from 'express';
import { query, body } from 'express-validator';
import validate from '../util/validate';

import * as youtube from '../archiving/youtube';
import db from '../archiving/database';

const router = express.Router();

router.get(
	'/get-channel-info',
	query('channelId').isString(),
	async (req, res) => {
		const { channelId } = validate(req);

		const channelData = await youtube.parseChannel(channelId);

		return res.json(channelData);
	}
);

router.get(
	'/get-channel-videos',
	query('channelId').isString(),
	async (req, res) => {
		const { channelId } = validate(req);

		const videos = await youtube.getVideos(channelId);

		return res.json(videos);
	}
);

router.post(
	'/accept-channel',
	body('channelId').isString(),
	async (req, res) => {
		const { channelId } = validate(req);

		await db.acceptChannel(channelId);

		return res.json({ success: true });
	}
);

router.post(
	'/filter-channel',
	body('channelId').isString(),
	async (req, res) => {
		const { channelId } = validate(req);

		await db.filterChannel(channelId);

		return res.json({ success: true });
	}
);

export default router;
