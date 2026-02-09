const parsePagination = (query) => {
  // If no pagination params provided, return undefined limit (no pagination)
  if (query.limit === undefined && query.page === undefined) {
    return { page: 1, limit: undefined, offset: undefined };
  }
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(10000, Math.max(1, parseInt(query.limit, 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const paginatedResponse = (data, total, { page, limit }) => ({
  success: true,
  data,
  pagination: {
    page,
    limit: limit || total,
    total,
    totalPages: limit ? Math.ceil(total / limit) : 1,
  },
});

module.exports = { parsePagination, paginatedResponse };
