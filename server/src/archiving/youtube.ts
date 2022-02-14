import YtDlpWrap from 'yt-dlp-wrap';
const ytch = require('yt-channel-info');

const ytDlpWrap = new YtDlpWrap();

const videoOptions = [
	// don't redownload videos
	'--no-overwrites',
	'--no-post-overwrites',

	// fix bugs with caching
	'--rm-cache-dir',

	// bypass geographic restrictions
	'--geo-bypass',

	// don't download livestreams
	'--match-filter',
	'!is_live',

	// embed video data
	'--embed-metadata',
	'--embed-thumbnail',
	'--embed-chapters',
	'--embed-subs',

	// // write video data
	// "--write-thumbnail",
	// "--write-info-json",
	// "--write-description",
	// "--write-comments",
	// "--write-link",

	// convert to mp4
	'--remux-video',
	'mp4',
];

export async function parseVideo(videoId: string) {
	const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
	const videoData = await ytDlpWrap.getVideoInfo([
		'--write-comments',
		videoUrl,
	]);

	const commenters = [
		...new Set<string>(
			videoData.comments.map((comment: any) => comment.author_id)
		),
	];

	return {
		videoData,
		commenters,
	};
}

export async function parseChannel(channelId: string) {
	return await ytch.getChannelInfo({
		channelId,
	});
}

export async function getVideos(channelId: string) {
	let videos: any[] = [];
	let continuation: string = null;

	do {
		let newVideos;
		if (!continuation) {
			newVideos = await ytch.getChannelVideos({
				channelId,
			});
		} else {
			newVideos = await ytch.getChannelVideosMore({
				continuation,
			});
		}

		videos = videos.concat(newVideos.items);
		continuation = newVideos.continuation;
	} while (continuation);

	return videos;
}

export function downloadVideoStream(video: string) {
	return ytDlpWrap.execStream([...videoOptions, video]);
}
