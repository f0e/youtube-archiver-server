import React, { ReactElement, useContext, useState } from 'react';
import { Card, Image, Text, Badge, Button, Group } from '@mantine/core';
import LoadingButton from '../LoadingButton/LoadingButton';
import ApiContext from '../../context/ApiContext';
import Channel from '../../types/channel';
import { VideoCard } from '../VideoCard/VideoCard';
import ConditionalLink from '../ConditionalLink/ConditionalLink';
import LoadingImage from '../LoadingImage/LoadingImage';

import './ChannelCard.scss';

interface ChannelCardProps {
	channel: Channel;
	parsed: boolean;
	channelTools?: ReactElement;
}

export const ChannelCard = ({
	channel,
	parsed,
	channelTools,
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
					<div className="channel-name-and-subs">
						{channelLink(
							<div className="channel-name">{channel.data.author}</div>
						)}

						<div className="channel-subscriptions">
							{channel.data.subscriberCount == 0
								? '0 or hidden subscribers'
								: channel.data.subscriberText}
						</div>
					</div>

					<div className="channel-tools">{channelTools}</div>
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
