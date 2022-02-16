import React, { ReactElement } from 'react';
import ConditionalLink from '../ConditionalLink/ConditionalLink';

import './VideoCard.scss';

interface VideoCardProps {
	basicVideo: any;
	fadeNotDownloaded: boolean;
	showChannel: boolean;
}

export const VideoCard = ({
	basicVideo,
	fadeNotDownloaded,
	showChannel,
}: VideoCardProps): ReactElement => {
	const videoLink = (children: any) =>
		basicVideo.downloaded ? (
			<ConditionalLink
				to={`/watch?v=${basicVideo.videoId}`}
				condition={basicVideo.downloaded}
			>
				{children}
			</ConditionalLink>
		) : (
			<a href={`https://youtu.be/${basicVideo.videoId}`}>{children}</a>
		);

	return (
		<>
			{videoLink(
				<div
					className={
						'video-card' +
						(!basicVideo.downloaded && fadeNotDownloaded ? ' unparsed' : '')
					}
				>
					<div className="video-thumbnail">
						<img
							src={basicVideo.videoThumbnails.at(-1).url}
							alt={`thumbnail for video '${basicVideo.title}' by ${basicVideo.author}`}
						/>

						<div className="video-duration">{basicVideo.durationText}</div>
					</div>

					<div className="video-details">
						<div className="video-title">{basicVideo.title}</div>
						{showChannel && (
							<div className="video-author"> {basicVideo.author}</div>
						)}
						<div className="views-and-date">
							{basicVideo.viewCountText} • {basicVideo.publishedText}
						</div>
					</div>
				</div>
			)}
		</>
	);
};
