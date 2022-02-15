import React, { ReactElement, useContext, useEffect, useState } from 'react';
import { ChannelCard } from '../../components/ChannelCard/ChannelCard';
import ApiContext from '../../context/ApiContext';
import Channel from '../../types/channel';

import './Browse.scss';

const Browse = (): ReactElement => {
	const [channels, setChannels] = useState<Channel[]>([]);

	const Api = useContext(ApiContext);

	const loadChannels = async () => {
		const channels = await Api.get('/get-channels');
		setChannels(channels);
	};

	useEffect(() => {
		loadChannels();
	}, []);

	return (
		<main className="browse-page">
			<h1 style={{ marginBottom: '0.5rem' }}>browse</h1>
			<br />

			<div className="channels">
				{channels.map((channel) => (
					<ChannelCard key={channel.id} parsed={true} channel={channel} />
				))}
			</div>
		</main>
	);
};

export default Browse;
