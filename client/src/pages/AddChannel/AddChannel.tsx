import React, { ReactElement, useContext, useState } from 'react';
import { TextInput } from '@mantine/core';
import { useForm } from '@mantine/hooks';
import ApiContext, { ApiState } from '../../context/ApiContext';

import './AddChannel.scss';
import Loader from '../../components/Loader/Loader';
import { ChannelCard } from '../../components/ChannelCard/ChannelCard';
import LoadingButton from '../../components/LoadingButton/LoadingButton';
import AcceptOrReject from '../../components/AcceptOrReject/AcceptOrReject';

interface SearchChannelBarProps {
	onSubmit: () => void;
	setChannel: React.Dispatch<React.SetStateAction<any>>;
}

const SearchChannelBar = ({
	onSubmit,
	setChannel,
}: SearchChannelBarProps): ReactElement => {
	const Api = useContext(ApiContext);

	const form = useForm({
		initialValues: {
			channelUrl: '',
		},
	});

	const searchChannel = async (values: typeof form['values']) => {
		onSubmit();

		await Api.getState(setChannel, '/get-channel-info', {
			channel: values.channelUrl,
		});
	};
	return (
		<form onSubmit={form.onSubmit(searchChannel)}>
			<TextInput
				placeholder="channel url"
				{...form.getInputProps('channelUrl')}
			/>
		</form>
	);
};

interface SearchChannelResultProps {
	channel: any;
	onAdd: () => void;
}

const SearchChannelResult = ({
	channel,
	onAdd,
}: SearchChannelResultProps): ReactElement => {
	const [destination, setDestination] = useState<null | AddChannelDestination>(
		null
	);

	const Api = useContext(ApiContext);

	const onAcceptReject = async () => {
		onAdd();
	};

	const addChannel = async (destination: AddChannelDestination) => {
		setDestination(destination);

		try {
			await Api.post('/add-channel', {
				channelId: channel.channel.id,
				destination,
			});

			onAdd();
			setDestination(null);
		} catch (e) {
			setDestination(null);
		}
	};

	const getChannelTools = () => {
		switch (channel.exists) {
			case 'queued': {
				return (
					<AcceptOrReject
						channelId={channel.channel.id}
						onAcceptReject={onAcceptReject}
					/>
				);
			}
			case undefined: {
				return (
					<div className="add-channel">
						<LoadingButton
							onClick={(e: any) => addChannel('accept')}
							label="add"
							loading={destination == 'accept'}
						/>
						<LoadingButton
							onClick={(e: any) => addChannel('acceptNoDownload')}
							variant="outline"
							label="add (no downloads)"
							loading={destination == 'acceptNoDownload'}
						/>
					</div>
				);
			}
		}

		return <></>;
	};

	return (
		<>
			{channel.exists && <h2>channel already {channel.exists}</h2>}

			<ChannelCard
				channel={channel.channel}
				parsed={channel.exists == 'added'}
				channelTools={getChannelTools()}
			/>
		</>
	);
};

type AddChannelDestination = 'accept' | 'acceptNoDownload';

const AddChannel = (): ReactElement => {
	const [channel, setChannel] = useState(new ApiState(false));
	const [submitted, setSubmitted] = useState(false);
	const [added, setAdded] = useState(false);

	const onSubmit = () => {
		setAdded(false);
		setSubmitted(true);
	};

	return (
		<main className="add-channel-page">
			<h1 style={{ marginBottom: '0.5rem' }}>add channel</h1>
			<br />

			<SearchChannelBar onSubmit={onSubmit} setChannel={setChannel} />
			<br />

			{submitted && (
				<>
					{channel.loading ? (
						<Loader message="loading channel" />
					) : channel.error ? (
						<>
							<h2>failed to load channel</h2>
						</>
					) : added ? (
						<h2>channel added</h2>
					) : (
						<SearchChannelResult
							channel={channel.data}
							onAdd={() => setAdded(true)}
						/>
					)}
				</>
			)}
		</main>
	);
};

export default AddChannel;
