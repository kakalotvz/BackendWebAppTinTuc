const mongoose = require('mongoose');

const CrawlerConfigSchema = new mongoose.Schema({
    name: { type: String, required: true }, // Tên nguồn (VD: VnExpress Tin mới)
    url: { type: String, required: true },  // Link RSS
    targetCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'TheLoai', required: true }, // Danh mục mục tiêu
    isActive: { type: Boolean, default: true },
    isPaused: { type: Boolean, default: false }, // Tạm dừng
    crawlMode: { type: String, enum: ['all', 'date_range', 'specific_day'], default: 'all' },
    startDate: { type: Date },
    endDate: { type: Date },
    lastRun: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('CrawlerConfig', CrawlerConfigSchema);
