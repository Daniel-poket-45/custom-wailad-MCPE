// @ts-check
import { world, system } from "@minecraft/server";
import { wawla } from "./wawla.js";
system.runInterval(
	() => {
		const players = world.getAllPlayers();
		for (let i = 0; i < players.length; i++) {
			const player = players[i];
			wawla(player);
		};
	}, 4
);