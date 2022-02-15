import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { ChannelCard } from '../../components/ChannelCard/ChannelCard';
import Channel from '../../types/channel';

import './Filter.scss';

const Filter = (): ReactElement => {
	const [channels, setChannels] = useState<Channel[]>([]);
	const [lastId, setLastId] = useState<string | null>(null);
	const [queueCount, setQueueCount] = useState(0);

	const ws = useRef<WebSocket | null>(null);

	useEffect(() => {
		ws.current = new WebSocket('ws://localhost:3001/ws/channelQueue');

		ws.current.onopen = () => console.log('connected');
		ws.current.onclose = () => console.log('disconnected');

		ws.current.onmessage = async (e: MessageEvent) => {
			const message: any = JSON.parse(e.data);

			switch (message.type) {
				case 'channels': {
					setChannels((cur) => cur.concat(message.data));

					const lastChannel = message.data.at(-1);
					if (lastChannel) setLastId(lastChannel.id);

					break;
				}
				case 'count': {
					setQueueCount(message.data);
					break;
				}
			}
		};

		const wsCurrent = ws.current;
		return () => {
			wsCurrent.close();
		};
	}, []);

	const requestNewChannel = () => {
		if (!ws.current) return;

		ws.current.send(
			JSON.stringify({
				type: 'getNewChannel',
				lastId,
			})
		);
	};

	const onAcceptReject = (channelId: string, accepted: boolean) => {
		setChannels((cur) => cur.filter((channel) => channel.id != channelId));

		requestNewChannel();
	};

	return (
		<main className="filter-page">
			<h1 style={{ marginBottom: '0.5rem' }}>channel filter</h1>
			<div>{queueCount} queued</div>
			<br />

			<div className="channels">
				{channels.map((channel) => (
					<ChannelCard
						key={channel.id}
						parsed={false}
						channel={channel}
						onAcceptReject={onAcceptReject}
					/>
				))}
			</div>
		</main>
	);
};

export default Filter;
