// api/itag.js

const ytdl = require('ytdl-core');

module.exports = async (req, res) => {
    // 必須: CORSを許可し、JSON形式で応答するためのヘッダーを設定
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    // クエリパラメータから 'v' (videoId) を取得
    const videoId = req.query.v;

    if (!videoId) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Video ID (v) パラメータが不足しています。例: /itag?v=xxxxxxxx' }));
    }

    try {
        const info = await ytdl.getInfo(videoId);

        // 必要な情報のみを抽出・整形
        const itags = info.formats
            // 動画または音声のビットレートを持つフォーマットのみにフィルタ
            .filter(format => format.itag && (format.qualityLabel || format.audioBitrate || format.bitrate))
            .map(format => ({
                // itagは文字列として扱う
                itag: format.itag.toString(),
                // 拡張子 (コンテナ)
                ext: format.container || (format.mimeType ? format.mimeType.split('/')[1].split(';')[0] : 'unknown'),
                // 解像度、音声のみの場合は 'audio only'
                resolution: format.qualityLabel || (format.audioBitrate ? 'audio only' : 'unknown'),
                // 動画コーデック。存在しない場合は 'none'
                vcodec: format.videoCodec || 'none',
                // 音声コーデック。存在しない場合は 'none'
                acodec: format.audioCodec || 'none',
                // URLはセキュリティ上の理由で含めないが、必要なら追加可能
                // url: format.url, 
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
        res.statusCode = 500;
        res.end(JSON.stringify({ error: `動画情報の取得中にエラーが発生しました: ${error.message}` }));
    }
};
