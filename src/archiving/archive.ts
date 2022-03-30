import fs from 'fs-extra';
import path from 'path';

import * as youtube from './youtube';
import * as filters from './filter';
import * as connections from '../connections/connections';

import db from './database';
import EventEmitter from 'events';
import sleep from '../util/sleep';

// event emitters for websockets
export const clientListener = new EventEmitter();
export const acceptedChannelListener = new EventEmitter();

async function updateChannel(channelId: string) {
	while (true) {
		try {
			const channelData = await youtube.parseChannel(channelId);
			if (channelData.alertMessage) {
				console.log(channelData.alertMessage);
				return false;
			}

			const videos = await youtube.getVideos(channelId);

			await db.updateChannel(channelId, channelData, videos);

			console.log(`updated channel ${channelData.author}`);

			return true;
		} catch (e) {
			console.log(e);
			console.log('failed to parse channel, retrying in 5 seconds');
			await sleep(5000);
		}
	}
}

async function addChannel(channelId: string, isFiltered: boolean = false) {
	if (await db.isChannelQueued(channelId)) return false;
	if (await db.isChannelAccepted(channelId)) return false;
	if (await db.isChannelRejected(channelId)) return false;
	if (await db.isChannelParsed(channelId)) return false;
	if (!isFiltered) {
		if (await db.isChannelFiltered(channelId)) return false;
	}

	const add = async () => {
		// const commentedChannels = await db.getChannelsCommentedOn(channelId);
		// const commented = commentedChannels.length;

		// if (filters.filterChannelComments(commented)) {
		// 	console.log('only commented on', commented, 'channels, filtering');
		// 	return false;
		// }

		const channelData = await youtube.parseChannel(channelId);

		// filter by channel
		if (filters.filterChannel(channelData)) return false;

		const videos = await youtube.getVideos(channelId);

		// filter by videos
		if (filters.filterChannelVideos(videos)) return false;

		// channel not filtered, store it.
		await db.queueChannel(channelId, channelData, videos);

		console.log(`parsed ${channelData.author}`);

		return true;
	};

	while (true) {
		try {
			const added = await add();

			if (!isFiltered && !added) {
				await db.filterChannel(channelId);
			}

			return added;
		} catch (e) {
			console.log(e);
			console.log('failed to parse channel, retrying in 5 seconds');
			await sleep(5000);
		}
	}
}

async function addRelation(channelId: string, commentedChannelId: string) {
	// don't know where the channel is, so just try each collection (bad)
	const collectionNames = [
		'acceptedChannelQueue',
		'channelQueue',
		'channels',
		'filteredChannels',
		'rejectedChannels',
	];

	for (const collectionName of collectionNames) {
		if (await db.addRelation(channelId, collectionName, commentedChannelId))
			return;
	}

	console.log(
		`didn't add relation (commenter couldn't be found?) ${channelId} commenting on ${commentedChannelId}`
	);
}

async function parseChannelVideos(
	channel: any,
	reparseVideos: boolean = false
) {
	console.log(`parsing ${channel.data.author}'s videos`);

	for (const video of channel.videos) {
		const { videoId } = video;

		// don't re-parse videos
		if (!reparseVideos) {
			if (await db.isVideoParsed(videoId)) {
				// console.log(`already parsed video '${video.title}'`);
				continue;
			}
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
					`parsing new video '${video.title}' (https://youtu.be/${videoId})`
				);

				const { videoData, commenters } = await youtube.parseVideo(
					video.videoId
				);

				const parsingCommenters = !filters.filterComments(channel, commenters);

				if (parsingCommenters && commenters.length > 0) {
					console.log(`parsing ${commenters.length} commenters`);

					for (const [i, commenter] of commenters.entries()) {
						console.log(`commenter ${i + 1}/${commenters.length}`);

						await addChannel(commenter);

						if (commenter != channel.id) {
							await addRelation(commenter, channel.id);
						}
					}
				} else {
					console.log(`not parsing commenters (${commenters.length} comments)`);
				}

				await db.addVideo(videoId, videoData, parsingCommenters);

				console.log('done');
			} catch (e) {
				const isPrivate = e.message.includes(
					'Video unavailable. This video is private'
				);

				if (!isPrivate) {
					console.log(e);
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
}

let parsing = false; // stupid solution todo: better please
async function parseAcceptedChannels() {
	if (parsing) return;
	parsing = true;

	let channel;
	while ((channel = await db.getNextChannel())) {
		const queuedCount = await db.getAcceptedChannelCount();
		console.log(`parsing new channel... ${queuedCount} channels queued`);

		if (!channel.dontDownload) {
			await parseChannelVideos(channel);
		} else {
			// don't download videos :)
			console.log('not downloading.');
		}

		await db.onChannelParsed(channel.id);
		await db.setChannelUpdated(channel.id);
	}

	console.log('no more channels queued');
	parsing = false;
}

async function reparseChannels() {
	const updateFrequencySeconds = 24 * 60 * 60; // 1 day

	console.log('re-parsing channels');

	const channels = (await db.getChannels()).filter(
		(channel) =>
			!channel.updateDate ||
			Date.now() - channel.updateDate > updateFrequencySeconds * 1000
	);

	for (const [i, channel] of channels.entries()) {
		if (i != 0) console.log();

		console.log(
			`${channel.data.author} (${i + 1}/${
				channels.length
			}) https://youtube.com/channel/${channel.id}`
		);

		if (await updateChannel(channel.id)) {
			if (!channel.dontDownload) {
				console.log('parsing videos...');
				await parseChannelVideos(channel);
			}

			await db.setChannelUpdated(channel.id);
		}
	}

	console.log('re-parsed all channels');
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

async function reFilter() {
	const filteredChannels = await db.getFilteredChannels();
	for (const [i, filteredChannel] of filteredChannels.entries()) {
		const progressString = `${i + 1}/${filteredChannels.length}`;
		console.log(
			`refiltering ${progressString} (https://youtube.com/channel/${filteredChannel.id})`
		);

		if (await addChannel(filteredChannel.id, true)) {
			await db.removeFromFilter(filteredChannel.id);
		}
		console.log('done');
	}
}

async function setRelations(collection: string, channelIds: string[]) {
	console.log('getting relations');

	const relations = await connections.getRelationsToAccepted(channelIds);

	for (const [i, channelId] of channelIds.entries()) {
		if (i % 1000 == 0) {
			console.log(`${i + 1}/${channelIds.length}`);
		}

		const relatedIds = relations[channelId];
		await db.setRelations(channelId, collection, relatedIds);
	}

	console.log('updated relations');
}

export async function start() {
	// const videos = await db.getMostCommentedVideos();
	// await fs.writeFile(
	// 	'most commented.txt',
	// 	videos
	// 		.map(
	// 			(video, i) =>
	// 				`#${i + 1} | ${video.data.title} - ${
	// 					video.data.comment_count
	// 				} comments | https://youtu.be/${video.id}`
	// 		)
	// 		.join('\n')
	// );

	// await fix();
	// await reFilter();

	// const oldArchiveFolder = 'F:/youtube/yt video archiver/youtube';
	// for (const channel of await fs.readdir(oldArchiveFolder)) {
	// 	const channelPath = path.join(oldArchiveFolder, channel);

	// 	for (const video of await fs.readdir(channelPath)) {
	// 		const { name, ext } = path.parse(video);
	// 		if (ext != '.mp4') continue;

	// 		const infoPath = path.join(channelPath, `${name}.info.json`);
	// 		if (!fs.existsSync(infoPath)) continue;

	// 		const videoInfo = await fs.readJSON(infoPath);

	// 		const channelId = videoInfo.channel_id;

	// 		let channel = await db.getChannel(channelId);
	// 		if (!channel) channel = await db.getAcceptedChannel(channelId);
	// 		if (!channel) channel = await db.getRejectedChannel(channelId);
	// 		if (!channel) channel = await db.getQueuedChannel(channelId);

	// 		if (!channel) {
	// 			const channelData = await youtube.parseChannel(channelId);
	// 			const videos = await youtube.getVideos(channelId);
	// 			console.log(
	// 				`dont have channel ${channelData.author} https://youtube.com/channel/${channelId}`
	// 			);
	// 		} else {
	// 			const archivedVideo = channel.videos.find(
	// 				(video: any) => video.id == videoInfo.id
	// 			);
	// 			if (!archivedVideo) {
	// 				console.log(
	// 					`video not archived (channel ${channel.data.author}, video: ${videoInfo.title})`
	// 				);
	// 			}
	// 		}

	// 		// const channelData = await youtube.parseChannel(channelId);
	// 		// const videos = await youtube.getVideos(channelId);

	// 		// // channel not filtered, store it.
	// 		// await db.queueChannel(channelId, channelData, videos);
	// 	}
	// }

	// process.exit();

	if (!(await db.isChannelParsed(process.env.START_CHANNEL))) {
		await addChannel(process.env.START_CHANNEL);
	}

	acceptedChannelListener.on('accepted', () => parseAcceptedChannels());

	await parseAcceptedChannels();
	await reparseChannels();
}
