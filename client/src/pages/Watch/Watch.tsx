import React, {
	ReactElement,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@mantine/core';
import { useDocumentTitle } from '@mantine/hooks';
import { BarChartIcon } from '@radix-ui/react-icons';
import ConditionalLink from '../../components/ConditionalLink/ConditionalLink';
import Loader from '../../components/Loader/Loader';
import LoadingImage from '../../components/LoadingImage/LoadingImage';
import ApiContext, { ApiState } from '../../context/ApiContext';
import Channel from '../../types/channel';
import Video from '../../types/video';

import './Watch.scss';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

interface CommentProps {
	comment: any;
	replies?: any[];
}

const Comment = ({ comment, replies }: CommentProps): ReactElement => {
	const channelLink = (children: any) => (
		<ConditionalLink
			to={`/channel/${comment.data.author_id}`}
			condition={comment.parsed}
		>
			{children}
		</ConditionalLink>
	);

	const commentTimeAgo = dayjs.unix(comment.data.timestamp).fromNow();

	return (
		<div key={comment.data.id} className="comment">
			<div className="comment-main">
				<div className="comment-top">
					{channelLink(
						<LoadingImage
							className={
								'channel-avatar' + (!comment.parsed ? ' unparsed' : '')
							}
							src={comment.data.author_thumbnail}
							alt={`${comment.data.author}'s avatar`}
						/>
					)}

					<div>
						<div className="channel-name-and-date">
							{channelLink(
								<div
									className={
										'channel-name' +
										(comment.data.author_is_uploader ? ' uploader' : '') +
										(!comment.parsed ? ' unparsed' : '')
									}
								>
									{comment.data.author}
								</div>
							)}

							<div className="comment-date">{commentTimeAgo}</div>
						</div>

						<div className="comment-text">{comment.data.text}</div>
					</div>
				</div>

				{(comment.data.like_count > 0 || comment.data.is_favorited) && (
					<div className="comment-bottom">
						{comment.data.like_count > 0 && (
							<div className="comment-likes">
								<span className="comment-like-number">
									{comment.data.like_count}
								</span>
								<span> likes</span>
							</div>
						)}

						{comment.data.is_favorited && (
							<div className="favourited">favourited</div>
						)}
					</div>
				)}
			</div>

			{replies && replies.length > 0 && (
				<div className="comment-replies">
					{replies.map((reply) => (
						<Comment key={reply.data.id} comment={reply} />
					))}
				</div>
			)}
		</div>
	);
};

interface VideoCommentsProps {
	comments: any[];
}

const VideoComments = ({ comments }: VideoCommentsProps): ReactElement => {
	const [parsedCommenters, setParsedCommenters] = useState(
		new ApiState(comments.length != 0)
	);

	const Api = useContext(ApiContext);

	useEffect(() => {
		if (comments.length == 0) return;

		Api.getState(setParsedCommenters, '/api/check-channels-parsed', {
			channelIds: comments.map((comment) => comment.author_id),
		});
	}, [comments]);

	const fixComments = (comments: any) => {
		// store which channels are parsed
		comments = comments.map((comment: any) => ({
			data: comment,
			parsed: parsedCommenters.data && parsedCommenters.data[comment.author_id],
		}));

		// fix replies
		const fixedComments = [];

		// add root comments
		for (const comment of comments) {
			if (comment.data.parent == 'root') {
				fixedComments.push({
					comment,
					replies: [],
				});
			}
		}

		// add replies
		for (const comment of comments) {
			if (comment.data.parent != 'root') {
				const parentComment: any = fixedComments.find(
					(parentComment) =>
						parentComment.comment.data.id == comment.data.parent
				);

				if (parentComment) {
					parentComment.replies.push(comment);
				}
			}
		}

		return fixedComments;
	};

	return (
		<div className="comments">
			{parsedCommenters.loading ? (
				<Loader message="loading comments" />
			) : parsedCommenters.error ? (
				<h2>failed to load comments</h2>
			) : (
				fixComments(comments).map((comment: any) => (
					<Comment
						key={comment.comment.data.id}
						comment={comment.comment}
						replies={comment.replies}
					/>
				))
			)}
		</div>
	);
};

interface VideoPlayerProps {
	video: Video;
	channel: Channel;
}

const VideoPlayer = ({ video, channel }: VideoPlayerProps): ReactElement => {
	const basicVideo = channel.videos.find(
		(basicVideo: any) => basicVideo.videoId == video.id
	);

	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		loadVolume();
	}, [videoRef]);

	const loadVolume = () => {
		if (!videoRef.current) return;

		const volume = localStorage.getItem('volume');
		if (!volume) return;

		videoRef.current.volume = parseFloat(volume);
	};

	const storeVolume = () => {
		if (!videoRef.current) return;
		localStorage.setItem('volume', videoRef.current.volume.toString());
	};

	const showVideo = () => {
		if (!videoRef.current) return;
		videoRef.current.classList.remove('loading-video');
	};

	const uploadDate = dayjs(video.data.upload_date, 'YYYY-MM-DD')
		.toDate()
		.toLocaleDateString('en-US', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});

	return (
		<div className="video">
			<video
				className="video-player loading-video"
				style={{ aspectRatio: `${video.data.width} / ${video.data.height}` }}
				controls
				onLoadedData={showVideo}
				ref={videoRef}
				onVolumeChange={storeVolume}
				// autoPlay
			>
				<source
					src={`/api/get-video-stream?videoId=${video.id}`}
					type="video/mp4"
				/>
			</video>

			<div className="video-info">
				<div>
					<h1 style={{ marginBottom: '0.5rem' }}>{video.data.title}</h1>

					<div className="views-and-date">
						{basicVideo.viewCountText} • {`${uploadDate}`}
					</div>
				</div>

				<div className="likes">
					{!video.data.like_count ? (
						<div>likes hidden</div>
					) : (
						<>
							<span className="like-number">{video.data.like_count}</span>
							<span> likes</span>
						</>
					)}
				</div>
			</div>

			<div className="spacer" />

			<Link to={`/channel/${video.data.channel_id}`}>
				<div className="video-channel">
					<LoadingImage
						className="channel-avatar"
						src={channel.data.authorThumbnails.at(-1).url}
						alt={`${channel.data.author}'s avatar`}
					/>

					<div className="channel-name-and-subs">
						<div className="channel-name">{video.data.channel}</div>
						<div className="channel-subs">
							{channel.data.subscriberCount == 0
								? '0 or hidden subscribers'
								: channel.data.subscriberText}
						</div>
					</div>
				</div>
			</Link>

			{video.data.description && (
				<div className="video-description">{video.data.description}</div>
			)}

			<div className="video-metadata">
				<div className="video-category">{video.data.categories.join(', ')}</div>

				{video.data.track && (
					<a
						className="video-song"
						href={`https://www.youtube.com/results?search_query=${video.data.artist} - ${video.data.song}`}
					>
						<BarChartIcon className="song-icon" />

						<div className="song-title">
							{video.data.artist} - {video.data.track}
						</div>
					</a>
				)}
			</div>

			<div className="spacer" />

			{video.data.comments.length == 0 ? (
				<h2>no comments / disabled</h2>
			) : (
				<>
					<h2>
						comments
						<span className="comment-count">
							{' '}
							- {video.data.comments.length}
						</span>
					</h2>

					<VideoComments comments={video.data.comments} />
				</>
			)}
		</div>
	);
};

const Watch = (): ReactElement => {
	const [videoInfo, setVideoInfo] = useState<any>(new ApiState());

	const navigate = useNavigate();

	const [searchParams, setSearchParams] = useSearchParams();
	const videoId = searchParams.get('v');

	const Api = useContext(ApiContext);

	useDocumentTitle(
		!videoInfo.data
			? 'bhop archive'
			: `bhop archive | ${videoInfo.data.channel.data.author} - ${videoInfo.data.video.data.title}`
	);

	useEffect(() => {
		Api.getState(setVideoInfo, '/api/get-video-info', {
			videoId,
		});
	}, []);

	return (
		<main className="watch-page">
			{videoInfo.loading ? (
				<Loader message="loading" />
			) : !videoInfo.data ? (
				<>
					<h1>failed to load video</h1>
					<Button onClick={() => navigate(-1)}>back</Button>
				</>
			) : (
				<VideoPlayer
					video={videoInfo.data.video}
					channel={videoInfo.data.channel}
				/>
			)}
		</main>
	);
};

export default Watch;
