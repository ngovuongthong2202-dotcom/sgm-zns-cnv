import { toast as hotToast, ToastOptions } from 'react-hot-toast';

const defaults = (type: string, opts?: ToastOptions): ToastOptions => ({ ...opts });

let successQueue: { msg: string, time: number }[] = [];
let queueTimeout: ReturnType<typeof setTimeout> | null = null; 

const flushSuccessQueue = () => {
   if (successQueue.length === 0) return;
   if (successQueue.length === 1) {
      hotToast.success(successQueue[0].msg, defaults('success'));
   } else {
      // Find common patterns or just group by count
      const isZns = successQueue.some(q => q.msg.toLowerCase().includes('zns') || q.msg.toLowerCase().includes('tin nhắn'));
      if (isZns) {
         hotToast.success(`Thành công: Đã thực hiện ${successQueue.length} thao tác (ZNS)`, defaults('success'));
      } else {
         hotToast.success(`Thành công: ${successQueue.length} thao tác đã hoàn thành`, defaults('success'));
      }
   }
   successQueue = [];
};

export const notify = {
  success: (msg: string, opts?: ToastOptions) => {
     successQueue.push({ msg, time: Date.now() });
     if (queueTimeout) clearTimeout(queueTimeout);
     queueTimeout = setTimeout(flushSuccessQueue, 1500);
  },
  error:   (msg: string, opts?: ToastOptions) => hotToast.error(msg, defaults('danger', opts)),
  info:    (msg: string, opts?: ToastOptions) => hotToast(msg, defaults('info', opts)),
  custom:  (render: (t: import('react-hot-toast').Toast) => import('react-hot-toast').Renderable, opts?: ToastOptions) => hotToast.custom(render, opts),
  warning: (msg: string, opts?: ToastOptions) => hotToast(msg, defaults('warning', opts)),
  promise: <T>(p: Promise<T>, msgs: { loading: string, success: string|((r:T)=>string), error: string|((e: unknown)=>string) }, opts?: import('react-hot-toast').DefaultToastOptions) => 
    hotToast.promise(p, msgs, { ...opts }),
  loading: (msg: string, opts?: ToastOptions) => hotToast.loading(msg, defaults('loading', opts)),
  dismiss: (id?: string) => hotToast.dismiss(id),
  znsBulk: (sent: number, failed: number, total?: number) => {
    if (failed === 0) hotToast(`Đã xếp hàng gửi xong. Thành công: ${sent}`, defaults('info'));
    else hotToast(`Đã xếp hàng gửi xong. Thành công: ${sent}, Lỗi/Bỏ qua: ${failed}`, defaults('info'));
  }
};
