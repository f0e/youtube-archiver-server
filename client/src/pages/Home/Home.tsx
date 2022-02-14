import React, { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@mui/material';

import './Home.scss';

const Home = (): ReactElement => {
	return (
		<main className="home-page">
			<h1>bhop archive</h1>

			<Link to="/filter">
				<Button variant="outlined">filter</Button>
			</Link>
		</main>
	);
};

export default Home;
