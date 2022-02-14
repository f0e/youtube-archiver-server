import * as youtube from './youtube';
import * as filters from './filter';

import db from './database';
import EventEmitter from 'events';

// event emitters for websockets
export const clientChannelListener = new EventEmitter();
export const acceptedChannelListener = new EventEmitter();

async function parseChannel(channelId: string) {
	// get channel data
	console.log(
		`parsing channel ${channelId} (https://www.youtube.com/channel/${channelId})`
	);
	const channelData = await youtube.parseChannel(channelId);
	console.log(`got channel data, channel name '${channelData.author}'`);

	// filter by channel
	if (filters.filterChannel(channelData))
		throw new Error('filtered by channel');

	// get videos
	let videos = await youtube.getVideos(channelId);
	console.log(`got ${videos.length} videos`);

	// filter by videos
	if (filters.filterChannelVideos(videos))
		throw new Error('filtered by videos');

	// channel not filtered, store it.
	await db.addChannel(channelId, channelData);

	for (const video of videos) {
		const { videoId } = video;

		// don't re-parse videos
		if (await db.videoParsed(videoId)) {
			console.log(`already parsed video '${video.title}'`);
			continue;
		}

		// filter videos
		if (filters.filterVideoBasic(video)) {
			console.log(`☠️ filtered video '${video.title}'`);
			continue;
		}

		console.log();

		console.log(`parsing video '${video.title}' (https://youtu.be/${videoId})`);
		const { videoData, commenters } = await youtube.parseVideo(video.videoId);

		await db.addVideo(videoId, videoData);
		await db.queueChannels(commenters);
	}

	console.log();

	console.log('parsed all videos');
}

let parsing = false; // stupid solution todo: better please
async function parseChannels() {
	if (parsing) return;
	parsing = true;

	while (true) {
		const queuedCount = await db.getWaitingChannelCount();
		console.log(`parsing new channel... ${queuedCount} channels queued\n`);

		// parse the next channel in the queue
		const channelId = await db.getNextChannel();
		if (!channelId) {
			console.log('no more channels queued');
			parsing = false;
			return;
		}

		try {
			await parseChannel(channelId);
		} catch (e) {
			console.log(`💀 ${e.message}`);
		}

		// remove this channel from the queue
		await db.removeFromAccepted(channelId);
	}

	// // console.log('downloading video');
	// // const stream = youtube.downloadVideoStream(video);
	// // console.log('done');
}

export async function start() {
	if (!(await db.channelParsed(process.env.START_CHANNEL))) {
		await db.queueChannels([process.env.START_CHANNEL]);
	}

	parseChannels();

	acceptedChannelListener.on('accepted', () => parseChannels());
}
