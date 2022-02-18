import React, { ReactElement, useEffect } from 'react';
import {
	BrowserRouter as Router,
	Routes,
	Route,
	useLocation,
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
	NotificationsProvider,
	useNotifications,
} from '@mantine/notifications';
import { ThemeStore } from './context/ThemeContext';
import { ApiStore } from './context/ApiContext';
import Navbar from './components/Navbar/Navbar';
import Home from './pages/Home/Home';
import Filter from './pages/Filter/Filter';
import Connections from './pages/Connections/Connections';
import Browse from './pages/Browse/Browse';
import Watch from './pages/Watch/Watch';
import ChannelPage from './pages/ChannelPage/ChannelPage';
import AddChannel from './pages/AddChannel/AddChannel';

import './styles/variables.scss';
import './App.scss';

type Nav = {
	path: string;
	element: React.ReactElement;
};

type AnimatedRoutesProps = {
	routes: Nav[];
};

export const AnimatedRoutes = ({ routes }: AnimatedRoutesProps) => {
	const { pathname } = useLocation();

	return (
		<Routes>
			{routes.map(({ path, element }) => (
				<Route
					key={path}
					path={path}
					element={
						<AnimatePresence>
							<motion.div
								initial={{ opacity: 0, x: -5 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ duration: 0.2 }}
								key={path}
							>
								{element}
							</motion.div>
						</AnimatePresence>
					}
				/>
			))}
		</Routes>
	);
};

const NotificationClearer = ({ children }: any) => {
	const location = useLocation();
	const notifications = useNotifications();

	useEffect(notifications.clean, [location]);

	return <>{children}</>;
};

const App = (): ReactElement => {
	const routes: Nav[] = [
		{
			path: '/',
			element: <Home />,
		},
		{
			path: '/add',
			element: <AddChannel />,
		},
		{
			path: '/filter',
			element: <Filter />,
		},
		{
			path: '/connections',
			element: <Connections />,
		},
		{
			path: '/browse',
			element: <Browse />,
		},
		{
			path: '/channel/:channelId',
			element: <ChannelPage />,
		},
		{
			path: '/watch',
			element: <Watch />,
		},
	];

	return (
		<div className="App">
			<Router>
				<ThemeStore>
					<NotificationsProvider>
						<NotificationClearer>
							<ApiStore>
								<Navbar />

								<AnimatedRoutes routes={routes} />
							</ApiStore>
						</NotificationClearer>
					</NotificationsProvider>
				</ThemeStore>
			</Router>
		</div>
	);
};

export default App;
