import React, { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import {
	Button,
	AppShell,
	Navbar,
	Header,
	Burger,
	MediaQuery,
} from '@mantine/core';

import './Home.scss';

const Home = (): ReactElement => {
	return (
		<main className="home-page">
			<h1>bhop archive</h1>

			<div className="links">
				<Link to="/browse">
					<Button>browse</Button>
				</Link>

				<Link to="/filter">
					<Button>filter</Button>
				</Link>

				<Link to="/connections">
					<Button>connections</Button>
				</Link>
			</div>
		</main>
	);
};

export default Home;
