const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testAI() {
    const apiKey = "AIzaSyAcIdQnuJDozsB1jVI2-oH0dGzbFm3YKy0";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Try 2.5-flash

    const prompt = `
Bạn là một biên tập viên báo chí chuyên nghiệp. Hãy viết lại bài báo sau đây để có văn phong mới mẻ, hấp dẫn hơn nhưng vẫn giữ nguyên ý nghĩa gốc và các sự thật (facts).

Yêu cầu cực kỳ quan trọng:
1. GIỮ NGUYÊN tất cả các thẻ HTML như <img> (cả thuộc tính src, alt), <a> (cả thuộc tính href). Không được thay đổi hay xóa bỏ chúng.
2. Viết lại hoàn toàn: Tiêu đề (title), Mô tả ngắn (description) và Nội dung chính (content).
3. KHÔNG ĐƯỢC nhắc đến tên nguồn báo gốc, tên phóng viên hay các cụm từ "Theo...", "Báo ... đưa tin". Hãy viết như thể đây là tin độc quyền của bạn.
4. Ngôn ngữ: Tiếng Việt, văn phong hiện đại, lôi cuốn.
5. Đề xuất 3-5 tag (từ khóa) phù hợp nhất với bài viết này.
6. Tuyệt đối LOẠI BỎ các phần: Quảng cáo, tin liên quan, kêu gọi theo dõi, các bảng tỷ số, các đoạn văn có nội dung mời gọi xem thêm bài khác (như "Bấm xem", "Video bóng đá...").
7. Trả về kết quả DUY NHẤT dưới định dạng JSON có cấu trúc sau (không kèm markdown):
{
  "title": "tiêu đề mới",
  "description": "mô tả mới",
  "content": "nội dung HTML mới đã được biên tập",
  "tags": ["tag1", "tag2", "tag3"]
}

Nội dung gốc:
Tiêu đề: Thủ tướng Lê Minh Hưng chủ trì Lễ đón Thủ tướng Slovakia thăm Việt Nam
Mô tả: Thủ tướng Lê Minh Hưng đón Thủ tướng Slovakia Robert Fico thăm Việt Nam - vị khách quốc tế đầu tiên trên cương vị Thủ tướng.
Nội dung HTML: <p>Sáng 13-4, tại Phủ Chủ tịch, Thủ tướng Chính phủ Lê Minh Hưng đã chủ trì Lễ đón chính thức Thủ tướng Cộng hòa Slovakia Robert Fico thăm chính thức Việt Nam từ ngày 12 đến 14-4.</p>
`;

    try {
        const result = await model.generateContent(prompt);
        console.log("RESPONSE:", result.response.text());
    } catch(e) {
        console.error("ERROR:", e);
    }
}
testAI();
