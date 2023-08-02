import fs from 'fs-extra';

import db from '../archiving/database';
import * as connections from '../connections/connections';

let queue: any[] = [];
let started = false;

const log = (...params: any[]) => console.log('[queue]', ...params);

export function onAcceptOrRejectChannel(channelId: string) {
	const index = queue.findIndex((channel) => channel.channelId == channelId);
	if (index == -1) return;

	queue.splice(index, 1);
}

export async function getNextQueuedChannel(skip: string[] = []) {
	for (const queuedChannel of queue) {
		const channel = await db.getQueuedChannel(queuedChannel.channelId);
		if (!channel) continue; // deleted, not removed from the queue yet -_-

		if (skip.includes(channel.id)) continue;

		// copy latest channel object
		let returning: any = {
			channel,
		};

		// copy queue stuff (but don't copy channel id, it's not needed)
		for (const [key, value] of Object.entries(queuedChannel)) {
			if (key == 'channelId') continue;
			returning[key] = value;
		}

		return returning;
	}

	return null;
}

export async function start() {
	if (started) return;
	started = true;

	log('sorting queue');

	const minRelations = 2;
	const minVideos = 1;
	let queuedChannels = await db.getQueuedChannels(minRelations, minVideos);

	// add in playlist video count
	queuedChannels = await Promise.all(
		queuedChannels.map(async (channel) => {
			if (channel.videos) {
				channel.videosFromPlaylists = channel.videos.filter(
					(video: any) => video && video.fromPlaylist
				).length;
			}

			return channel;
		})
	);

	queue = queuedChannels
		.sort(
			(a, b) =>
				// b.videosFromPlaylists - a.videosFromPlaylists ||
				b.relations.length - a.relations.length
		)
		.map((channel) => ({
			channelId: channel.id,
			commented: channel.relations.length,
			videosFromPlaylists: channel.videosFromPlaylists,
		}));

	log('sorted queue');
}
