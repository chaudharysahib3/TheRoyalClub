
const reportService = require("../services/reportService");

exports.dashboard = async (req, res, next) => {
  try {
    const data = await reportService.getDashboard();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.financial = async (req, res, next) => {
  try {
    const date = req.query.date || reportService.todayDateString();

    const data = await reportService.getFinancialSummary(date);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.sessions = async (req, res, next) => {
  try {
    const date = req.query.date || reportService.todayDateString();
    const data = await reportService.getSessionReport(date);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

exports.chips = async (req, res, next) => {
  try {
    const data = await reportService.getChipInventory();

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};
