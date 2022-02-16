import { Button } from '@mantine/core';
import React, {
	ReactElement,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ConditionalLink from '../../components/ConditionalLink/ConditionalLink';
import Loader from '../../components/Loader/Loader';
import ApiContext, { ApiState } from '../../context/ApiContext';
import Channel from '../../types/channel';
import Video from '../../types/video';

import './Watch.scss';

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

	return (
		<div key={comment.data.id} className="comment">
			<div className="comment-main">
				<div className="comment-top">
					{channelLink(
						<img
							className={
								'channel-avatar' + (!comment.parsed ? ' unparsed' : '')
							}
							src={comment.data.author_thumbnail}
							alt={`${comment.data.author}'s avatar`}
						/>
					)}

					<div className="comment-name-and-text">
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
	const [parsedCommenters, setParsedCommenters] = useState(new ApiState());

	const Api = useContext(ApiContext);

	useEffect(() => {
		Api.getState(setParsedCommenters, 'check-channels-parsed', {
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

	const showVideo = () => {
		if (!videoRef.current) return;
		videoRef.current.classList.remove('loading-video');
	};

	return (
		<div className="video">
			<video
				className="video-player loading-video"
				style={{ aspectRatio: `${video.data.width} / ${video.data.height}` }}
				controls
				onLoadedData={showVideo}
				ref={videoRef}
				// autoPlay
			>
				<source src={`get-video-stream?videoId=${video.id}`} type="video/mp4" />
			</video>

			<div className="video-info">
				<div>
					<h1 style={{ marginBottom: '0.5rem' }}>{video.data.title}</h1>

					<div className="views-and-date">
						{basicVideo.viewCountText} • {`${basicVideo.publishedText}`}
					</div>
				</div>

				<div className="likes">
					<span className="like-number">
						{video.data.like_count ? video.data.like_count : 0}
					</span>
					<span> likes</span>
				</div>
			</div>

			<div className="spacer" />

			<Link to={`/channel/${video.data.channel_id}`}>
				<div className="video-channel">
					<img
						className="channel-avatar"
						src={channel.data.authorThumbnails.at(-1).url}
						alt={`${channel.data.author}'s avatar`}
					/>

					<div className="channel-name-and-subs">
						<div className="channel-name">{video.data.channel}</div>
						<div className="channel-subs">{channel.data.subscriberText}</div>
					</div>
				</div>
			</Link>

			{video.data.description && (
				<div className="video-description">{video.data.description}</div>
			)}

			<div className="spacer" />

			<h2>
				comments
				<span className="comment-count"> - {video.data.comments.length}</span>
			</h2>

			<VideoComments comments={video.data.comments} />
		</div>
	);
};

const Watch = (): ReactElement => {
	const [videoInfo, setVideoInfo] = useState<any>({
		video: null,
		channel: null,
		loading: true,
		error: false,
	});

	const navigate = useNavigate();

	const [searchParams, setSearchParams] = useSearchParams();
	const videoId = searchParams.get('v');

	const Api = useContext(ApiContext);

	useEffect(() => {
		Api.getState(setVideoInfo, 'get-video-info', {
			videoId,
		});
	}, []);

	return (
		<main className="watch-page">
			{videoInfo.loading ? (
				<Loader message="loading" />
			) : !videoInfo ? (
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
