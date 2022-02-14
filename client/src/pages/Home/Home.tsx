import { Card, CardContent } from '@mui/material';
import { Box } from '@mui/system';
import React, {
	ReactElement,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import Loader from '../../components/Loader/Loader';
import ApiContext from '../../context/ApiContext';

import './Home.scss';

interface ChannelProps {
	data: any;
	videos: any;
}

const ChannelCard = ({ data, videos }: ChannelProps): ReactElement => {
	console.log(data);
	if (videos) console.log(videos[0]);

	return (
		<Card variant="outlined">
			<CardContent>
				{!data ? (
					<Loader message="loading channel..." />
				) : (
					<>
						<a href={data.authorUrl}>
							<div className="channel-header">
								<img
									className="channel-avatar"
									src={data.authorThumbnails.at(-1).url}
								/>
								<div className="channel-info">
									<div className="channel-name">{data.author}</div>
									<div className="channel-subscriptions">
										{data.subscriberText}
									</div>
									<div className="channel-tags">
										{data.tags &&
											data.tags.map((tag: string, i: number) => (
												<div key={`tag-${i}`} className="channel-tag">
													{tag}
												</div>
											))}
									</div>
								</div>
							</div>
						</a>

						<p>{data.description}</p>
					</>
				)}

				<div className="channel-videos">
					{!videos ? (
						<Loader message="loading videos..." />
					) : (
						videos.map((video: any) => (
							<a key={video.videoId} href={`https://youtu.be/${video.videoId}`}>
								<div className="video">
									<div className="video-thumbnail">
										<img
											src={video.videoThumbnails.at(-1).url}
											alt={`thumbnail for video '${video.title}' by ${data.author}`}
										/>

										<div className="video-duration">{video.durationText}</div>
									</div>

									<div className="video-details">
										<div>{video.title}</div>
										<div className="views-and-date">
											{video.viewCountText} • {video.publishedText}
										</div>
									</div>
								</div>
							</a>
						))
					)}
				</div>
			</CardContent>
		</Card>
	);
};

interface ChannelQueueProps {
	channels: any[];
}

const ChannelQueue = ({ channels }: ChannelQueueProps): ReactElement => {
	console.log('channels', channels);
	return (
		<div>
			{channels.map((channel) => (
				<ChannelCard data={channel.data} videos={channel.videos} />
			))}
		</div>
	);
};

interface Channel {
	id: string;

	data?: any;
	videos?: any;
}

const Home = (): ReactElement => {
	const showingChannels = 3;

	const [channelIds, setChannelIds] = useState<string[]>([]);
	const [channelOffset, setChannelOffset] = useState(0);
	const [channels, setChannels] = useState<Channel[]>([]);

	const ws = useRef<WebSocket | null>(null);

	const Api = useContext(ApiContext);

	useEffect(() => {
		ws.current = new WebSocket('ws://localhost:3001/ws/channelQueue');
		ws.current.onopen = () => console.log('ws opened');
		ws.current.onclose = () => console.log('ws closed');

		ws.current.onmessage = async (e: MessageEvent) => {
			const channels = JSON.parse(e.data);
			setChannelIds((cur) =>
				cur.concat(channels.map((channel: any) => channel.id))
			);
		};

		const wsCurrent = ws.current;
		return () => {
			wsCurrent.close();
		};
	}, []);

	useEffect(() => {
		let mounted = true;

		for (let i = channelOffset; i < channelOffset + showingChannels; i++) {
			const channelId = channelIds[i];
			if (!channelId) continue;
			if (channels.find((channel) => channel.id == channelId)) continue;

			const channel: Channel = {
				id: channelId,
			};

			setChannels((cur) => cur.concat(channel));

			const updateChannel = (channelData?: any, videos?: any) => {
				if (!mounted) return;

				setChannels((cur) => {
					const copy = [...cur];
					const channel = copy.find((channel) => channel.id == channelId);
					if (channel) {
						if (channelData) channel.data = channelData;
						if (videos) channel.videos = videos;
					}
					return copy;
				});
			};

			const loadChannel = async (channelId: string) => {
				const channelData = await Api.get('get-channel-info', {
					channelId,
				});

				updateChannel(channelData, null);
			};

			const loadVideos = async (channelId: string) => {
				const videos = await Api.get('get-channel-videos', {
					channelId,
				});

				updateChannel(null, videos);
			};

			console.log('loading channel', channelId);
			Promise.all([loadChannel(channelId), loadVideos(channelId)]);
		}

		return () => {
			mounted = false;
		};
	}, [channelIds, channelOffset]);

	return (
		<main className="home-page">
			<ChannelQueue channels={channels} />
			<button onClick={() => setChannelOffset((cur) => cur + 1)}>hii</button>
		</main>
	);
};

export default Home;
