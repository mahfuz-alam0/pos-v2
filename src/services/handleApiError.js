export function handleApiError(err) {
  const status = err.response?.status;

  if (status === 401) {
    localStorage.removeItem("user");
    window.location.href = "/signin";
  }

  if (status === 422) {
    const errors = err.response?.data?.data?.errors;
    if (errors?.length) {
      throw { status, errors: errors.map((e) => `${e.property}: ${Object.values(e.constraints)[0]}`) };
    }
  }

  const message =
    err.response?.data?.data?.message || err.response?.data?.message || err.message || "Request failed";
  throw { status, message };
}
