import React, { ReactElement, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@mantine/core';
import { useDocumentTitle } from '@mantine/hooks';
import { ChannelCard } from '../../components/ChannelCard/ChannelCard';
import Loader from '../../components/Loader/Loader';
import ApiContext, { ApiState } from '../../context/ApiContext';

import './ChannelPage.scss';

const ChannelPage = (): ReactElement => {
	const [channel, setChannel] = useState(new ApiState());

	const { channelId } = useParams();

	const navigate = useNavigate();

	const Api = useContext(ApiContext);

	useDocumentTitle(
		!channel.data
			? 'bhop archive'
			: `bhop archive | ${channel.data.data.author}`
	);

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
				<>
					<h2>failed to load channel</h2>
					<Button onClick={() => navigate(-1)}>back</Button>
				</>
			) : (
				<ChannelCard parsed={true} channel={channel.data} />
			)}
		</main>
	);
};

export default ChannelPage;
