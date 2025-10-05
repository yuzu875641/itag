// api/itag.js

const ytdl = require('ytdl-core');

module.exports = async (req, res) => {
    // CORSを許可し、JSON形式で応答するためのヘッダーを設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    // クエリパラメータから 'v' (videoId) を取得
    const videoId = req.query.v;

    if (!videoId) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ 
            error: 'Video ID (v) パラメータが不足しています。例: /api/itag?v=xxxxxxxx' 
        }));
    }

    try {
        // 動画情報を取得
        const info = await ytdl.getInfo(videoId);

        // 必要なitag情報を抽出・整形
        const itags = info.formats
            // itagがあり、かつ品質情報（動画または音声）を持つフォーマットにフィルタ
            .filter(format => format.itag && (format.qualityLabel || format.audioBitrate || format.bitrate))
            .map(format => ({
                // itagは文字列として扱う
                itag: format.itag.toString(),
                // 拡張子 (コンテナ)
                ext: format.container || (format.mimeType ? format.mimeType.split('/')[1].split(';')[0] : 'unknown'),
                // 解像度。音声のみの場合は 'audio only'
                resolution: format.qualityLabel || (format.audioBitrate ? 'audio only' : 'unknown'),
                // 動画コーデック。存在しない場合は 'none'
                vcodec: format.videoCodec || 'none',
                // 音声コーデック。存在しない場合は 'none'
                acodec: format.audioCodec || 'none',
            }));

        const response = {
            videoId: videoId,
            title: info.videoDetails.title,
            itags: itags
        };

        res.statusCode = 200;
        res.end(JSON.stringify(response, null, 2)); // 整形されたJSONで応答

    } catch (error) {
        console.error(`Error fetching info for video ID ${videoId}:`, error.message);

        let statusCode = 500;
        let errorMessage = `動画情報の取得中に予期せぬエラーが発生しました: ${error.message}`;

        // 動画が見つからない/利用できない場合のエラーハンドリング
        if (error.message && (error.message.includes('Status code: 410') || error.message.includes('No video id found'))) {
            statusCode = 404;
            errorMessage = `動画ID '${videoId}' はYouTube上で見つからないか、非公開/削除されています。`;
        } else if (error.message && error.message.includes('Status code: 403')) {
            statusCode = 403;
            errorMessage = `動画ID '${videoId}' はアクセスが拒否されました（地域制限など）。`;
        }

        res.statusCode = statusCode;
        res.end(JSON.stringify({ error: errorMessage }));
    }
};
