import db from '../archiving/database';

export async function getMostUsedSongs() {
	const songs = await db.getUsedSongs();

	const songUses: { [key: string]: string[] } = {};
	for (const song of songs) {
		const songName = `${song.data.artist} - ${song.data.track}`;

		if (!songUses[songName]) songUses[songName] = [];
		songUses[songName].push(song.data.original_url);
	}

	const mostUsedSongs = Object.entries(songUses)
		.sort(([songA, videosA], [songB, videosB]) => {
			return videosB.length - videosA.length;
		})
		.map(
			([song, videos], i) =>
				`#${i + 1} | ${videos.length} uses | ${song} | ${videos.join(', ')}`
		);

	return mostUsedSongs;
}

export async function getMostUsedArtists() {
	const songs = await db.getUsedSongs();

	const artistUses: { [key: string]: any } = {};
	for (const song of songs) {
		const artist = song.data.artist;

		if (!artistUses[artist]) artistUses[artist] = [];
		artistUses[artist].push({
			song: song.data.track,
			video: `https://youtu.be/${song.id}`,
		});
	}

	const mostUsedArtists = Object.entries(artistUses)
		.sort(([artistA, dataA], [artistB, dataB]) => {
			return dataB.length - dataA.length;
		})
		.map(
			([artist, dataArr], i) =>
				`#${i + 1} | ${dataArr.length} uses | ${artist} | ${dataArr
					.map((data: any) => `${data.song} (${data.video})`)
					.join(', ')}`
		);

	return mostUsedArtists;
}
