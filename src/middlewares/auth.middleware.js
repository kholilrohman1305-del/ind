const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  return next();
};

const requireRole = (role) => (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  if (req.session.user.role !== role) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  return next();
};

const requireAnyRole = (roles) => (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  if (!roles.includes(req.session.user.role)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  return next();
};

module.exports = {
  requireAuth,
  requireRole,
  requireAnyRole,
};
