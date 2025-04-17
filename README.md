# Hệ Thống Khảo Sát Ẩn Danh Sử Dụng Mật Mã Học

## Tổng Quan

Hệ thống khảo sát ẩn danh này được thiết kế để thu thập ý kiến đánh giá từ sinh viên trong khi vẫn đảm bảo tính riêng tư và ẩn danh. Hệ thống sử dụng các kỹ thuật mật mã hiện đại để đảm bảo rằng nhà trường không thể liên kết câu trả lời với từng sinh viên cụ thể, đồng thời vẫn đảm bảo mỗi sinh viên chỉ tham gia một lần duy nhất.

## Các Kỹ Thuật Mật Mã Được Sử Dụng

1. **Blind Signatures** - Để tạo phiếu tham gia ẩn danh
2. **Hash-based Commitments** - Để đảm bảo tính toàn vẹn của quy trình
3. **Public-key Encryption** - Để mã hóa dữ liệu khảo sát
4. **One-time Tokens** - Để đảm bảo mỗi sinh viên chỉ tham gia một lần

## Quy Trình Hoạt Động Chi Tiết

### I. Thiết lập hệ thống (phía nhà trường)

```javascript
// 1. Nhà trường tạo cặp khóa
SchoolPublicKey = "solana4jDk92jf83hDkw9sDn3"
SchoolPrivateKey = "8sKl3nJdk37Lmn5jD92jsDkw" // giữ bí mật

// 2. Nhà trường khởi tạo danh sách sinh viên (lưu dưới dạng hash)
students = [
  "Hash(SV12345)" = "7f4b3d2e1a8c9b6f5d2e3a4b5c6d7e8f",
  "Hash(SV67890)" = "1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p",
  // ...
]

// 3. Tạo khảo sát
surveyID = "SURVEY_LP_NANGCAO_2025"
survey_questions = [
  "Câu 1: Bạn đánh giá thế nào về nội dung môn học?",
  "Câu 2: Bạn đánh giá thế nào về phương pháp giảng dạy?",
  // ...
]
```

### II. Phân phối token (phía nhà trường)

```javascript
// 1. Tạo token ngẫu nhiên cho sinh viên
token_NguyenVanA = "T1-a7b8c9d0-LP2025"

// 2. Lưu hash của token lên blockchain
blockchain.store("Hash(T1-a7b8c9d0-LP2025)" = "3f7d9a1c5e8b2d4f6a0c9e8d7f6a5s4")

// 3. Gửi email cho sinh viên
sendEmail("nguyenvana@email.com", "Token khảo sát: T1-a7b8c9d0-LP2025")
```

### III. Xác thực và tạo phiếu tham gia (phía sinh viên)

```javascript
// 1. Sinh viên Nguyễn Văn A nhận token qua email
initialToken = "T1-a7b8c9d0-LP2025"

// 2. Tạo phiếu tham gia ẩn danh (ngẫu nhiên)
participationTicket = "P-5f4e3d2c1b-2025"

// 3. Tạo giá trị làm mù ngẫu nhiên
blindingFactor = "BF-9e8d7c6b5a-2025"

// 4. Làm mù phiếu tham gia
blindedTicket = blindFunction(participationTicket, blindingFactor)
               = "BT-1a2s3d4f5g6h7j8k9l-2025"

// 5. Gửi cho nhà trường
send_to_school(initialToken, blindedTicket)
```

### IV. Ký phiếu tham gia (phía nhà trường)

```javascript
// 1. Kiểm tra token ban đầu
if (blockchain.contains("Hash(T1-a7b8c9d0-LP2025)") && !token_used) {
    // 2. Ký lên phiếu đã làm mù
    blindedSignedTicket = sign(blindedTicket, SchoolPrivateKey)
                        = "BST-8h7g6f5d4s3a2-2025"

    // 3. Đánh dấu token đã sử dụng
    mark_token_as_used("Hash(T1-a7b8c9d0-LP2025)")

    // 4. Gửi trả phiếu đã ký (vẫn ở dạng mù)
    return blindedSignedTicket
}
```

### V. Sinh viên tạo phiếu tham gia có chữ ký (phía sinh viên)

```javascript
// 1. Nhận phiếu đã ký ở dạng mù
blindedSignedTicket = "BST-8h7g6f5d4s3a2-2025"

// 2. Bỏ mù để lấy phiếu có chữ ký hợp lệ
signedTicket = unblind(blindedSignedTicket, blindingFactor)
             = "ST-3k4j5h6g7f8d9s0-2025"

// Lúc này, phiếu signedTicket đã có chữ ký của nhà trường
// và KHÔNG CÒN liên kết với token ban đầu hay mã số sinh viên
```

### VI. Tạo cam kết và làm khảo sát (phía sinh viên)

```javascript
// 1. Tạo nonce ngẫu nhiên
nonce = "N-7h6g5f4d3s2a1-2025"

// 2. Tạo commitment
commitment = Hash(signedTicket + nonce)
           = "C-9f8e7d6c5b4a3-2025"

// 3. Gửi commitment lên blockchain
blockchain.store(commitment)

// 4. Sinh viên làm khảo sát
surveyAnswers = [
  "Câu 1: Rất hài lòng",
  "Câu 2: Hài lòng",
  // ...
]

// 5. Mã hóa câu trả lời
encryptedAnswers = encrypt(surveyAnswers, SchoolPublicKey)
                 = "EA-5s6d7f8g9h0j1k2l3-2025"
```

### VII. Nộp bài khảo sát (phía sinh viên)

```javascript
// 1. Gửi dữ liệu nộp bài
submit_data = {
  "signedTicket": "ST-3k4j5h6g7f8d9s0-2025",
  "nonce": "N-7h6g5f4d3s2a1-2025",
  "encryptedAnswers": "EA-5s6d7f8g9h0j1k2l3-2025",
  "surveyID": "SURVEY_LP_NANGCAO_2025"
}

// 2. Gửi lên blockchain
blockchain.submit(submit_data)
```

### VIII. Xác nhận và lưu trữ khảo sát (phía smart contract)

```javascript
// 1. Kiểm tra phiếu có chữ ký hợp lệ
if (verify(submit_data.signedTicket, SchoolPublicKey)) {
  // 2. Tính lại commitment để kiểm tra
  calc_commitment = Hash(submit_data.signedTicket + submit_data.nonce)

  // 3. Kiểm tra commitment đã đăng ký và chưa sử dụng
  if (blockchain.contains(calc_commitment) && !used_commitments.contains(calc_commitment)) {
    // 4. Lưu bài khảo sát đã mã hóa
    survey_id = generateRandomID()
    blockchain.store({
      "id": survey_id,
      "surveyType": submit_data.surveyID,
      "encryptedData": submit_data.encryptedAnswers,
      "timestamp": current_time()
    })

    // 5. Đánh dấu commitment đã sử dụng
    used_commitments.add(calc_commitment)

    // 6. Xác nhận thành công
    return "SUCCESS"
  }
}
```

### IX. Xem kết quả khảo sát (phía nhà trường)

```javascript
// 1. Truy vấn tất cả bài khảo sát thuộc một loại
all_surveys = blockchain.query({
  "surveyType": "SURVEY_LP_NANGCAO_2025"
})

// 2. Giải mã từng bài khảo sát
decrypted_surveys = []
for each survey in all_surveys {
  decrypted_data = decrypt(survey.encryptedData, SchoolPrivateKey)
  decrypted_surveys.push(decrypted_data)
}

// 3. Phân tích kết quả (ví dụ: tính tỷ lệ %)
analysis_results = analyze(decrypted_surveys)
```

### X. Kiểm tra tỷ lệ tham gia (phía nhà trường)

```javascript
// 1. Đếm số lượng token đã sử dụng
used_token_count = count_used_tokens()

// 2. Tính tỷ lệ tham gia
participation_rate = (used_token_count / total_students) * 100

// Nhà trường biết Nguyễn Văn A đã tham gia (token của bạn ấy đã được đánh dấu sử dụng)
// Nhưng KHÔNG THỂ biết bài khảo sát cụ thể nào là của Nguyễn Văn A
```

## Đặc điểm bảo mật

- **Tính ẩn danh**: Nhà trường không thể biết bài khảo sát nào thuộc về sinh viên nào
- **Tính toàn vẹn**: Mỗi sinh viên chỉ có thể tham gia khảo sát một lần duy nhất
- **Tính bảo mật**: Dữ liệu khảo sát được mã hóa và chỉ nhà trường mới có thể giải mã
- **Tính minh bạch**: Quy trình được thực hiện trên blockchain, có thể kiểm chứng và theo dõi

## Tham khảo

- [Blind Signature - Wikipedia](https://en.wikipedia.org/wiki/Blind_signature)
- [Commitment Scheme - Wikipedia](https://en.wikipedia.org/wiki/Commitment_scheme)
- [Public-key Cryptography - Wikipedia](https://en.wikipedia.org/wiki/Public-key_cryptography)