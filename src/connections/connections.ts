import db from '../archiving/database';
import fs from 'fs-extra';

type Relations = { [key: string]: string[] };
type ChannelNames = { [key: string]: string };

export async function getRelationsToAccepted(channelIds: string[]) {
	const relationArray = await Promise.all(
		channelIds.map((channelId) => db.getChannelsCommentedOn(channelId))
	);

	const relations: Relations = {};
	for (const [i, channelId] of channelIds.entries()) {
		relations[channelId] = relationArray[i];
	}

	return relations;
}

export async function getRelations() {
	const relations: Relations = {};
	const channelNames: ChannelNames = {};

	const channels = await db.getChannels();
	for (const channel of channels) {
		const channelId = channel.id;

		// initialise relations
		relations[channelId] = [];

		// store channel name
		if (!(channelId in channelNames))
			channelNames[channelId] = channel.data.author;

		for (const basicVideo of channel.videos) {
			const video = await db.getVideo(basicVideo.videoId);
			if (!video) continue;

			for (const comment of video.data.comments) {
				const commenterId = comment.author_id;

				// don't count self comments
				if (commenterId == channelId) continue;

				// remove duplicates
				if (relations[channelId].includes(commenterId)) continue;

				// store channel name
				if (!(commenterId in channelNames))
					channelNames[commenterId] = comment.author;

				// add relation
				relations[channelId].push(commenterId);
			}
		}
	}

	console.log('calculated relations');

	return { relations, channelNames };
}

export async function getMostCommented(relations: Relations) {
	const mostCommented: { [key: string]: number } = {};
	for (const [channel, commenters] of Object.entries(relations)) {
		for (const commenter of commenters) {
			if (!(commenter in mostCommented)) mostCommented[commenter] = 0;
			mostCommented[commenter]++;
		}
	}

	const sorted = Object.entries(mostCommented).sort(
		([channelA, countA], [channelB, countB]) => {
			return countB - countA;
		}
	);

	return sorted;
}

export async function run() {
	const { relations, channelNames } = await getRelations();

	const mostCommented = await getMostCommented(relations);

	await fs.writeFile(
		'commenters.txt',
		mostCommented
			.filter(([channelId, count], i) => i < 100)
			.map(
				([channelId, count], i) =>
					`#${i + 1} | ${
						channelNames[channelId]
					} has commented on ${count} channels (https://youtube.com/channel/${channelId})`
			)
			.join('\n')
	);

	console.log('exported most commented');
}
