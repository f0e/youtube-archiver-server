import { EventEmitter } from 'stream';
import db from './database';

class ChannelListener extends EventEmitter {
	emitNewChannels = (channels: any) => {
		this.emit('channels', channels);
	};
}

const channelListener = new ChannelListener();
export default channelListener;
