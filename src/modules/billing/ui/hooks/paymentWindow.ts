export interface PaymentWindowLike {
  data: unknown[];
  loading: boolean;
  total: number | null;
  capped: boolean;
}

/** Cửa sổ phiếu thu trong bộ nhớ đủ tin cậy để tính điểm: có dữ liệu, không còn đang nạp, đã biết tổng hoặc đã chạm trần. */
export function isPaymentWindowReady(win: PaymentWindowLike): boolean {
  return win.data.length > 0 && !win.loading && (win.total !== null || win.capped);
}
