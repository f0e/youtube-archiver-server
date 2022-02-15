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
import useOnScreen from '../../hooks/useOnScreen';
import Channel from '../../types/channel';
import Video from '../../types/video';

import './Watch.scss';

interface VideoProps {
	video: Video;
	channel: Channel;
}

interface CommentProps {
	comment: any;
	isReply?: boolean;
	replies?: any[];
}

const Comment = ({ comment, isReply, replies }: CommentProps): ReactElement => {
	const [loadedParsed, setLoadedParsed] = useState(false);
	const [commenterParsed, setCommenterParsed] = useState(false);

	const ref = useRef<any>();
	const onScreen = useOnScreen(ref);

	const Api = useContext(ApiContext);

	const getCommenterParsed = async () => {
		const channel = await Api.get('get-channel', {
			channelId: comment.author_id,
		});

		setCommenterParsed(channel != null);
	};

	useEffect(() => {
		if (onScreen && !commenterParsed) {
			setLoadedParsed(true);
			getCommenterParsed();
		}
	}, [onScreen]);

	const channelLink = (children: any) => (
		<ConditionalLink
			to={`/channel/${comment.author_id}`}
			condition={commenterParsed}
		>
			{children}
		</ConditionalLink>
	);

	return (
		<div key={comment.id} ref={ref} className="comment">
			<div className="comment-main">
				<div className="comment-top">
					{channelLink(
						<img
							className={`channel-avatar${!commenterParsed ? ' unparsed' : ''}`}
							src={comment.author_thumbnail}
							alt={`${comment.author.author}'s avatar`}
						/>
					)}

					<div className="comment-name-and-text">
						{channelLink(
							<div
								className={`channel-name${
									comment.author_is_uploader ? ' uploader' : ''
								}
							${!commenterParsed ? ' unparsed' : ''}`}
							>
								{comment.author}
							</div>
						)}

						<div className="comment-text">{comment.text}</div>
					</div>
				</div>

				{(comment.like_count > 0 || comment.is_favorited) && (
					<div className="comment-bottom">
						{comment.like_count > 0 && (
							<div className="comment-likes">
								<span className="comment-like-number">
									{comment.like_count}
								</span>
								<span> likes</span>
							</div>
						)}

						{comment.is_favorited && (
							<div className="favourited">favourited</div>
						)}
					</div>
				)}
			</div>

			{replies && replies.length > 0 && (
				<div className="comment-replies">
					{replies.map((reply) => (
						<Comment key={reply.id} comment={reply} isReply={true} />
					))}
				</div>
			)}
		</div>
	);
};

const VideoPlayer = ({ video, channel }: VideoProps): ReactElement => {
	const basicVideo = channel.videos.find(
		(basicVideo: any) => basicVideo.videoId == video.id
	);

	const comments: any[] = [];

	// add root comments
	for (const comment of video.data.comments) {
		if (comment.parent == 'root') {
			comments.push({
				data: comment,
				replies: [],
			});
		}
	}

	// add replies
	for (const comment of video.data.comments) {
		if (comment.parent != 'root') {
			const parentComment = comments.find(
				(parentComment) => parentComment.data.id == comment.parent
			);

			parentComment.replies.push(comment);
		}
	}

	return (
		<div className="video">
			<video className="video-player" width="100%" controls>
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
						key={comment.data.id}
						comment={comment.data}
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

		setVideoInfo({ video, channel });
		setLoading(false);
	};

	useEffect(() => {
		loadVideo();
	}, []);

	return (
		<main className="browse-page">
			{loading ? (
				<Loader message="loading" />
			) : !videoInfo ? (
				<div>failed to load video</div>
			) : (
				<VideoPlayer video={videoInfo.video} channel={videoInfo.channel} />
			)}
		</main>
	);
};

export default Watch;
