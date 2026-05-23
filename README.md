# VHLIGHTING Sales - Fixed Supabase Build

Đã dán trực tiếp đúng Supabase Project URL:

https://jrkmhalznaxsskazyggt.supabase.co

và Publishable key vào `src/App.jsx`.

## Cách upload lại

1. Giải nén file zip.
2. Vào GitHub repo cũ.
3. Xóa hoặc ghi đè toàn bộ file cũ bằng bộ file này.
4. Commit changes.
5. Vercel sẽ tự deploy lại.

## Nếu Supabase vẫn không online

Vào Supabase > SQL Editor, chạy lại file `supabase.sql`.
Sau đó mở web và bấm Ctrl + F5.


## Bản tối ưu quản lý sản phẩm
- Có nút Sửa để sửa mã, tên, đơn vị tính, giá, tồn kho.
- Có bảng `product_groups` để tạo nhóm sản phẩm.
- Sản phẩm có cột `group_code` để gán vào nhóm như `rncc`, `tan-quang`, `thanh-ray-nam-cham`.
- Cần chạy lại file `supabase.sql` trong Supabase SQL Editor để thêm bảng nhóm.


## Bản sửa tiếp
- Bán hàng nhanh: nhập được mã sản phẩm, tên sản phẩm hoặc mã/tên nhóm sản phẩm.
- Nếu nhập nhóm sản phẩm, hệ thống thêm toàn bộ sản phẩm thuộc nhóm đó vào hóa đơn.
- Quản lý sản phẩm: nút `Sửa mã / tồn` rõ ràng hơn để sửa mã, tên, giá, tồn kho và nhóm.


## Bản bỏ tồn kho
- Giao diện quản lý sản phẩm chỉ còn: Nhóm sản phẩm, Tên sản phẩm, Đơn vị tính, Giá tiền.
- Không kiểm tra tồn kho khi bán hàng.
- Bán hàng nhanh vẫn nhập được nhóm sản phẩm hoặc tên sản phẩm.


## Bản gợi ý bán hàng nhanh
- Khi nhập tên/SĐT khách hàng, website tự hiện gợi ý khách cũ.
- Khi nhập mã/tên/nhóm sản phẩm, website tự hiện gợi ý sản phẩm và nhóm.
- Bấm vào gợi ý để chọn nhanh, sau đó bấm thêm vào hóa đơn.


## Bản danh mục rút gọn
- Quản lý sản phẩm hiển thị theo danh mục/nhóm.
- Bấm vào từng danh mục để mở các mã hàng đã thêm vào trước.
- Giúp gom các mã hàng liên quan chung vào một mục sản phẩm.
