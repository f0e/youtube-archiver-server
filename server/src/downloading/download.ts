import fs from 'fs-extra';
import path from 'path';
import sleep from '../util/sleep';

import db from '../archiving/database';

import * as youtube from '../archiving/youtube';

export function getVideoPath(video: any, withExtension: boolean = false) {
	return path.join(
		process.env.DOWNLOAD_FOLDER,
		video.data.channel_id,
		withExtension ? `${video.id}.${youtube.remuxFormat}` : video.id
	);
}

export async function downloadVideo(videoId: string) {
	const video = await db.getVideo(videoId);

	await youtube.downloadVideo(videoId, getVideoPath(video));
}

export async function updateVideosDownloaded() {
	const videos = await db.getVideos();

	for (const [i, video] of videos.entries()) {
		await db.updateVideoDownloaded(video.id);
	}
}

export async function downloadAllVideos() {
	// update already downloaded videos
	await updateVideosDownloaded();
	console.log('updated downloaded videos');

	const videos = await db.getVideos();

	for (const [i, video] of videos.entries()) {
		// check if it's already been downloaded (COULD BE DELETED THOUGH. todo: MANAGE THAT)
		if (video.downloaded) continue;

		// const videoPath = await getVideoPath(video, true);
		// if (!fs.existsSync(videoPath)) throw new Error('video deleted');

		console.log(
			`downloading video '${video.data.title}' by ${video.data.uploader} (${i}/${videos.length})`
		);

		while (true) {
			try {
				await downloadVideo(video.id);

				await db.updateVideoDownloaded(video.id);
				console.log('done');

				break;
			} catch (e) {
				console.log(`failed to download, retrying in 5 seconds`, e);
				await sleep(5000);
			}
		}
	}
}
