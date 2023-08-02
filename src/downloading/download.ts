import fs from 'fs-extra';
import path from 'path';
import { sleep } from '../util/util';

import db from '../archiving/database';

import * as youtube from '../archiving/youtube';

const log = (...params: any[]) => console.log('[download]', ...params);

export function getVideoPath(video: any, withExtension: boolean = false) {
	return path.join(
		process.env.DOWNLOAD_FOLDER,
		video.data.channel_id,
		withExtension ? `${video.id}.${youtube.remuxFormat}` : video.id
	);
}

export async function downloadVideo(videoId: string) {
	const video = await db.getVideo(videoId);

	await youtube.downloadVideo(videoId, getVideoPath(video), (progress: any) => {
		// log(`${video.data.title} - ${progress.percent}%`);
	});
}

export async function updateVideosDownloaded() {
	const videos = await db.getVideos();

	for (const [i, video] of videos.entries()) {
		await db.updateVideoDownloaded(video.id);
	}
}

export async function downloadVideos() {
	while (true) {
		const videos = await db.getUndownloadedVideos();

		if (videos.length == 0) {
			await sleep(1000);
			continue;
		}

		log(`downloading ${videos.length} videos`);

		for (const [i, video] of videos.entries()) {
			// const videoPath = await getVideoPath(video, true);
			// if (!fs.existsSync(videoPath)) throw new Error('video deleted');

			log(
				`${i + 1}/${videos.length} - downloading video '${
					video.data.title
				}' by ${video.data.uploader} (${video.data.original_url})`
			);

			while (true) {
				try {
					await downloadVideo(video.id);

					await db.updateVideoDownloaded(video.id);
					log('done');

					break;
				} catch (e) {
					if (e.message) {
						const removedMessages = [
							'ERROR: unable to download video data: [Errno 2] No such file or directory', // idk what this is
							'Video unavailable. This video has been removed by the uploader',
							'Video unavailable. This video is private',
							'Video unavailable. This video is no longer available because the uploader has closed their YouTube account.',
							'Video unavailable',
						];

						// handle privated/deleted videos
						const dontDownload = removedMessages.find((msg) =>
							e.message.includes(msg)
						);

						if (dontDownload) {
							log('video private/removed/etc. skipping.', dontDownload);
							break;
						}
					}

					log(e);

					log('failed to download, retrying in 5 seconds');
					await sleep(5000);
				}
			}
		}

		log('downloaded all videos');
	}
}
