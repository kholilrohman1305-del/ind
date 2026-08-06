const { ZodError } = require("zod");

const FIELD_LABELS = {
  program_id: "Program bimbingan",
  edukator_id: "Edukator",
  mapel_ids: "Mata pelajaran",
  cabang_id: "Cabang",
  email: "Email",
  password: "Password",
  nama: "Nama",
};

const formatIssue = (issue) => {
  const path = issue.path.filter((part) => part !== "body" && part !== "params" && part !== "query");
  const fieldKey = path.find((part) => typeof part === "string");
  const label = FIELD_LABELS[fieldKey] || fieldKey || "Data formulir";
  const itemIndex = path.find((part) => typeof part === "number");
  const itemLabel = typeof itemIndex === "number" ? ` (pilihan ke-${itemIndex + 1})` : "";
  const rawMessage = issue.message || "Nilai tidak valid.";

  // Pesan bawaan Zod berbahasa teknis tidak boleh langsung ditampilkan ke user.
  if (/Too small|expected number|Invalid input/i.test(rawMessage)) {
    return `${label}${itemLabel} tidak valid. Pilih ulang ${label.toLowerCase()} dari daftar yang tersedia.`;
  }
  return `${label}${itemLabel}: ${rawMessage}`;
};

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
      const messages = err.issues.map(formatIssue);
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
