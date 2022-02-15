import React, { ReactElement } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MessageStore } from './context/MessageContext';
import { ThemeStore } from './context/ThemeContext';
import { ApiStore } from './context/ApiContext';
import Navbar from './components/Navbar/Navbar';
import MessageBar from './components/MessageBar/MessageBar';
import Home from './pages/Home/Home';
import Filter from './pages/Filter/Filter';
import Connections from './pages/Connections/Connections';
import Browse from './pages/Browse/Browse';
import Watch from './pages/Watch/Watch';
import ChannelPage from './pages/ChannelPage/ChannelPage';

import './styles/variables.scss';
import './App.scss';

const App = (): ReactElement => {
	return (
		<div className="App">
			<Router>
				<ThemeStore>
					<MessageStore>
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

							<MessageBar />
						</ApiStore>
					</MessageStore>
				</ThemeStore>
			</Router>
		</div>
	);
};

export default App;
