import React, {
	ReactElement,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import { Card, CardContent } from '@mui/material';
import LoadingButton from '../../components/LoadingButton/LoadingButton';
import ApiContext from '../../context/ApiContext';
import Channel from '../../types/channel';
import useOnScreen from '../../hooks/useOnScreen';
import { DownloadedVideoCard, VideoCard } from '../VideoCard/VideoCard';

import './Channel.scss';

interface ChannelCardProps {
	channel: Channel;
	parsed: boolean;
	onAcceptReject?: (channelId: string, accepted: boolean) => void;
}

export const ChannelCard = ({
	channel,
	parsed,
	onAcceptReject,
}: ChannelCardProps): ReactElement => {
	const [accepting, setAccepting] = useState(false);
	const [rejecting, setRejecting] = useState(false);

	const [loadedDownloaded, setLoadedDownloaded] = useState(false);
	const [downloaded, setDownloaded] = useState<{ [key: string]: boolean }>({});

	const Api = useContext(ApiContext);

	const ref = useRef<any>();

	const onScreen = useOnScreen(ref);

	const getDownloaded = async () => {
		const downloaded = await Api.get('/check-downloaded', {
			videoIds: channel.videos.map((video: any) => video.videoId),
		});

		setDownloaded(downloaded);
	};

	useEffect(() => {
		if (parsed) {
			if (onScreen && !loadedDownloaded) {
				setLoadedDownloaded(true);
				getDownloaded();
			}
		}
	}, [onScreen]);

	const acceptOrReject = async (accept: boolean) => {
		if (accept) setAccepting(true);
		else setRejecting(true);

		const url = accept ? '/accept-channel' : '/filter-channel';
		await Api.post(url, {
			channelId: channel.id,
		});

		if (accept) setAccepting(false);
		else setRejecting(false);

		onAcceptReject && onAcceptReject(channel.id, accept);
	};

	return (
		<div ref={ref}>
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

								{onAcceptReject && (
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
								)}
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
							{channel.videos.map((video: any) =>
								parsed ? (
									<DownloadedVideoCard
										key={video.videoId}
										basicVideo={video}
										downloaded={downloaded[video.videoId]}
									/>
								) : (
									<VideoCard key={video.videoId} basicVideo={video} />
								)
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
};
