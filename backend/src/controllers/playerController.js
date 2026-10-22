const { notifyPlayerCreated, } = require("../services/operationalNotificationService");
const playerService = require("../services/playerService");

const createPlayer = async (req, res, next) => {
  try {
    const player = await playerService.createPlayer(
      req.body,
      req.user.id
    );
    
    notifyPlayerCreated(player);

    res.status(201).json({
      success: true,
      message: "Player registered successfully",
      player
    });


  } catch (error) {
    next(error);
  }
};

const getPlayers = async (req, res, next) => {
  try {
    const players = await playerService.getPlayers(
      typeof req.query.search === "string" ? req.query.search : ""
    );

    res.json({ success: true, count: players.length, players });
  } catch (error) {
    next(error);
  }
};

const getPlayerById = async (req, res, next) => {
  try {
    const player = await playerService.getPlayerById(req.params.id);

    res.json({ success: true, player });
  } catch (error) {
    next(error);
  }
};

module.exports = { createPlayer, getPlayers, getPlayerById };