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
	// // update already downloaded videos
	// await updateVideosDownloaded();
	// console.log('updated downloaded videos');

	const videos = await db.getUndownloadedVideos();

	for (const [i, video] of videos.entries()) {
		// const videoPath = await getVideoPath(video, true);
		// if (!fs.existsSync(videoPath)) throw new Error('video deleted');

		const progressString = `${i + 1}/${videos.length}`;
		console.log(
			`downloading video '${video.data.title}' by ${video.data.uploader} (${progressString})`
		);

		while (true) {
			try {
				await downloadVideo(video.id);

				await db.updateVideoDownloaded(video.id);
				console.log('done');

				break;
			} catch (e) {
				if (
					e.message &&
					e.message.includes(
						'ERROR: unable to download video data: [Errno 2] No such file or directory'
					)
				) {
					await fs.appendFile('failed downloads.txt', video.id + '\n');
					break;
				}

				console.log(e);
				console.log('failed to download, retrying in 5 seconds');
				await sleep(5000);
			}
		}
	}
}
