import { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@mantine/core';
import DarkModeToggler from '../DarkModeToggler/DarkModeToggler';

import './Navbar.scss';

const Navbar = (): ReactElement => {
	return (
		<div className="navbar">
			<Link to="/">
				<div className="navbar-title">bhop archive</div>
			</Link>

			<div style={{ flexGrow: 1 }}></div>

			<DarkModeToggler />
		</div>
	);
};

export default Navbar;
