import * as youtube from './youtube';
import * as filters from './filter';

import db from './database';

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

async function parseChannels() {
	while (true) {
		const queuedCount = await db.getQueuedChannelCount();
		console.log(`parsing new channel... ${queuedCount} channels queued\n`);

		// parse the next channel in the queue
		const channelId = await db.getQueuedChannel();
		if (!channelId) {
			console.log('no more channels queued');
			return;
		}

		try {
			await parseChannel(channelId);
		} catch (e) {
			console.log(`💀 ${e.message}`);
		}

		// remove this channel from the queue
		await db.removeFromQueue(channelId);
	}

	// // console.log('downloading video');
	// // const stream = youtube.downloadVideoStream(video);
	// // console.log('done');
}
