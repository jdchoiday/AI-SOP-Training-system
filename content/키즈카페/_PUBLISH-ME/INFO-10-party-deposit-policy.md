# SOP - INFO - ĐẶT CỌC TIỆC & CÁCH TRỪ ĐẶT CỌC

> Nguồn gốc: `SOP - INFO - Đặt cọc tiệc và cách trừ đặt cọc` — Department: Information · Owner: wind@kiwooza.com.
> Bản trích xuất TOÀN VĂN (giữ nguyên số tiền, bảng quy đổi, công thức). KHÔNG sửa file gốc.

> Mục đích — nhân viên nắm rõ:
> - Số tiền đặt cọc quy định của từng gói tiệc
> - Chính sách hủy / hoàn tiền cọc
> - Cách nhập tiền cọc lên hệ thống
> - Cách trừ tiền cọc khi thanh toán hoá đơn

---

## 1. Quy định số tiền đặt cọc của từng gói tiệc

| Gói | Tiền cọc |
| --- | --- |
| Booking (KHÔNG có F&B) | **500.000 vnd** |
| Booking (CÓ F&B) | **1.000.000 vnd** |
| Basic / Premium Package | **5.000.000 vnd** |
| Kiwooza Package | **10.000.000 vnd** |

**Liên hệ:**
- Hotline Quận 7: **028 224 966 00**
- Hotline Quận 2: **028 668 527 04**
- Zalo Kiwooza Thiso

---

## 2. Chính sách hủy / hoàn tiền cọc
1. Nhân viên **chủ động giải thích** thủ tục, phí hủy/hoàn và **đề xuất khách giữ khoản cọc như tiền credit / trả trước** (để dùng cho tất cả dịch vụ/sản phẩm tại Kiwooza) cho những lần đến tiếp theo.
2. Nếu khách vẫn muốn hủy/hoàn → nhân viên **xác nhận thủ tục, phí hủy/hoàn** và **thông báo đến BQL** để được hướng dẫn các bước tiếp theo.

---

## 3. Cách nhập tiền cọc lên hệ thống
- **B1:** Nhận hình ảnh chuyển khoản giao dịch / ủy nhiệm chi / …
- **B2:** Truy cập CukCuk (**kwz.cukcuk.vn**) → chọn danh mục **"Thực Đơn"**.
- **B3:** Chọn **"Thêm"**.
- **B4:** Nhập thông tin đầy đủ, chính xác theo mẫu → **"Cất"**.

> ⚠️ **SỐ TIỀN CỌC NHẬP CUKCUK PHẢI LÀ SỐ TIỀN TRƯỚC SERVICE CHARGE VÀ VAT.**
> Để tính số tiền trước SC & VAT: dùng **"Công thức chia VAT/SC"** (file Google Sheets nội bộ) — nhập tiền cọc vào ô → ra số cần nhập CukCuk.

**Bảng quy đổi (cọc khách → số nhập CukCuk):**
| Khách cọc | Số nhập CukCuk |
| --- | --- |
| 500.000 | **440.918** |
| 1.000.000 | **881.835** |
| 5.000.000 | **4.409.172** |
| 10.000.000 | **8.818.343** |

- **B5:** Ra bill CukCuk cho cọc vừa nhập (như một item bình thường).
- **B6:** Gửi hình ảnh + thông tin lên group **KWZ Deposit**, gồm:
  - Hình khách chuyển khoản cọc
  - Hình hoá đơn CukCuk của khoản cọc
  - Chi nhánh, ngày giờ tổ chức tiệc
- **B7:** Nhập thông tin cọc vào **Sales Report**.

---

## 4. Cách trừ cọc khi thanh toán — HOÁ ĐƠN KHÔNG BIA-RƯỢU
- **B1:** Ra bill và **trừ tay tiền cọc trên bill giấy** để khách dễ hiểu.
- **B2:** Khách đồng ý → nhận tiền / quẹt thẻ / QR chuyển khoản.
- **B3:** **Không scan mã trên bill giấy** — scan **mã ngân hàng standee** hoặc nhập tay STK.
- **(Khách thanh toán hoàn tất)**
- **B4:** Sau khi khách thanh toán, thao tác trên CukCuk:
  - Chọn **"Other promotion"** (góc trái phía dưới màn hình).
  - Chọn **Amount**, nhập **tiền cọc TRƯỚC VAT & SC** & **BỎ TICK** ô như hình.
  - VD: khách cọc 5.000.000 → nhập **4.409.171** vào ô Amount.
  - Chọn **Reason:** Deposit / đặt cọc từ ngày …/…/…
  - Payment như bình thường.

---

## 5. Cách trừ cọc khi thanh toán — HOÁ ĐƠN CÓ BIA-RƯỢU
- **B1:** Ra bill và trừ tay tiền cọc trên bill giấy để khách dễ hiểu **(Ghi nhận hoá đơn 1)**.
- **B2:** Khách đồng ý → nhận tiền / quẹt thẻ / QR.
- **B3:** Không scan mã trên bill giấy — scan mã ngân hàng standee hoặc nhập tay STK.
- **(Khách thanh toán hoàn tất)**
- **B4:** Thao tác CukCuk:
  - Chọn **"Other promotion"** (góc trái dưới).
  - Chọn Amount, nhập **tiền cọc TRƯỚC VAT & SC** & BỎ TICK ô như hình.
  - VD: cọc 5.000.000 → nhập 4.409.171 **(Ghi nhận hoá đơn 2)**. ⚠️ **Chưa bấm hoàn tất hoá đơn** lúc này — chỉ in bill giấy để đối chiếu & tính chênh lệch.
- **B5:** Dựa vào 2 hoá đơn giấy **(bill 1)** và **(bill 2)** để tính chênh lệch:
  - Hoá đơn 1 − Hoá đơn 2 = **(A)**
  - Lấy **A ÷ 1,134** = **Phần chênh lệch**
  - **Phần đặt cọc trước thuế&phí − Phần chênh lệch = Phần đặt cọc phải trừ sau cùng (D)**
- **B6:** Nhập **phần tiền cọc sau cùng (D)** vào mục **"Other promotion"** → để hoá đơn ra tổng số tiền **trùng khớp** với "Hoá đơn số 1 — Bước 1" ở trên.

---
*Bản trích xuất phục vụ tạo nội dung đào tạo. Giữ nguyên số tiền, bảng quy đổi và công thức gốc.*
