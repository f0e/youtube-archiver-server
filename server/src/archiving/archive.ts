import * as youtube from './youtube';
import * as filters from './filter';

import db from './database';
import EventEmitter from 'events';

// event emitters for websockets
export const clientQueueListener = new EventEmitter();
export const acceptedChannelListener = new EventEmitter();

async function addChannel(channelId: string) {
	if (await db.isChannelQueued(channelId)) return false;
	if (await db.isChannelAccepted(channelId)) return false;
	if (await db.isChannelParsed(channelId)) return false;

	const add = async () => {
		// get channel data
		const channelData = await youtube.parseChannel(channelId);

		// filter by channel
		if (filters.filterChannel(channelData)) return false;

		// get videos
		let videos = await youtube.getVideos(channelId);

		// filter by videos
		if (filters.filterChannelVideos(videos)) return false;

		// channel not filtered, store it.
		await db.queueChannel(channelId, channelData, videos);
		console.log(`parsed ${channelData.author}`);

		return true;
	};

	const added = await add();
	if (!added) {
		await db.filterChannel(channelId);
	}
}

async function parseChannelVideos(channel: any) {
	console.log(`parsing ${channel.data.author}'s videos`);

	for (const video of channel.videos) {
		const { videoId } = video;

		// don't re-parse videos
		if (await db.isVideoParsed(videoId)) {
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

		console.log('parsing commenters');
		// await Promise.all(commenters.map((commenter) => addChannel(commenter)));
		for (const commenter of commenters) {
			await addChannel(commenter);
		}

		console.log('done');
		await db.addVideo(videoId, videoData);
	}

	console.log();

	console.log('parsed all videos');

	await db.onChannelParsed(channel.id);
}

let parsing = false; // stupid solution todo: better please
async function parseChannels() {
	if (parsing) return;
	parsing = true;

	while (true) {
		const queuedCount = await db.getAcceptedChannelCount();
		console.log(`parsing new channel... ${queuedCount} channels queued\n`);

		// parse the next channel in the queue
		const channel = await db.getNextChannel();
		if (!channel) {
			console.log('no more channels queued');
			parsing = false;
			return;
		}

		await parseChannelVideos(channel);

		// remove this channel from the queue
		await db.removeFromAccepted(channel.id);
	}

	// // console.log('downloading video');
	// // const stream = youtube.downloadVideoStream(video);
	// // console.log('done');
}

export async function start() {
	if (!(await db.isChannelParsed(process.env.START_CHANNEL))) {
		await addChannel(process.env.START_CHANNEL);
	}

	parseChannels();

	acceptedChannelListener.on('accepted', () => parseChannels());
}
