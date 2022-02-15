import YtDlpWrap from 'yt-dlp-wrap';
const ytch = require('yt-channel-info');

const ytDlpWrap = new YtDlpWrap();

export const remuxFormat = 'mp4';

const downloadOptions = [
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
	remuxFormat,
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

export function downloadVideo(videoId: string, downloadPath: string) {
	const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

	return new Promise((resolve, reject) => {
		ytDlpWrap
			.exec([...downloadOptions, videoUrl, '-o', downloadPath])
			.on('progress', (progress) => {
				const percent = Math.floor(progress.percent / 10) * 10;
				console.log(`${percent}% ${progress.currentSpeed} ${progress.eta}`);
			})
			// .on('ytDlpEvent', (eventType, eventData) =>
			// 	console.log(eventType, eventData)
			// )
			.on('error', reject)
			.on('close', resolve);
	});
}

export function downloadVideoStream(videoId: string) {
	const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
	return ytDlpWrap.execStream([...downloadOptions, videoUrl]);
}
