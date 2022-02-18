import React, {
	ReactElement,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import CountUp from 'react-countup';
import AcceptOrReject from '../../components/AcceptOrReject/AcceptOrReject';
import { ChannelCard } from '../../components/ChannelCard/ChannelCard';
import ApiContext from '../../context/ApiContext';
import Channel from '../../types/channel';

import './Filter.scss';

const QueueCount = (): ReactElement => {
	const [queueCount, setQueueCount] = useState({ from: 0, to: 0 });

	const ws = useRef<WebSocket | null>(null);

	useEffect(() => {
		ws.current = new WebSocket('ws://localhost:3001/ws/queue-count');
		ws.current.onmessage = async (e: MessageEvent) => {
			const count = JSON.parse(e.data);

			setQueueCount((cur) => ({
				from: cur.to,
				to: count,
			}));
		};

		const wsCurrent = ws.current;
		return () => {
			wsCurrent.close();
		};
	}, []);

	return (
		<div>
			<CountUp start={queueCount.from} end={queueCount.to} duration={0.25} />{' '}
			queued
		</div>
	);
};

const Filter = (): ReactElement => {
	const [channels, setChannels] = useState<any[]>([]);

	const Api = useContext(ApiContext);

	const getNewChannel = async () => {
		const channel = await Api.get('/get-queued-channel');
		setChannels([channel]);
	};

	useEffect(() => {
		getNewChannel();
	}, []);

	const onAcceptReject = () => {
		getNewChannel();
	};

	return (
		<main className="filter-page">
			<h1 style={{ marginBottom: '0.5rem' }}>channel filter</h1>
			<QueueCount />
			<br />

			<div className="channels">
				{channels.map((channel) => (
					<ChannelCard
						key={channel.channel.id}
						parsed={false}
						channel={channel.channel}
						channelTools={
							<>
								<div className="count">
									<span>commented on </span>
									<span className="count-number">{channel.commented}</span>
									<span> channels</span>
								</div>

								<AcceptOrReject
									channelId={channel.channel.id}
									onAcceptReject={onAcceptReject}
								/>
							</>
						}
					/>
				))}
			</div>
		</main>
	);
};

export default Filter;
