const RSSParser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');

const parser = new RSSParser();

async function testSingleCrawl() {
    const rssUrl = 'https://cdn.24h.com.vn/upload/rss/thethao.rss';
    console.log(`Bắt đầu thử nghiệm RSS: ${rssUrl}`);
    
    try {
        const feed = await parser.parseURL(rssUrl);
        console.log(`Thành công! Lấy được ${feed.items.length} tin.`);
        
        if (feed.items.length > 0) {
            const item = feed.items[0];
            console.log(`Thử bóc tách bài đầu tiên: ${item.title}`);
            console.log(`Link: ${item.link}`);
            
            const { data } = await axios.get(item.link, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
            });
            const $ = cheerio.load(data);
            
            // Selector cũ của tôi:
            // title = $('h1.hti').text().trim();
            // description = $('h2.hdesc').text().trim();
            // contentObj = $('#baiviet-container');
            
            let title = $('h1.hti').text().trim();
            let description = $('h2.hdesc').text().trim();
            let coverImage = $('img.pic-detail').first().attr('src') || $('meta[property="og:image"]').attr('content');
            let contentHtml = $('#baiviet-container').html() || '';

            console.log("Title found:", title);
            console.log("Description found length:", description.length);
            console.log("Image found:", coverImage);
            console.log("Content length:", contentHtml.length);
            
            if (!contentHtml) {
                console.log("--- THỬ SELECTOR KHÁC CHO 24H ---");
                // Thử selector phổ biến khác của 24h
                title = $('.article-title').text().trim();
                description = $('.article-summary').text().trim();
                contentHtml = $('.article-content').html() || '';
                console.log("Alternative Content length:", contentHtml.length);
            }
        }
    } catch (error) {
        console.error("Lỗi:", error.message);
    }
}

testSingleCrawl();
