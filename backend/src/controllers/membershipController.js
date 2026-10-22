
const service = require("../services/membershipService");

const createPlan = async (req, res, next) => {
  try {
    const plan = await service.createPlan(req.body);
    res.status(201).json({
      success: true,
      message: "Membership plan created",
      plan
    });
  } catch (error) {
    next(error);
  }
};

const getPlans = async (req, res, next) => {
  try {
    const plans = await service.getPlans();
    res.json({ success: true, plans });
  } catch (error) {
    next(error);
  }
};

const assignMembership = async (req, res, next) => {
  try {
    const membership = await service.assignMembership(
      req.body,
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: "Membership activated",
      membership
    });
  } catch (error) {
    next(error);
  }
};

const getMemberships = async (req, res, next) => {
  try {
    const memberships = await service.getMemberships();
    res.json({
      success: true,
      count: memberships.length,
      memberships
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPlan,
  getPlans,
  assignMembership,
  getMemberships
};
