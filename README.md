Plex Cache Client
===
> NOTE: This project is still very much in the POC phase. Please take current implementation with a grain of salt, things will likely change a lot as I have a better plan for where this idea will go.

[Plex](https://www.plex.tv/) is an amazing tool for organizing and streaming your local media library. However, for various reasons, people prefer not to expose their Plex server to the outside web (security concerns, poor performance, etc.). Keeping Plex constrained to LAN works great if you're the only person using your library or you're not frequently on the move. But what if you want to share your library with friends and family?

***The goal behind this Plex sync manager is to allow friends and family to share your Plex content while not compromising the performance and security benefits you enjoy from your own local Plex server.***

Planned flow for library sync:
1. Content owner installs the [sync manager](https://github.com/amoore1337/plex-sync-manager) on the same environment as their Plex server ("master" instance).
2. Users who wish to sync with "master" instance must install the client app (this app) alongside their own local Plex instance.
3. After authenticating/authorizing with the sync manager, the client will be able to search, download, and subscribe to content from the "master" Plex instance.

---

## Planned functionallity of the sync manager:

1. Implements OAuth2 to allow for authentication/authorization of clients.
2. Exposes API for clients to facilitate checking out content from the "master" Plex server.
    * Communication will remain encrypted over SSL.
3. Allows control over what content clients are allowed to see and download.
4. Displays detail logs over what content clients are requesting/have downloaded.
5. Allows revoking of clients and IP blocking.

---

## Environment requirements:

* Node v10 or newer
* Docker v19 or newer required for running container version of app.

---

## Dev setup:

This app uses a monolithic structure to house both the frontend and backend apps.

Checkout the repo:
```sh
> git clone git@github.com:amoore1337/plex-sync-manager.git
```

### Backend setup:

1. Install server dependencies:
    ```sh
    > npm install
    ```
2. Start server:
    ```sh
    > npm start
    ```
3. ctrl + c only stops tailing the logs. PM2 will remain running until you run:
    ```sh
    > npm stop
    ```

> NOTE: You can view the status of backend processes with: `npm run stat`

> NOTE: You can selectively run specific node apps with `npm run start:internal` or `npm run start:external`. This is likely what you want to use if you're actively developing something specific to one API. These scripts use nodemon to automatically pull in code changes without requiring server restarts.

### Frontend setup:

1. Navigate to client's directory and install dependencies:
    ```sh
    > cd ./client && npm install
    ```
2. Compile assets and serve for local development:
    ```sh
    > npm run serve
    ```

> NOTE: See the Readme under `./client` for more instructions and options.

---

## Running Docker version locally:

1. Make the bash script executable:
    ```sh
    > chmod u+x docker-run.sh
    ```
2. Run build script:
    ```sh
    > ./docker-run.sh
    ```

> NOTE: If you're only testing backend, you can skip the compile step by running: `./docker-run --no-compile`

---

## Pushing to Docker Hub:

1. Make the bash script executable:
    ```sh
    > chmod u+x docker-push.sh
    ```
2. Run script:
    ```sh
    > ./docker-push.sh
    ```
