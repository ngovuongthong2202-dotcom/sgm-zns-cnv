import * as XLSX from 'xlsx';
import Papa from 'papaparse';

self.onmessage = async (e) => {
  const { action, data, filename, format } = e.data;

  try {
    if (action === 'exportXLSX') {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      self.postMessage({ status: 'done', data: arrayBuffer, filename: `${filename}.xlsx`, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    } else if (action === 'exportCSV') {
      const csv = Papa.unparse(data);
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8' });
      const arrayBuffer = await blob.arrayBuffer();
      self.postMessage({ status: 'done', data: arrayBuffer, filename: `${filename}.csv`, type: 'text/csv;charset=utf-8' });
    }
  } catch (error) {
    self.postMessage({ status: 'error', message: (error as Error).message });
  }
};
