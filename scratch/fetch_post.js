const https = require('https');
const fs = require('fs');

https.get('https://backendwebapptintuc-backendwebapptintuc.up.railway.app/api/bai-viet/get-detail-bai-viet?id=69dc8198ee5dec8091b41bbc', res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            const content = parsed.data ? parsed.data.noiDungChinh : parsed.noiDungChinh;
            // Write just the text parts
            fs.writeFileSync('scratch/post_dump.json', JSON.stringify(parsed, null, 2));
            console.log("Saved to scratch/post_dump.json");
        } catch(e) {
            console.error("JSON parse error: ", e);
            fs.writeFileSync('scratch/post_dump.txt', data);
        }
    });
});
