import React, { ReactElement, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChannelCard } from '../../components/ChannelCard/ChannelCard';
import Loader from '../../components/Loader/Loader';
import ApiContext, { ApiState } from '../../context/ApiContext';
import Channel from '../../types/channel';

import './ChannelPage.scss';

const ChannelPage = (): ReactElement => {
	const [channel, setChannel] = useState(new ApiState());

	const { channelId } = useParams();

	const Api = useContext(ApiContext);

	useEffect(() => {
		Api.getState(setChannel, '/get-channel', {
			channelId,
		});
	}, []);

	return (
		<main className="channel-page">
			{channel.loading ? (
				<Loader message="loading" />
			) : !channel.data || channel.error ? (
				<div>failed to load channel</div>
			) : (
				<ChannelCard parsed={true} channel={channel.data} />
			)}
		</main>
	);
};

export default ChannelPage;
