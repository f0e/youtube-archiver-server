import fs from 'fs-extra';

import db from '../archiving/database';
import * as connections from '../connections/connections';

let queue: any[] = [];

async function sortQueue() {
	const queuedChannels = await db.getQueuedChannels();
	const queuedIds = queuedChannels.map((channel) => channel.id);

	const relationsToAccepted = await connections.getRelationsToAccepted(
		queuedIds
	);

	const mostCommentedChannelIds = Object.entries(relationsToAccepted)
		.sort(
			([aChannel, aCommented], [bChannel, bCommented]) =>
				bCommented.length - aCommented.length
		)
		.map(([channelId, commented]) => ({
			channelId,
			commented: commented.length,
		}));

	return mostCommentedChannelIds;
}

export function onAcceptOrRejectChannel(channelId: string) {
	const index = queue.findIndex((channel) => channel.channelId == channelId);
	if (index == -1) return;

	queue.splice(index, 1);
}

export async function getNextQueuedChannel() {
	for (const queuedChannel of queue) {
		const channel = await db.getQueuedChannel(queuedChannel.channelId);
		if (!channel) continue; // deleted, not removed from the queue yet -_-

		return {
			channel,
			commented: queuedChannel.commented,
		};
	}

	return null;
}

export async function start() {
	console.log('sorting queue');

	queue = await sortQueue();

	console.log('sorted queue');
}
