import express from 'express';
import { query, body } from 'express-validator';
import validate from '../util/validate';

import * as youtube from '../archiving/youtube';
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

export default router;
