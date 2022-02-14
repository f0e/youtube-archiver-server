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
	data: any;
	videos: any;
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
				<div className="channel-header">
					<a href={channel.data.authorUrl}>
						<img
							className="channel-avatar"
							src={channel.data.authorThumbnails.at(-1).url}
							alt={`${channel.data.author}'s avatar`}
						/>
					</a>

					<div className="channel-info">
						<div className="top-info">
							<div>
								<a href={channel.data.authorUrl}>
									<div className="channel-name">{channel.data.author}</div>
								</a>
								<div className="channel-subscriptions">
									{channel.data.subscriberText}
								</div>
							</div>

							<div className="accept-or-reject">
								<LoadingButton
									onClick={(e: any) => acceptOrReject(true)}
									variant="contained"
									color="primary"
									label="accept"
									loading={accepting}
								/>
								<LoadingButton
									onClick={(e: any) => acceptOrReject(false)}
									variant="contained"
									color="secondary"
									label="reject"
									loading={rejecting}
								/>
							</div>
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

				<p>{channel.data.description}</p>

				{channel.videos.length == 0 ? (
					<div className="no-videos">no videos</div>
				) : (
					<div className="channel-videos">
						{channel.videos.map((video: any) => (
							<a key={video.videoId} href={`https://youtu.be/${video.videoId}`}>
								<div className="video">
									<div className="video-thumbnail">
										<img
											src={video.videoThumbnails.at(-1).url}
											alt={`thumbnail for video '${video.title}' by ${channel.data.author}`}
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
		<div className="channels">
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
	const [channels, setChannels] = useState<Channel[]>([]);
	const [lastId, setLastId] = useState<string | null>(null);
	const [queueCount, setQueueCount] = useState(0);

	const ws = useRef<WebSocket | null>(null);

	useEffect(() => {
		ws.current = new WebSocket('ws://localhost:3001/ws/channelQueue');

		ws.current.onopen = () => console.log('connected');
		ws.current.onclose = () => console.log('disconnected');

		ws.current.onmessage = async (e: MessageEvent) => {
			const message: any = JSON.parse(e.data);
			console.log(message);
			switch (message.type) {
				case 'channels': {
					setChannels((cur) => cur.concat(message.data));

					const lastChannel = message.data.at(-1);
					if (lastChannel) setLastId(lastChannel.id);

					break;
				}
				case 'count': {
					setQueueCount(message.data);
					break;
				}
			}
		};

		const wsCurrent = ws.current;
		return () => {
			wsCurrent.close();
		};
	}, []);

	const requestNewChannel = () => {
		if (!ws.current) return;

		ws.current.send(
			JSON.stringify({
				type: 'getNewChannel',
				lastId,
			})
		);
	};

	const onAcceptReject = (channelId: string, accepted: boolean) => {
		setChannels((cur) => cur.filter((channel) => channel.id != channelId));

		requestNewChannel();
	};

	return (
		<main className="filter-page">
			<h1 style={{ marginBottom: '0.5rem' }}>channel filter</h1>
			<div>{queueCount} queued</div>
			<br />

			<ChannelQueue channels={channels} onAcceptReject={onAcceptReject} />
		</main>
	);
};

export default Filter;
