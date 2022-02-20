import React, { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@mantine/core';
import { useDocumentTitle } from '@mantine/hooks';

import './Home.scss';

const Home = (): ReactElement => {
	useDocumentTitle('bhop archive');

	return (
		<main className="home-page">
			<h1>bhop archive</h1>

			<div className="links">
				<Link to="/browse">
					<Button>browse</Button>
				</Link>

				<Link to="/add">
					<Button>add</Button>
				</Link>

				<Link to="/filter">
					<Button>filter</Button>
				</Link>

				<Link to="/connections">
					<Button variant="outline" color="dark">
						connections
					</Button>
				</Link>
			</div>
		</main>
	);
};

export default Home;
