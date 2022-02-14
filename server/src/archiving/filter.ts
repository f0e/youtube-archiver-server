const filters = {
	// // channels
	// minSubscribers: 0,
	// maxSubscribers: 5000,
	// maxVideos: 100,

	// videos
	blockLivestreams: true,
	minVideoLength: 15,
	maxVideoLength: 60 * 5,
	// minViews: 100,
};

export function filterChannel(channelData: any) {
	return false;
	// return (
	// 	channelData.subscriberCount < filters.minSubscribers ||
	// 	channelData.subscriberCount > filters.maxSubscribers
	// );
}

export function filterChannelVideos(videos: any) {
	return false;
	// return videos.length > filters.maxVideos;
}

export function filterVideoBasic(video: any) {
	return (
		(video.liveNow && filters.blockLivestreams) ||
		video.lengthSeconds < filters.minVideoLength ||
		video.lengthSeconds > filters.maxVideoLength
		// || video.viewCount < filters.minViews
	);
}
