var index = {};

index.index = function (req, res, next) {
  return res.render('index');
};

index.new = function (req, res, next) {
  return res.render('new');
};

module.exports = index;