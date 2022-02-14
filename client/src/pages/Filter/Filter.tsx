import React, {
	ReactElement,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import { Card, CardContent } from '@mui/material';
import Loader from '../../components/Loader/Loader';
import LoadingButton from '../../components/LoadingButton/LoadingButton';
import ApiContext from '../../context/ApiContext';

import './Filter.scss';

interface Channel {
	id: string;

	data?: any;
	videos?: any;
}

interface ChannelProps {
	channel: Channel;
	onAcceptReject: (channelId: string, accepted: boolean) => void;
}

const ChannelCard = ({
	channel,
	onAcceptReject,
}: ChannelProps): ReactElement => {
	const [accepting, setAccepting] = useState(false);
	const [rejecting, setRejecting] = useState(false);

	const Api = useContext(ApiContext);

	const acceptOrReject = async (accept: boolean) => {
		if (accept) setAccepting(true);
		else setRejecting(true);

		const url = accept ? 'accept-channel' : 'filter-channel';
		await Api.post(url, {
			channelId: channel.id,
		});

		if (accept) setAccepting(false);
		else setRejecting(false);

		onAcceptReject(channel.id, accept);
	};

	return (
		<Card variant="outlined">
			<CardContent>
				{!channel.data ? (
					<Loader message="loading channel..." />
				) : (
					<>
						<div className="accept-or-reject">
							<LoadingButton
								onClick={() => acceptOrReject(true)}
								variant="contained"
								color="primary"
								label="accept"
								loading={accepting}
							/>
							<LoadingButton
								onClick={() => acceptOrReject(false)}
								variant="contained"
								color="secondary"
								label="reject"
								loading={rejecting}
							/>
						</div>

						<a href={channel.data.authorUrl}>
							<div className="channel-header">
								<img
									className="channel-avatar"
									src={channel.data.authorThumbnails.at(-1).url}
									alt={`${channel.data.author}'s avatar`}
								/>
								<div className="channel-info">
									<div className="channel-name">{channel.data.author}</div>
									<div className="channel-subscriptions">
										{channel.data.subscriberText}
									</div>
									<div className="channel-tags">
										{channel.data.tags &&
											channel.data.tags.map((tag: string, i: number) => (
												<div key={`tag-${i}`} className="channel-tag">
													{tag}
												</div>
											))}
									</div>
								</div>
							</div>
						</a>

						<p>{channel.data.description}</p>
					</>
				)}

				{!channel.videos ? (
					<Loader message="loading videos..." />
				) : channel.videos.length == 0 ? (
					<div className="no-videos">no videos</div>
				) : (
					<div className="channel-videos">
						{channel.videos.map((video: any) => (
							<a key={video.videoId} href={`https://youtu.be/${video.videoId}`}>
								<div className="video">
									<div className="video-thumbnail">
										<img
											src={video.videoThumbnails.at(-1).url}
											alt={`thumbnail for video '${video.title}' by ${
												channel.data ? channel.data.author : 'loading'
											}`}
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
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
};

interface ChannelQueueProps {
	channels: any[];
	onAcceptReject: (channelId: string, accepted: boolean) => void;
}

const ChannelQueue = ({
	channels,
	onAcceptReject,
}: ChannelQueueProps): ReactElement => {
	return (
		<div>
			{channels.map((channel) => (
				<ChannelCard
					key={channel.id}
					channel={channel}
					onAcceptReject={onAcceptReject}
				/>
			))}
		</div>
	);
};

const Filter = (): ReactElement => {
	const showingChannels = 10;

	const [channelIds, setChannelIds] = useState<string[]>([]);
	const [channels, setChannels] = useState<Channel[]>([]);

	const ws = useRef<WebSocket | null>(null);

	const Api = useContext(ApiContext);

	useEffect(() => {
		ws.current = new WebSocket('ws://localhost:3001/ws/channelQueue');

		ws.current.onmessage = async (e: MessageEvent) => {
			const channels = JSON.parse(e.data);
			setChannelIds((cur) => cur.concat(channels));
		};

		const wsCurrent = ws.current;
		return () => {
			wsCurrent.close();
		};
	}, []);

	const updateChannels = () => {
		const newChannels = Math.min(
			channelIds.length,
			showingChannels - channels.length
		);

		if (newChannels <= 0) return;

		for (let i = 0; i < newChannels; i++) {
			const channelId = channelIds[i];

			const channel: Channel = { id: channelId };
			setChannels((cur) => cur.concat(channel));

			const updateChannel = (channelData?: any, videos?: any) => {
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

			Promise.all([loadChannel(channelId), loadVideos(channelId)]);
		}

		// remove those channels from the queue
		setChannelIds((cur) => {
			cur.splice(0, newChannels);
			return cur;
		});
	};

	useEffect(() => {
		let mounted = true;

		updateChannels();

		return () => {
			mounted = false;
		};
	}, [channelIds]);

	const onAcceptReject = (channelId: string, accepted: boolean) => {
		setChannels((cur) => cur.filter((channel) => channel.id != channelId));
	};

	return (
		<main className="filter-page">
			<h1 style={{ marginBottom: '0.5rem' }}>channel filter</h1>
			<div>{channelIds.length} queued</div>
			<br />

			<ChannelQueue channels={channels} onAcceptReject={onAcceptReject} />
		</main>
	);
};

export default Filter;
