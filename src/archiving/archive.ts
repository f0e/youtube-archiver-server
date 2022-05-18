import fs from 'fs-extra';
import path from 'path';

import * as youtube from './youtube';
import * as filters from './filter';
import * as connections from '../connections/connections';

import db from './database';
import EventEmitter from 'events';
import { sleep, filterPromise } from '../util/util';

// event emitters for websockets
export const clientListener = new EventEmitter();
export const acceptedChannelListener = new EventEmitter();

async function updateChannel(channelId: string) {
	while (true) {
		try {
			const channelData = await youtube.parseChannel(channelId);
			if (channelData.alertMessage) {
				console.log(channelData.alertMessage);
				return [false, 0];
			}

			const videos = await youtube.getVideos(channelId);

			const newVideos = await db.updateChannel(channelId, channelData, videos);

			return [true, newVideos];
		} catch (e) {
			console.log(e);
			console.log('failed to parse channel, retrying in 5 seconds');
			await sleep(5000);
		}
	}
}

async function addChannel(channelId: string) {
	if (await db.isChannelSeenAny(channelId)) return false;

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

			if (!added) {
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
	const collectionNames = [
		'acceptedChannelQueue',
		'channelQueue',
		'channels',
		'filteredChannels',
		'rejectedChannels',
	];

	// don't know where the channel is, so just try each collection (bad)
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
			console.log(
				`☠️ filtered video '${video.title}' (https://youtu.be/${videoId})`
			);
			continue;
		}

		while (true) {
			try {
				console.log('');

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
						// console.log(`commenter ${i + 1}/${commenters.length}`);

						await addChannel(commenter);

						if (commenter != channel.id) {
							await addRelation(commenter, channel.id);
						}
					}
				} else {
					console.log(`not parsing commenters (${commenters.length} comments)`);
				}

				await db.addVideo(videoId, videoData, parsingCommenters);

				console.log('added video');
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

	console.log('parsed all videos');
}

async function parseAcceptedChannels() {
	while (true) {
		const channel = await db.getNextChannel();
		if (!channel) {
			// wait 1s and try again
			await sleep(1000);
			continue;
		}

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
}

export async function reparseChannels() {
	const updateGapSeconds = 6 * 60 * 60; // 4 times a day

	while (true) {
		const channels = (await db.getChannels()).filter(
			(channel) =>
				!channel.updateDate ||
				Date.now() - channel.updateDate > updateGapSeconds * 1000
		);

		if (channels.length == 0) {
			await sleep(1000);
			continue;
		}

		console.log(`re-parsing ${channels.length} channels`);

		const startVideoCount = await db.getVideoCount();

		for (let [i, channel] of channels.entries()) {
			if (i != 0) console.log('');

			console.log(
				`${channel.data.author} (${i + 1}/${
					channels.length
				}) https://youtube.com/channel/${channel.id}`
			);

			const [updated, newVideos] = await updateChannel(channel.id);

			if (updated && newVideos > 0) {
				console.log(`found ${newVideos} new video${newVideos != 1 ? 's' : ''}`);

				// got new videos, so we have to re-get the channel
				channel = await db.getChannel(channel.id);

				if (!channel.dontDownload) {
					await parseChannelVideos(channel);
				}
			}

			await db.setChannelUpdated(channel.id);
		}

		const endVideoCount = await db.getVideoCount();
		console.log(
			`re-parsed all channels. found ${
				endVideoCount - startVideoCount
			} new videos`
		);
	}
}

export async function parseVideos() {
	const channels = await db.getChannels();

	for (const [i, channel] of channels.entries()) {
		if (!channel.dontDownload) {
			await parseChannelVideos(channel);
		}
	}
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

export async function parseChannels() {
	const channels = await db.getChannels();
	for (const channel of channels) {
		await parseChannelVideos(channel);
	}

	if (!(await db.isChannelParsed(process.env.START_CHANNEL))) {
		await addChannel(process.env.START_CHANNEL);
	}

	parseAcceptedChannels();
}

export async function parsePlaylist(playlistId: string) {
	console.log(`parsing playlist ${playlistId}`);

	const playlist = await youtube.getPlaylist(playlistId);

	console.log(`got ${playlist.items.length} videos`);
	console.log('');

	const channelVideos: { [key: string]: any[] } = {};
	for (const video of playlist.items) {
		const id = video.author.channelID;
		if (!(id in channelVideos)) channelVideos[id] = [];

		channelVideos[id].push(video);
	}

	let unlistedVideosTotal = 0;

	let logged = false;
	const logWrap = (msg: string) => {
		console.log(msg);
		if (!logged) logged = true;
	};

	for (const [i, [channelId, playlistVideos]] of Object.entries(
		channelVideos
	).entries()) {
		if (logged) {
			console.log('');
			logged = false;
		}

		// check if the channel's been added
		let channel = await db.getChannelAny(channelId);
		let justAddedChannel = false;
		if (!channel) {
			logWrap(
				`new channel - ${playlistVideos[0].author.name} https://youtube.com/channel/${channelId}`
			);

			if (!(await addChannel(channelId))) {
				// don't want channel, so don't add video.
				logWrap('Fail');
				continue;
			}

			justAddedChannel = true;
			channel = await db.getChannelAny(channelId);
		}

		if (!channel) throw "should've been added...";

		// find unlisted videos
		let videos = [];
		for (const video of playlistVideos) {
			// check if the video's been added
			const foundVideo = channel.videos.find(
				(channelVideo: any) => channelVideo.videoId == video.id
			);
			if (foundVideo) {
				if (foundVideo.fromPlaylist) unlistedVideosTotal++;
				continue;
			}

			logWrap(
				`(${i + 1}/${Object.keys(channelVideos).length}) ${
					playlistVideos[0].author.name
				} - new video ${video.author.name} - ${video.title} (${video.shortUrl})`
			);

			// transform data into same format
			videos.push({
				fromPlaylist: true,

				// type: "video",
				title: video.title,
				videoId: video.id,
				author: video.author.name,
				authorId: video.author.channelID,
				videoThumbnails: video.thumbnails,
				// viewCountText: null,
				// viewCount: null,
				// publishedText: null,
				durationText: video.duration,
				lengthSeconds: video.durationSec,
				liveNow: video.isLive,
				// premiere: null,
				// premium: null,
			});
		}

		// check if it's even worth re-parsing
		if (videos.length == 0) continue;

		if (!justAddedChannel) {
			// re-parse channel to filter out not actually unlisted videos just in case it's outdated
			const [updated, newVideos] = await updateChannel(channelId);
			if (updated && newVideos > 0) {
				logWrap(`found ${newVideos} new video${newVideos != 1 ? 's' : ''}`);

				logWrap(`${videos.length} unlisted`);
				videos = await filterPromise(videos, (video) =>
					db.isVideoFoundAny(video.id)
				);
				logWrap(`-> ${videos.length} unlisted`);
			}
		}

		if (videos.length > 0) {
			const newVideos = await db.updateChannel(channelId, channel.data, videos);

			logWrap(
				`updated channel ${
					channel.data.author
				} with ${newVideos} unlisted video${newVideos != 1 ? 's' : ''}`
			);

			unlistedVideosTotal += newVideos;

			let newChannel = await db.getChannel(channel.id);
			if (newChannel && !newChannel.dontDownload) {
				await parseChannelVideos(newChannel);
			}
		}
	}

	console.log(
		`done - ${((unlistedVideosTotal / playlist.items.length) * 100).toFixed(
			1
		)}% unlisted videos (${unlistedVideosTotal}/${playlist.items.length})`
	);
}
