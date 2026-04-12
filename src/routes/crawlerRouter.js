const express = require('express');
const router = express.Router();
const CrawlerConfig = require('../model/CrawlerConfig');
const SystemSetting = require('../model/SystemSetting');
const { startCrawler } = require('../services/Crawler/crawlerService');

// --- Quản lý Nguồn Crawler ---
router.get('/config', async (req, res) => {
    try {
        const configs = await CrawlerConfig.find().populate('targetCategory');
        res.json(configs);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/config', async (req, res) => {
    try {
        const config = await CrawlerConfig.create(req.body);
        res.status(201).json(config);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.put('/config/:id', async (req, res) => {
    try {
        const config = await CrawlerConfig.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(config);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.delete('/config/:id', async (req, res) => {
    try {
        await CrawlerConfig.findByIdAndDelete(req.params.id);
        res.json({ message: 'Đã xóa cấu hình' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// --- Cài đặt Hệ thống ---
router.get('/settings', async (req, res) => {
    try {
        let setting = await SystemSetting.findOne({ key: 'crawler_settings' });
        if (!setting) {
            setting = await SystemSetting.create({ key: 'crawler_settings', value: { geminiKey: '', frequency: '6h' } });
        }
        res.json(setting.value);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

router.post('/settings', async (req, res) => {
    try {
        const setting = await SystemSetting.findOneAndUpdate(
            { key: 'crawler_settings' },
            { value: req.body },
            { new: true, upsert: true }
        );

        // Làm mới lịch quét tự động ngay lập tức
        if (global.refreshCrawlerCron) {
            global.refreshCrawlerCron();
        }

        res.json(setting.value);
    } catch (e) { res.status(500).json({ message: e.message }); }
});

// --- Kích hoạt Thủ công ---
router.post('/run-now', async (req, res) => {
    try {
        // Run in background
        startCrawler();
        res.json({ message: 'Crawler đang bắt đầu chạy ngầm...' });
    } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
