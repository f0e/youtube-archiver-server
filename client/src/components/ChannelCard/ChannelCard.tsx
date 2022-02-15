import React, { ReactElement, useContext, useState } from 'react';
import { Card, CardContent } from '@mui/material';
import LoadingButton from '../LoadingButton/LoadingButton';
import ApiContext from '../../context/ApiContext';
import Channel from '../../types/channel';
import { VideoCard } from '../VideoCard/VideoCard';
import ConditionalLink from '../ConditionalLink/ConditionalLink';

import './ChannelCard.scss';

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

	const Api = useContext(ApiContext);

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

	const channelLink = (children: any) => (
		<ConditionalLink to={`/channel/${channel.id}`} condition={parsed}>
			{children}
		</ConditionalLink>
	);

	return (
		<Card variant="outlined">
			<CardContent>
				<div className="channel-header">
					{channelLink(
						<img
							className="channel-avatar"
							src={channel.data.authorThumbnails.at(-1).url}
							alt={`${channel.data.author}'s avatar`}
						/>
					)}

					<div className="channel-info">
						<div className="top-info">
							<div>
								{channelLink(
									<div className="channel-name">{channel.data.author}</div>
								)}

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
						{channel.videos.map((video: any) => (
							<VideoCard
								key={video.videoId}
								basicVideo={video}
								fadeNotDownloaded={parsed}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
};
