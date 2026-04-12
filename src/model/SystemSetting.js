const mongoose = require('mongoose');

const SystemSettingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true }, // VD: 'crawler_settings'
    value: { type: mongoose.Schema.Types.Mixed, required: true }, // Lưu JSON cấu hình
}, { timestamps: true });

module.exports = mongoose.model('SystemSetting', SystemSettingSchema);
