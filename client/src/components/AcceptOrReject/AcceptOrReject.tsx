import React, { ReactElement, useState, useContext } from 'react';
import ApiContext from '../../context/ApiContext';
import LoadingButton from '../LoadingButton/LoadingButton';

import './AcceptOrReject.scss';

interface AcceptOrRejectProps {
	channelId: string;
	onAcceptReject?: () => void;
}

type AcceptChannelDestination = 'accept' | 'reject' | 'acceptNoDownload';

const AcceptOrReject = ({
	channelId,
	onAcceptReject,
}: AcceptOrRejectProps): ReactElement => {
	const [moving, setMoving] = useState<null | AcceptChannelDestination>(null);

	const Api = useContext(ApiContext);

	const acceptOrReject = async (destination: AcceptChannelDestination) => {
		setMoving(destination);

		try {
			await Api.post('move-channel', {
				channelId,
				destination,
			});

			onAcceptReject && onAcceptReject();
		} catch (e) {
			setMoving(null);
		}
	};

	return (
		<div className="accept-or-reject">
			<LoadingButton
				onClick={(e: any) => acceptOrReject('accept')}
				label="accept"
				loading={moving == 'accept'}
			/>
			<LoadingButton
				onClick={(e: any) => acceptOrReject('acceptNoDownload')}
				variant="outline"
				label="accept (no downloads)"
				loading={moving == 'acceptNoDownload'}
			/>
			<LoadingButton
				onClick={(e: any) => acceptOrReject('reject')}
				color="red"
				label="reject"
				loading={moving == 'reject'}
			/>
		</div>
	);
};

export default AcceptOrReject;
