
const service = require(
  "../services/reconciliationService"
);

exports.closeDay = async (req, res, next) => {
  try {
    const reconciliation = await service.closeDay(
      req.body,
      req.user.id,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: "Daily reconciliation created",
      reconciliation
    });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const reconciliations =
      await service.getReconciliations();

    res.json({
      success: true,
      count: reconciliations.length,
      reconciliations
    });
  } catch (error) {
    next(error);
  }
};

exports.getByDate = async (req, res, next) => {
  try {
    const reconciliation =
      await service.getReconciliationByDate(
        req.params.date
      );

    res.json({
      success: true,
      reconciliation
    });
  } catch (error) {
    next(error);
  }
};
