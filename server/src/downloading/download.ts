import fs from 'fs-extra';
import path from 'path';

import db from '../archiving/database';

import * as youtube from '../archiving/youtube';

const DOWNLOAD_PATH = path.join(__dirname, '../../../downloads');

export function getVideoPath(video: any, withExtension: boolean = false) {
	return path.join(
		DOWNLOAD_PATH,
		video.data.channel_id,
		withExtension ? `${video.id}.${youtube.remuxFormat}` : video.id
	);
}

export async function downloadVideo(videoId: string) {
	const video = await db.getVideo(videoId);

	await youtube.downloadVideo(videoId, getVideoPath(video));
}

export async function downloadAllVideos() {
	const videos = await db.getVideos();

	for (const [i, video] of videos.entries()) {
		// check if it's already been downloaded
		const videoPath = getVideoPath(video, true);
		if (fs.existsSync(videoPath)) continue;

		console.log(
			`downloading video '${video.data.title}' by ${video.data.uploader} (${i}/${videos.length})`
		);

		await downloadVideo(video.id);

		console.log('done');
	}
}
