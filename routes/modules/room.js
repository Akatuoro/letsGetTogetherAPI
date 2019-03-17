module.exports = function (io, socket, gameHelper, gameMap) {
	const isEmpty = function(obj) {
		return Object.keys(obj).length === 0 && obj.constructor === Object;
	}

	const isRoomEmpty = function (name) {
		return io.sockets.adapter.rooms[name] === undefined;
	};

	socket.on("joinRoomRequest", (data) => {
		if (!socket.user) return;
		console.log(`${socket.user.name} want's to join ${data.room}`);

		// room already exists, so join it
		if (!isRoomEmpty(data.room)) {
			socket.join(data.room, () => {
				// set socket basic data
				socket.room = data.room;
				console.log(`${socket.user.name} joined: ${socket.room}`);


				// if a card is currently active, increase playerLeftCount because new player also want to play!
				if (!isEmpty(gameMap.get(socket.room).currentCard)) {
					++gameHelper.getGameSession().currentCard.playerLeftCount;
				}

				socket.to(socket.room).emit("users-changed", {user: socket.user, event: "joined"});
				socket.emit("roomJoinSucceed", {room: socket.room, game: gameMap.get(socket.room)});

				// ++gameLogs.totalPlayers;

				gameHelper.updateAndEmitGame(socket.room);
			});
		} else {
			console.log(`${data.room} does not exist`);
			socket.emit("noSuchRoom");
		}
	});

	socket.on("createRoomRequest", (data) => {
		if (!socket.user) return;
		console.log(`${JSON.stringify(socket.user.name)} want's to create ${data.room}`);

		if (!isRoomEmpty(data.room)) {
			socket.emit("roomAlreadyExists");
		} else {
			socket.join(data.room, function room() {
				// set socket basic data
				socket.room = data.room;

				const oGame = {
					players: [],
					isOver: false,
					admin: socket.user,
					categories: data.categories,
					themes: data.themes,
					cardsPerGame: data.cardsPerGame,
					cardsPlayed: 0,
					cards: gameHelper.getCardsForEnabledCategories(data.categories),
					currentCard: {},
					currentCategory: "none",
					multiplier: 1,
					playerCount: 1,
					curseEnabled: data.curseEnabled,
				};

				gameMap.set(data.room, oGame);


				gameHelper.updateAndEmitGame(socket.room);
				socket.emit("roomCreated", {room: socket.room, game: oGame});

				// keep track of played games
				// ++gameLogs.gamesPlayed;
				// ++gameLogs.totalPlayers;


				/*	console.log(`${socket.room} created! \n`
						+ `Number of games in gameMap: ${gameMap.size} \n`
						+ `gameStatistics${JSON.stringify(gameLogs)}`); */
			});
		}
	});

	socket.on("leaveRoom", () => {
		socket.leave(socket.room, () => {
			console.log(`${JSON.stringify(socket.user)} left room ${socket.room}`);
			if (this.isRoomEmpty(socket.room)) {
				// if room is empty delete it from session array
				console.log("no one is in the room anymore..");
				gameMap.set(socket.room, undefined);
			} else {
				if (socket.user.isAdmin) {
					console.log("admin left");
					gameHelper.setNewRandomAdmin();
					socket.user.isAdmin = false;
					socket.emit("updateUser", {user: socket.user});
				}

				console.log(`emit user change: ${socket.room}`);
				io.to(socket.room).emit("users-changed", {user: socket.user, event: "left"});


				const room = socket.room;
				socket.room = "";
				gameHelper.updateAndEmitGame(room);
			}
		});
	});



	return {
		isRoomEmpty: isRoomEmpty,
	};
};
