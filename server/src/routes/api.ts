import fs from 'fs-extra';
import express from 'express';
import { query, body } from 'express-validator';
import mm from 'music-metadata';
import validate from '../util/validate';

import * as youtube from '../archiving/youtube';
import * as connections from '../connections/connections';
import * as download from '../downloading/download';
import * as queue from '../queue/queue';

import db from '../archiving/database';

const router = express.Router();

router.get(
	'/get-channel-info',
	query('channel').isString(),
	async (req, res) => {
		const { channel } = validate(req);

		let supposedChannelId = channel;

		const urlTypes = ['/channel/', '/user/', '/c/'];
		for (const urlType of urlTypes) {
			if (channel.includes(urlType)) {
				supposedChannelId = channel.split(urlType)[1].split('/')[0];
				break;
			}
		}

		try {
			const channelData = await youtube.parseChannel(supposedChannelId);
			const channelId = channelData.authorId;

			let tempChannel;
			if ((tempChannel = await db.getQueuedChannel(channelId)))
				return res.json({
					exists: 'queued',
					channel: tempChannel,
				});

			if ((tempChannel = await db.getAcceptedChannel(channelId)))
				return res.json({
					exists: 'accepted',
					channel: tempChannel,
				});

			if ((tempChannel = await db.getRejectedChannel(channelId)))
				return res.json({
					exists: 'rejected',
					channel: tempChannel,
				});

			if ((tempChannel = await db.getFilteredChannel(channelId)))
				return res.json({
					exists: 'filtered',
					channel: tempChannel,
				});

			if ((tempChannel = await db.getChannel(channelId)))
				return res.json({
					exists: 'added',
					channel: tempChannel,
				});

			const videos = await youtube.getVideos(channelId);

			const channelObj = {
				id: channelId,
				data: channelData,
				videos: videos,
			};

			return res.json({
				channel: channelObj,
			});
		} catch (e) {
			return res.json({
				error: 'channel not found',
			});
		}
	}
);

router.get('/get-queued-channel', async (req, res) => {
	const queuedChannel = await queue.getNextQueuedChannel();

	if (!queuedChannel) throw new Error('no channels in queue');

	return res.json(queuedChannel);
});

router.post(
	'/move-channel',
	body('channelId').isString(),
	body('destination').isString(),
	async (req, res) => {
		const { channelId, destination } = validate(req);

		await db.moveChannel(channelId, destination);

		console.log(`moved channel (${destination})`);

		return res.json({ success: true });
	}
);

router.post(
	'/add-channel',
	body('channelId').isString(),
	body('destination').isString(),
	async (req, res) => {
		const { channelId, destination } = validate(req);

		if (await db.isChannelQueued(channelId))
			throw new Error('channel is queued');

		if (await db.isChannelAccepted(channelId))
			throw new Error('channel is accepted');

		if (await db.isChannelRejected(channelId))
			throw new Error('channel is rejected');

		if (await db.isChannelParsed(channelId))
			throw new Error('channel is parsed');

		if (await db.isChannelFiltered(channelId))
			throw new Error('channel is filtered');

		const channelData = await youtube.parseChannel(channelId);
		const videos = await youtube.getVideos(channelId);

		await db.queueChannel(channelId, channelData, videos);
		await db.moveChannel(channelId, destination);

		console.log(`added channel ${channelData.author} to ${destination}`);

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
	const channel = await db.getChannel(video.data.channel_id);

	return res.json({ video, channel });
});

router.get(
	'/get-video-thumbnail',
	query('videoId').isString(),
	async (req, res) => {
		const { videoId } = validate(req);

		const video = await db.getVideo(videoId);
		if (!video.downloaded) throw new Error('video not downloaded');

		const filePath = download.getVideoPath(video, true);
		if (!fs.existsSync(filePath)) throw new Error('video not found');

		const metadata = await mm.parseFile(filePath);

		const picture = metadata.common.picture;

		res.set({ 'Content-Type': 'image/png' });
		return res.send(picture[0].data);
	}
);

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

router.get('/get-count', async (req, res) => {
	const videos = await db.getVideoCount();
	const channels = await db.getChannelCount();

	return res.json({
		videos,
		channels,
	});
});

export default router;
