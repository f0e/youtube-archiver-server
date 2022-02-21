import React, { ReactElement, useContext, useEffect, useState } from 'react';
import ConditionalLink from '../ConditionalLink/ConditionalLink';
import LoadingImage from '../LoadingImage/LoadingImage';
import ApiContext, { ApiState } from '../../context/ApiContext';
import Loader from '../Loader/Loader';

import './VideoCard.scss';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

interface VideoCardDateProps {
	basicVideo: any;
}

const VideoCardDate = ({ basicVideo }: VideoCardDateProps) => {
	const [date, setDate] = useState<string | null>(null);

	const Api = useContext(ApiContext);

	const loadDate = async () => {
		const newDate = await Api.get('/api/get-video-upload-date', {
			videoId: basicVideo.videoId,
		});

		setDate(newDate);
	};

	useEffect(() => {
		loadDate();
	}, []);

	return (
		<>
			{!date ? (
				<span className="outdated-date">{basicVideo.publishedText}</span>
			) : (
				dayjs(date, 'YYYY-MM-DD').fromNow()
			)}
		</>
	);
};

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
						<LoadingImage
							src={
								basicVideo.downloaded
									? `/api/get-video-thumbnail?videoId=${basicVideo.videoId}`
									: basicVideo.videoThumbnails.at(-1).url
							}
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
							{basicVideo.viewCountText} •{' '}
							<VideoCardDate basicVideo={basicVideo} />
						</div>
					</div>
				</div>
			)}
		</>
	);
};
