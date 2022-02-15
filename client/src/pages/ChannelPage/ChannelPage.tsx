import React, { ReactElement, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChannelCard } from '../../components/ChannelCard/ChannelCard';
import Loader from '../../components/Loader/Loader';
import ApiContext from '../../context/ApiContext';
import Channel from '../../types/channel';

import './ChannelPage.scss';

const ChannelPage = (): ReactElement => {
	const [loading, setLoading] = useState(true);
	const [channel, setChannel] = useState<Channel>();

	const { channelId } = useParams();

	const Api = useContext(ApiContext);

	const loadChannel = async () => {
		if (!loading) setLoading(true);

		const channel = await Api.get('/get-channel', {
			channelId,
		});

		setChannel(channel);
		setLoading(false);
	};

	useEffect(() => {
		loadChannel();
	}, []);

	return (
		<main className="channel-page">
			{loading ? (
				<Loader message="loading" />
			) : !channel ? (
				<div>failed to load channel</div>
			) : (
				<ChannelCard parsed={true} channel={channel} />
			)}
		</main>
	);
};

export default ChannelPage;
