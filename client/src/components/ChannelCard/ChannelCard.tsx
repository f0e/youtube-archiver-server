import React, { ReactElement, useContext, useState } from 'react';
import { Card, Image, Text, Badge, Button, Group } from '@mantine/core';
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
	const [accepting, setAccepting] = useState<null | 'accepting' | 'rejecting'>(
		null
	);

	const Api = useContext(ApiContext);

	const acceptOrReject = async (accept: boolean) => {
		setAccepting(accept ? 'accepting' : 'rejecting');

		const url = accept ? '/accept-channel' : '/filter-channel';
		await Api.post(url, {
			channelId: channel.id,
		});

		setAccepting(null);

		onAcceptReject && onAcceptReject(channel.id, accept);
	};

	const channelLink = (children: any) => (
		<ConditionalLink to={`/channel/${channel.id}`} condition={parsed}>
			{children}
		</ConditionalLink>
	);

	return (
		<Card className="channel-card">
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
									// variant="contained"
									// color="primary"
									label="accept"
									loading={accepting == 'accepting'}
								/>
								<LoadingButton
									onClick={(e: any) => acceptOrReject(false)}
									// variant="contained"
									// color="secondary"
									label="reject"
									loading={accepting == 'rejecting'}
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
							showChannel={false}
						/>
					))}
				</div>
			)}
		</Card>
	);
};
