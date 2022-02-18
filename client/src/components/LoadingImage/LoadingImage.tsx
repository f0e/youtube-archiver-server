import React, { ReactElement, useRef } from 'react';

import './LoadingImage.scss';

interface LoadingImageProps {
	className?: string;
	src: string;
	alt: string;
}

const LoadingImage = ({
	className,
	src,
	alt,
}: LoadingImageProps): ReactElement => {
	const ref = useRef<HTMLImageElement | null>(null);

	const onLoad = () => {
		if (!ref.current) return;

		ref.current.classList.add('image-loaded');
	};

	return (
		<img
			className={className + ' loading-image'}
			ref={ref}
			onLoad={onLoad}
			src={src}
			alt={alt}
		/>
	);
};

export default LoadingImage;
