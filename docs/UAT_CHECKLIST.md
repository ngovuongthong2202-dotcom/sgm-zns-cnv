# Checklist Nghiệm Thu (UAT) - SGM OS / ZNS-SGM

**Mục tiêu:** Hướng dẫn kiểm thử thủ công các luồng nghiệp vụ chính của hệ thống dành cho người dùng không có chuyên môn kỹ thuật.

---

## 1. Quản lý Khách hàng (Customers)

**1.1. Tạo mới khách hàng hợp lệ**
- **Thao tác:** Bấm "Thêm khách hàng", nhập tên, số điện thoại hợp lệ và lưu.
- **Kết quả mong đợi:** Khách hàng mới xuất hiện trong danh sách, không có lỗi.
- **Đạt/Không đạt:** [ ] 
- **Ghi chú:** ...................................................................
*(Tham chiếu E2E: happy-paths.spec.ts - Trình tự 1)*

**1.2. Sửa thông tin khách hàng**
- **Thao tác:** Bấm vào khách hàng trong danh sách (mở ngăn chi tiết bên phải), chọn "Sửa", thay đổi tên khách hàng, bấm "Lưu".
- **Kết quả mong đợi:** Thông tin khách hàng cập nhật đúng nội dung vừa sửa.
- **Đạt/Không đạt:** [ ] 
- **Ghi chú:** ...................................................................
*(Tham chiếu E2E: happy-paths.spec.ts - Trình tự 1)*

**1.3. Tạo mới khách hàng trùng số điện thoại**
- **Thao tác:** Tạo khách hàng mới với số điện thoại đã tồn tại trên một khách hàng khác.
- **Kết quả mong đợi:** Hệ thống báo lỗi "SĐT đã tồn tại" và chặn việc lưu dữ liệu.
- **Đạt/Không đạt:** [ ] 
- **Ghi chú:** ...................................................................
*(Tham chiếu E2E: sad-paths.spec.ts - Trình tự 1)*

**1.4. Cảnh báo sửa đồng thời (Trùng lặp chỉnh sửa)**
- **Thao tác:** Mở cùng 1 trình duyệt ở 2 tab, vào cùng 1 khách hàng. Tab 1 sửa và lưu. Tab 2 cũng sửa và bấm lưu (với nội dung khác, sau khi tab 1 đã lưu).
- **Kết quả mong đợi:** Tab 2 hiện thông báo cảnh báo dữ liệu đã được chỉnh sửa bởi người khác, chống việc ghi đè vô ý.
- **Đạt/Không đạt:** [ ] 
- **Ghi chú:** ...................................................................
*(Tham chiếu E2E: sad-paths.spec.ts - Trình tự 3)*

**1.5. Xóa khách hàng có dữ liệu liên quan**
- **Thao tác:** Chọn khách hàng đã có liên kết Báo giá, Hợp đồng hoặc Đơn hàng, bấm "Xóa".
- **Kết quả mong đợi:** Hệ thống chặn và hiện thông báo "Không thể xóa vì có dữ liệu liên quan".
- **Đạt/Không đạt:** [ ] 
- **Ghi chú:** ...................................................................
*(Tham chiếu E2E: sad-paths.spec.ts - Trình tự 4)*

---

## 2. Quản lý Báo giá (Quotations)

**2.1. Tạo Báo giá (BG Vật tư) thành công**
- **Thao tác:** Chọn "Tạo báo giá", mục loại báo giá chọn "BG Vật tư". Tìm và chọn một khách hàng có sẵn. Thêm 2 sản phẩm bất kỳ. Bấm "Phát hành".
- **Kết quả mong đợi:** Báo giá hiển thị trong danh sách chứa đủ 2 sản phẩm và ở trạng thái đã phát hành.
- **Đạt/Không đạt:** [ ]
- **Ghi chú:** ...................................................................
*(Tham chiếu E2E: happy-paths.spec.ts - Trình tự 2)*

**2.2. Tạo Báo giá các loại khác (BG Máy / BG Dịch vụ)**
- **Thao tác:** Khởi tạo báo giá tương tự phương pháp trên nhưng chọn loại "BG Máy" và "BG Dịch vụ".
- **Kết quả mong đợi:** Báo giá lưu thành công và hiển thị loại chính xác theo lựa chọn.
- **Đạt/Không đạt:** [ ]
- **Ghi chú:** ...................................................................

---

## 3. Quản lý Hợp đồng (Contracts)

**3.1. Tạo Hợp đồng từ Báo giá (Loại BG Máy) hợp lệ**
- **Thao tác:** Vào màn hình Quản lý Hợp đồng, bấm "Tạo hợp đồng". Bấm "Chọn báo giá" và chọn một Báo giá ĐÃ ĐƯỢC CHỐT. Bấm "Lưu".
- **Kết quả mong đợi:** Hợp đồng được tạo thành công, có trạng thái "Chờ thanh toán".
- **Đạt/Không đạt:** [ ]
- **Ghi chú:** ...................................................................
*(Tham chiếu E2E: happy-paths.spec.ts - Trình tự 3)*

**3.2. Cố tình tạo Hợp đồng từ Báo giá chưa chốt**
- **Thao tác:** Thử tạo Hợp đồng mới và chọn một Báo giá vẫn đang ở trạng thái Nháp (chưa được chốt/phát hành).
- **Kết quả mong đợi:** Hệ thống báo lỗi chặn lại với nội dung "Báo giá chưa được chốt" (Nghiệp vụ Gate STRICT).
- **Đạt/Không đạt:** [ ]
- **Ghi chú:** ...................................................................
*(Tham chiếu E2E: sad-paths.spec.ts - Trình tự 5)*

---

## 4. Quản lý Thanh toán (Payments / Phiếu thu)

**4.1. Tạo Phiếu Thu cho Hợp đồng**
- **Thao tác:** Mở màn hình Thanh toán, chọn "Tạo phiếu thu". Chỉ định Số tiền cần thu (ví dụ: 1.000.000). Bấm Xác nhận.
- **Kết quả mong đợi:** Phiếu thu được ghi nhận trên hệ thống và trạng thái trên hồ sơ thanh toán cập nhật thành "Đã thanh toán".
- **Đạt/Không đạt:** [ ]
- **Ghi chú:** ...................................................................
*(Tham chiếu E2E: happy-paths.spec.ts - Trình tự 4)*

---

## 5. Quản lý Giao hàng (Deliveries / Phiếu giao)

**5.1. Tạo Phiếu giao hàng từ Hợp đồng chờ giao**
- **Thao tác:** Chọn tính năng "Tạo phiếu giao", điền các thông tin vị trí ngày giao tương ứng và bấm Lưu.
- **Kết quả mong đợi:** Phiếu giao lưu thành công vào cơ sở dữ liệu với trạng thái mặc định (Chờ giao).
- **Đạt/Không đạt:** [ ]
- **Ghi chú:** ...................................................................
*(Tham chiếu E2E: happy-paths.spec.ts - Trình tự 5)*

**5.2. Xác nhận hoàn thành Giao hàng thực tế**
- **Thao tác:** Mở Phiếu giao hàng vừa tạo, chọn thao tác "Hoàn thành", bấm "Xác nhận" trên hộp thoại cảnh báo.
- **Kết quả mong đợi:** Trạng thái phiếu thay đổi thành "Đã giao".
- **Đạt/Không đạt:** [ ]
- **Ghi chú:** ...................................................................
*(Tham chiếu E2E: happy-paths.spec.ts - Trình tự 5)*

---

## 6. Gửi tin nhắn Zalo (ZNS)

**6.1. Thao tác Gửi tin nhắn tự động từ hệ thống**
- **Thao tác:** Mở ngăn Chi tiết Thông tin khách hàng, bấm nút điều khiển "Gửi ZNS". Xem và kiểm duyệt cấu trúc tin nhắn ở màn hình Xem trước. Bấm "Xác nhận gửi".
- **Kết quả mong đợi:** Phiếu ZNS xuất hiện Trạng thái "Đang gửi" (Hệ thống chờ phản hồi từ nhà cung cấp tin nhắn).
- **Đạt/Không đạt:** [ ]
- **Ghi chú:** ...................................................................
*(Tham chiếu E2E: zns-paths.spec.ts - Trình tự 6)*

**6.2. Kiểm tra Kết quả Gửi ZNS**
- **Thao tác:** Chờ khoảng vài giây cho đối tác Zalo phản hồi trạng thái thật. Theo dõi cột trạng thái hoặc màn hình Thông báo.
- **Kết quả mong đợi:** Thông báo ghi nhận "Gửi thành công", thay đổi trên giao diện khách hàng tương ứng.
- **Đạt/Không đạt:** [ ]
- **Ghi chú:** ...................................................................
*(Tham chiếu E2E: zns-paths.spec.ts - Trình tự 7)*

---

## 7. Theo dõi Dashboard & Báo cáo Tổng Quan

**7.1. Xem màn hình Dashboard số liệu**
- **Thao tác:** Truy cập màn hình Dashboard. Kiểm tra tải biểu đồ, tổng danh sách các mục hoạt động bán hàng (Khách hàng mới, Số phiếu thu, Phiếu giao).
- **Kết quả mong đợi:** Tất cả KPI và biểu đồ đều tải lên số liệu bình thường, không ghi nhận các lỗi kết nối hay trắng trang.
- **Đạt/Không đạt:** [ ]
- **Ghi chú:** ...................................................................

---

## 8. Tiện ích Xuất Báo cáo & Lỗi Hệ thống

**8.1. Kiểm tra Lỗi kết nối Mạng**
- **Thao tác:** Mở Form tạo Khách hàng/Báo Giá mới. Điền thông tin. Vô hiệu hóa Mạng Internet (Tắt Wifi). Bấm Lưu.
- **Kết quả mong đợi:** Ứng dụng hiện nổi thông báo Lỗi Mạng và hiện nút Nạp (Thử) Lại. 
- **Đạt/Không đạt:** [ ]
- **Ghi chú:** ...................................................................
*(Tham chiếu E2E: sad-paths.spec.ts - Trình tự 2)*

**8.2. Tiện ích Tải xuống Báo giá / Phiếu (PDF)**
- **Thao tác:** Vào danh sách Báo Giá, chọn Báo Giá Đã Chốt. Mở chức năng Tải / In (PDF Export).
- **Kết quả mong đợi:** Tệp PDF tải xuống thành công để in ấn hoặc đưa lại cho khách hàng.
- **Đạt/Không đạt:** [ ]
- **Ghi chú:** ...................................................................

**8.3. Tiện ích Xuất danh sách Excel (CSV/XLSX)**
- **Thao tác:** Từ màn hình danh sách (Khách hàng hoặc Báo giá), chọn tính năng "Xuất Excel / CSV" sau khi đã chọn sẵn một vài bộ lọc mong muốn.
- **Kết quả mong đợi:** Tệp dữ liệu dạng bảng Excel tải về thành công và đối chiếu trùng khớp dữ liệu đã lọc trên màn hình.
- **Đạt/Không đạt:** [ ]
- **Ghi chú:** ...................................................................

---

## 9. Tìm kiếm Toàn cục / Tìm kiếm thông minh

**9.1. Tìm kiếm bằng thanh công cụ Smart Search**
- **Thao tác:** Kích hoạt thanh tìm kiếm chung trên đầu trang (hoặc dùng tổ hợp phím tắt), gõ tên một khách hàng hoặc số điện thoại bất kỳ.
- **Kết quả mong đợi:** Danh sách trả về ngay lập tức (không cần tải lại trang) liệt kê chính xác các bản ghi có chứa từ khóa đó.
- **Đạt/Không đạt:** [ ]
- **Ghi chú:** ...................................................................
