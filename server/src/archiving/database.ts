import { Collection, Db, MongoClient } from 'mongodb';
import { acceptedChannelListener, clientChannelListener } from './archive';

const updateHistoryArray = (
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
		collection.updateOne({ id }, updateQuery);

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

	addChannel = async (channelId: string, channelData: any) => {
		const channels = this.db.collection('channels');

		const name = channelData.author;
		const avatar = channelData.authorThumbnails.at(-1);

		const channel = await channels.findOne({ id: channelId });
		if (channel) {
			console.log(
				`channel '${name}' already exists, updating names and avatars`
			);

			updateHistoryArray(channels, channel, channelId, 'names', name);
			updateHistoryArray(channels, channel, channelId, 'avatars', avatar);
		} else {
			await channels.insertOne({
				id: channelId,
				names: [name],
				avatars: [avatar],
				data: channelData,
			});

			console.log(`added channel '${name}'`);
		}
	};

	addVideo = async (videoId: string, videoData: any) => {
		const videos = this.db.collection('videos');

		const title = videoData.title;

		const video = await videos.findOne({ id: videoId });
		if (video) {
			console.log(
				`channel '${title}' already exists, updating names and avatars`
			);

			updateHistoryArray(videos, video, videoId, 'titles', title);
		} else {
			await videos.insertOne({
				id: videoId,
				titles: [title],
				data: videoData,
			});

			console.log(`added video '${title}'`);
		}
	};

	queueChannels = async (channels: string[]) => {
		const channelQueue = this.db.collection('channelQueue');

		let newChannels = 0;
		for (const channelId of channels) {
			// check if the channel has already been parsed
			if (await this.channelParsed(channelId)) continue;

			// check if the channel is already queued
			if (await this.channelQueued(channelId)) continue;

			newChannels++;
			await channelQueue.insertOne({ id: channelId });
			clientChannelListener.emit('channel', channelId);
		}

		console.log(`${newChannels} new channels queued`);
	};

	removeFromQueue = async (channelId: string) => {
		const channelQueue = this.db.collection('channelQueue');
		await channelQueue.deleteOne({ id: channelId });
	};

	acceptChannel = async (channelId: string) => {
		const acceptedChannelQueue = this.db.collection('acceptedChannelQueue');
		await acceptedChannelQueue.insertOne({ id: channelId });

		// also remove from the queue
		await this.removeFromQueue(channelId);

		acceptedChannelListener.emit('accepted');
	};

	filterChannel = async (channelId: string) => {
		const filteredChannels = this.db.collection('filteredChannels');
		await filteredChannels.insertOne({ id: channelId });

		// also remove from the queue
		await this.removeFromQueue(channelId);
	};

	removeFromAccepted = async (channelId: string) => {
		const acceptedChannelQueue = this.db.collection('acceptedChannelQueue');
		await acceptedChannelQueue.deleteOne({ id: channelId });
	};

	getNextChannel = async () => {
		const acceptedChannelQueue = this.db.collection('acceptedChannelQueue');

		const firstChannel = await acceptedChannelQueue.findOne();

		if (!firstChannel) return null;
		else return firstChannel.id;
	};

	getWaitingChannelCount = async () => {
		const acceptedChannelQueue = this.db.collection('acceptedChannelQueue');
		return await acceptedChannelQueue.countDocuments();
	};

	getQueuedChannels = async () => {
		const channelQueue = this.db.collection('channelQueue');
		const queue = await channelQueue.find().toArray();
		if (queue.length == 0) return [];
		else return queue.map((channel) => channel.id);
	};

	channelQueued = async (channelId: string) => {
		const channelQueue = this.db.collection('channelQueue');
		return await channelQueue.findOne({ id: channelId });
	};

	channelParsed = async (channelId: string) => {
		const channels = this.db.collection('channels');
		return await channels.findOne({ id: channelId });
	};

	videoParsed = async (videoId: string) => {
		const videos = this.db.collection('videos');
		return await videos.findOne({ id: videoId });
	};
}

const db = new Database();
export default db;
