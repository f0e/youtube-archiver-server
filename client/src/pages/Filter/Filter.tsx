import React, {
	ReactElement,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react';
import CountUp from 'react-countup';
import { ChannelCard } from '../../components/ChannelCard/ChannelCard';
import ApiContext from '../../context/ApiContext';
import Channel from '../../types/channel';

import './Filter.scss';

const QueueCount = (): ReactElement => {
	const [queueCount, setQueueCount] = useState({ from: 0, to: 0 });

	const ws = useRef<WebSocket | null>(null);

	useEffect(() => {
		ws.current = new WebSocket('ws://localhost:3001/ws/queueCount');

		// ws.current.onopen = () => console.log('opened websocket');
		// ws.current.onclose = () => console.log('closed websocket');

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

	const onAcceptReject = (channelId: string, accepted: boolean) => {
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
						commentedCount={channel.commented}
						onAcceptReject={onAcceptReject}
					/>
				))}
			</div>
		</main>
	);
};

export default Filter;
