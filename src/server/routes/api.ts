import fs from 'fs-extra';
import express from 'express';
import { query, body } from 'express-validator';
import mm from 'music-metadata';
import validate from '../../util/validate';

import * as archive from '../../archiving/archive';
import * as youtube from '../../archiving/youtube';
import * as connections from '../../connections/connections';
import * as download from '../../downloading/download';
import * as queue from '../../queue/queue';

import db from '../../archiving/database';

const router = express.Router();

async function getChannelInfo(channelData: any) {
	const channelId = channelData.authorId;
	
	const res = await db.getChannelAny(channelId);

	let channel: any = {};

	// get videos
	if (res.channel) {
		const collectionName = res.collection.collectionName;
		console.log('channel added already');

		// channel already added, update videos (and channel info)
		const [updated, newVideos] = await archive.updateChannel(channelId);

		if (updated && newVideos > 0) {
			console.log(`found ${newVideos} new video${newVideos != 1 ? 's' : ''}`);
		}

		// get channel again
		const newChannel = await db.getChannelAny(channelId);
		console.log("new channel", newChannel);

		const collectionDisplayMap: any = {
			channels: 'added',
			rejectedChannels: 'rejected',
			filteredChannels: 'filtered',
			acceptedChannelQueue: 'accepted',
			channelQueue: 'queued',
		};

		return {
			exists: collectionDisplayMap[collectionName] ?? '',
			existsCollection: collectionName,
			channel: newChannel.channel,
		};
	} else {
		// channel not added yet, get videos for first time
		const newVids = await youtube.getVideos(channelId);
		if (!newVids) throw new Error('video fail');

		console.log(channelData);

		return {
			channel: {
				id: channelId,
				data: channelData,
				videos: newVids,
			},
		};
	}
}

async function getChannelDataFromUrl(channelUrl: string) {
	let supposedChannelId = channelUrl;

	const urlTypes = ['/channel/', '/user/', '/c/', '/@'];

	for (const [i, urlType] of urlTypes.entries()) {
		const index = channelUrl.indexOf(urlType);

		if (index != -1) {
			supposedChannelId = channelUrl.substring(index + urlType.length);
			break;
		}
	}

	return youtube.parseChannel(supposedChannelId);
}

router.get(
	'/get-channel-info',
	query('channel').isString(),
	async (req, res) => {
		const { channel } = validate(req);

		const channelData = await getChannelDataFromUrl(channel);
		const channelInfo = await getChannelInfo(channelData);

		return res.json(channelInfo);
	}
);

router.get(
	'/get-queued-channel',
	query('skip').isArray().optional(),
	async (req, res) => {
		const { skip } = validate(req);

		const queuedChannel = await queue.getNextQueuedChannel(skip);

		if (!queuedChannel) throw new Error('no channels in queue');

		return res.json(queuedChannel);
	}
);

router.post(
	'/move-channel',
	body('channelId').isString(),
	body('destination').isString(),
	async (req, res) => {
		const { channelId, destination } = validate(req);

		console.log('moving channel', channelId, 'to', destination);

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

async function sortVideos(channel: any) {
	// sort videos
	const uploadDates = await Promise.all(
		channel.videos.map(async (video: any) => [
			video.videoId,
			await db.getVideoUploadDate(video.videoId),
		])
	);

	channel.videos.sort((a: any, b: any) => {
		let [_, aDate] = uploadDates.find(
			([dateVideoId, date]) => dateVideoId == a.videoId
		);
		let [_2, bDate] = uploadDates.find(
			([dateVideoId, date]) => dateVideoId == b.videoId
		);

		// not parsed, show at the end
		if (!aDate) aDate = Number.MAX_VALUE;
		if (!bDate) bDate = Number.MAX_VALUE;

		return aDate - bDate;
	});

	return channel;
}

router.get('/get-channel', query('channelId').isString(), async (req, res) => {
	const { channelId } = validate(req);

	let channel = await db.getChannel(channelId);

	channel = await sortVideos(channel);

	return res.json(channel);
});

router.get('/get-channels', async (req, res) => {
	let channels = await db.getChannels();

	// channels = await Promise.all(
	// 	channels.map(async (channel: any) => await sortVideos(channel))
	// );

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
	const basicVideo = channel.videos.find(
		(basicVideo: any) => basicVideo.videoId == videoId
	);

	return res.json({ video, channel, basicVideo });
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

router.get(
	'/get-video-upload-date',
	query('videoId').isString(),
	async (req, res) => {
		const { videoId } = validate(req);

		const video = await db.getVideo(videoId);
		if (!video) return res.json(null);

		return res.json(video.data.upload_date);
	}
);

router.get('/get-video-ids', async (req, res) => {
	const videoIds = await db.getVideoIds();

	return res.json(videoIds);
});

router.get('/get-channel-ids', async (req, res) => {
	const channelIds = await db.getChannelIds();

	return res.json(channelIds);
});

export default router;
