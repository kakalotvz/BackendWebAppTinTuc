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

        // Danh sách các selector rác cần loại bỏ (Dùng cho cả 2 site)
        const commonJunk = [
            'header', 'footer', '.col-right', '.sidebar', '.adt_box', '.adt_banner', 
            '.baiviet-lienquan', '.bv-lq', '.box-tin-lien-quan', '.social-share', 
            '.cate-path', '.back-home-fixed', '.back-top', '.comment-container',
            '.related-news-container', '.tin-bai-lien-quan', '.box-video-highlight', 
            '.box-tin-moi-nhat', '#id_a_box_video_highlight', '.view-more-related', 
            '.ads-container', '.baiviet-bailienquan', '.cate-24h-foot-arti-deta-sum',
            '.article-more', '.box-sticky-ads', '.view-more-wrap', '.video-related', 
            '.box-ads', '.view-more-info', '.article-footer', '.widget-container',
            '.box-share', '.cate-24h-foot-arti-deta-sum', '.breadcrumb'
        ].join(', ');

        if (url.includes('vnexpress.net')) {
            title = $('h1.title-detail').text().trim();
            description = $('p.description').text().trim() || $('meta[property="og:description"]').attr('content');
            coverImage = $('article.fck_detail img').first().attr('src') || $('meta[property="og:image"]').attr('content');
            
            const contentObj = $('article.fck_detail');
            contentObj.find(commonJunk + ', .list-news, .insert-link-article, .banner-ads, .tplCaption').remove();
            contentHtml = contentObj.html() || '';
        } 
        else if (url.includes('24h.com.vn')) {
            title = $('h1').first().text().trim();
            description = $('.cate-24h-foot-arti-deta-sum').text().trim() || $('h2.hdesc').text().trim();
            coverImage = $('img.pic-detail').first().attr('src') || $('meta[property="og:image"]').attr('content');
            
            const contentObj = $('#article_body');
            // 24h hay có tin liên quan xen kẽ trong bài
            contentObj.find(commonJunk + ', .baiviet-bailienquan, .view-more-related').remove();
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
    if (!apiKey) return { ...article, tags: [], isAi: false };

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
Tiêu đề: ${article.title}
Mô tả: ${article.description}
Nội dung HTML: ${article.contentHtml}
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Clean text if AI adds markdown code blocks
        text = text.replace(/```json|```/g, '').trim();
        const rewritten = JSON.parse(text);

        return {
            ...article,
            title: rewritten.title || article.title,
            description: rewritten.description || article.description,
            contentHtml: rewritten.content || article.contentHtml,
            tags: rewritten.tags || [],
            isAi: true
        };
    } catch (error) {
        console.error("Lỗi AI Rewrite:", error.message);
        return { ...article, tags: [], isAi: false }; 
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

    const maxItems = settings.maxArticles || 10;
    console.log(`--- Đang quét nguồn: ${config.name} (Chế độ: ${config.crawlMode}, Giới hạn: ${maxItems}) ---`);
    try {
        const feed = await parser.parseURL(config.url);
        let count = 0;
        const totalItems = feed.items.length;
        
        for (let i = 0; i < totalItems; i++) {
            if (count >= maxItems) break;
            const item = feed.items[i];

            // --- Kiểm tra ngày ---
            if (config.crawlMode !== 'all') {
                const itemDate = new Date(item.isoDate || item.pubDate);
                const start = config.startDate ? new Date(config.startDate) : null;
                const end = config.endDate ? new Date(config.endDate) : null;

                if (config.crawlMode === 'specific_day' && start) {
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

            // Bắn tín hiệu progress realtime
            if (global.io) {
                global.io.emit('crawler:progress', {
                    current: count + 1,
                    total: Math.min(maxItems, totalItems),
                    title: item.title.length > 60 ? item.title.substring(0, 60) + "..." : item.title,
                    source: config.name
                });
            }

            console.log(`Đang xử lý [${count + 1}]: ${item.title}`);
            
            // 1. Scrape nội dung
            let scraped = await scrapeContent(item.link);
            if (!scraped || !scraped.contentHtml) continue;

            // 2. Rewrite với AI
            let finalData = await rewriteWithGemini(settings.geminiKey, scraped);

            // 3. Lưu vào DB
            await BaiViet.create({
                title: finalData.title,
                anhBia: finalData.coverImage,
                moTaNgan: finalData.description,
                noiDungChinh: finalData.contentHtml,
                tags: finalData.tags || [],
                theLoai: config.targetCategory,
                status: false,
                originUrl: item.link,
                isAiGenerated: finalData.isAi || false
            });

            count++;
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

        if (global.io) global.io.emit('crawler:status', { running: true, message: "Khởi động..." });
        for (const config of configs) {
            await runCrawlSource(config, settings);
        }
        if (global.io) global.io.emit('crawler:status', { running: false, message: "Hoàn tất!" });
    } catch (error) {
        console.error("Lỗi khởi chạy Crawler:", error.message);
    }
};

module.exports = { startCrawler };
