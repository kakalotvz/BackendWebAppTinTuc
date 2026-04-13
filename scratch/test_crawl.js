const RSSParser = require('rss-parser');
const axios = require('axios');
const cheerio = require('cheerio');

const parser = new RSSParser();

async function testSingleCrawl() {
    const testUrl = 'https://www.24h.com.vn/tin-tuc-trong-ngay/sieu-bao-sinlaku-dang-manh-nhat-the-gioi-nam-2026-c46a1752857.html';
    console.log(`Bắt đầu thử nghiệm crawl URL: ${testUrl}`);
    
    try {
        const { data } = await axios.get(testUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        const $ = cheerio.load(data);
        
        const commonJunk = [
            'header', 'footer', '.col-right', '.sidebar', '.adt_box', '.adt_banner', 
            '.baiviet-lienquan', '.bv-lq', '.box-tin-lien-quan', '.social-share', 
            '.cate-path', '.back-home-fixed', '.back-top', '.comment-container',
            '.related-news-container', '.tin-bai-lien-quan', '.box-video-highlight', 
            '.box-tin-moi-nhat', '#id_a_box_video_highlight', '.view-more-related', 
            '.ads-container', '.baiviet-bailienquan', '.cate-24h-foot-arti-deta-sum',
            '.article-more', '.box-sticky-ads', '.view-more-wrap', '.video-related', 
            '.box-ads', '.view-more-info', '.article-footer', '.widget-container',
            '.box-share', '.breadcrumb', '.TextlinkBaiviet', '.url_tin_lien_quan_trong_bai', 
            '.see-now', 'div[id^="ADS"]', '.article-meta', '.article-utility', '#article_meta'
        ].join(', ');

        let title = $('h1').first().text().trim();
        let description = $('#article_sapo').text().trim() || $('.cate-24h-foot-arti-deta-sum').text().trim() || $('h2.hdesc').text().trim();
        let coverImage = $('meta[property="og:image"]').attr('content') || $('img.pic-detail').first().attr('src');
        
        const contentObj = $('#article_body');

        // Logic lazy load và lọc logo
        contentObj.find('img').each((i, el) => {
            const dataOriginal = $(el).attr('data-original');
            const src = $(el).attr('src');
            
            if ((src && src.includes('logo')) || (dataOriginal && dataOriginal.includes('logo'))) {
                $(el).remove();
                return;
            }

            if (dataOriginal) {
                $(el).attr('src', dataOriginal);
            }
        });

        contentObj.find(commonJunk).remove();
        contentObj.find('.bv-sk-lb-cs, .bv-lb-cs, .author, .updTme, .source, .time').remove();
        contentObj.find('script, style, iframe:not([src*="youtube.com"]):not([src*="vimeo.com"])').remove();

        console.log("Title found:", title);
        console.log("Description found:", description.substring(0, 100) + "...");
        console.log("Image found:", coverImage);
        
        const contentHtml = contentObj.html() || '';
        console.log("Content length:", contentHtml.length);
        
        // Kiểm tra xem có ảnh trong content không
        const imagesCount = contentObj.find('img').length;
        console.log("Images count in content:", imagesCount);
        
        contentObj.find('img').each((i, el) => {
            console.log(`Image ${i+1} src:`, $(el).attr('src'));
        });

    } catch (error) {
        console.error("Lỗi:", error.message);
    }
}

testSingleCrawl();
