import React, { ReactElement, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextInput } from '@mantine/core';
import { useForm } from '@mantine/hooks';
import { ChannelCard } from '../../components/ChannelCard/ChannelCard';
import Loader from '../../components/Loader/Loader';
import ApiContext from '../../context/ApiContext';
import Channel from '../../types/channel';
import Video from '../../types/video';

import Fuse from 'fuse.js';

import './Browse.scss';
import { VideoCard } from '../../components/VideoCard/VideoCard';

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

	console.log('rerendering results', results);

	const channelsInput = allChannels.map(
		(channel): SearchItem => ({
			name: channel.data.author,
			data: channel,
			elem: <ChannelCard key={channel.id} parsed={true} channel={channel} />,
		})
	);

	const videosInput = allChannels
		.map((channel) => channel.videos)
		.flat()
		.map(
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

	return (
		<>
			<SearchBar items={searchItems} onSearch={setResults} maxResults={10} />

			<br />

			<div className="results">{results.map((result) => result.elem)}</div>
		</>
	);
};

const Browse = (): ReactElement => {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);
	const [channels, setChannels] = useState<Channel[]>([]);

	const navigate = useNavigate();

	const Api = useContext(ApiContext);

	const loadChannels = async () => {
		if (!loading) setLoading(true);

		try {
			const channels = await Api.get('/get-channels');
			setChannels(channels);
		} catch (e) {
			setError(true);
		}

		setLoading(false);
	};

	useEffect(() => {
		loadChannels();
	}, []);

	return (
		<main className="browse-page">
			<h1 style={{ marginBottom: '0.5rem' }}>browse</h1>
			<br />

			{loading ? (
				<Loader message="loading channels" />
			) : error ? (
				<>
					<h2>failed to load channels</h2>
					<Button onClick={() => navigate(-1)}>back</Button>
				</>
			) : channels.length == 0 ? (
				<>
					<h2>no channels found</h2>
					<Button onClick={() => navigate(-1)}>back</Button>
				</>
			) : (
				<Search channels={channels} />
			)}
		</main>
	);
};

export default Browse;
