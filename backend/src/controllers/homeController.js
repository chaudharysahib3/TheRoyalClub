const getHome = (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to THE ROYALS CLUB API"
  });
};

module.exports = { getHome };