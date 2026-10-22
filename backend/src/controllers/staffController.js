
const staffService = require("../services/staffService");

const createStaff = async (req, res, next) => {
  try {
    const staff = await staffService.createStaff(req.body);

    res.status(201).json({
      success: true,
      message: "Staff created successfully",
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        status: staff.status
      }
    });
  } catch (error) {
    next(error);
  }
};

const getStaff = async (req, res, next) => {
  try {
    const staff = await staffService.getStaff();

    res.json({ success: true, staff });
  } catch (error) {
    next(error);
  }
};

const updateStaff = async (req, res, next) => {
  try {
    const staff = await staffService.updateStaff(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      message: "Staff updated successfully",
      staff
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createStaff, getStaff, updateStaff };
