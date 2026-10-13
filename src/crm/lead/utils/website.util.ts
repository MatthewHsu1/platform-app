// A website typed without a scheme opens as http.
export const cleanWebsite = (url: string | null) => {
  if (url === null || url.trim() === '') {
    return url;
  }

  return url.includes('://') ? url : `http://${url.trim()}`;
};
