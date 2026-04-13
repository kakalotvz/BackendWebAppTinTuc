const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    // The specific article the user is referring to "Người đàn ông lao xuống sông cứu..."
    // Because I need to find the boat overlapping bug which is specific to this article!
    const activeUrl = 'https://www.24h.com.vn/tin-tuc-trong-ngay/nguoi-dan-ong-dung-cam-lao-xuong-dong-nuoc-chay-xiet-cuu-2-me-con-nhay-cau-tu-tu-c46a1752834.html';

    try {
        const { data } = await axios.get(activeUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        const articleBody = $('#article_body');

        articleBody.find('*').each((i, el) => {
            const style = $(el).attr('style') || '';
            const cls = $(el).attr('class') || '';
            if (style.includes('background') || style.includes('position: absolute') || style.includes('url(')) {
                console.log(`STYLE FOUND: Tag=${el.tagName}, class=${cls}, style="${style}"`);
            }
            if (cls.includes('bg') || cls.includes('pos-abs')) {
                 console.log(`CLASS FOUND: Tag=${el.tagName}, class=${cls}`);
            }
        });

    } catch (e) {
        console.error("404 Error! Trying alternative...");
        const altUrl = 'https://www.24h.com.vn/tin-tuc-trong-ngay/nguoi-dan-ong-lao-xuong-song-cuu-hai-me-con-nhay-cau-o-nghe-an-c46a1558296.html';
        try {
            const res = await axios.get(altUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            console.log("Alternative worked!");
            const $ = cheerio.load(res.data);
            const articleBody = $('#article_body');
            articleBody.find('*').each((i, el) => {
                const style = $(el).attr('style') || '';
                if (style.includes('background') || style.includes('position: absolute') || style.includes('url(')) {
                    console.log(`STYLE FOUND: Tag=${el.tagName}, style="${style}"`);
                }
            });
        } catch (e2) {
             console.log("Alternative also failed", e2.message);
        }
    }
}
test();
