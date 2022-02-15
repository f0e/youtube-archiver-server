import React, { ReactElement } from 'react';
import ConditionalLink from '../ConditionalLink/ConditionalLink';

import './VideoCard.scss';

interface VideoCardProps {
	basicVideo: any;
}

export const VideoCard = ({ basicVideo }: VideoCardProps): ReactElement => {
	return (
		<a key={basicVideo.videoId} href={`https://youtu.be/${basicVideo.videoId}`}>
			<div className="video-card">
				<div className="video-thumbnail">
					<img
						src={basicVideo.videoThumbnails.at(-1).url}
						alt={`thumbnail for video '${basicVideo.title}' by ${basicVideo.author}`}
					/>

					<div className="video-duration">{basicVideo.durationText}</div>
				</div>

				<div className="video-details">
					<div className="video-title">{basicVideo.title}</div>
					<div className="views-and-date">
						{basicVideo.viewCountText} • {basicVideo.publishedText}
					</div>
				</div>
			</div>
		</a>
	);
};

interface DownloadedVideoCardProps {
	basicVideo: any;
	downloaded: boolean;
}

export const DownloadedVideoCard = ({
	basicVideo,
	downloaded,
}: DownloadedVideoCardProps): ReactElement => {
	return (
		<ConditionalLink
			key={basicVideo.videoId}
			to={`/watch?v=${basicVideo.videoId}`}
			condition={downloaded}
		>
			<div className={`video-card${!downloaded ? ' unparsed' : ''}`}>
				<div className="video-thumbnail">
					<img
						src={basicVideo.videoThumbnails.at(-1).url}
						alt={`thumbnail for video '${basicVideo.title}' by ${basicVideo.author}`}
					/>

					<div className="video-duration">{basicVideo.durationText}</div>
				</div>

				<div className="video-details">
					<div className="video-title">{basicVideo.title}</div>
					<div className="views-and-date">
						{basicVideo.viewCountText} • {basicVideo.publishedText}
					</div>
				</div>
			</div>
		</ConditionalLink>
	);
};
