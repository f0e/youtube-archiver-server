import YtDlpWrap from 'yt-dlp-wrap';
import ytpl from 'ytpl';
import ytch from 'yt-channel-info';

const ytDlpWrap = new YtDlpWrap();

export const remuxFormat = 'mp4';

const log = (...params: any[]) => console.log('[youtube]', ...params);

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

const cookies = ['--cookies-from-browser', 'brave'];

export async function parseVideo(videoId: string) {
	const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
	const videoData = await ytDlpWrap.getVideoInfo([
		'--write-comments',
		...cookies,
		videoUrl,
	]);

	let commenters: string[] = [];

	if (videoData.comments != null) {
		commenters = [
			...new Set<string>(
				videoData.comments.map((comment: any) => comment.author_id)
			),
		];
	}

	return {
		videoData,
		commenters,
	};
}

export async function parseChannel(channelId: string) {
	return await ytch.getChannelInfo({
		channelId,
		channelIdType: 0,
	});
}

export async function getVideos(channelId: string, maxVideos: number = -1) {
	let videos: any[] = [];
	let continuation: string = null;

	try {
		do {
			let newVideos;
			if (!continuation) {
				newVideos = await ytch.getChannelVideos({
					channelIdType: 0,
					channelId,
				});
			} else {
				newVideos = await ytch.getChannelVideosMore({
					continuation,
				});
			}

			videos = videos.concat(newVideos.items);
			continuation = newVideos.continuation;

			if (maxVideos != -1) {
				if (videos.length > maxVideos) return false;
			}
		} while (continuation);
	} catch (e) {
		log(e);
		log(videos.map((video) => video.title).join(', '));
		log(videos.length, 'videos');
		log('channelId', channelId);
		log('error when getting more videos? ignoring');
	}

	return videos;
}

export async function getPlaylist(playlistId: string) {
	return await ytpl(playlistId, {
		hl: 'en',
		limit: Infinity,
	});
}

export function downloadVideo(
	videoId: string,
	downloadPath: string,
	callback?: (progress: any) => void
) {
	const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

	return new Promise((resolve, reject) => {
		ytDlpWrap
			.exec([...downloadOptions, ...cookies, videoUrl, '-o', downloadPath])
			.on('progress', callback)
			// .on('ytDlpEvent', (eventType, eventData) =>
			// 	log(eventType, eventData)
			// )
			.on('error', reject)
			.on('close', resolve);
	});
}

export function downloadVideoStream(videoId: string) {
	const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
	return ytDlpWrap.execStream([...downloadOptions, videoUrl]);
}
