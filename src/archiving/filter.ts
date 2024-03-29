export const filters = {
	// channels
	minChannelsCommentedOn: 1,
	minSubscribers: 0,
	maxSubscribers: 100000,
	maxVideos: 1000,

	// videos
	blockLivestreams: true,
	blockNoVideos: false,
	minVideoLength: 0,
	maxVideoLength: 60 * 5,
	// minViews: 100,

	// comments
	maxSubscribersForComments: 20000,
	maxComments: 500,
};

export function filterChannelComments(commented: number) {
	return commented < filters.minChannelsCommentedOn;
}

export function filterChannel(channelData: any) {
	return (
		channelData.subscriberCount < filters.minSubscribers ||
		channelData.subscriberCount > filters.maxSubscribers
	);
}

export function filterChannelVideos(videos: any) {
	return (
		(filters.blockNoVideos && videos.length == 0) ||
		videos.length > filters.maxVideos
	);
}

export function filterVideoBasic(video: any) {
	return (
		(video.liveNow && filters.blockLivestreams) ||
		video.lengthSeconds < filters.minVideoLength ||
		video.lengthSeconds > filters.maxVideoLength
		// || video.viewCount < filters.minViews
	);
}

export function filterComments(channel: any, comments: any[]) {
	return (
		channel.subscriberCount > filters.maxSubscribersForComments ||
		comments.length > filters.maxComments
	);
}
