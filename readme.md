# YouTube Archiver - Server

This is the server code for my YouTube archiver.

[Client repository](https://github.com/f0e/youtube-archiver)

## Requirements

- [Node.js](https://nodejs.org/en/)
- [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/#windows-stable)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- A MongoDB database

## Setup

1. Install the [requirements](#requirements)
2. Run `yarn`
3. Create a `.env` file and fill out this template

```
PORT=

DB_URI=
DB_TABLE=

START_CHANNEL=

DOWNLOAD_FOLDER=
```

## Running

1. Run `yarn start`
2. Start the [client](https://github.com/f0e/youtube-archiver-client)
