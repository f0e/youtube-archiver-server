import 'dotenv/config';

import express from 'express';
import 'express-async-errors';

import helmet from 'helmet';
import morgan from 'morgan';

import enableWs from 'express-ws';

import db from './archiving/database';
import * as archive from './archiving/archive';

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
app.use('/', apiRouter);
app.use('/ws/', wsRouter);

async function start() {
	const port = process.env.PORT;

	await db.connect();
	await archive.start();

	await app
		.listen(port, () => {
			console.log(`app started on port ${port}`);
		})
		.on('error', (e) => {
			console.log(`fatal error: ${e.message}`);
		});
}

start();
