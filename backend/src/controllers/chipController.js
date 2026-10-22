
const chipService = require("../services/chipService");

exports.createDenomination = async (req, res, next) => {
  try {
    const denomination = await chipService.createDenomination(
      req.body,
      req.user.id
    );
    res.status(201).json({
      success: true,
      message: "Chip denomination created",
      denomination
    });
  } catch (error) {
    next(error);
  }
};

exports.getDenominations = async (req, res, next) => {
  try {
    res.json({
      success: true,
      denominations: await chipService.getDenominations()
    });
  } catch (error) {
    next(error);
  }
};

exports.createLocation = async (req, res, next) => {
  try {
    const location = await chipService.createLocation(
      req.body,
      req.user.id
    );
    res.status(201).json({
      success: true,
      message: "Chip location created",
      location
    });
  } catch (error) {
    next(error);
  }
};

exports.getLocations = async (req, res, next) => {
  try {
    res.json({
      success: true,
      locations: await chipService.getLocations()
    });
  } catch (error) {
    next(error);
  }
};

exports.recordMovement = async (req, res, next) => {
  try {
    const movement = await chipService.recordMovement(
      req.body,
      req.user.id
    );
    res.status(201).json({
      success: true,
      message: "Chip movement recorded",
      movement
    });
  } catch (error) {
    next(error);
  }
};

exports.getLedger = async (req, res, next) => {
  try {
    const ledger = await chipService.getLedger(req.query);
    res.json({ success: true, count: ledger.length, ledger });
  } catch (error) {
    next(error);
  }
};

exports.getInventory = async (req, res, next) => {
  try {
    const inventory = await chipService.getInventory();
    res.json({ success: true, inventory });
  } catch (error) {
    next(error);
  }
};
