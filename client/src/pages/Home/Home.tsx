import React, { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@mui/material';

import './Home.scss';

const Home = (): ReactElement => {
	return (
		<main className="home-page">
			<h1>bhop archive</h1>

			<div className="links">
				<Link to="/browse">
					<Button variant="outlined">browse</Button>
				</Link>

				<Link to="/filter">
					<Button variant="outlined">filter</Button>
				</Link>

				<Link to="/connections">
					<Button variant="outlined">connections</Button>
				</Link>
			</div>
		</main>
	);
};

export default Home;
