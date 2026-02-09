const { ZodError } = require("zod");

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    return next();
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.errors.map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages[0],
        errors: messages,
      });
    }
    return next(err);
  }
};

module.exports = { validate };
