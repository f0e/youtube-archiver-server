import fs from 'fs-extra';
import express from 'express';
import { query, body } from 'express-validator';
import validate from '../util/validate';

import * as youtube from '../archiving/youtube';
import * as connections from '../graphing/connections';
import * as download from '../downloading/download';

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

router.get('/get-channel', query('channelId').isString(), async (req, res) => {
	const { channelId } = validate(req);

	const channel = await db.getChannel(channelId);

	return res.json(channel);
});

router.get('/get-channels', async (req, res) => {
	const channels = await db.getChannels();

	return res.json(channels);
});

router.get(
	'/check-channels-parsed',
	query('channelIds').isArray(),
	async (req, res) => {
		const { channelIds } = validate(req);

		const isParsed = async (channelId: string) => {
			const channel = await db.getChannel(channelId);
			return channel != null;
		};

		const parsedArray = await Promise.all(
			channelIds.map((channelId: string) => isParsed(channelId))
		);

		// todo: refactor

		const parsedMap: { [key: string]: boolean } = {};
		for (const [i, downloaded] of parsedArray.entries())
			parsedMap[channelIds[i]] = downloaded;

		return res.json(parsedMap);
	}
);

router.get('/get-video-info', query('videoId').isString(), async (req, res) => {
	const { videoId } = validate(req);

	const video = await db.getVideo(videoId);
	const channel = await db.getChannel(video.data.uploader_id);

	return res.json({ video, channel });
});

router.get(
	'/get-video-stream',
	query('videoId').isString(),
	async (req, res) => {
		const { videoId } = validate(req);

		const video = await db.getVideo(videoId);
		if (!video) throw new Error('video not parsed');
		if (!video.downloaded) throw new Error('video not downloaded');

		const videoPath = await download.getVideoPath(video, true);
		if (!fs.existsSync(videoPath)) throw new Error('video deleted');

		// get headers
		const { size } = fs.statSync(videoPath);
		const range = req.headers.range;

		if (range) {
			const parts = range.replace(/bytes=/, '').split('-');
			const start = parseInt(parts[0], 10);
			const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
			const chunksize = end - start + 1;
			const file = fs.createReadStream(videoPath, { start, end });
			const head = {
				'Content-Range': `bytes ${start}-${end}/${size}`,
				'Accept-Ranges': 'bytes',
				'Content-Length': chunksize,
				'Content-Type': 'video/mp4',
			};
			res.writeHead(206, head);
			file.pipe(res);
		} else {
			const head = {
				'Content-Length': size,
				'Content-Type': 'video/mp4',
			};
			res.writeHead(200, head);
			fs.createReadStream(videoPath).pipe(res);
		}
	}
);

router.get('/get-connections', async (req, res) => {
	const { relations, channelNames } = await connections.getRelations();

	return res.json({ relations, channelNames });
});

export default router;
