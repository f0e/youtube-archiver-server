import React, { ReactElement, useContext, useState } from 'react';
import { Card, CardContent } from '@mui/material';
import LoadingButton from '../../components/LoadingButton/LoadingButton';
import ApiContext from '../../context/ApiContext';
import Channel from '../../types/channel';

import './Channel.scss';

interface ChannelProps {
	channel: Channel;
	onAcceptReject?: (channelId: string, accepted: boolean) => void;
}

export const ChannelCard = ({
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

		onAcceptReject && onAcceptReject(channel.id, accept);
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
										<div className="video-title">{video.title}</div>
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
