import fs from 'fs-extra';

import db from '../archiving/database';
import * as connections from '../connections/connections';

let queue: any[] = [];

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

	const minRelations = 2;
	const queuedChannels = await db.getQueuedChannels(minRelations);

	queue = queuedChannels
		.sort((a, b) => b.relations.length - a.relations.length)
		.map((channel) => ({
			channelId: channel.id,
			commented: channel.relations.length,
		}));

	console.log('sorted queue');
}
