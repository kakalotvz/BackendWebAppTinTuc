const RSSParser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const BaiViet = require('../../model/BaiViet');
const CrawlerConfig = require('../../model/CrawlerConfig');
const SystemSetting = require('../../model/SystemSetting');

const parser = new RSSParser();

/**
 * Lấy API Key và cấu hình từ DB
 */
const getCrawlerSettings = async () => {
    const setting = await SystemSetting.findOne({ key: 'crawler_settings' });
    return setting ? setting.value : null;
};

/**
 * Bóc tách nội dung chi tiết từ URL (VnExpress / 24h)
 */
const scrapeContent = async (url) => {
    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const $ = cheerio.load(data);
        let title = '', description = '', contentHtml = '', coverImage = '';

        if (url.includes('vnexpress.net')) {
            title = $('h1.title-detail').text().trim();
            description = $('p.description').text().trim();
            coverImage = $('article.fck_detail img').first().attr('src') || $('meta[property="og:image"]').attr('content');
            
            // Lấy nội dung, loại bỏ các phần thừa
            const contentObj = $('article.fck_detail');
            contentObj.find('.list-news, .insert-link-article, .banner-ads').remove();
            contentHtml = contentObj.html() || '';
        } 
        else if (url.includes('24h.com.vn')) {
            title = $('h1.hti').text().trim();
            description = $('h2.hdesc').text().trim();
            coverImage = $('img.pic-detail').first().attr('src') || $('meta[property="og:image"]').attr('content');
            
            const contentObj = $('#baiviet-container');
            contentObj.find('.view-more-related, .ads-container').remove();
            contentHtml = contentObj.html() || '';
        }

        return { title, description, contentHtml, coverImage };
    } catch (error) {
        console.error(`Lỗi scrape content từ ${url}:`, error.message);
        return null;
    }
};

/**
 * Gọi Gemini AI để viết lại nội dung
 */
const rewriteWithGemini = async (apiKey, article) => {
    if (!apiKey) return article;

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
Bạn là một biên tập viên báo chí chuyên nghiệp. Hãy viết lại bài báo sau đây để có văn phong mới mẻ, hấp dẫn hơn nhưng vẫn giữ nguyên ý nghĩa gốc và các sự thật (facts).

Yêu cầu cực kỳ quan trọng:
1. GIỮ NGUYÊN tất cả các thẻ HTML như <img> (cả thuộc tính src, alt), <a> (cả thuộc tính href). Không được thay đổi hay xóa bỏ chúng.
2. Viết lại: Tiêu đề (title), Mô tả ngắn (description) và Nội dung chính (content).
3. Ngôn ngữ: Tiếng Việt.
4. Trả về kết quả dưới định dạng JSON có cấu trúc:
{
  "title": "tiêu đề mới",
  "description": "mô tả mới",
  "content": "nội dung HTML mới đã được biên tập"
}

Nội dung gốc:
Tiêu đề: ${article.title}
Mô tả: ${article.description}
Nội dung HTML: ${article.contentHtml}
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Clean text if AI adds markdown code blocks
        const jsonStr = text.replace(/```json|```/g, '').trim();
        const rewritten = JSON.parse(jsonStr);

        return {
            ...article,
            title: rewritten.title || article.title,
            description: rewritten.description || article.description,
            contentHtml: rewritten.content || article.contentHtml
        };
    } catch (error) {
        console.error("Lỗi AI Rewrite:", error.message);
        return article; // Trả về bản gốc nếu lỗi AI
    }
};

/**
 * Tiến hành chạy Crawler cho một cấu hình nguồn
 */
const runCrawlSource = async (config, settings) => {
    if (config.isPaused) {
        console.log(`--- Nguồn ${config.name} đang TẠM DỪNG. Bỏ qua. ---`);
        return;
    }

    console.log(`--- Đang quét nguồn: ${config.name} (Chế độ: ${config.crawlMode}) ---`);
    try {
        const feed = await parser.parseURL(config.url);
        
        for (const item of feed.items) {
            // --- Kiểm tra ngày ---
            if (config.crawlMode !== 'all') {
                const itemDate = new Date(item.isoDate || item.pubDate);
                const start = config.startDate ? new Date(config.startDate) : null;
                const end = config.endDate ? new Date(config.endDate) : null;

                if (config.crawlMode === 'specific_day' && start) {
                    // Cùng ngày (bỏ qua giờ)
                    if (itemDate.toDateString() !== start.toDateString()) continue;
                } 
                else if (config.crawlMode === 'date_range') {
                    if (start && itemDate < start) continue;
                    if (end && itemDate > end) continue;
                }
            }

            // Kiểm tra bài viết đã tồn tại chưa
            const exists = await BaiViet.findOne({ originUrl: item.link });
            if (exists) continue;

            console.log(`Đang xử lý bài: ${item.title} (${item.isoDate || item.pubDate})`);
            
            // 1. Scrape nội dung
            let scraped = await scrapeContent(item.link);
            if (!scraped || !scraped.contentHtml) continue;

            // 2. Rewrite với AI
            let finalData = scraped;
            if (settings && settings.geminiKey) {
                finalData = await rewriteWithGemini(settings.geminiKey, scraped);
            }

            // 3. Lưu vào DB (Draft/Pending)
            await BaiViet.create({
                title: finalData.title,
                anhBia: finalData.coverImage,
                moTaNgan: finalData.description,
                noiDungChinh: finalData.contentHtml,
                theLoai: config.targetCategory,
                status: false, // Bài viết chờ duyệt
                originUrl: item.link
            });

            console.log(`✅ Đã lưu bài: ${finalData.title}`);
        }

        // Cập nhật thời gian chạy cuối
        config.lastRun = new Date();
        await config.save();

    } catch (error) {
        console.error(`Lỗi khi chạy nguồn ${config.name}:`, error.message);
    }
};

/**
 * Hàm khởi chạy toàn bộ crawler
 */
const startCrawler = async () => {
    try {
        const settings = await getCrawlerSettings();
        const configs = await CrawlerConfig.find({ isActive: true });

        for (const config of configs) {
            await runCrawlSource(config, settings);
        }
    } catch (error) {
        console.error("Lỗi khởi chạy Crawler:", error.message);
    }
};

module.exports = { startCrawler };
