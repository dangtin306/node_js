import querystring from 'querystring';
import { URL } from 'url'; // Thay vì url.parse(req.url)
import axios from 'axios';
// Importing modules with the ECMAScript import syntax
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import FormData from 'form-data';
import { Readable } from 'stream';
import * as lamejs from '@breezystack/lamejs';
// Phân tích URL
// Giả sử có req được truyền vào
export default async function get_text_image(req, res) {
    // Kiểm tra xem phương thức có phải là GET hay không
    // if (req.method != 'GET') {
    //     // Trả về mã trạng thái 405 nếu không phải là GET
    //     return res.status(405).send('Method Not Allowed. Please use GET method.');
    // }
    // else
    if (req.url.includes('/text_image_search')) {
        // Trả về mã trạng thái 405 nếu không phải là GET
        // Lấy giá trị của tham số "123"
        const google_search = req.query['google_search'];
        const web_partner = req.query['web_partner'];
        try {
            // Chờ fetchData hoàn thành
            const fetchDataResponse = await fetchData(google_search, web_partner);
            console.log(fetchDataResponse);
            // Sau khi fetchData chạy xong, gửi phản hồi với giá trị tham số
            res.send(fetchDataResponse);
        } catch (error) {
            // Xử lý lỗi nếu fetchData không thành công
            res.status(500).send('Error fetching data');
        }
    } else if (req.url.includes('/text_speech')) {
        // Lấy query string từ URL
        const { voice_data, randomNumber } = req.body;  // Lấy dữ liệu JSON từ req.body
        // Xử lý dữ liệu JSON
        console.log(req.body);
        console.log('voice_data:', voice_data);
        console.log('randomNumber:', randomNumber);
        text_speech(voice_data, randomNumber);
        return res.status(200).send('thanks.');
    } else if (req.url.includes('/speech_text')) {
        // Lấy query string từ URL
        const { voice_data, randomNumber } = req.body;  // Lấy dữ liệu JSON từ req.body
        // Xử lý dữ liệu JSON
        // console.log(voice_data);
        speech_text(voice_data);
        return res.status(200).send('ok');
    } else {
        // Trả về mã trạng thái 405 nếu không phải là GET
        // return res.status(405).send('Not found.');
    }

}
function decodeData(data) {
    const lines = data.split('\n');
    let formattedString = lines;
    return {
        formattedString
    };
}

async function fetchData(google_search, web_partner) {
    try {
        // Sử dụng await để chờ Promise.all hoàn thành
        const [response1, response2] = await Promise.all([
            axios.get('http://vip.tecom.pro:8787/text_easyocr?value=' + google_search),
            axios.get('http://vip.tecom.pro:8787/text_easyocr?value=' + web_partner)
        ]);

        // Chỉ chạy khi cả hai lệnh API đều hoàn thành
        console.log('Response 1:', response1.data);
        console.log('Response 2:', response2.data);

        // Trả về dữ liệu của response1 hoặc response2 (tùy vào yêu cầu của bạn)
        return { data1: response1.data, data2: response2.data };
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error; // Ném lỗi lên để có thể được xử lý ở nơi gọi hàm
    }
}


function uploadMp3File(filePath, serverEndpoint) {
    // Create a FormData instance
    const form = new FormData();

    // Append the file to the form data
    form.append('file', fs.createReadStream(filePath), path.basename(filePath));
    // Log the form-data headers (this includes the boundary)
    console.log(form)
}
function speech_text(voice_data) {
    // console.log(voice_data);
    // Gọi hàm và lưu vào file .mp3
    // const filePath = path.join(__dirname, 'output.mp3');
    // Example usage:
    const outputFormat = 'mp3';  // Output format (mp3, m4a, ogg, wav, etc.)
    const filePath = 'C:\\hustmedia2\\truyenthanh\\ai\\speech_text.mp3';  // Full path where the file will be saved
    saveBase64ToFile(voice_data, filePath, outputFormat);
}
// Hàm để lưu file mp3 từ chuỗi base64
function saveBase64ToFile(base64Data, filePath, outputFormat) {
    // Remove metadata from base64 string
    const base64Audio = base64Data.includes('base64,') ? base64Data.split(',')[1] : base64Data;

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(base64Audio, 'base64');

    // Write the buffer to a temporary file
    const tempFilePath = 'temp_audio_input';
    fs.writeFileSync(tempFilePath, audioBuffer);

    // Convert to the desired format using fluent-ffmpeg
    ffmpeg(tempFilePath)
        .toFormat(outputFormat)  // Specify the desired output format: 'mp3', 'wav', etc.
        .on('end', () => {
            console.log(`Audio has been converted and saved to ${filePath}`);
            fs.unlinkSync(tempFilePath);  // Clean up temp file
        })
        .on('error', (err) => {
            console.error(`Error: ${err.message}`);
        })
        .save(filePath);  // Save the converted file to the desired path

}
function text_speech(voice_data, randomNumber) {
    console.log(randomNumber);
    const pcmArray = JSON.parse(voice_data.data.array);
    // Bước 1: Lấy sampling_rate và PCM array từ JSON
    const samplingRate = voice_data.data.sampling_rate; // Lấy sampling_rate
    // Step 2: Convert the array into a Buffer
    console.log(samplingRate);
    // Bước 1: Chuyển mảng PCM thành Buffer
    // Bước 2: Khởi tạo LameJS encoder
    // Bước 2: Khởi tạo LameJS encoder
    const mp3Encoder = new lamejs.Mp3Encoder(1, samplingRate, 128);  // 1: số kênh (mono), 128: bitrate

    // Bước 3: Mã hóa PCM array thành MP3
    const maxSamples = 1152;  // Số mẫu PCM tối đa cho mỗi lần mã hóa
    let mp3Data = [];

    for (let i = 0; i < pcmArray.length; i += maxSamples) {
        let sampleChunk = pcmArray.slice(i, i + maxSamples);
        // Chuyển đổi Int8Array sang Uint8Array
        let mp3buf = mp3Encoder.encodeBuffer(new Int16Array(sampleChunk));
        if (mp3buf.length > 0) {
            mp3Data.push(Buffer.from(mp3buf)); // Chuyển đổi Uint8Array thành Buffer
        }
    }

    // Bước 4: Kết thúc quá trình mã hóa và nhận phần đệm MP3 còn lại
    let endBuffer = mp3Encoder.flush();
    if (endBuffer.length > 0) {
        mp3Data.push(Buffer.from(endBuffer));  // Chuyển đổi Uint8Array thành Buffer
    }

    // Bước 5: Ghi dữ liệu MP3 vào tệp
    let mp3Blob = Buffer.concat(mp3Data);  // Kết hợp tất cả các phần MP3 thành một buffer duy nhất
    fs.writeFileSync('C:/hustmedia2/truyenthanh/sql/' + randomNumber + '.mp3', mp3Blob);  // Lưu buffer vào tệp output.mp3

    console.log('Đã lưu file MP3 vào output.mp3');
}