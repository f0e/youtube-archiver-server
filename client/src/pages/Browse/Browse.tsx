import React, { ReactElement, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextInput } from '@mantine/core';
import { useForm } from '@mantine/hooks';
import { ChannelCard } from '../../components/ChannelCard/ChannelCard';
import Loader from '../../components/Loader/Loader';
import { VideoCard } from '../../components/VideoCard/VideoCard';
import ApiContext, { ApiState } from '../../context/ApiContext';
import Channel from '../../types/channel';
import Video from '../../types/video';

import Fuse from 'fuse.js';

import './Browse.scss';

interface SearchItem {
	name: string;
	data: any;
	elem: ReactElement;
}

interface SearchBarProps {
	items: SearchItem[];
	onSearch: (results: any[]) => void;
	maxResults: number;
}

const SearchBar = ({ items, onSearch, maxResults }: SearchBarProps) => {
	const fuse = new Fuse(items, {
		keys: ['name'],
	});

	const search = (values: typeof form['values']) => {
		const fuseResults = fuse.search(values.query);
		const results = fuseResults
			.map((result) => result.item)
			.slice(0, maxResults);

		onSearch(results);
	};

	const form = useForm({
		initialValues: {
			query: '',
		},
	});

	return (
		<form onSubmit={form.onSubmit(search)}>
			<TextInput placeholder="search" {...form.getInputProps('query')} />
		</form>
	);
};

interface SearchProps {
	channels: Channel[];
}

const Search = ({ channels: allChannels }: SearchProps): ReactElement => {
	const [results, setResults] = useState<any[]>([]);
	const [searched, setSearched] = useState(false);

	const videos = allChannels.map((channel) => channel.videos).flat();

	const [randomVideos, setRandomVideos] = useState<any[]>(() => {
		const randomVideos: any[] = [];

		while (randomVideos.length < Math.min(10, videos.length)) {
			const randomVideo = videos[Math.floor(Math.random() * videos.length)];

			if (randomVideos.includes(randomVideo)) continue;
			if (!randomVideo.downloaded) continue;

			randomVideos.push(randomVideo);
		}

		return randomVideos;
	});

	const channelsInput = allChannels.map(
		(channel): SearchItem => ({
			name: channel.data.author,
			data: channel,
			elem: <ChannelCard key={channel.id} parsed={true} channel={channel} />,
		})
	);

	const videosInput = videos.map(
		(video): SearchItem => ({
			name: video.title,
			data: video,
			elem: (
				<VideoCard
					key={video.videoId}
					basicVideo={video}
					fadeNotDownloaded={true}
					showChannel={true}
				/>
			),
		})
	);

	const searchItems = [...channelsInput, ...videosInput];

	const onSearch = (results: any) => {
		setResults(results);
		setSearched(true);
	};

	return (
		<>
			<SearchBar
				items={searchItems}
				onSearch={(results: any) => onSearch(results)}
				maxResults={10}
			/>

			<br />

			{!searched && <h2>don't know what to watch?</h2>}

			<div className="results">
				{!searched ? (
					randomVideos.map((video) => (
						<VideoCard
							key={video.videoId}
							basicVideo={video}
							fadeNotDownloaded={true}
							showChannel={true}
						/>
					))
				) : results.length == 0 ? (
					<h2>your search returned no results</h2>
				) : (
					results.map((result) => result.elem)
				)}
			</div>
		</>
	);
};

const Browse = (): ReactElement => {
	const [channels, setChannels] = useState(new ApiState());

	const navigate = useNavigate();

	const Api = useContext(ApiContext);

	useEffect(() => {
		Api.getState(setChannels, '/get-channels');
	}, []);

	return (
		<main className="browse-page">
			<h1 style={{ marginBottom: '0.5rem' }}>browse</h1>
			<br />

			{channels.loading ? (
				<Loader message="loading channels" />
			) : channels.error ? (
				<>
					<h2>failed to load channels</h2>
					<Button onClick={() => navigate(-1)}>back</Button>
				</>
			) : channels.data.length == 0 ? (
				<>
					<h2>no channels found</h2>
					<Button onClick={() => navigate(-1)}>back</Button>
				</>
			) : (
				<Search channels={channels.data} />
			)}
		</main>
	);
};

export default Browse;
