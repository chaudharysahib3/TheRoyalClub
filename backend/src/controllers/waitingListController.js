const {
  notifyWaitingListUpdated,
} = require("../services/operationalNotificationService");
const waitingListService = require("../services/waitingListService");

exports.add = async (req, res, next) => {
  try {
    const entry = await waitingListService.addToWaitingList(
      req.body,
      req.user.id
    );

    notifyWaitingListUpdated();

    res.status(201).json({
      success: true,
      message: "Player added to waiting list",
      entry
    });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const entries = await waitingListService.getWaitingList();

    res.json({
      success: true,
      count: entries.length,
      entries
    });
  } catch (error) {
    next(error);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const entry = await waitingListService.cancelWaitingListEntry(
      req.params.id
    );

    res.json({
      success: true,
      message: "Waiting-list entry cancelled",
      entry
    });
  } catch (error) {
    next(error);
  }
};

exports.assign = async (req, res, next) => {
  try {
    const { tableId, seatNumber } = req.body;

    const entry = await waitingListService.assignFromWaitingList(
      req.params.id,
      tableId,
      seatNumber
    );

    res.json({
      success: true,
      message: "Player assigned from waiting list",
      entry
    });
  } catch (error) {
    next(error);
  }
};
