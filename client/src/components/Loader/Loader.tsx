import React, { ReactElement } from 'react';
import { Loader as MantineLoader } from '@mantine/core';

import './Loader.scss';

interface LoaderProps {
	message?: string;
}

const Loader = ({ message }: LoaderProps): ReactElement => {
	return (
		<div className="loader">
			<MantineLoader />
			{message && <span>{message}</span>}
		</div>
	);
};

export default Loader;
