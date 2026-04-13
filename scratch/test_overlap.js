const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function testSingleCrawl() {
    const testUrl = 'https://www.24h.com.vn/tin-tuc-trong-ngay/nguoi-dan-ong-lao-xuong-song-cuu-hai-me-con-nhay-cau-o-nghe-an-c46a1558296.html';
    
    try {
        const { data } = await axios.get(testUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        
        const commonJunk = [
            'header', 'footer', '.col-right', '.sidebar', '.adt_box', '.adt_banner', 
            '.baiviet-lienquan', '.bv-lq', '.box-tin-lien-quan', '.social-share', 
            // ...
        ].join(', ');
        
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
                $(el).removeAttr('data-original');
            }
            $(el).removeAttr('class');
            $(el).removeAttr('style');
            $(el).removeAttr('width');
            $(el).removeAttr('height');
        });

        // LOẠI BỎ RÁC 24H MỚI PHÁT HIỆN
        const newJunk = [
            '.btn-save-news', '.btn-save-24h', '.cv19-sha-social', '.box-share-send-bv',
            '.nguontin', '.source-time-art24h', '.bmTpSeoBlk', '#popup_save_news_result',
            '.cate-24h-foot-arti-deta-social', '.btn-kd-social', '.mar-b-30'
        ].join(', ');

        contentObj.find(commonJunk).remove();
        contentObj.find(newJunk).remove();
        contentObj.find('.source, .author, .date, .time').remove();
        contentObj.find('script, style, iframe:not([src*="youtube.com"]):not([src*="vimeo.com"])').remove();

        fs.writeFileSync('scratch/crawled.html', contentObj.html());
        console.log("HTML Saved");

    } catch (error) {
        console.error("Lỗi:", error.message);
    }
}
testSingleCrawl();
