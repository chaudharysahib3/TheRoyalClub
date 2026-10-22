const {
  notifySessionStarted,
  notifySessionEnded,
} = require("../services/operationalNotificationService");
const service = require("../services/gameSessionService");

exports.start = async (req, res, next) => {
  try {
    const session = await service.startSession(req.body, req.user.id);
    
    notifySessionStarted(session._id);

    res.status(201).json({
      success: true,
      message: "Player game session started",
      session
    });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const sessions = await service.getSessions(req.query);

    res.json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    next(error);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const session = await service.getSessionById(req.params.id);

    res.json({ success: true, session });
  } catch (error) {
    next(error);
  }
};

exports.end = async (req, res, next) => {
  try {
    const session = await service.endSession(
      req.params.id,
      req.body,
      req.user.id
    );

    notifySessionEnded(session._id);

    res.json({
      success: true,
      message: "Player game session ended",
      session
    });
  } catch (error) {
    next(error);
  }
};
