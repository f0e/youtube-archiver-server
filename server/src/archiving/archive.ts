import * as youtube from './youtube';
import * as filters from './filter';

import db from './database';
import EventEmitter from 'events';
import sleep from '../util/sleep';

// event emitters for websockets
export const clientQueueListener = new EventEmitter();
export const acceptedChannelListener = new EventEmitter();

async function addChannel(channelId: string) {
	if (await db.isChannelQueued(channelId)) return false;
	if (await db.isChannelAccepted(channelId)) return false;
	if (await db.isChannelRejected(channelId)) return false;
	if (await db.isChannelParsed(channelId)) return false;
	if (await db.isChannelFiltered(channelId)) return false;

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

		while (true) {
			try {
				console.log();

				console.log(
					`parsing video '${video.title}' (https://youtu.be/${videoId})`
				);

				const { videoData, commenters } = await youtube.parseVideo(
					video.videoId
				);

				console.log('parsing commenters');

				// await Promise.all(commenters.map((commenter) => addChannel(commenter)));
				for (const commenter of commenters) {
					await addChannel(commenter);
				}

				console.log('done');
				await db.addVideo(videoId, videoData);
			} catch (e) {
				const isPrivate = e.message.includes(
					'Video unavailable. This video is private'
				);

				if (!isPrivate) {
					console.log(e.message);
					console.log('failed to parse video, retrying in 5 seconds');
					await sleep(5000);

					continue;
				}
			}

			break;
		}
	}

	console.log();

	console.log('parsed all videos');

	await db.onChannelParsed(channel.id);
}

let parsing = false; // stupid solution todo: better please
async function parseChannels() {
	if (parsing) return;
	parsing = true;

	let channel;
	while ((channel = await db.getNextChannel())) {
		const queuedCount = await db.getAcceptedChannelCount();
		console.log(`parsing new channel... ${queuedCount} channels queued\n`);

		await parseChannelVideos(channel);

		// remove this channel from the queue
		await db.removeFromAccepted(channel.id);
	}

	console.log('no more channels queued');
	parsing = false;
}

async function fix() {
	// remove processed channels from the queue
	const queued = await db.getQueuedChannels();
	let removed = 0;
	for (const channel of queued) {
		const alreadyProcessed = async () => {
			if (await db.isChannelAccepted(channel.id)) return true;
			if (await db.isChannelRejected(channel.id)) return true;
			if (await db.isChannelParsed(channel.id)) return true;
			if (await db.isChannelFiltered(channel.id)) return true;
			return false;
		};

		if (await alreadyProcessed()) {
			// already processed this channel, remove it from the queue cause i messed up somewhere
			await db.removeFromQueue(channel.id);
		}
	}

	console.log(`removed ${removed} processed channels from the queue`);

	// remove duplicate documents
	await db.checkDuplicates('acceptedChannelQueue');
	await db.checkDuplicates('channelQueue');
	await db.checkDuplicates('channels');
	await db.checkDuplicates('filteredChannels');
	await db.checkDuplicates('rejectedChannels');
	await db.checkDuplicates('videos');

	console.log('removed duplicate documents');
}

export async function start() {
	// await fix();

	if (!(await db.isChannelParsed(process.env.START_CHANNEL))) {
		await addChannel(process.env.START_CHANNEL);
	}

	parseChannels();

	acceptedChannelListener.on('accepted', () => parseChannels());
}
