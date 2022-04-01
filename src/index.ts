import 'dotenv/config';

import express from 'express';
import 'express-async-errors';

import helmet from 'helmet';
import morgan from 'morgan';

import enableWs from 'express-ws';

import statusCodes from './util/statusCodes';

import db from './archiving/database';

import * as archive from './archiving/archive';
import * as connections from './connections/connections';
import * as download from './downloading/download';
import * as queue from './queue/queue';

// setup
const appBase = express();

// use websockets
let { app } = enableWs(appBase);

// middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// app.use(morgan('tiny'));
app.use(
	helmet({
		contentSecurityPolicy: false,
	})
);

// handle routes
import apiRouter from './routes/api';
import wsRouter from './routes/ws';
app.use('/api/', apiRouter);
app.use('/api/ws/', wsRouter);

// error handlers
app.use((req, res, next) => {
	// 404s
	res.status(statusCodes.NOT_FOUND).json({
		error: true,
		message: 'Not Found',
	});
});

app.use((err: any, req: any, res: any, next: any) => {
	// general
	// const dev = req.app.get("env") === "development";
	const dev = true;

	const errStatus = err.status || statusCodes.INTERNAL_SERVER_ERROR;
	let errMessage = dev
		? err.message || err
		: 'an unexpected error has occurred, please try again later';

	console.log('[api error]', req.url, errMessage);
	if (err.trace) console.log(err.trace);

	// format express-validator errors (stupid)
	if (Array.isArray(errMessage)) {
		errMessage = errMessage[1]
			.map(
				(e: any) =>
					`${e.msg}: ${e.location} param '${e.param}' has value ${e.value}`
			)
			.join(', ');
	}

	res.status(errStatus).json({
		error: true,
		message: errMessage,
	});
});

async function start() {
	await db.connect();

	const port = process.env.PORT;
	app
		.listen(port, () => {
			console.log(`app started on port ${port}\n`);
		})
		.on('error', (e) => {
			console.log(`fatal error: ${e.message}`);
		});

	archive.reparseChannels();
	archive.parseChannels();
	download.downloadVideos();
	queue.start();
	// connections.run();
}

start();
