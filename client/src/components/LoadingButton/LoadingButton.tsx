import React, { ReactElement } from 'react';
import {
	Button,
	ButtonVariant,
	Loader as MantineLoader,
	MantineColor,
} from '@mantine/core';

import './LoadingButton.scss';

interface LoadingButtonProps {
	onClick?: (e: any) => void;
	label: string;
	variant?: ButtonVariant;
	color?: MantineColor;
	style?: Record<string, unknown>;
	loading?: boolean;
	className?: string;
}

const LoadingButton = ({
	onClick,
	label,
	variant,
	color,
	style,
	loading,
	className,
}: LoadingButtonProps): ReactElement => {
	return (
		<div className={`loading-button ${loading ? 'loading' : ''} ${className}`}>
			<Button
				type="submit"
				onClick={onClick}
				disabled={loading}
				variant={variant}
				color={color}
				style={{ ...style, height: 35 }}
			>
				<span className="spinner">
					<MantineLoader
						className="loader"
						style={{ color: 'white' }}
						size={24}
					/>
				</span>
				<span className="label">{label}</span>
			</Button>
		</div>
	);
};

export default LoadingButton;
