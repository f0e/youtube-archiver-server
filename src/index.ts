import 'dotenv/config';

import db from './archiving/database';

import * as archive from './archiving/archive';
import * as connections from './connections/connections';
import * as download from './downloading/download';
import * as queue from './queue/queue';

import { startServer } from './server/server';

async function start() {
	await db.connect();

	await startServer();

	archive.reparseChannels();
	archive.parseChannels();
	download.downloadVideos();
	queue.start();
	// connections.run();

	console.log('parsing playlists');

	const playlists = [];

	for (const playlist of playlists) {
		await archive.parsePlaylist(playlist);
		console.log('');
	}

	console.log('done');
}

start();
