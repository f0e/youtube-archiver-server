import React, { ReactElement, useContext, useEffect, useState } from 'react';
import ApiContext from '../../context/ApiContext';
import './Connections.scss';

const Connections = (): ReactElement => {
	const [graphData, setGraphData] = useState<any>();

	const Api = useContext(ApiContext);

	useEffect(() => {
		Api.get('get-connections').then((data) => {
			const getChannelIndex = (channelId: string) =>
				Object.keys(data.channelNames).findIndex((id) => channelId == id);

			const nodes: any = Object.values(data.channelNames).map(
				(channelName, i) => ({
					id: i,
					label: channelName,
				})
			);

			let edges: any[] = [];
			for (const [channelId, commenters] of Object.entries(data.relations)) {
				edges = edges.concat(
					(commenters as any[]).map((commenterId: string) => ({
						from: getChannelIndex(channelId),
						to: getChannelIndex(commenterId),
					}))
				);
			}

			setGraphData({
				nodes,
				edges,
			});
		});
	}, []);

	return (
		<main className="filter-page">
			<h1 style={{ marginBottom: '0.5rem' }}>connections</h1>
		</main>
	);
};

export default Connections;
