import fs from 'fs-extra';

import { Collection, Db, MongoClient } from 'mongodb';
import { acceptedChannelListener, clientListener } from './archive';
import { getVideoPath } from '../downloading/download';
import * as queue from '../queue/queue';

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

	addVideo = async (
		videoId: string,
		videoData: any,
		parsedCommenters: boolean
	) => {
		const videos = this.db.collection('videos');

		const title = videoData.title;

		const video = await videos.findOne({ id: videoId });
		if (video) {
			console.log(`video '${title}' already exists, updating titles`);

			await videos.updateOne(
				{ id: videoId },
				{
					$addToSet: {
						titles: title,
					},
				}
			);
		} else {
			await videos.insertOne({
				id: videoId,
				titles: [title],
				data: videoData,
				parsedCommenters,
			});

			clientListener.emit('video');
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

		clientListener.emit('queue');
	};

	getQueuedChannelCount = async () => {
		const channelQueue = this.db.collection('channelQueue');
		return await channelQueue.countDocuments();
	};

	getQueuedChannel = async (channelId: string) => {
		const channelQueue = this.db.collection('channelQueue');
		return await channelQueue.findOne({ id: channelId });
	};

	getQueuedChannels = async (minRelations: number = 0) => {
		const channelQueue = this.db.collection('channelQueue');

		const searchOpts: any = {};
		if (minRelations > 0)
			searchOpts[`relations.${minRelations - 1}`] = { $exists: true };

		return await channelQueue.find(searchOpts).toArray();
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

		clientListener.emit('queue');
	};

	filterChannel = async (channelId: string) => {
		const filteredChannels = this.db.collection('filteredChannels');
		await filteredChannels.insertOne({ id: channelId });
	};

	getFilteredChannel = async (channelId: string) => {
		const filteredChannels = this.db.collection('filteredChannels');
		return await filteredChannels.findOne({ id: channelId });
	};

	getFilteredChannels = async () => {
		const filteredChannels = this.db.collection('filteredChannels');
		return await filteredChannels.find().toArray();
	};

	removeFromFilter = async (channelId: string) => {
		const filteredChannels = this.db.collection('filteredChannels');
		await filteredChannels.deleteOne({ id: channelId });
	};

	getRejectedChannel = async (channelId: string) => {
		const rejectedChannels = this.db.collection('rejectedChannels');
		return await rejectedChannels.findOne({ id: channelId });
	};

	getRejectedChannels = async () => {
		const rejectedChannels = this.db.collection('rejectedChannels');
		return await rejectedChannels.find().toArray();
	};

	onChannelParsed = async (channelId: string) => {
		const acceptedChannelQueue = this.db.collection('acceptedChannelQueue');
		const channel = await acceptedChannelQueue.findOne({ id: channelId });

		const channels = this.db.collection('channels');

		await channels.insertOne(channel);
		await acceptedChannelQueue.deleteOne({ id: channelId });

		clientListener.emit('channel');
	};

	getNextChannel = async () => {
		const acceptedChannelQueue = this.db.collection('acceptedChannelQueue');

		const firstChannel = await acceptedChannelQueue.findOne();

		if (!firstChannel) return null;
		else return firstChannel;
	};

	getAcceptedChannel = async (channelId: string) => {
		const acceptedChannelQueue = this.db.collection('acceptedChannelQueue');
		return await acceptedChannelQueue.findOne({ id: channelId });
	};

	getAcceptedChannels = async () => {
		const acceptedChannelQueue = this.db.collection('acceptedChannelQueue');
		return await acceptedChannelQueue.find().toArray();
	};

	getAcceptedChannelCount = async () => {
		const acceptedChannelQueue = this.db.collection('acceptedChannelQueue');
		return await acceptedChannelQueue.countDocuments();
	};

	getChannel = async (channelId: string) => {
		const channels = this.db.collection('channels');
		return await channels.findOne({ id: channelId });
	};

	getChannels = async () => {
		const channels = this.db.collection('channels');
		return await channels.find().toArray();
	};

	getChannelCount = async () => {
		const channels = this.db.collection('channels');
		return await channels.countDocuments();
	};

	getVideo = async (videoId: string) => {
		const videos = this.db.collection('videos');
		return await videos.findOne({ id: videoId });
	};

	getVideos = async () => {
		const videos = this.db.collection('videos');
		return await videos.find().toArray();
	};

	getVideoCount = async () => {
		const videos = this.db.collection('videos');
		return await videos.countDocuments();
	};

	getDownloadedVideoCount = async () => {
		const videos = this.db.collection('videos');
		return await videos.countDocuments({ downloaded: true });
	};

	isChannelQueued = async (channelId: string) => {
		const channelQueue = this.db.collection('channelQueue');
		return await channelQueue.findOne({ id: channelId });
	};

	isChannelAccepted = async (channelId: string) => {
		const channel = await this.getAcceptedChannel(channelId);
		return channel != null;
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

		return [
			...new Set( // get unique channel ids
				relations
					.filter((relation) => relation.data.channel_id != channelId) // remove self comments
					.map((relation) => relation.data.channel_id)
			),
		];
	};

	setRelations = async (
		channelId: string,
		collectionName: string,
		relations: string[]
	) => {
		const collection = this.db.collection(collectionName);
		if (!collection) throw new Error(`invalid collection ${collectionName}`);

		await collection.updateOne(
			{ id: channelId },
			{
				$set: {
					relations: relations,
				},
			}
		);
	};

	addRelation = async (
		channelId: string,
		collectionName: string,
		relation: string
	) => {
		const collection = this.db.collection(collectionName);
		if (!collection) throw new Error(`invalid collection ${collectionName}`);

		const channel = await collection.findOne({ id: channelId });
		if (!channel) return false;

		await collection.updateOne(
			{ id: channelId },
			{
				$addToSet: {
					relations: relation,
				},
			}
		);

		return true;
	};

	getUsedSongs = async () => {
		const videos = this.db.collection('videos');

		let songs = await videos
			.find()
			.project({
				id: 1,
				'data.track': 1,
				'data.artist': 1,
				'data.duration': 1,
				_id: 0,
			})
			.toArray();

		songs = songs.filter(
			(song) => song.data.artist && song.data.duration < 60 * 2
		);

		return songs;
	};

	getMostCommentedVideos = async () => {
		const videos = this.db.collection('videos');

		const comments = await videos
			.find()
			.project({
				id: 1,
				'data.title': 1,
				'data.comment_count': 1,
				_id: 0,
			})
			.toArray();

		const sortedComments = comments.sort(
			(a, b) => b.data.comment_count - a.data.comment_count
		);

		return sortedComments;
	};

	getVideoIds = async () => {
		const videos = this.db.collection('videos');

		const videoIds = await videos
			.find()
			.project({
				id: 1,
				_id: 0,
			})
			.toArray();

		return await videoIds.map((data) => data.id);
	};

	getChannelIds = async () => {
		const channels = this.db.collection('channels');

		const channelIds = await channels
			.find()
			.project({
				id: 1,
				_id: 0,
			})
			.toArray();

		return await channelIds.map((data) => data.id);
	};
}

const db = new Database();
export default db;
