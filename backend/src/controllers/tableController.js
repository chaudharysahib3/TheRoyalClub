const {
  notifyTableUpdated,
} = require("../services/operationalNotificationService");
const tableService = require("../services/tableService");

exports.createTable = async (req, res, next) => {
  try {
    const table = await tableService.createTable(
      req.body,
      req.user.id
    );

    notifyTableUpdated(table._id);

    res.status(201).json({
      success: true,
      message: "Table created successfully",
      table
    });
  } catch (error) {
    next(error);
  }
};

exports.getTables = async (req, res, next) => {
  try {
    res.json({
      success: true,
      tables: await tableService.getTables()
    });
  } catch (error) {
    next(error);
  }
};

exports.getTableById = async (req, res, next) => {
  try {
    res.json({
      success: true,
      table: await tableService.getTableById(req.params.id)
    });
  } catch (error) {
    next(error);
  }
};

exports.assignDealer = async (req, res, next) => {
  try {
    const table = await tableService.assignDealer(
      req.params.id,
      req.body.dealerId
    );

    res.json({ success: true, table });
  } catch (error) {
    next(error);
  }
};

exports.updateTableStatus = async (req, res, next) => {
  try {
    const table = await tableService.updateTableStatus(
      req.params.id,
      req.body.status
    );

    res.json({ success: true, table });
  } catch (error) {
    next(error);
  }
};

exports.seatPlayer = async (req, res, next) => {
  try {
    const table = await tableService.seatPlayer(
      req.params.id,
      req.body.playerId,
      req.body.seatNumber
    );

    res.json({
      success: true,
      message: "Player seated successfully",
      table
    });
  } catch (error) {
    next(error);
  }
};

exports.removePlayer = async (req, res, next) => {
  try {
    const table = await tableService.removePlayer(
      req.params.id,
      req.params.seatNumber
    );

    res.json({
      success: true,
      message: "Player removed from seat",
      table
    });
  } catch (error) {
    next(error);
  }
};
