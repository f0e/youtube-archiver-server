import fs from 'fs-extra';

import { Collection, Db, MongoClient } from 'mongodb';
import { acceptedChannelListener, clientQueueListener } from './archive';
import { getVideoPath } from '../downloading/download';
import * as queue from '../queue/queue';

const updateHistoryArray = async (
	collection: Collection,
	document: any,
	id: string,
	field: string,
	value: any
) => {
	const array = document[field];

	if (
		array.length == 0 ||
		JSON.stringify(array.at(-1)) != JSON.stringify(value)
	) {
		const updateQuery = { $set: {} };
		(updateQuery.$set as any)[field] = array.concat(value); // bit poo
		await collection.updateOne({ id }, updateQuery);

		console.log(`updated ${field} array (${array}), added ${value}`);
	}
};

class Database {
	client: MongoClient;
	db: Db;

	connect = async () => {
		this.client = new MongoClient(process.env.DB_URI);

		await this.client.connect();

		this.db = this.client.db(process.env.DB_TABLE);
	};

	// addChannel = async (channelId: string, channelData: any) => {
	// 	const channels = this.db.collection('channels');

	// 	const name = channelData.author;
	// 	const avatar = channelData.authorThumbnails.at(-1);

	// 	const channel = await channels.findOne({ id: channelId });
	// 	if (channel) {
	// 		console.log(
	// 			`channel '${name}' already exists, updating names and avatars`
	// 		);

	// 		await updateHistoryArray(channels, channel, channelId, 'names', name);
	// 		await updateHistoryArray(channels, channel, channelId, 'avatars', avatar);
	// 	} else {
	// 		await channels.insertOne({
	// 			id: channelId,
	// 			names: [name],
	// 			avatars: [avatar],
	// 			data: channelData,
	// 		});

	// 		console.log(`added channel '${name}'`);
	// 	}
	// };

	addVideo = async (videoId: string, videoData: any) => {
		const videos = this.db.collection('videos');

		const title = videoData.title;

		const video = await videos.findOne({ id: videoId });
		if (video) {
			console.log(
				`channel '${title}' already exists, updating names and avatars`
			);

			await updateHistoryArray(videos, video, videoId, 'titles', title);
		} else {
			await videos.insertOne({
				id: videoId,
				titles: [title],
				data: videoData,
			});
		}
	};

	updateVideoDownloaded = async (videoId: string) => {
		const video = await this.getVideo(videoId);
		const videoPath = getVideoPath(video, true);
		const downloaded = fs.existsSync(videoPath);

		// update in videos
		const videos = this.db.collection('videos');
		await videos.updateOne(
			{ id: videoId },
			{
				$set: {
					downloaded,
				},
			}
		);

		// also update in channel videos
		const channels = this.db.collection('channels');
		await channels.updateOne(
			{ 'videos.videoId': videoId },
			{
				$set: {
					'videos.$.downloaded': downloaded,
				},
			}
		);
	};

	queueChannel = async (channelId: string, channelData: any, videos: any) => {
		const channelQueue = this.db.collection('channelQueue');

		const channel = {
			id: channelId,
			data: channelData,
			videos: videos,
		};

		await channelQueue.insertOne(channel);

		clientQueueListener.emit('channel', channel);
	};

	getQueuedChannelCount = async () => {
		const channelQueue = this.db.collection('channelQueue');
		return await channelQueue.countDocuments();
	};

	getQueuedChannel = async (channelId: string) => {
		const channelQueue = this.db.collection('channelQueue');
		return await channelQueue.findOne({ id: channelId });
	};

	getQueuedChannels = async () => {
		const channelQueue = this.db.collection('channelQueue');
		return await channelQueue.find().toArray();
	};

	removeFromQueue = async (channelId: string) => {
		const channelQueue = this.db.collection('channelQueue');
		await channelQueue.deleteOne({ id: channelId });
	};

	moveChannel = async (
		channelId: string,
		destination: 'accept' | 'reject' | 'acceptNoDownload'
	) => {
		const channelQueue = this.db.collection('channelQueue');
		const channel = await channelQueue.findOne({ id: channelId });
		if (!channel) return;

		// move the channel
		const getDestination = () => {
			switch (destination) {
				case 'acceptNoDownload':
				case 'accept':
					return this.db.collection('acceptedChannelQueue');

				case 'reject':
					return this.db.collection('rejectedChannels');

				default:
					return null;
			}
		};

		const newQueue = getDestination();
		if (!newQueue) throw new Error('invalid destination');

		if (destination == 'acceptNoDownload') {
			channel.dontDownload = true;
		}

		await newQueue.insertOne(channel);
		await channelQueue.deleteOne({ id: channelId });

		// update queue
		queue.onAcceptOrRejectChannel(channelId);

		// emit events
		if (destination == 'acceptNoDownload' || destination == 'accept')
			acceptedChannelListener.emit('accepted');

		clientQueueListener.emit('channel', channel);
	};

	filterChannel = async (channelId: string) => {
		const filteredChannels = this.db.collection('filteredChannels');
		await filteredChannels.insertOne({ id: channelId });
	};

	getFilteredChannels = async () => {
		const filteredChannels = this.db.collection('filteredChannels');
		return await filteredChannels.find().toArray();
	};

	removeFromFilter = async (channelId: string) => {
		const filteredChannels = this.db.collection('filteredChannels');
		await filteredChannels.deleteOne({ id: channelId });
	};

	onChannelParsed = async (channelId: string) => {
		const acceptedChannelQueue = this.db.collection('acceptedChannelQueue');
		const channel = await acceptedChannelQueue.findOne({ id: channelId });

		const channels = this.db.collection('channels');

		await channels.insertOne(channel);
		await acceptedChannelQueue.deleteOne({ id: channelId });
	};

	getNextChannel = async () => {
		const acceptedChannelQueue = this.db.collection('acceptedChannelQueue');

		const firstChannel = await acceptedChannelQueue.findOne();

		if (!firstChannel) return null;
		else return firstChannel;
	};

	getAcceptedChannelCount = async () => {
		const acceptedChannelQueue = this.db.collection('acceptedChannelQueue');
		return await acceptedChannelQueue.countDocuments();
	};

	getChannels = async () => {
		const channels = this.db.collection('channels');
		return await channels.find().toArray();
	};

	getChannel = async (channelId: string) => {
		const channels = this.db.collection('channels');
		return await channels.findOne({ id: channelId });
	};

	getVideo = async (videoId: string) => {
		const videos = this.db.collection('videos');
		return await videos.findOne({ id: videoId });
	};

	getVideos = async () => {
		const videos = this.db.collection('videos');
		return await videos.find().toArray();
	};

	isChannelQueued = async (channelId: string) => {
		const channelQueue = this.db.collection('channelQueue');
		return await channelQueue.findOne({ id: channelId });
	};

	isChannelAccepted = async (channelId: string) => {
		const acceptedChannelQueue = this.db.collection('acceptedChannelQueue');
		return await acceptedChannelQueue.findOne({ id: channelId });
	};

	isChannelRejected = async (channelId: string) => {
		const rejectedChannels = this.db.collection('rejectedChannels');
		return await rejectedChannels.findOne({ id: channelId });
	};

	isChannelFiltered = async (channelId: string) => {
		const filteredChannels = this.db.collection('filteredChannels');
		return await filteredChannels.findOne({ id: channelId });
	};

	isChannelParsed = async (channelId: string) => {
		const channel = await this.getChannel(channelId);
		return channel != null;
	};

	isVideoParsed = async (videoId: string) => {
		const video = await this.getVideo(videoId);
		return video != null;
	};

	checkDuplicates = async (collectionName: string) => {
		const collection = this.db.collection(collectionName);

		const duplicates = await collection
			.aggregate([
				{
					$group: {
						_id: { id: '$id' },
						dups: { $push: '$_id' },
						count: { $sum: 1 },
					},
				},
				{ $match: { count: { $gt: 1 } } },
			])
			.toArray();

		console.log(
			`deleting ${duplicates.length} duplicates from ${collectionName}`
		);

		for (const duplicate of duplicates) {
			const deletingIds = duplicate.dups;
			deletingIds.shift(); // keep one.
			await collection.deleteMany({ _id: { $in: deletingIds } });
		}
	};

	getChannelsCommentedOn = async (channelId: string) => {
		// find videos the channel has commented on and get the videos channel ids
		const videos = this.db.collection('videos');
		const relations = await videos
			.find({
				'data.comments.author_id': channelId,
			})
			.project({ 'data.channel_id': 1, _id: 0 })
			.toArray();

		// get unique channel ids
		return [...new Set(relations.map((relation) => relation.data.channel_id))];
	};
}

const db = new Database();
export default db;
