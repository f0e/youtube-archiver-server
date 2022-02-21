import React, { ReactElement, useState, useContext } from 'react';
import ApiContext from '../../context/ApiContext';
import LoadingButton from '../LoadingButton/LoadingButton';

import './AcceptOrReject.scss';

interface AcceptOrRejectProps {
	channelId: string;
	onAcceptReject?: () => void;
}

export type ChannelDestination = 'accept' | 'reject' | 'acceptNoDownload';

const AcceptOrReject = ({
	channelId,
	onAcceptReject,
}: AcceptOrRejectProps): ReactElement => {
	const [destination, setDestination] = useState<null | ChannelDestination>(
		null
	);

	const Api = useContext(ApiContext);

	const acceptOrReject = async (newDestination: ChannelDestination) => {
		setDestination(destination);

		try {
			await Api.post('/api/move-channel', {
				channelId,
				destination: newDestination,
			});

			onAcceptReject && onAcceptReject();
		} catch (e) {
			setDestination(null);
		}
	};

	return (
		<div className="accept-or-reject">
			<LoadingButton
				onClick={(e: any) => acceptOrReject('accept')}
				label="accept"
				loading={destination == 'accept'}
			/>
			<LoadingButton
				onClick={(e: any) => acceptOrReject('acceptNoDownload')}
				variant="outline"
				label="accept (no downloads)"
				loading={destination == 'acceptNoDownload'}
			/>
			<LoadingButton
				onClick={(e: any) => acceptOrReject('reject')}
				color="red"
				label="reject"
				loading={destination == 'reject'}
			/>
		</div>
	);
};

export default AcceptOrReject;
