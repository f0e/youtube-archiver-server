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

	console.log(
		`downloading video '${video.data.title}' by ${video.data.uploader}`
	);

	await youtube.downloadVideo(videoId, getVideoPath(video));

	console.log('done');
}

export async function downloadAllVideos() {
	const videos = await db.getVideos();
	for (const video of videos) {
		// check if it's already been downloaded
		const videoPath = getVideoPath(video, true);
		if (fs.existsSync(videoPath)) continue;

		await downloadVideo(video.id);
	}
}
