import NodeMediaServer from 'node-media-server';

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 3037,
    allow_origin: '*'
  },
  trans: {
    ffmpeg: '/Users/dangtin306/Downloads/ffmpeg',
    tasks: [
      {
        // Ứng dụng live1: Publish stream tới rtmp://your-server-ip:1935/live1/streamKey
        app: 'live1',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        dash: true,
        dashFlags: '[f=dash:window_size=3:extra_window_size=5]',
        ac: 'aac',
        args: '-vn'
      },
      {
        // Ứng dụng live2: Publish stream tới rtmp://your-server-ip:1935/live2/streamKey
        app: 'live2',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        ac: 'aac',
        args: '-vn'
      }
    ]
  }
};

const nms = new NodeMediaServer(config);
nms.run();

console.log('Node-Media-Server is running on HTTP port 3037...');
