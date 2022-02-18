import React, { ReactElement, useContext, useState } from 'react';
import { Card, Image, Text, Badge, Button, Group } from '@mantine/core';
import LoadingButton from '../LoadingButton/LoadingButton';
import ApiContext from '../../context/ApiContext';
import Channel from '../../types/channel';
import { VideoCard } from '../VideoCard/VideoCard';
import ConditionalLink from '../ConditionalLink/ConditionalLink';
import LoadingImage from '../LoadingImage/LoadingImage';

import './ChannelCard.scss';

interface AcceptOrRejectProps {
	channelId: string;
	onAcceptReject?: () => void;
}

type ChannelDestination = 'accept' | 'reject' | 'acceptNoDownload';

const AcceptOrReject = ({
	channelId,
	onAcceptReject,
}: AcceptOrRejectProps): ReactElement => {
	const [moving, setMoving] = useState<null | ChannelDestination>(null);

	const Api = useContext(ApiContext);

	const acceptOrReject = async (destination: ChannelDestination) => {
		setMoving(destination);

		try {
			await Api.post('move-channel', {
				channelId,
				destination,
			});

			onAcceptReject && onAcceptReject();
		} catch (e) {
			setMoving(null);
		}
	};

	return (
		<div className="accept-buttons">
			<LoadingButton
				onClick={(e: any) => acceptOrReject('accept')}
				label="accept"
				loading={moving == 'accept'}
			/>
			<LoadingButton
				onClick={(e: any) => acceptOrReject('acceptNoDownload')}
				variant="outline"
				label="accept (no downloads)"
				loading={moving == 'acceptNoDownload'}
			/>
			<LoadingButton
				onClick={(e: any) => acceptOrReject('reject')}
				color="red"
				label="reject"
				loading={moving == 'reject'}
			/>
		</div>
	);
};

interface ChannelCardProps {
	channel: Channel;
	parsed: boolean;
	onAcceptReject?: () => void;
	commentedCount?: number;
}

export const ChannelCard = ({
	channel,
	parsed,
	onAcceptReject,
	commentedCount,
}: ChannelCardProps): ReactElement => {
	const channelLink = (children: any) =>
		parsed ? (
			<ConditionalLink to={`/channel/${channel.id}`} condition={parsed}>
				{children}
			</ConditionalLink>
		) : (
			<a href={`https://youtube.com/channel/${channel.id}`}>{children}</a>
		);

	return (
		<Card className="channel-card">
			<div className="channel-header">
				{channelLink(
					<LoadingImage
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

						<div className="filter-tools">
							{commentedCount && (
								<div className="count">
									<span>commented on </span>
									<span className="count-number">{commentedCount}</span>
									<span> channels</span>
								</div>
							)}

							{onAcceptReject && (
								<AcceptOrReject
									channelId={channel.id}
									onAcceptReject={onAcceptReject}
								/>
							)}
						</div>
					</div>
				</div>
			</div>

			{channel.data.description && (
				<div className="channel-description">{channel.data.description}</div>
			)}

			{channel.data.tags && (
				<div className="channel-tags">
					{channel.data.tags.map((tag: string, i: number) => (
						<div key={`tag-${i}`} className="channel-tag">
							{tag}
						</div>
					))}
				</div>
			)}

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
