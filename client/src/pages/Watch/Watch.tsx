import React, {
	ReactElement,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ConditionalLink from '../../components/ConditionalLink/ConditionalLink';
import Loader from '../../components/Loader/Loader';
import ApiContext from '../../context/ApiContext';
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
							alt={`${comment.data.author.author}'s avatar`}
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

interface VideoPlayerProps {
	video: Video;
	channel: Channel;
	parsedCommenters: { [key: string]: boolean };
}

const VideoPlayer = ({
	video,
	channel,
	parsedCommenters,
}: VideoPlayerProps): ReactElement => {
	const basicVideo = channel.videos.find(
		(basicVideo: any) => basicVideo.videoId == video.id
	);

	const commentsWithParsed = video.data.comments.map((comment: any) => ({
		data: comment,
		parsed: parsedCommenters[comment.author_id],
	}));

	const comments: any[] = [];

	// add root comments
	for (const comment of commentsWithParsed) {
		if (comment.data.parent == 'root') {
			comments.push({
				comment: comment,
				replies: [],
			});
		}
	}

	// add replies
	for (const comment of commentsWithParsed) {
		if (comment.data.parent != 'root') {
			const parentComment = comments.find(
				(parentComment) => parentComment.comment.data.id == comment.data.parent
			);

			parentComment.replies.push(comment);
		}
	}

	const videoRef = useRef<HTMLVideoElement>(null);

	const showVideo = () => {
		console.log('video loaded');

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
				autoPlay
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

			<div className="comments">
				{comments.map((comment) => (
					<Comment
						key={comment.comment.data.id}
						comment={comment.comment}
						replies={comment.replies}
					/>
				))}
			</div>
		</div>
	);
};

const Watch = (): ReactElement => {
	const [loading, setLoading] = useState(true);
	const [videoInfo, setVideoInfo] = useState<any>();

	const [searchParams, setSearchParams] = useSearchParams();
	const videoId = searchParams.get('v');

	const Api = useContext(ApiContext);

	const loadVideo = async () => {
		if (!loading) setLoading(true);

		const { video, channel } = await Api.get('get-video-info', {
			videoId,
		});

		const parsedCommenters = await Api.get('check-channels-parsed', {
			channelIds: video.data.comments.map((comment: any) => comment.author_id),
		});

		setVideoInfo({ video, channel, parsedCommenters });
		setLoading(false);
	};

	useEffect(() => {
		loadVideo();
	}, []);

	return (
		<main className="watch-page">
			{loading ? (
				<Loader message="loading" />
			) : !videoInfo ? (
				<div>failed to load video</div>
			) : (
				<VideoPlayer
					video={videoInfo.video}
					channel={videoInfo.channel}
					parsedCommenters={videoInfo.parsedCommenters}
				/>
			)}
		</main>
	);
};

export default Watch;
