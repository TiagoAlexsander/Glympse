export type ApiResponse<T> = {
  success: true;
  data: T;
};

export type ApiErrorResponse = {
  success: false;
  error: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
};

export type ApiListResponse<T> = {
  success: true;
  data: T[];
  pagination: Pagination;
};