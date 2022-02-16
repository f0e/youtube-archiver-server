import React, { ReactElement, useEffect } from 'react';
import {
	BrowserRouter as Router,
	Routes,
	Route,
	useLocation,
} from 'react-router-dom';
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

import './styles/variables.scss';
import './App.scss';

const NotificationClearer = ({ children }: any) => {
	const location = useLocation();
	const notifications = useNotifications();

	useEffect(notifications.clean, [location]);

	return <>{children}</>;
};

const App = (): ReactElement => {
	return (
		<div className="App">
			<Router>
				<ThemeStore>
					<NotificationsProvider>
						<NotificationClearer>
							<ApiStore>
								<Navbar />

								<Routes>
									<Route path="/" element={<Home />} />
									<Route path="/filter" element={<Filter />} />
									<Route path="/connections" element={<Connections />} />
									<Route path="/browse" element={<Browse />} />
									<Route path="/channel/:channelId" element={<ChannelPage />} />
									<Route path="/watch" element={<Watch />} />
								</Routes>
							</ApiStore>
						</NotificationClearer>
					</NotificationsProvider>
				</ThemeStore>
			</Router>
		</div>
	);
};

export default App;
